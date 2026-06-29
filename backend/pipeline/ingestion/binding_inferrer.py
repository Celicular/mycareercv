"""
pipeline/ingestion/binding_inferrer.py
Stage 4 — Semantic classification and binding inference via Vision LLM.

Uses a vision-capable LLM (meta/llama-3.2-90b-vision-instruct) to look at
the resume image, read all extracted elements, and assign the correct
data binding (bindParent / bindField / bindInstanceId) to each one.

Usage:
    from pipeline.ingestion.binding_inferrer import infer_bindings

    annotated, instance_counts = infer_bindings(
        elements, "/tmp/job/source.png", source_w, source_h
    )
"""

import base64
import json
import logging
import os
import re

import requests
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# ── NIM endpoint & models ────────────────────────────────────────────────────
_NVAI_URL = "https://integrate.api.nvidia.com/v1/chat/completions"
_VISION_MODEL = "meta/llama-3.2-90b-vision-instruct"
_FALLBACK_MODEL = "meta/llama-3.1-8b-instruct"

# Confidence threshold for human review
REVIEW_THRESHOLD = 0.70

# The binding schema — matches the frontend's SCHEMA_DEF in resumeSchema.js
_BINDING_SCHEMA = {
    "identity": {
        "type": "object",
        "fields": ["full_name", "headline", "summary"],
    },
    "contact": {
        "type": "object",
        "fields": ["email", "phone", "location", "linkedin", "github", "portfolio"],
    },
    "work_experience": {
        "type": "array",
        "fields": ["company", "title", "location", "start_date", "end_date", "is_current", "responsibilities"],
    },
    "education": {
        "type": "array",
        "fields": ["institution", "degree", "field_of_study", "graduation_year", "gpa", "honors"],
    },
    "skills": {
        "type": "object",
        "fields": ["technical", "soft", "languages", "other"],
    },
    "projects": {
        "type": "array",
        "fields": ["name", "description", "technologies", "url", "date"],
    },
    "certifications": {
        "type": "array",
        "fields": ["name", "issuer", "date", "credential_id", "url"],
    },
    "awards": {
        "type": "array",
        "fields": ["title", "issuer", "date", "description"],
    },
    "publications": {
        "type": "array",
        "fields": ["title", "publisher", "date", "url"],
    },
    "volunteer": {
        "type": "array",
        "fields": ["organisation", "role", "start_date", "end_date", "description"],
    },
}


def _get_headers() -> dict:
    api_key = os.getenv("NVIDIA_API_KEY")
    if not api_key:
        raise EnvironmentError("NVIDIA_API_KEY is not set. Check backend/.env")
    return {
        "Authorization": f"Bearer {api_key}",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }


