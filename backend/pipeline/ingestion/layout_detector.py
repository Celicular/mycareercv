"""
pipeline/ingestion/layout_detector.py
Stage 2 — Layout detection via NVIDIA NemoRetriever-Parse NIM.

Uses nvidia/nemoretriever-parse with the `markdown_bbox` tool to extract
structured content with bounding boxes from the canonical image.
The model returns markdown with coordinate annotations which we parse
into element bounding boxes with labels.

The API requires a SPECIFIC request format:
  - Content uses HTML <img> tags (NOT OpenAI-style image_url arrays)
  - Must include `tools` and `tool_choice` parameters
  - Only a single user message, no system message

Usage:
    from pipeline.ingestion.layout_detector import detect_layout

    elements = detect_layout("/tmp/ingestion/job_abc/source.png", source_w, source_h)
"""

import base64
import json
import logging
import mimetypes
import os
import re

import requests
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# ── NIM endpoint & model ──────────────────────────────────────────────────────
_NVAI_URL = "https://integrate.api.nvidia.com/v1/chat/completions"
_MODEL = "nvidia/nemoretriever-parse"

# Available tools for NemoRetriever-Parse
_TOOL_BBOX = "markdown_bbox"       # markdown with bounding box coordinates
_TOOL_NO_BBOX = "markdown_no_bbox" # clean markdown, no bounding boxes

# Minimum element dimensions (pixels) — filter rendering artefacts
_MIN_WIDTH_PX = 10
_MIN_HEIGHT_PX = 2

# Separator aspect ratio threshold
_SEPARATOR_ASPECT_RATIO = 20
_SEPARATOR_MAX_HEIGHT_PX = 8


def _get_headers() -> dict:
    api_key = os.getenv("NVIDIA_API_KEY")
    if not api_key:
        raise EnvironmentError("NVIDIA_API_KEY is not set. Check backend/.env")
    return {
        "Authorization": f"Bearer {api_key}",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }


def detect_layout(
    canonical_image_path: str,
    source_width_px: int,
    source_height_px: int,
    timeout: int = 120,
) -> list[dict]:
    """
    Detect layout regions in the canonical image using NemoRetriever-Parse.

    First tries `markdown_bbox` (positions + text).
    Falls back to `markdown_no_bbox` with heuristic positioning.

    Args:
        canonical_image_path: Path to the 300 DPI canonical PNG.
        source_width_px:      Image width in pixels.
        source_height_px:     Image height in pixels.
        timeout:              HTTP request timeout in seconds.

    Returns:
        List of detected elements:
            {
                "id": "el_001",
                "label": "title" | "text" | "separator" | "figure" | "header",
                "bbox_px": [x1, y1, x2, y2],
                "confidence": 0.97,
                "text": "...",
                "visual_properties": { ... },
            }
    """
    # Read and base64-encode the image
    with open(canonical_image_path, "rb") as f:
        image_b64 = base64.b64encode(f.read()).decode("ascii")

    # Guess MIME type from extension
    mime, _ = mimetypes.guess_type(canonical_image_path)
    if mime is None:
        mime = "image/png"

    # ── Try markdown_bbox first (gives positions + text) ──────────────────
    detections = _call_nemoretriever(
        image_b64, mime, _TOOL_BBOX, source_width_px, source_height_px, timeout
    )

    # ── Fallback: markdown_no_bbox (text only, heuristic positions) ───────
    if not detections:
        logger.warning("[Stage 2] markdown_bbox failed, trying markdown_no_bbox fallback")
        detections = _call_nemoretriever(
            image_b64, mime, _TOOL_NO_BBOX, source_width_px, source_height_px, timeout
        )

    if not detections:
        logger.error("[Stage 2] All NemoRetriever-Parse calls failed")
        return []

    # Post-processing
    detections = _post_process(detections, source_width_px, source_height_px)

    logger.info(f"[Stage 2] Detected {len(detections)} elements after post-processing")
    return detections


