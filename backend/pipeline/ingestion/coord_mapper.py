"""
pipeline/ingestion/coord_mapper.py
Stage 5 — Pixel coordinates → Fabric.js canvas coordinates (595×842).

Proportionally maps bounding boxes from the source image resolution
to the Fabric.js A4 canvas coordinate system.

Usage:
    from pipeline.ingestion.coord_mapper import map_coordinates

    mapped = map_coordinates(elements, source_w, source_h)
"""

import logging

logger = logging.getLogger(__name__)

# Fabric.js canvas dimensions (A4 at 96 DPI display scaling)
CANVAS_WIDTH = 595
CANVAS_HEIGHT = 842


def map_coordinates(
    elements: list[dict],
    source_width_px: int,
    source_height_px: int,
    source_dpi: int = 300,
) -> list[dict]:
    """
    Convert pixel coordinates to Fabric.js canvas coordinates.

    Args:
        elements:         Annotated elements from Stages 2–4.
        source_width_px:  Source image width in pixels.
        source_height_px: Source image height in pixels.
        source_dpi:       Source image DPI (for font size correction).

    Returns:
        Elements enriched with fabric_left, fabric_top, fabric_width,
        fabric_height, and fabric_font_size.
    """
    scale_x = CANVAS_WIDTH / source_width_px
    scale_y = CANVAS_HEIGHT / source_height_px

    for el in elements:
        x1, y1, x2, y2 = el["bbox_px"]

        el["fabric_left"] = round(x1 * scale_x, 2)
        el["fabric_top"] = round(y1 * scale_y, 2)
        el["fabric_width"] = round((x2 - x1) * scale_x, 2)
        el["fabric_height"] = round((y2 - y1) * scale_y, 2)

        # Font size mapping
        font_size_pt = el.get("font_size_pt", 12.0)
        el["fabric_font_size"] = round(
            _scale_font_size(font_size_pt, source_height_px, source_dpi), 2
        )

    logger.info(
        f"[Stage 5] Mapped {len(elements)} elements to "
        f"canvas ({CANVAS_WIDTH}×{CANVAS_HEIGHT}). "
        f"Scale: x={scale_x:.4f}, y={scale_y:.4f}"
    )

    return elements


def _scale_font_size(
    font_size_pt: float,
    source_height_px: int,
    source_dpi: int = 300,
) -> float:
    """
    Convert a font size estimated at source DPI to Fabric.js canvas units.

    Fabric.js renders at ~96 DPI equivalent. The canvas height is 842 units
    representing an A4 page (11.69 inches). So 1 canvas unit ≈ 1 point.

    We scale the font size proportionally to the canvas height.
    """
    if font_size_pt <= 0:
        return 10.0

    # Source height in inches
    source_height_inches = source_height_px / source_dpi

    # Scale: how many canvas units per source inch
    # At A4: 842 canvas units = 11.69 inches → ~72 canvas units per inch
    canvas_units_per_inch = CANVAS_HEIGHT / source_height_inches

    # Font size in canvas units ≈ source_pt * (canvas_units_per_inch / 72)
    # Since 1pt = 1/72 inch, and we want canvas units:
    scaled = font_size_pt * (canvas_units_per_inch / 72)

    # Clamp to reasonable range
    return max(6.0, min(72.0, scaled))