def infer_bindings(
    elements: list[dict],
    canonical_image_path: str,
    source_width_px: int,
    source_height_px: int,
    timeout: int = 60,
) -> tuple[list[dict], dict]:
    """
    Use a Vision LLM to assign semantic bindings to each element.

    Args:
        elements:             Enriched elements from Stage 3.
        canonical_image_path: Path to the canonical PNG.
        source_width_px:      Image width.
        source_height_px:     Image height.
        timeout:              HTTP request timeout.

    Returns:
        Tuple of (annotated elements, instance_counts dict).
    """
    # Build element summary for the prompt
    elements_summary = "\n".join(
        f"ID: {el['id']} | Label: {el['label']} | Text: '{el.get('text', '')}' | "
        f"Position: top={el['bbox_px'][1]}px, left={el['bbox_px'][0]}px, "
        f"width={el['bbox_px'][2]-el['bbox_px'][0]}px, height={el['bbox_px'][3]-el['bbox_px'][1]}px"
        for el in elements
    )

    schema_description = json.dumps(_BINDING_SCHEMA, indent=2)

    system_prompt = f"""You are a resume layout analyst. Your job is to analyse a resume image and a list of
detected text elements, and assign the correct data binding to each element.

You will be given:
1. The full resume image
2. A list of elements with their detected text and position
3. A binding schema of valid binding values

For each element, you must output a JSON object with:
- "id": the element ID (exactly as given)
- "bindParent": the parent category from the schema (e.g. "identity", "work_experience", "contact")
- "bindField": the specific field within that category (e.g. "full_name", "email", "title")
- "bindInstanceId": for array-type categories, which instance this belongs to (0-indexed). For object-type categories, always use 0.
- "is_static": true if this element is a section header, label, or decorative element that never changes
- "confidence": your confidence in this binding assignment (0.0 to 1.0)
- "reasoning": one short sentence explaining your decision

BINDING SCHEMA:
{schema_description}

Rules:
- For array-type categories (work_experience, education, projects, etc.), use bindInstanceId starting from 1 for the first instance, 2 for the second, etc.
- For object-type categories (identity, contact, skills), always use bindInstanceId = 0
- Section headers like "WORK EXPERIENCE", "EDUCATION", "SKILLS" are static: set is_static=true, bindParent=null, bindField=null
- Decorative shapes, lines, and separators are static: set is_static=true, bindParent=null, bindField=null
- If text looks like a person's name at the top → bindParent="identity", bindField="full_name"
- If text looks like an email address → bindParent="contact", bindField="email"
- If text looks like a phone number → bindParent="contact", bindField="phone"
- Job titles within experience blocks → bindParent="work_experience", bindField="title"
- Company names → bindParent="work_experience", bindField="company"
- Dates near experience/education → appropriate start_date or end_date
- Bullet point descriptions → bindParent="work_experience", bindField="responsibilities"
- Never invent bindings outside the provided schema
- If genuinely uncertain, set confidence < 0.7 and explain why

Respond ONLY with a JSON array. No preamble, no markdown fences."""

    user_prompt = f"""Detected elements:
{elements_summary}

Assign a binding to each element based on the resume image and the text content."""

    # Try vision model first, then fall back to text-only
    bindings = _call_vision_model(
        canonical_image_path, system_prompt, user_prompt, timeout
    )

    if bindings is None:
        logger.warning("[Stage 4] Vision model failed, trying text-only fallback")
        bindings = _call_text_model(system_prompt, user_prompt, timeout)

    if bindings is None:
        logger.warning("[Stage 4] All models failed, using rule-based fallback")
        bindings = _rule_based_fallback(elements)

    # Merge bindings into elements
    binding_map = {b["id"]: b for b in bindings if isinstance(b, dict)}

    for el in elements:
        binding = binding_map.get(el["id"])
        if binding:
            el["binding"] = {
                "bindParent": binding.get("bindParent"),
                "bindField": binding.get("bindField"),
                "bindInstanceId": binding.get("bindInstanceId", 0),
            }
            el["is_static"] = binding.get("is_static", False)
            el["binding_confidence"] = float(binding.get("confidence", 0.5))
            el["binding_reasoning"] = binding.get("reasoning", "")
        else:
            # No binding returned — mark as static with low confidence
            el["binding"] = {"bindParent": None, "bindField": None, "bindInstanceId": 0}
            el["is_static"] = True
            el["binding_confidence"] = 0.5
            el["binding_reasoning"] = "No binding assignment returned by model"

    # Compute instance counts
    instance_counts = _compute_instance_counts(elements)

    logger.info(
        f"[Stage 4] Binding inference complete. "
        f"Instance counts: {instance_counts}. "
        f"Low confidence: {sum(1 for e in elements if e['binding_confidence'] < REVIEW_THRESHOLD)}"
    )

    return elements, instance_counts


def _call_vision_model(
    image_path: str,
    system_prompt: str,
    user_prompt: str,
    timeout: int,
) -> list[dict] | None:
    """Call the vision LLM with the resume image."""
    try:
        with open(image_path, "rb") as f:
            image_b64 = base64.b64encode(f.read()).decode("ascii")

        payload = {
            "model": _VISION_MODEL,
            "messages": [
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:image/png;base64,{image_b64}"},
                        },
                        {"type": "text", "text": user_prompt},
                    ],
                },
            ],
            "max_tokens": 4096,
            "temperature": 0.1,
        }

        resp = requests.post(
            _NVAI_URL, headers=_get_headers(), json=payload, timeout=timeout
        )
        resp.raise_for_status()

        raw_content = resp.json()["choices"][0]["message"]["content"]
        return _parse_bindings(raw_content)

    except Exception as e:
        logger.error(f"[Stage 4] Vision model error: {e}")
        return None


