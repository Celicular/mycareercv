"""
pipeline/resume_pipeline.py
Orchestrator — PDF file → structured JSON.

This is the *only* place where stages are chained together.
Each stage is imported from its own module and can be replaced independently.

Stages:
    1. pdf_rasterizer    → pages as base64 images
    2. nemotron_parser   → Markdown per page
    3. llama_structurer  → structured JSON dict
    4. schema_validator  → validates / warns
    5. json_store        → saves JSON to disk

Public API:
    from pipeline.resume_pipeline import process_resume

    result = process_resume("/path/to/upload-xyz.pdf")
    # result = {
    #   "resume":      { ...structured dict... },
    #   "json_path":   "/abs/path/to/json/upload-xyz.json",
    #   "total_pages": 2,
    #   "valid":       True,
    #   "warnings":    [],
    # }
"""

import logging
from pathlib import Path

from pipeline.pdf_rasterizer   import rasterize_pdf
from pipeline.nemotron_parser  import extract_all_pages
from pipeline.llama_structurer import markdown_to_json
from pipeline.schema_validator import validate_resume_json
from pipeline.json_store       import save_resume_json
from pipeline.ats_checker      import analyze_ats_compliance
import fitz  # PyMuPDF

logger = logging.getLogger(__name__)

def check_ats(file_path: str) -> dict:
    """
    Analyzes a PDF resume for ATS compliance.
    """
    ext = Path(file_path).suffix.lower()
    if ext != ".pdf":
        raise NotImplementedError("ATS Checker only supports PDF files.")
        
    logger.info(f"[ATS Checker] START -> {file_path}")
    
    # 1. Quick pass: check for hidden verification flag
    force_verified = False
    try:
        doc = fitz.open(file_path)
        for page in doc:
            text = page.get_text()
            if "MYCAREERCV_VERIFIED_TEMPLATE" in text:
                logger.info("[ATS Checker] Found verified template flag!")
                force_verified = True
                break
        doc.close()
    except Exception as e:
        logger.error(f"[ATS Checker] Failed to read PDF text natively: {e}")
        
    # 2. Rasterize & Extract Markdown
    logger.info("[ATS Checker] Extracting Markdown...")
    pages = rasterize_pdf(file_path)
    page_markdowns = extract_all_pages(pages)
    full_markdown = "\n\n".join(page_markdowns)
    
    # 3. Analyze with LLM
    logger.info("[ATS Checker] Analyzing with LLM...")
    result = analyze_ats_compliance(full_markdown, force_verified=force_verified)
    
    return result


def process_resume(file_path: str) -> dict:
    """
    Run the full PDF → structured JSON pipeline.

    Args:
        file_path: Absolute path to an uploaded PDF file.

    Returns:
        {
            "resume":      dict,   # structured resume data
            "json_path":   str,    # path where JSON was saved
            "total_pages": int,
            "valid":       bool,   # schema validation result
            "warnings":    list,   # validation warning messages
        }

    Raises:
        FileNotFoundError:   if the PDF does not exist.
        NotImplementedError: if a non-PDF is passed (DOCX support is future work).
        RuntimeError:        if Llama extraction fails.
    """
    ext = Path(file_path).suffix.lower()
    if ext != ".pdf":
        raise NotImplementedError(
            f"resume_pipeline only supports PDF files (got '{ext}'). "
            "DOCX support will be added in a future pipeline module."
        )

    logger.info(f"[resume_pipeline] START  → {file_path}")

    # ── Stage 1: Rasterize ────────────────────────────────────────────────
    logger.info("[Stage 1] Rasterizing PDF …")
    pages = rasterize_pdf(file_path)
    total_pages = len(pages)

    # ── Stage 2: Extract Markdown per page ───────────────────────────────
    logger.info(f"[Stage 2] Running Nemotron-Parse on {total_pages} page(s) …")
    page_markdowns = extract_all_pages(pages)
    full_markdown = "\n\n".join(
        f"<!-- Page {i + 1} -->\n{md}"
        for i, md in enumerate(page_markdowns)
    )
    logger.info(f"[Stage 2] Total extracted markdown: {len(full_markdown):,} chars")

    # ── Stage 3: Markdown → structured JSON (Llama) ──────────────────────
    logger.info("[Stage 3] Structuring with Llama 3.1-8B …")
    structured = markdown_to_json(full_markdown, total_pages=total_pages)

    # Ensure meta.total_pages is always set
    structured.setdefault("meta", {})
    if not structured["meta"].get("total_pages"):
        structured["meta"]["total_pages"] = total_pages

    # ── Stage 4: Validate ─────────────────────────────────────────────────
    logger.info("[Stage 4] Validating against RESUME_SCHEMA …")
    result = validate_resume_json(structured, strict=False)
    if result.valid:
        logger.info("[Stage 4] Validation passed ✓")
    else:
        logger.warning(f"[Stage 4] Validation warnings: {result.errors}")

    # ── Stage 5: Persist JSON ─────────────────────────────────────────────
    logger.info("[Stage 5] Saving JSON to disk …")
    json_path = save_resume_json(result.data, file_path)

    logger.info(f"[resume_pipeline] DONE  → {json_path}")

    return {
        "resume":      result.data,
        "json_path":   json_path,
        "total_pages": total_pages,
        "valid":       result.valid,
        "warnings":    result.errors,
    }
