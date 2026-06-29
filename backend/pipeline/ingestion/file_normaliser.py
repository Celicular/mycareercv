"""
pipeline/ingestion/file_normaliser.py
Stage 1 — Uploaded file → canonical high-resolution PNG.

Handles PDF (page 1 only, via PyMuPDF), JPEG, PNG, WEBP.
Outputs a 300 DPI RGB PNG with EXIF rotation corrected.

Usage:
    from pipeline.ingestion.file_normaliser import normalise_file

    result = normalise_file("/path/to/upload.pdf", "/tmp/ingestion/job_abc")
    # result = {
    #   "canonical_image_path": "/tmp/ingestion/job_abc/source.png",
    #   "source_width_px": 2480,
    #   "source_height_px": 3508,
    #   "source_dpi": 300,
    #   "original_format": "pdf",
    # }
"""

import logging
from pathlib import Path

import fitz  # PyMuPDF
from PIL import Image, ImageOps

logger = logging.getLogger(__name__)

# Target DPI — minimum for reliable OCR and layout detection
TARGET_DPI = 300


def normalise_file(file_path: str, work_dir: str) -> dict:
    """
    Convert the uploaded file into a canonical 300 DPI RGB PNG.

    Args:
        file_path: Absolute path to the uploaded file.
        work_dir:  Directory to write the canonical PNG into.

    Returns:
        Dict with canonical_image_path, source dimensions, DPI, and format.

    Raises:
        FileNotFoundError: if file_path does not exist.
        ValueError:        if the file type is unsupported.
    """
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"Upload not found: {file_path}")

    work = Path(work_dir)
    work.mkdir(parents=True, exist_ok=True)
    out_path = work / "source.png"

    ext = path.suffix.lower()
    original_format = ext.lstrip(".")

    if ext == ".pdf":
        img = _rasterize_pdf(str(path))
        original_format = "pdf"
    elif ext in (".jpg", ".jpeg", ".png", ".webp"):
        img = Image.open(str(path))
        # Auto-correct EXIF rotation (phones embed rotation in metadata)
        img = ImageOps.exif_transpose(img)
    else:
        raise ValueError(
            f"Unsupported file type '{ext}'. "
            "Accepted: .pdf, .jpg, .jpeg, .png, .webp"
        )

    # Convert to RGB (strip alpha channels — confuses OCR)
    if img.mode != "RGB":
        img = img.convert("RGB")

    # Resample to TARGET_DPI if below threshold
    img = _ensure_dpi(img)

    # Save canonical PNG
    img.save(str(out_path), format="PNG")

    w, h = img.size
    logger.info(
        f"[Stage 1] Normalised → {out_path.name}  "
        f"({w}×{h} px, {TARGET_DPI} DPI, from {original_format})"
    )

    return {
        "canonical_image_path": str(out_path),
        "source_width_px": w,
        "source_height_px": h,
        "source_dpi": TARGET_DPI,
        "original_format": original_format,
    }


def _rasterize_pdf(pdf_path: str) -> Image.Image:
    """Render page 1 of a PDF at TARGET_DPI using PyMuPDF."""
    try:
        doc = fitz.open(pdf_path)
    except Exception as e:
        raise RuntimeError(f"PyMuPDF failed to open '{pdf_path}': {e}") from e

    if len(doc) > 1:
        logger.warning(
            f"[Stage 1] Multi-page PDF detected ({len(doc)} pages). "
            "Only page 1 will be processed."
        )

    page = doc.load_page(0)
    matrix = fitz.Matrix(TARGET_DPI / 72, TARGET_DPI / 72)
    pix = page.get_pixmap(matrix=matrix, alpha=False)
    doc.close()

    # Convert PyMuPDF pixmap → PIL Image
    img = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
    return img


def _ensure_dpi(img: Image.Image) -> Image.Image:
    """
    Resample the image to TARGET_DPI if its current DPI is below threshold.
    For images without DPI metadata, we assume 96 DPI (screen default).
    """
    dpi_info = img.info.get("dpi", (96, 96))
    current_dpi = max(dpi_info[0], dpi_info[1]) if isinstance(dpi_info, tuple) else dpi_info

    if current_dpi >= TARGET_DPI:
        return img

    # Scale factor to reach TARGET_DPI
    scale = TARGET_DPI / current_dpi
    new_w = int(img.width * scale)
    new_h = int(img.height * scale)

    logger.info(
        f"[Stage 1] Upsampling from ~{int(current_dpi)} DPI → {TARGET_DPI} DPI  "
        f"({img.width}×{img.height} → {new_w}×{new_h})"
    )

    return img.resize((new_w, new_h), Image.LANCZOS)