def _call_text_model(
    system_prompt: str,
    user_prompt: str,
    timeout: int,
) -> list[dict] | None:
    """Fallback: call text-only LLM with element descriptions."""
    try:
        payload = {
            "model": _FALLBACK_MODEL,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "max_tokens": 4096,
            "temperature": 0.1,
        }

        resp = requests.post(
            _NVAI_URL, headers=_get_headers(), json=payload, timeout=timeout
        )
        resp.raise_for_status()

        raw_content = resp.json()["choices"][0]["message"]["content"]
        return _parse_bindings(raw_content)

    except Exception as e:
        logger.error(f"[Stage 4] Text model error: {e}")
        return None


def _parse_bindings(raw_content: str) -> list[dict] | None:
    """Parse the LLM's JSON response into a list of binding objects."""
    content = raw_content.strip()
    content = re.sub(r"^```(?:json)?\s*", "", content)
    content = re.sub(r"\s*```$", "", content)
    content = content.strip()

    try:
        bindings = json.loads(content)
        if isinstance(bindings, list):
            return bindings
        elif isinstance(bindings, dict):
            return [bindings]
    except json.JSONDecodeError:
        # Try to find a JSON array in the content
        match = re.search(r"\[.*\]", content, re.DOTALL)
        if match:
            try:
                return json.loads(match.group())
            except json.JSONDecodeError:
                pass

    logger.warning("[Stage 4] Could not parse binding response as JSON")
    return None


def _rule_based_fallback(elements: list[dict]) -> list[dict]:
    """
    Rule-based binding assignment when all AI models fail.
    Uses position and text patterns for basic classification.
    """
    bindings = []
    experience_count = 0
    education_count = 0

    for el in elements:
        text = el.get("text", "").strip().lower()
        label = el.get("label", "text")
        y_pos = el["bbox_px"][1]

        binding = {
            "id": el["id"],
            "bindParent": None,
            "bindField": None,
            "bindInstanceId": 0,
            "is_static": False,
            "confidence": 0.40,
            "reasoning": "Rule-based fallback — all AI models failed",
        }

        # Static elements
        if label in ("separator", "figure"):
            binding["is_static"] = True
            binding["confidence"] = 0.90
            binding["reasoning"] = f"Detected as {label} — decorative element"

        # Section headers
        elif label == "header" or text in (
            "experience", "work experience", "professional experience",
            "education", "skills", "projects", "certifications",
            "awards", "publications", "volunteer",
        ):
            binding["is_static"] = True
            binding["confidence"] = 0.85
            binding["reasoning"] = "Section heading — static text"

        # Email pattern
        elif "@" in text and "." in text:
            binding["bindParent"] = "contact"
            binding["bindField"] = "email"
            binding["confidence"] = 0.85
            binding["reasoning"] = "Contains @ symbol — likely email"

        # Phone pattern
        elif re.search(r"[\+\(]?\d[\d\s\-\(\)]{7,}", text):
            binding["bindParent"] = "contact"
            binding["bindField"] = "phone"
            binding["confidence"] = 0.75
            binding["reasoning"] = "Numeric pattern — likely phone"

        # Name (title at top of page)
        elif label == "title" and y_pos < el.get("bbox_px", [0, 500])[1]:
            binding["bindParent"] = "identity"
            binding["bindField"] = "full_name"
            binding["confidence"] = 0.70
            binding["reasoning"] = "Large text at top of page — likely name"

        else:
            binding["is_static"] = True
            binding["confidence"] = 0.30
            binding["reasoning"] = "Could not determine binding — marked for review"

        bindings.append(binding)

    return bindings


def _compute_instance_counts(elements: list[dict]) -> dict:
    """Compute the max instance ID per array-type parent."""
    counts = {}

    for el in elements:
        binding = el.get("binding", {})
        parent = binding.get("bindParent")
        instance_id = binding.get("bindInstanceId", 0)

        if parent and parent in _BINDING_SCHEMA:
            if _BINDING_SCHEMA[parent]["type"] == "array" and instance_id > 0:
                counts[parent] = max(counts.get(parent, 0), instance_id)

    return counts