def _call_nemoretriever(
    image_b64: str,
    mime: str,
    tool_name: str,
    source_width_px: int,
    source_height_px: int,
    timeout: int,
) -> list[dict]:
    """
    Call NemoRetriever-Parse with the correct API format.

    The API requires:
    - A single user message with content as an HTML <img> tag string
    - tools array with the function spec
    - tool_choice specifying which tool to use
    """
    # Build content with HTML <img> tag — this is the format the API expects
    content = f'<img src="data:{mime};base64,{image_b64}" />'

    payload = {
        "model": _MODEL,
        "messages": [
            {
                "role": "user",
                "content": content,
            }
        ],
        "tools": [{"type": "function", "function": {"name": tool_name}}],
        "tool_choice": {"type": "function", "function": {"name": tool_name}},
        "max_tokens": 3200,
    }

    try:
        resp = requests.post(
            _NVAI_URL, headers=_get_headers(), json=payload, timeout=timeout
        )
        resp.raise_for_status()
        data = resp.json()

        # Extract the result from the response
        raw_content = _extract_response_content(data)

        if not raw_content:
            logger.warning(f"[Stage 2] Empty response from NemoRetriever-Parse ({tool_name})")
            return []

        logger.info(
            f"[Stage 2] NemoRetriever-Parse ({tool_name}) returned "
            f"{len(raw_content):,} chars"
        )

        # Parse into elements based on which tool was used
        if tool_name == _TOOL_BBOX:
            return _parse_bbox_markdown(raw_content, source_width_px, source_height_px)
        else:
            return _parse_plain_markdown(raw_content, source_width_px, source_height_px)

    except requests.HTTPError as e:
        logger.error(
            f"[Stage 2] NemoRetriever-Parse ({tool_name}) HTTP error: "
            f"{resp.status_code} — {resp.text[:300]}"
        )
        return []
    except requests.RequestException as e:
        logger.error(f"[Stage 2] NemoRetriever-Parse ({tool_name}) request error: {e}")
        return []
    except Exception as e:
        logger.error(f"[Stage 2] Unexpected error in NemoRetriever-Parse ({tool_name}): {e}")
        return []


def _extract_response_content(data: dict) -> str:
    """Extract the text content from a NemoRetriever-Parse API response."""
    choices = data.get("choices", [])
    if not choices:
        return ""

    msg = choices[0].get("message", {})

    # Check tool_calls first (primary response format)
    tool_calls = msg.get("tool_calls", [])
    if tool_calls:
        raw = tool_calls[0].get("function", {}).get("arguments", "")
        try:
            parsed = json.loads(raw)
            if isinstance(parsed, dict):
                return (
                    parsed.get("markdown")
                    or parsed.get("content")
                    or parsed.get("text")
                    or str(parsed)
                )
            return str(parsed)
        except json.JSONDecodeError:
            return raw  # Already raw markdown string

    # Fallback: plain content field
    return msg.get("content", "")


