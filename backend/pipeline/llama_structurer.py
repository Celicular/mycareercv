"""
pipeline/llama_structurer.py
Stage 3 — Aggregated Markdown → structured JSON via Llama 3.1-8B Instruct NIM.

Uses guided_json to enforce the RESUME_SCHEMA at inference time, then
post-processes the raw response to guarantee a clean Python dict.

Usage:
    from pipeline.llama_structurer import markdown_to_json

    structured = markdown_to_json(full_markdown, total_pages=2)
"""

import json
import logging
import os
import re
import sys

import requests
from dotenv import load_dotenv

# resume_schema lives one level up (backend/resume_schema.py)
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from resume_schema import RESUME_SCHEMA

load_dotenv()

logger = logging.getLogger(__name__)

# ── NIM endpoint & model ──────────────────────────────────────────────────────
_NVAI_URL = "https://integrate.api.nvidia.com/v1/chat/completions"
_MODEL    = "meta/llama-3.1-8b-instruct"

# System prompt (as refined in the project system-prompts file)
_SYSTEM_PROMPT = (
    "You are a resume data extraction API. You receive the Markdown text of a "
    "resume and return a single JSON object that strictly conforms to the provided schema.\n\n"
    "Extraction rules:\n"
    "1. REQUIRED fields (full_name, contact.email, work_experience, education) must "
    "always be populated. If genuinely absent from the resume, use null for scalars "
    "or [] for arrays — never omit the key.\n"
    "2. OPTIONAL fields: include them if the information is present; omit the key "
    "entirely if it is not found. Do not guess or fabricate values.\n"
    "3. Dates: copy them exactly as written in the resume (e.g. 'Mar 2020', "
    "'2019–2021'). Do not reformat or normalise.\n"
    "4. Skills: categorise into technical / soft / languages / other using your "
    "best judgment from context. A skill belongs in only one category.\n"
    "5. work_experience and education must be in reverse chronological order "
    "(most recent first).\n"
    "6. is_current: set to true only if the role explicitly says 'Present', "
    "'Current', or has no end date in an otherwise date-bearing section.\n"
    "7. meta block: set parse_confidence to a float between 0 and 1 reflecting "
    "how complete and unambiguous the source text was. Set detected_language "
    "to the ISO 639-1 code of the resume's primary language.\n"
    "8. Output only the JSON object — no markdown fences, no explanation, no preamble."
)


def _get_headers() -> dict:
    api_key = os.getenv("NVIDIA_API_KEY")
    if not api_key:
        raise EnvironmentError("NVIDIA_API_KEY is not set. Check backend/.env")
    return {
        "Authorization": f"Bearer {api_key}",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }


def _strip_fences(raw: str) -> str:
    """Strip markdown code fences if the model wrapped its JSON output."""
    raw = raw.strip()
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)
    return raw.strip()


def _sanitise_nulls(obj):
    """
    Recursively walk the parsed dict/list and convert the literal string
    "null" (and "none", "n/a", "N/A") to Python None.
    Llama sometimes emits these as strings instead of proper JSON null.
    """
    NULL_STRINGS = {"null", "none", "n/a", "na", "undefined", ""}
    if isinstance(obj, dict):
        return {k: _sanitise_nulls(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_sanitise_nulls(v) for v in obj]
    if isinstance(obj, str) and obj.strip().lower() in NULL_STRINGS:
        return None
    return obj


def markdown_to_json(
    markdown: str,
    total_pages: int = 1,
    temperature: float = 0.1,
    max_tokens: int = 4096,
    timeout: int = 180,
) -> dict:
    """
    Convert aggregated resume Markdown into a structured Python dict.

    Args:
        markdown:    Full Markdown string (all pages concatenated).
        total_pages: Number of source pages (injected into user prompt for context).
        temperature: Sampling temperature — keep low (0.0–0.2) for determinism.
        max_tokens:  Max output tokens.
        timeout:     HTTP timeout in seconds.

    Returns:
        Parsed Python dict conforming (best-effort) to RESUME_SCHEMA.

    Raises:
        RuntimeError: if the NIM call fails or the response is not valid JSON.
    """
    user_content = (
        f"Here is the full resume text extracted from a {total_pages}-page document:\n\n"
        f"{markdown}\n\n"
        "Convert this into a single JSON object that strictly follows the schema provided."
    )

    payload = {
        "model": _MODEL,
        "messages": [
            {"role": "system", "content": _SYSTEM_PROMPT},
            {"role": "user",   "content": user_content},
        ],
        "max_tokens":   max_tokens,
        "temperature":  temperature,
        "guided_json":  RESUME_SCHEMA,   # NIM-native schema enforcement
    }

    try:
        resp = requests.post(_NVAI_URL, headers=_get_headers(), json=payload, timeout=timeout)
        resp.raise_for_status()
    except requests.HTTPError as e:
        raise RuntimeError(
            f"Llama NIM HTTP {resp.status_code}: {resp.text[:400]}"
        ) from e
    except requests.RequestException as e:
        raise RuntimeError(f"Llama NIM request failed: {e}") from e

    try:
        raw_content = resp.json()["choices"][0]["message"]["content"]
    except (KeyError, IndexError) as e:
        raise RuntimeError(f"Unexpected Llama NIM response shape: {resp.text[:400]}") from e

    cleaned = _strip_fences(raw_content)

    try:
        structured = json.loads(cleaned)
    except json.JSONDecodeError as e:
        raise RuntimeError(
            f"Llama returned non-JSON output. First 300 chars:\n{cleaned[:300]}"
        ) from e

    # Clean up "null" strings the model may emit instead of real JSON null
    structured = _sanitise_nulls(structured)

    logger.info(
        f"Llama structured extraction complete — "
        f"keys: {list(structured.keys())}, "
        f"name: {structured.get('full_name')}, "
        f"confidence: {structured.get('meta', {}).get('parse_confidence', 'n/a')}"
    )
    return structured
