"""
pipeline/ingestion/ingestion_pipeline.py
Orchestrator — chains Stages 1→6 sequentially.

Runs the full template ingestion pipeline in a background thread,
reports progress via an in-memory job store.

Usage:
    from pipeline.ingestion.ingestion_pipeline import run_ingestion_pipeline, get_job_status

    job_id = run_ingestion_pipeline("/path/to/uploaded.png")
    status = get_job_status(job_id)
"""

import logging
import threading
import time
import uuid
from pathlib import Path

from pipeline.ingestion.file_normaliser import normalise_file
from pipeline.ingestion.layout_detector import detect_layout
from pipeline.ingestion.ocr_extractor import extract_visual_properties
from pipeline.ingestion.binding_inferrer import infer_bindings
from pipeline.ingestion.coord_mapper import map_coordinates
from pipeline.ingestion.fabric_assembler import assemble_fabric_json

logger = logging.getLogger(__name__)

# ── In-memory job store ──────────────────────────────────────────────────────
# Key: job_id (str) → value: dict with status, progress, etc.
_jobs: dict[str, dict] = {}
_lock = threading.Lock()

# Stage labels for progress reporting
_STAGES = [
    {"id": "normalising", "label": "Normalising image…", "progress": 0.05},
    {"id": "detecting", "label": "Detecting layout…", "progress": 0.20},
    {"id": "extracting", "label": "Reading text & colours…", "progress": 0.45},
    {"id": "inferring", "label": "Inferring bindings…", "progress": 0.70},
    {"id": "mapping", "label": "Mapping coordinates…", "progress": 0.85},
    {"id": "assembling", "label": "Assembling template…", "progress": 0.95},
]


def run_ingestion_pipeline(file_path: str) -> str:
    """
    Start the ingestion pipeline in a background thread.

    Args:
        file_path: Absolute path to the uploaded file.

    Returns:
        job_id: Unique ID to poll for status and retrieve results.
    """
    job_id = str(uuid.uuid4())[:8]

    with _lock:
        _jobs[job_id] = {
            "status": "pending",
            "progress": 0.0,
            "current_stage": "queued",
            "stage_label": "Starting pipeline…",
            "error": None,
            "result": None,
            "started_at": time.time(),
        }

    # Run pipeline in background thread
    thread = threading.Thread(
        target=_run_pipeline,
        args=(job_id, file_path),
        daemon=True,
    )
    thread.start()

    logger.info(f"[ingestion_pipeline] Started job {job_id} for {file_path}")
    return job_id


def get_job_status(job_id: str) -> dict | None:
    """Get the current status of an ingestion job."""
    with _lock:
        job = _jobs.get(job_id)
        if job:
            return {
                "status": job["status"],
                "progress": job["progress"],
                "current_stage": job["current_stage"],
                "stage_label": job["stage_label"],
                "error": job["error"],
            }
    return None


def get_job_result(job_id: str) -> dict | None:
    """Get the result of a completed ingestion job."""
    with _lock:
        job = _jobs.get(job_id)
        if job and job["status"] == "complete":
            return job["result"]
    return None


def _update_job(job_id: str, **kwargs):
    """Thread-safe job status update."""
    with _lock:
        if job_id in _jobs:
            _jobs[job_id].update(kwargs)


def _run_pipeline(job_id: str, file_path: str):
    """Execute the full pipeline in a background thread."""
    try:
        work_dir = str(Path(file_path).parent / f"ingestion_{job_id}")

        # ── Stage 1: File Normalisation ──────────────────────────────────
        _update_stage(job_id, 0)
        stage1 = normalise_file(file_path, work_dir)

        # ── Stage 2: Layout Detection ───────────────────────────────────
        _update_stage(job_id, 1)
        elements = detect_layout(
            stage1["canonical_image_path"],
            stage1["source_width_px"],
            stage1["source_height_px"],
        )

        if not elements:
            _update_job(
                job_id,
                status="failed",
                error="No layout detected. Ensure the image is clear and right-side up.",
            )
            return

        # ── Stage 3: OCR + Visual Property Extraction ───────────────────
        _update_stage(job_id, 2)
        elements, background_hex = extract_visual_properties(
            elements,
            stage1["canonical_image_path"],
            stage1["source_width_px"],
            stage1["source_height_px"],
        )

        # ── Stage 4: Binding Inference ──────────────────────────────────
        _update_stage(job_id, 3)
        elements, instance_counts = infer_bindings(
            elements,
            stage1["canonical_image_path"],
            stage1["source_width_px"],
            stage1["source_height_px"],
        )

        # ── Stage 5: Coordinate Mapping ────────────────────────────────
        _update_stage(job_id, 4)
        elements = map_coordinates(
            elements,
            stage1["source_width_px"],
            stage1["source_height_px"],
            stage1["source_dpi"],
        )

        # ── Stage 6: fabric_json Assembly ──────────────────────────────
        _update_stage(job_id, 5)
        result = assemble_fabric_json(elements, instance_counts, background_hex)

        # ── Done ───────────────────────────────────────────────────────
        _update_job(
            job_id,
            status="complete",
            progress=1.0,
            current_stage="complete",
            stage_label="Template ready!",
            result=result,
        )

        elapsed = time.time() - _jobs[job_id]["started_at"]
        logger.info(
            f"[ingestion_pipeline] Job {job_id} complete in {elapsed:.1f}s. "
            f"Elements: {len(elements)}, Flagged: {len(result['flagged_elements'])}"
        )

    except Exception as e:
        logger.exception(f"[ingestion_pipeline] Job {job_id} failed: {e}")
        _update_job(
            job_id,
            status="failed",
            error=str(e),
        )


def _update_stage(job_id: str, stage_idx: int):
    """Update job status to a specific pipeline stage."""
    stage = _STAGES[stage_idx]
    _update_job(
        job_id,
        status="processing",
        progress=stage["progress"],
        current_stage=stage["id"],
        stage_label=stage["label"],
    )
    logger.info(f"[ingestion_pipeline] Job {job_id} → {stage['label']}")