def _parse_bbox_markdown(
    markdown: str,
    source_width_px: int,
    source_height_px: int,
) -> list[dict]:
    """
    Parse markdown_bbox output into elements with bounding boxes.

    The markdown_bbox format includes coordinate annotations in the text.
    Coordinates may appear as inline annotations or structured data.
    We extract text blocks and their positions.
    """
    elements = []

    # Try to parse as JSON first (some models return structured JSON)
    try:
        data = json.loads(markdown)
        if isinstance(data, list):
            for idx, item in enumerate(data):
                el = _structured_item_to_element(item, idx, source_width_px, source_height_px)
                if el:
                    elements.append(el)
            if elements:
                return elements
    except (json.JSONDecodeError, TypeError):
        pass

    # Parse as annotated markdown
    # Common bbox patterns:
    #   <bbox>x1, y1, x2, y2</bbox>
    #   [x1, y1, x2, y2]
    #   Coordinates as fractions (0.0–1.0) or absolute pixels

    # Pattern 1: <bbox> tags
    bbox_pattern = re.compile(
        r'(?:<bbox>|<loc_)(\d+(?:\.\d+)?)[,\s]+(\d+(?:\.\d+)?)[,\s]+'
        r'(\d+(?:\.\d+)?)[,\s]+(\d+(?:\.\d+)?)\s*(?:</bbox>|>)',
        re.IGNORECASE,
    )

    # Split into blocks separated by bbox annotations
    # First, find all bbox regions
    matches = list(bbox_pattern.finditer(markdown))

    if matches:
        # We have bounding box annotations
        for idx, match in enumerate(matches):
            coords = [float(match.group(i)) for i in range(1, 5)]

            # Determine if coordinates are normalised (0-1) or absolute
            if all(c <= 1.0 for c in coords):
                # Normalised coordinates
                x1 = int(coords[0] * source_width_px)
                y1 = int(coords[1] * source_height_px)
                x2 = int(coords[2] * source_width_px)
                y2 = int(coords[3] * source_height_px)
            elif all(c <= 1000 for c in coords):
                # NemoRetriever often uses 0-1000 scale
                x1 = int(coords[0] / 1000 * source_width_px)
                y1 = int(coords[1] / 1000 * source_height_px)
                x2 = int(coords[2] / 1000 * source_width_px)
                y2 = int(coords[3] / 1000 * source_height_px)
            else:
                # Absolute pixel coordinates
                x1 = int(coords[0])
                y1 = int(coords[1])
                x2 = int(coords[2])
                y2 = int(coords[3])

            # Extract text near this bbox annotation
            start = match.start()
            end = match.end()

            # Look for text before this match (after previous match)
            prev_end = matches[idx - 1].end() if idx > 0 else 0
            text_before = markdown[prev_end:start].strip()

            # Clean the text
            text = re.sub(r'<[^>]+>', '', text_before).strip()
            text = re.sub(r'\*\*(.*?)\*\*', r'\1', text)
            text = re.sub(r'\*(.*?)\*', r'\1', text)
            text = re.sub(r'^#+\s*', '', text)
            text = text.strip()

            if not text and idx == len(matches) - 1:
                text_after = markdown[end:].strip()
                text = re.sub(r'<[^>]+>', '', text_after).strip()[:100]

            label = _classify_element(text, x1, y1, x2, y2, source_width_px, source_height_px)

            elements.append({
                "id": f"el_{len(elements) + 1:03d}",
                "label": label,
                "bbox_px": [x1, y1, x2, y2],
                "confidence": 0.85,
                "text": text,
                "visual_properties": _infer_visual_properties(text, label),
            })

    # If no bbox annotations found, fall back to line-by-line parsing
    if not elements:
        logger.info("[Stage 2] No bbox annotations found, parsing markdown line-by-line")
        return _parse_plain_markdown(markdown, source_width_px, source_height_px)

    return elements


def _structured_item_to_element(
    item: dict,
    idx: int,
    source_width_px: int,
    source_height_px: int,
) -> dict | None:
    """Convert a structured JSON item into an element dict."""
    if not isinstance(item, dict):
        return None

    text = item.get("text", item.get("content", ""))
    bbox = item.get("bbox", item.get("bounding_box", item.get("coordinates", [])))

    if not bbox or len(bbox) < 4:
        return None

    coords = [float(c) for c in bbox[:4]]

    # Determine coordinate scale
    if all(c <= 1.0 for c in coords):
        x1 = int(coords[0] * source_width_px)
        y1 = int(coords[1] * source_height_px)
        x2 = int(coords[2] * source_width_px)
        y2 = int(coords[3] * source_height_px)
    elif all(c <= 1000 for c in coords):
        x1 = int(coords[0] / 1000 * source_width_px)
        y1 = int(coords[1] / 1000 * source_height_px)
        x2 = int(coords[2] / 1000 * source_width_px)
        y2 = int(coords[3] / 1000 * source_height_px)
    else:
        x1, y1, x2, y2 = int(coords[0]), int(coords[1]), int(coords[2]), int(coords[3])

    label = item.get("type", item.get("label", "text"))
    label = _normalise_label(label)
    if label == "text":
        label = _classify_element(text, x1, y1, x2, y2, source_width_px, source_height_px)

    return {
        "id": f"el_{idx + 1:03d}",
        "label": label,
        "bbox_px": [x1, y1, x2, y2],
        "confidence": float(item.get("confidence", 0.85)),
        "text": text,
        "visual_properties": _infer_visual_properties(text, label),
    }


