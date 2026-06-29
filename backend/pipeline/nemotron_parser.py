"""
pipeline/nemotron_parser.py
Stage 2 — Page image → Markdown via NVIDIA Nemotron-Parse NIM.

Usage (single page):
    from pipeline.nemotron_parser import extract_page_markdown

    markdown = extract_page_markdown(b64_str, "image/png", page_num=1)

Usage (whole document):
    from pipeline.nemotron_parser import extract_all_pages

    pages_md = extract_all_pages(pages)  # pages = output of rasterize_pdf()
    full_md  = "\n\n".join(pages_md)
"""

import json
import logging
import os

import requests
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# ── NIM endpoint & auth ───────────────────────────────────────────────────────
_NVAI_URL = "https://integrate.api.nvidia.com/v1/chat/completions"
_MODEL    = "nvidia/nemotron-parse"
_TOOL     = "markdown_no_bbox"   # clean Markdown, no bounding-box JSON noise

# System prompt (as refined in the project system-prompts file)
_SYSTEM_PROMPT = (
    "You are a document extraction engine. Your only job is to faithfully extract "
    "all text content from the provided resume image.\n\n"
    "Rules:\n"
    "- Preserve the original section headings exactly as written.\n"
    "- Output clean Markdown. Use ## for section headers, bullet points (-) for "
    "list items, and pipe tables only if the source uses a table layout.\n"
    "- Do NOT summarise, rephrase, infer, or add anything not present in the image.\n"
    "- Preserve all dates, numbers, URLs, and proper nouns exactly as they appear.\n"
    "- Maintain reading order: top-to-bottom, left-to-right, multi-column aware.\n"
    "- If a region is unclear or unreadable, write [UNREADABLE] in its place.\n"
    "- Output only the Markdown content — no preamble, no commentary."
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


def extract_page_markdown(
    b64: str,
    mime: str,
    page_num: int = 1,
    timeout: int = 120,
) -> str:
    """
    Send a single page image to Nemotron-Parse and return its Markdown.

    Args:
        b64:      Base64-encoded image string.
        mime:     MIME type, e.g. "image/png".
        page_num: 1-indexed page number (used only for logging/error messages).
        timeout:  HTTP request timeout in seconds.

    Returns:
        Extracted Markdown string. Returns "[EXTRACTION_FAILED]" on error
        instead of raising, so the pipeline can continue with remaining pages.
    """
    # Nemotron-Parse requires:
    #   - EXACTLY ONE user message
    #   - content as a structured array (NOT a plain string)
    #   - image-only input; the tool choice (markdown_no_bbox) IS the instruction
    payload = {
        "model": _MODEL,
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{mime};base64,{b64}"
                        }
                    }
                ]
            }
        ],
        "tools": [{"type": "function", "function": {"name": _TOOL}}],
        "tool_choice": {"type": "function", "function": {"name": _TOOL}},
        "max_tokens": 8192,
    }

    try:
        resp = requests.post(_NVAI_URL, headers=_get_headers(), json=payload, timeout=timeout)
        resp.raise_for_status()
        data = resp.json()

        choices = data.get("choices", [])
        if not choices:
            logger.warning(f"Page {page_num}: empty choices from Nemotron-Parse")
            return f"[EMPTY_RESPONSE page={page_num}]"

        msg        = choices[0].get("message", {})
        tool_calls = msg.get("tool_calls", [])

        if tool_calls:
            raw = tool_calls[0].get("function", {}).get("arguments", "")
            # Model sometimes returns {"markdown": "..."} or {"content": "..."}
            try:
                parsed = json.loads(raw)
                if isinstance(parsed, dict):
                    return parsed.get("markdown") or parsed.get("content") or str(parsed)
                return str(parsed)
            except json.JSONDecodeError:
                return raw  # already raw Markdown

        # Fallback: plain content field
        return msg.get("content", f"[NO_CONTENT page={page_num}]")

    except requests.HTTPError as e:
        logger.error(f"Page {page_num}: Nemotron HTTP {resp.status_code} — {resp.text[:200]}")
        return f"[EXTRACTION_FAILED page={page_num}]"
    except requests.RequestException as e:
        logger.error(f"Page {page_num}: Nemotron request error — {e}")
        return f"[EXTRACTION_FAILED page={page_num}]"


def extract_all_pages(
    pages: list[dict],
    timeout: int = 120,
) -> list[str]:
    """
    Run extract_page_markdown for every page produced by rasterize_pdf().

    Args:
        pages:   Output of pdf_rasterizer.rasterize_pdf().
        timeout: Per-page request timeout.

    Returns:
        List of Markdown strings, one per page (in order).
    """
    markdowns = []
    for pg in pages:
        logger.info(f"Extracting page {pg['page']}/{len(pages)} via Nemotron-Parse …")
        md = extract_page_markdown(pg["b64"], pg["mime"], pg["page"], timeout=timeout)
        markdowns.append(md)
        logger.info(f"Page {pg['page']} → {len(md):,} chars extracted")
    return markdowns
