"""
pipeline/ingestion/fabric_assembler.py
Stage 6 — Assemble all enriched element data into a valid fabric_json string.

Produces a JSON string that can be loaded directly into the Fabric.js canvas
via canvas.loadFromJSON(). Wraps the output in the multi-page envelope
format used by the MyCareerCV editor.

Usage:
    from pipeline.ingestion.fabric_assembler import assemble_fabric_json

    result = assemble_fabric_json(elements, instance_counts, "#ffffff")
    # result = {
    #   "fabric_json": '{"version":1,"pages":[...]}',
    #   "flagged_elements": ["el_007", ...],
    #   "template_metadata": { ... },
    # }
"""

import json
import logging

logger = logging.getLogger(__name__)

# Confidence threshold for flagging elements for review
REVIEW_THRESHOLD = 0.70


def assemble_fabric_json(
    elements: list[dict],
    instance_counts: dict,
    background_hex: str = "#ffffff",
) -> dict:
    """
    Build the complete fabric_json string from enriched elements.

    Args:
        elements:         Fully enriched elements from Stages 2–5.
        instance_counts:  Dict of max instance IDs per array-type parent.
        background_hex:   Page background colour.

    Returns:
        {
            "fabric_json":        str,   # multi-page envelope JSON string
            "flagged_elements":   list,  # element IDs with confidence < threshold
            "template_metadata":  dict,  # instance counts and confidence data
        }
    """
    fabric_objects = []
    flagged_elements = []
    ingestion_confidences = {}

    for el in elements:
        obj = _build_fabric_object(el)
        if obj:
            fabric_objects.append(obj)

        # Track confidences
        confidence = el.get("binding_confidence", el.get("confidence", 0.8))
        ingestion_confidences[el["id"]] = round(confidence, 2)

        if confidence < REVIEW_THRESHOLD:
            flagged_elements.append(el["id"])

    # Build the single-page canvas JSON
    canvas_json = {
        "version": "5.3.0",
        "objects": fabric_objects,
        "background": background_hex,
        "templateMetadata": {
            "instanceCounts": instance_counts,
            "ingestionSource": "image_upload",
            "ingestionConfidences": ingestion_confidences,
        },
    }

    # Wrap in multi-page envelope (matching the editor's format)
    envelope = {
        "version": 1,
        "pages": [json.dumps(canvas_json)],
    }

    fabric_json_str = json.dumps(envelope)

    logger.info(
        f"[Stage 6] Assembled fabric_json with {len(fabric_objects)} objects. "
        f"Flagged for review: {len(flagged_elements)}"
    )

    return {
        "fabric_json": fabric_json_str,
        "flagged_elements": flagged_elements,
        "template_metadata": {
            "instanceCounts": instance_counts,
            "ingestionConfidences": ingestion_confidences,
        },
    }


def _build_fabric_object(element: dict) -> dict | None:
    """Convert a single enriched element into a Fabric.js object."""
    label = element.get("label", "text")
    binding = element.get("binding", {})
    is_static = element.get("is_static", False)

    # Base properties common to all Fabric.js objects
    base = {
        "version": "5.3.0",
        "originX": "left",
        "originY": "top",
        "left": element.get("fabric_left", 0),
        "top": element.get("fabric_top", 0),
        "width": element.get("fabric_width", 100),
        "height": element.get("fabric_height", 20),
        "selectable": True,
        "hasControls": True,
        "evented": True,
    }

    bind_parent = binding.get("bindParent")
    bind_field = binding.get("bindField")
    bind_instance_id = binding.get("bindInstanceId", 0)

    custom_meta = {}
    if bind_parent and bind_field and not is_static:
        custom_meta = {
            "bindParent": bind_parent,
            "bindField": bind_field,
            "bindInstanceId": bind_instance_id,
        }
    elif is_static:
        custom_meta = {
            "isStatic": True,
        }

    # Add friendly label for the properties panel
    text = element.get("text", "")
    if text:
        # Truncate long text for the label
        custom_meta["friendlyLabel"] = text[:30] + ("…" if len(text) > 30 else "")

    if label in ("title", "text", "header") and text:
        # Text element → Fabric.js Textbox
        obj = {
            **base,
            "type": "textbox",
            "text": text,
            "fill": element.get("fill_hex", "#333333"),
            "fontFamily": "Inter",
            "fontSize": element.get("fabric_font_size", 12),
            "fontWeight": element.get("font_weight", "normal"),
            "textAlign": element.get("text_align", "left"),
            "lineHeight": 1.2,
            "customMeta": custom_meta,
        }

    elif label == "separator":
        # Separator → Fabric.js Rect (thin horizontal bar)
        obj = {
            **base,
            "type": "rect",
            "fill": element.get("fill_hex", "#CCCCCC"),
            "rx": 0,
            "ry": 0,
            "customMeta": {**custom_meta, "isStatic": True},
        }

    elif label == "figure":
        # Figure/shape → Fabric.js Rect
        obj = {
            **base,
            "type": "rect",
            "fill": element.get("fill_hex", "#E0E0E0"),
            "rx": 0,
            "ry": 0,
            "customMeta": custom_meta,
        }

    else:
        # Fallback: treat as static textbox
        obj = {
            **base,
            "type": "textbox",
            "text": text or " ",
            "fill": element.get("fill_hex", "#333333"),
            "fontFamily": "Inter",
            "fontSize": element.get("fabric_font_size", 10),
            "fontWeight": "normal",
            "textAlign": "left",
            "lineHeight": 1.2,
            "customMeta": {**custom_meta, "isStatic": True},
        }

    return obj