def _parse_plain_markdown(
    markdown: str,
    source_width_px: int,
    source_height_px: int,
) -> list[dict]:
    """
    Parse plain markdown (no bounding boxes) into elements with
    heuristic bounding boxes estimated from line positions and formatting.
    """
    lines = markdown.strip().split("\n")
    elements = []
    current_y_pct = 3.0  # start 3% from top
    margin_x_pct = 5.0   # 5% left margin

    for line in lines:
        line = line.strip()
        if not line:
            current_y_pct += 1.0
            continue

        # Determine element type and size from markdown formatting
        if line.startswith("# "):
            label = "title"
            text = re.sub(r'^#+\s*', '', line).strip()
            height_pct = 4.0
            font_hint = "xlarge"
            is_bold = True
        elif line.startswith("## "):
            label = "header"
            text = re.sub(r'^#+\s*', '', line).strip()
            height_pct = 3.0
            font_hint = "large"
            is_bold = True
        elif line.startswith("### "):
            label = "header"
            text = re.sub(r'^#+\s*', '', line).strip()
            height_pct = 2.5
            font_hint = "medium"
            is_bold = True
        elif line.startswith("---") or line.startswith("***") or line.startswith("___"):
            label = "separator"
            text = ""
            height_pct = 0.3
            font_hint = "medium"
            is_bold = False
        elif line.startswith("- ") or line.startswith("* ") or re.match(r'^\d+\.\s', line):
            label = "text"
            text = re.sub(r'^[-*]\s+', '', line)
            text = re.sub(r'^\d+\.\s+', '', text).strip()
            height_pct = 2.0
            font_hint = "small"
            is_bold = False
        elif line.startswith("|"):
            # Skip markdown table formatting
            continue
        else:
            label = "text"
            text = line
            height_pct = 2.0
            font_hint = "medium"
            is_bold = "**" in line

        # Clean markdown formatting from text
        text = re.sub(r'\*\*(.*?)\*\*', r'\1', text)
        text = re.sub(r'\*(.*?)\*', r'\1', text)
        text = re.sub(r'`(.*?)`', r'\1', text)
        text = re.sub(r'\[(.*?)\]\(.*?\)', r'\1', text)

        if not text and label != "separator":
            continue

        width_pct = 90.0 if label in ("title", "header", "separator") else 85.0

        x1 = int(margin_x_pct / 100 * source_width_px)
        y1 = int(current_y_pct / 100 * source_height_px)
        x2 = int((margin_x_pct + width_pct) / 100 * source_width_px)
        y2 = int((current_y_pct + height_pct) / 100 * source_height_px)

        elements.append({
            "id": f"el_{len(elements) + 1:03d}",
            "label": label,
            "bbox_px": [x1, y1, x2, y2],
            "confidence": 0.60,  # lower confidence for heuristic detection
            "text": text,
            "visual_properties": {
                "is_bold": is_bold,
                "font_size_hint": font_hint,
                "text_color": "#333333",
                "background_color": None,
                "text_align": "left",
            },
        })

        current_y_pct += height_pct + 0.5

    return elements


