"""
pipeline/ingestion/ocr_extractor.py
Stage 3 — OCR and visual property extraction.

Enriches each element from Stage 2 with text content, font properties,
and colour information by analysing the cropped regions of the canonical image.

Since NemoRetriever-Parse already provides text in Stage 2, this stage
focuses on extracting visual properties (colours, font sizes, weights)
from the pixel data using Pillow and NumPy.

Usage:
    from pipeline.ingestion.ocr_extractor import extract_visual_properties

    enriched = extract_visual_properties(elements, "/tmp/job/source.png", 2480, 3508)
"""

import logging
from pathlib import Path

import numpy as np
from PIL import Image

logger = logging.getLogger(__name__)

# Font size mapping from hints to approximate pt values
_FONT_SIZE_MAP = {
    "xlarge": 28.0,
    "large": 20.0,
    "medium": 12.0,
    "small": 10.0,
}

# Bold detection: average brightness threshold
# Bold text has higher ink density → lower average brightness
_BOLD_BRIGHTNESS_THRESHOLD = 160


def extract_visual_properties(
    elements: list[dict],
    canonical_image_path: str,
    source_width_px: int,
    source_height_px: int,
) -> tuple[list[dict], str]:
    """
    Enrich each element with visual properties extracted from the image pixels.

    Args:
        elements:             List of elements from Stage 2.
        canonical_image_path: Path to the canonical 300 DPI PNG.
        source_width_px:      Image width.
        source_height_px:     Image height.

    Returns:
        Tuple of (enriched elements list, background hex colour).
    """
    img = Image.open(canonical_image_path).convert("RGB")
    img_array = np.array(img)

    # Detect page background colour from margin pixels
    background_hex = _detect_background(img_array)

    for el in elements:
        x1, y1, x2, y2 = el["bbox_px"]

        # Clamp coordinates to image bounds
        x1 = max(0, min(x1, source_width_px - 1))
        y1 = max(0, min(y1, source_height_px - 1))
        x2 = max(x1 + 1, min(x2, source_width_px))
        y2 = max(y1 + 1, min(y2, source_height_px))

        crop_array = img_array[y1:y2, x1:x2]

        if crop_array.size == 0:
            el.update(_default_properties(el))
            continue

        label = el.get("label", "text")
        visual = el.get("visual_properties", {})

        if label in ("title", "text", "header"):
            # Text element — extract text colour and font properties
            fill_hex = _sample_text_colour(crop_array)
            font_size_pt = _estimate_font_size(y2 - y1, visual.get("font_size_hint", "medium"))
            font_weight = _detect_font_weight(crop_array, visual.get("is_bold", False))
            text_align = visual.get("text_align", "left")

            el["fill_hex"] = fill_hex
            el["font_size_pt"] = font_size_pt
            el["font_weight"] = font_weight
            el["text_align"] = text_align

        elif label == "separator":
            # Separator — sample median colour
            el["fill_hex"] = _sample_shape_colour(crop_array)
            el["font_size_pt"] = 0
            el["font_weight"] = "normal"
            el["text_align"] = "left"

        elif label == "figure":
            # Figure/shape — sample fill colour
            el["fill_hex"] = _sample_shape_colour(crop_array)
            el["font_size_pt"] = 0
            el["font_weight"] = "normal"
            el["text_align"] = "left"

        else:
            el.update(_default_properties(el))

    logger.info(
        f"[Stage 3] Extracted visual properties for {len(elements)} elements. "
        f"Background: {background_hex}"
    )

    return elements, background_hex


def _detect_background(img_array: np.ndarray) -> str:
    """
    Detect page background colour by sampling the margins.
    Takes the most common colour in the top-left, top-right,
    bottom-left, and bottom-right corners.
    """
    h, w = img_array.shape[:2]
    margin = max(10, min(50, h // 20, w // 20))

    # Sample corners
    corners = np.concatenate([
        img_array[:margin, :margin].reshape(-1, 3),         # top-left
        img_array[:margin, -margin:].reshape(-1, 3),        # top-right
        img_array[-margin:, :margin].reshape(-1, 3),        # bottom-left
        img_array[-margin:, -margin:].reshape(-1, 3),       # bottom-right
    ])

    # Find the median colour (robust to outliers)
    median_color = np.median(corners, axis=0).astype(int)
    return "#{:02X}{:02X}{:02X}".format(*median_color)


def _sample_text_colour(crop_array: np.ndarray) -> str:
    """
    Extract text colour by sampling the darkest pixels in the crop.
    Text pixels are typically the darkest — we take the 5th percentile.
    """
    if crop_array.size == 0:
        return "#333333"

    brightness = crop_array.mean(axis=2)  # per-pixel brightness
    threshold = np.percentile(brightness, 5)
    dark_mask = brightness <= threshold

    if not dark_mask.any():
        return "#333333"

    dark_pixels = crop_array[dark_mask]
    text_color = dark_pixels.mean(axis=0).astype(int)
    return "#{:02X}{:02X}{:02X}".format(*text_color)


def _sample_shape_colour(crop_array: np.ndarray) -> str:
    """
    Extract shape fill colour by taking the median pixel colour.
    Shapes have a uniform fill, so the median is very stable.
    """
    if crop_array.size == 0:
        return "#CCCCCC"

    median_color = np.median(crop_array.reshape(-1, 3), axis=0).astype(int)
    return "#{:02X}{:02X}{:02X}".format(*median_color)


def _estimate_font_size(height_px: int, size_hint: str) -> float:
    """
    Estimate font size in points from the bounding box height and model hint.

    The model provides a rough size category (small/medium/large/xlarge).
    We combine this with the actual pixel height for a better estimate.

    At 300 DPI:  font_size_pt ≈ (cap_height_px / 300) * 72
    Cap height is roughly 70% of the bounding box height for typical text.
    """
    # Use the hint-based size as a baseline
    base_pt = _FONT_SIZE_MAP.get(size_hint, 12.0)

    # Also estimate from pixel height
    cap_height_px = height_px * 0.7  # approximate cap height
    pixel_based_pt = (cap_height_px / 300) * 72

    # Weighted average — trust the hint more for larger sizes, pixels more for smaller
    if pixel_based_pt > 0:
        return round((base_pt * 0.4 + pixel_based_pt * 0.6), 1)
    return base_pt


def _detect_font_weight(crop_array: np.ndarray, hint_bold: bool) -> str:
    """
    Detect font weight from pixel intensity.
    Bold characters have higher ink density (lower average brightness).
    We also factor in the model's hint.
    """
    if hint_bold:
        return "bold"

    if crop_array.size == 0:
        return "normal"

    brightness = crop_array.mean(axis=2)
    # Look at the darkest region (text pixels)
    dark_pixels = brightness[brightness < np.percentile(brightness, 30)]
    if len(dark_pixels) == 0:
        return "normal"

    avg_darkness = dark_pixels.mean()
    return "bold" if avg_darkness < _BOLD_BRIGHTNESS_THRESHOLD else "normal"


def _default_properties(el: dict) -> dict:
    """Return default visual properties for elements that can't be analyzed."""
    visual = el.get("visual_properties", {})
    return {
        "fill_hex": visual.get("text_color", "#333333"),
        "font_size_pt": _FONT_SIZE_MAP.get(visual.get("font_size_hint", "medium"), 12.0),
        "font_weight": "bold" if visual.get("is_bold") else "normal",
        "text_align": visual.get("text_align", "left"),
    }
