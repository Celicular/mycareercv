"""
pipeline/pdf_rasterizer.py
Stage 1 — PDF → list of base64-encoded page images.

Usage:
    from pipeline.pdf_rasterizer import rasterize_pdf

    pages = rasterize_pdf("/path/to/resume.pdf", dpi=150)
    # pages = [{"page": 1, "b64": "...", "mime": "image/png"}, ...]
"""

import base64
import logging
from pathlib import Path

import fitz  # PyMuPDF

logger = logging.getLogger(__name__)


def rasterize_pdf(pdf_path: str, dpi: int = 150) -> list[dict]:
    """
    Convert every page of a PDF into a PNG image encoded as base64.

    Args:
        pdf_path: Absolute path to the PDF file.
        dpi:      Rendering resolution. 150 is a good balance between
                  quality and token count for vision models.

    Returns:
        List of dicts, one per page:
            {
                "page": int,   # 1-indexed
                "b64":  str,   # base64-encoded PNG
                "mime": str,   # "image/png"
            }

    Raises:
        FileNotFoundError: if pdf_path does not exist.
        RuntimeError:      if PyMuPDF fails to open the document.
    """
    path = Path(pdf_path)
    if not path.exists():
        raise FileNotFoundError(f"PDF not found: {pdf_path}")

    try:
        doc = fitz.open(str(path))
    except Exception as e:
        raise RuntimeError(f"PyMuPDF failed to open '{pdf_path}': {e}") from e

    matrix = fitz.Matrix(dpi / 72, dpi / 72)
    pages = []

    for idx in range(len(doc)):
        page = doc.load_page(idx)
        pix = page.get_pixmap(matrix=matrix, alpha=False)
        png_bytes = pix.tobytes("png")
        b64 = base64.b64encode(png_bytes).decode("ascii")
        pages.append({"page": idx + 1, "b64": b64, "mime": "image/png"})
        logger.debug(f"Rasterized page {idx + 1}/{len(doc)} ({len(png_bytes):,} bytes)")

    doc.close()
    logger.info(f"Rasterized {len(pages)} page(s) from '{path.name}' at {dpi} DPI")
    return pages
