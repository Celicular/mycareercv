"""
pipeline/json_store.py
Stage 5 — Persist the structured resume JSON to disk.

Storage convention:
    uploads/<user_id>/json/<upload_stem>.json

Usage:
    from pipeline.json_store import save_resume_json

    json_path = save_resume_json(structured_dict, "/path/to/upload-20240623-abc.pdf")
"""

import json
import logging
from pathlib import Path

logger = logging.getLogger(__name__)


def save_resume_json(resume_data: dict, upload_path: str) -> str:
    """
    Write the structured resume dict as JSON next to the uploaded file,
    inside a `json/` sub-directory.

    Args:
        resume_data: Validated (or best-effort) structured resume dict.
        upload_path: Absolute path to the uploaded file, e.g.
                     ".../uploads/3/upload-20240623123456-abc12345.pdf"

    Returns:
        Absolute path of the written JSON file.

    Example output path:
        .../uploads/3/json/upload-20240623123456-abc12345.json
    """
    upload_p  = Path(upload_path)
    json_dir  = upload_p.parent / "json"
    json_dir.mkdir(parents=True, exist_ok=True)

    json_path = json_dir / (upload_p.stem + ".json")

    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(resume_data, f, ensure_ascii=False, indent=2)

    logger.info(f"Resume JSON saved → {json_path}  ({json_path.stat().st_size:,} bytes)")
    return str(json_path)


def load_resume_json(upload_path: str) -> dict | None:
    """
    Load a previously-saved resume JSON given the original upload path.
    Returns None if the JSON file does not exist yet.
    """
    upload_p  = Path(upload_path)
    json_path = upload_p.parent / "json" / (upload_p.stem + ".json")

    if not json_path.exists():
        return None

    with open(json_path, "r", encoding="utf-8") as f:
        return json.load(f)