def _classify_element(
    text: str,
    x1: int, y1: int, x2: int, y2: int,
    source_width_px: int,
    source_height_px: int,
) -> str:
    """Classify an element based on its text content and position."""
    text_lower = text.lower().strip()
    w = x2 - x1
    h = y2 - y1

    # Separator: very wide and very thin
    if h > 0 and w / h > _SEPARATOR_ASPECT_RATIO and h < _SEPARATOR_MAX_HEIGHT_PX:
        return "separator"

    # No text = figure
    if not text_lower:
        return "figure"

    # Section headers
    section_keywords = {
        "experience", "work experience", "professional experience", "employment",
        "education", "academic", "skills", "technical skills", "competencies",
        "projects", "certifications", "certificates", "awards",
        "publications", "volunteer", "volunteering", "interests",
        "languages", "references", "summary", "profile", "about me",
        "objective", "achievements", "honors",
    }
    if text_lower in section_keywords or (
        text_lower.replace(" ", "") in {kw.replace(" ", "") for kw in section_keywords}
    ):
        return "header"

    # Title: large text near the top of the page (top 15%)
    y_pct = y1 / source_height_px * 100
    if y_pct < 15 and h > source_height_px * 0.02:
        return "title"

    return "text"


def _normalise_label(label: str) -> str:
    """Normalise various label strings to our standard set."""
    label = label.lower().strip()
    mapping = {
        "heading": "header",
        "section_header": "header",
        "section": "header",
        "paragraph": "text",
        "body": "text",
        "line": "separator",
        "divider": "separator",
        "image": "figure",
        "shape": "figure",
        "icon": "figure",
        "decoration": "figure",
    }
    return mapping.get(label, label if label in ("title", "text", "header", "separator", "figure") else "text")


def _infer_visual_properties(text: str, label: str) -> dict:
    """Infer visual properties from text content and label."""
    is_bold = label in ("title", "header")
    font_hint = {
        "title": "xlarge",
        "header": "large",
        "text": "medium",
        "separator": "medium",
        "figure": "medium",
    }.get(label, "medium")

    return {
        "is_bold": is_bold,
        "font_size_hint": font_hint,
        "text_color": "#333333",
        "background_color": None,
        "text_align": "center" if label == "title" else "left",
    }


def _post_process(
    elements: list[dict],
    source_width_px: int,
    source_height_px: int,
) -> list[dict]:
    """Apply post-processing rules to detected elements."""
    filtered = []

    for el in elements:
        x1, y1, x2, y2 = el["bbox_px"]
        w = x2 - x1
        h = y2 - y1

        # 1. Minimum area filter
        if w < _MIN_WIDTH_PX or h < _MIN_HEIGHT_PX:
            continue

        # 2. Separator detection override
        if w > 0 and h > 0:
            aspect = w / h
            if aspect > _SEPARATOR_ASPECT_RATIO and h < _SEPARATOR_MAX_HEIGHT_PX:
                el["label"] = "separator"

        # 3. Clamp to image bounds
        el["bbox_px"] = [
            max(0, x1),
            max(0, y1),
            min(source_width_px, x2),
            min(source_height_px, y2),
        ]

        filtered.append(el)

    # 4. Deduplication (IoU > 0.8 → keep higher confidence)
    deduped = _deduplicate(filtered)

    return deduped


def _iou(box1: list, box2: list) -> float:
    """Compute Intersection over Union of two bounding boxes."""
    x1 = max(box1[0], box2[0])
    y1 = max(box1[1], box2[1])
    x2 = min(box1[2], box2[2])
    y2 = min(box1[3], box2[3])

    intersection = max(0, x2 - x1) * max(0, y2 - y1)
    area1 = (box1[2] - box1[0]) * (box1[3] - box1[1])
    area2 = (box2[2] - box2[0]) * (box2[3] - box2[1])
    union = area1 + area2 - intersection

    return intersection / union if union > 0 else 0


def _deduplicate(elements: list[dict], iou_threshold: float = 0.8) -> list[dict]:
    """Remove duplicate detections with IoU > threshold."""
    sorted_els = sorted(elements, key=lambda e: e["confidence"], reverse=True)
    keep = []

    for el in sorted_els:
        is_dup = False
        for kept in keep:
            if _iou(el["bbox_px"], kept["bbox_px"]) > iou_threshold:
                is_dup = True
                break
        if not is_dup:
            keep.append(el)

    return keep
