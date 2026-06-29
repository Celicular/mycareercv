"""
routers/cover_letter_router.py
FastAPI router for cover letter management.

Endpoints:
  POST /api/cover-letter/upload       — upload & parse a new resume for cover letter use
  POST /api/cover-letter/generate     — run full 6-step AI pipeline and save to DB
  GET  /api/cover-letter/             — list user's cover letters
  GET  /api/cover-letter/{id}         — fetch a single cover letter
  DELETE /api/cover-letter/{id}       — delete a cover letter
"""

import json as json_lib
import logging
import os
import uuid
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, Request, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

import auth as auth_utils
import database
import models
from jose import JWTError, jwt
from pipeline.resume_pipeline import process_resume
from pipeline.cover_letter_pipeline import generate_cover_letter

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/cover-letter", tags=["cover_letter"])

UPLOAD_DIR = Path(__file__).parent.parent / "uploads"
ALLOWED_TYPES = {
    "application/pdf": ".pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
}
MAX_SIZE_BYTES = 2 * 1024 * 1024  # 2 MB


# ── Auth helper (same pattern as resume_router) ───────────────────────────────
def get_user_from_token(token: str, db: Session) -> models.User:
    try:
        payload = jwt.decode(token, auth_utils.SECRET_KEY, algorithms=[auth_utils.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = db.query(models.User).filter(models.User.id == int(user_id)).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def _auth(request: Request, db: Session) -> models.User:
    return auth_utils.get_user_from_request(request, db)


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/cover-letter/upload
# Upload a resume file specifically for use in cover letter generation.
# Files are stored at uploads/{user_id}/coveruploads/
# ─────────────────────────────────────────────────────────────────────────────
def _run_cover_upload_pipeline(file_path: str) -> None:
    """Background task — runs the resume parsing pipeline on the uploaded file."""
    try:
        result = process_resume(file_path)
        logger.info(f"[CoverLetter Upload] Pipeline done → {result['json_path']}")
    except NotImplementedError as e:
        logger.warning(f"[CoverLetter Upload] Pipeline skipped: {e}")
    except Exception as e:
        logger.error(f"[CoverLetter Upload] Pipeline FAILED for {file_path}: {e}", exc_info=True)


@router.post("/upload")
async def upload_resume_for_cover_letter(
    request: Request,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(database.get_db),
):
    """
    Upload a resume file to be parsed for cover letter generation.
    Files stored in uploads/{user_id}/coveruploads/
    JSON output stored in uploads/{user_id}/coveruploads/json/
    """
    user = _auth(request, db)

    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Only PDF or DOCX files are supported.")

    contents = await file.read()
    if len(contents) > MAX_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="File must be under 2 MB.")

    ext = ALLOWED_TYPES[file.content_type]
    timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    short_id = uuid.uuid4().hex[:8]
    safe_filename = f"cover-upload-{timestamp}-{short_id}{ext}"

    # Store in coveruploads subdirectory — separate from main resume uploads
    cover_upload_dir = UPLOAD_DIR / str(user.id) / "coveruploads"
    cover_upload_dir.mkdir(parents=True, exist_ok=True)
    file_path = cover_upload_dir / safe_filename

    with open(file_path, "wb") as f:
        f.write(contents)

    logger.info(f"[CoverLetter Upload] Saved: {file_path}")

    if ext == ".pdf":
        background_tasks.add_task(_run_cover_upload_pipeline, str(file_path))

    return {
        "message": "Resume uploaded for cover letter. Processing started.",
        "filename": safe_filename,
        "user_id": user.id,
        "size_bytes": len(contents),
        "processing": ext == ".pdf",
        "type": "cover_upload",
    }


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/cover-letter/status/{user_id}/{filename}
# Poll for cover-upload pipeline completion
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/status/{user_id}/{filename}")
async def get_cover_upload_status(
    user_id: int,
    filename: str,
    request: Request,
    db: Session = Depends(database.get_db),
):
    user = _auth(request, db)
    if user.id != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    stem = Path(filename).stem
    # JSON is saved to coveruploads/json/ by the pipeline's json_store
    json_path = UPLOAD_DIR / str(user_id) / "coveruploads" / "json" / f"{stem}.json"

    if json_path.exists():
        return {"status": "complete"}
    return {"status": "processing"}


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/cover-letter/load/{user_id}/{filename}
# Load parsed JSON from a cover-upload
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/load/{user_id}/{filename:path}")
async def load_cover_upload_resume(
    user_id: int,
    filename: str,
    request: Request,
    db: Session = Depends(database.get_db),
):
    user = _auth(request, db)
    if user.id != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    stem = os.path.splitext(filename)[0]
    json_path = UPLOAD_DIR / str(user_id) / "coveruploads" / "json" / f"{stem}.json"

    if not json_path.exists():
        raise HTTPException(status_code=404, detail="Parsed resume not found for this cover upload")

    with open(json_path, "r", encoding="utf-8") as f:
        data = json_lib.load(f)
    return data


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/cover-letter/generate
# ─────────────────────────────────────────────────────────────────────────────
class GenerateRequest(BaseModel):
    document_name:    str = Field(default="Untitled Cover Letter")
    job_description:  str = Field(..., min_length=50)
    preferences:      dict = Field(default_factory=dict)
    # Provide exactly ONE of the two below
    source_resume_id: int | None = None      # use an existing DB resume
    resume_json:      dict | None = None     # pass the JSON directly (from cover-upload flow)
    resume_file_url:  str | None = None      # relative path to the uploaded cover file


@router.post("/generate")
async def generate_cover_letter_endpoint(
    payload: GenerateRequest,
    request: Request,
    db: Session = Depends(database.get_db),
):
    """
    Run the full 6-step AI cover letter generation pipeline.
    Either source_resume_id (existing resume) or resume_json (newly uploaded) must be provided.
    """
    user = _auth(request, db)

    # ── Resolve the resume JSON ───────────────────────────────────────────────
    resume_json_used = None
    resume_json_url_stored = None
    source_resume_id = None

    if payload.source_resume_id is not None:
        # Load the JSON from the existing resume's json_url
        resume_db = db.query(models.Resume).filter(
            models.Resume.id == payload.source_resume_id,
            models.Resume.user_id == user.id
        ).first()
        if not resume_db:
            raise HTTPException(status_code=404, detail="Resume not found or does not belong to you")

        json_path = Path(__file__).parent.parent / resume_db.json_url.lstrip("/")
        if not json_path.exists():
            raise HTTPException(status_code=404, detail="Resume JSON file not found on disk")

        with open(json_path, "r", encoding="utf-8") as f:
            resume_json_used = json_lib.load(f)

        source_resume_id = payload.source_resume_id
        resume_json_url_stored = resume_db.json_url

    elif payload.resume_json is not None:
        # Resume JSON was passed directly from the upload-then-parse flow
        resume_json_used = payload.resume_json
        resume_json_url_stored = payload.resume_file_url  # optional reference

    else:
        raise HTTPException(
            status_code=400,
            detail="Must provide either source_resume_id or resume_json"
        )

    # ── Run the pipeline ──────────────────────────────────────────────────────
    try:
        result = generate_cover_letter(
            resume_json=resume_json_used,
            job_description=payload.job_description,
            preferences=payload.preferences,
        )
    except RuntimeError as e:
        logger.error(f"Cover letter pipeline failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"AI pipeline error: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error in cover letter generation: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Cover letter generation failed unexpectedly")

    # ── Persist to DB ─────────────────────────────────────────────────────────
    cover_letter_db = models.CoverLetter(
        user_id              = user.id,
        document_name        = payload.document_name,
        source_resume_id     = source_resume_id,
        resume_file_url      = payload.resume_file_url,
        resume_json_url      = resume_json_url_stored,
        job_description      = payload.job_description,
        preferences          = payload.preferences,
        analyzer_output      = result["analyzer_output"],
        jd_analysis          = result["jd_analysis"],
        match_results        = result["match_results"],
        content_plan         = result["content_plan"],
        cover_letter_json    = result["cover_letter_json"],
        quality_score        = result["quality_score"],
        word_count           = result["word_count"],
        matched_skills       = result["matched_skills"],
        projects_used        = result["projects_used"],
    )
    db.add(cover_letter_db)
    db.commit()
    db.refresh(cover_letter_db)

    logger.info(f"[CoverLetter] Saved to DB — id: {cover_letter_db.id}, score: {result['quality_score']}")

    return {
        "id":                cover_letter_db.id,
        "document_name":     cover_letter_db.document_name,
        "cover_letter_json": result["cover_letter_json"],
        "word_count":        result["word_count"],
        "quality_score":     result["quality_score"],
        "matched_skills":    result["matched_skills"],
        "projects_used":     result["projects_used"],
        "created_at":        cover_letter_db.created_at.isoformat() if cover_letter_db.created_at else None,
    }


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/cover-letter/
# List all cover letters for the authenticated user
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/")
async def list_cover_letters(
    request: Request,
    db: Session = Depends(database.get_db),
):
    user = _auth(request, db)
    letters = (
        db.query(models.CoverLetter)
        .filter(models.CoverLetter.user_id == user.id)
        .order_by(models.CoverLetter.created_at.desc())
        .all()
    )
    return [
        {
            "id":            cl.id,
            "document_name": cl.document_name,
            "quality_score": cl.quality_score,
            "word_count":    cl.word_count,
            "matched_skills": cl.matched_skills,
            "created_at":    cl.created_at.isoformat() if cl.created_at else None,
            "updated_at":    cl.updated_at.isoformat() if cl.updated_at else None,
        }
        for cl in letters
    ]


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/cover-letter/{cover_letter_id}
# Fetch a single cover letter with full details
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/{cover_letter_id}")
async def get_cover_letter(
    cover_letter_id: int,
    request: Request,
    db: Session = Depends(database.get_db),
):
    user = _auth(request, db)
    cl = db.query(models.CoverLetter).filter(
        models.CoverLetter.id == cover_letter_id,
        models.CoverLetter.user_id == user.id
    ).first()
    if not cl:
        raise HTTPException(status_code=404, detail="Cover letter not found")

    return {
        "id":                 cl.id,
        "document_name":      cl.document_name,
        "source_resume_id":   cl.source_resume_id,
        "cover_letter_json":  cl.cover_letter_json,
        "job_description":    cl.job_description,
        "preferences":        cl.preferences,
        "quality_score":      cl.quality_score,
        "word_count":         cl.word_count,
        "matched_skills":     cl.matched_skills,
        "projects_used":      cl.projects_used,
        "analyzer_output":    cl.analyzer_output,
        "jd_analysis":        cl.jd_analysis,
        "match_results":      cl.match_results,
        "content_plan":       cl.content_plan,
        "created_at":         cl.created_at.isoformat() if cl.created_at else None,
        "updated_at":         cl.updated_at.isoformat() if cl.updated_at else None,
    }


# ─────────────────────────────────────────────────────────────────────────────
# DELETE /api/cover-letter/{cover_letter_id}
# ─────────────────────────────────────────────────────────────────────────────
@router.delete("/{cover_letter_id}")
async def delete_cover_letter(
    cover_letter_id: int,
    request: Request,
    db: Session = Depends(database.get_db),
):
    user = _auth(request, db)
    cl = db.query(models.CoverLetter).filter(
        models.CoverLetter.id == cover_letter_id,
        models.CoverLetter.user_id == user.id
    ).first()
    if not cl:
        raise HTTPException(status_code=404, detail="Cover letter not found")

    db.delete(cl)
    db.commit()
    return {"message": "Cover letter deleted successfully"}
