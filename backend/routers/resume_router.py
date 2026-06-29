import uuid
import logging
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Request, BackgroundTasks
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from pydantic import BaseModel

import database, models
import auth as auth_utils
from pipeline.resume_pipeline import process_resume, check_ats
from pipeline.ats_rewriter import rewrite_text_for_ats, grammar_check_text
import time

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/resume", tags=["resume"])

UPLOAD_DIR = Path(__file__).parent.parent / "uploads"

ALLOWED_TYPES = {
    "application/pdf": ".pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
}
MAX_SIZE_BYTES = 2 * 1024 * 1024  # 2 MB

# Simple in-memory rate limiting for ATS Checker (guest accessible)
ATS_RATE_LIMITS = {}

def check_ats_rate_limit(request: Request, limit: int = 5, window_seconds: int = 3600):
    client_ip = request.client.host if request.client else "unknown"
    now = time.time()
    
    if client_ip not in ATS_RATE_LIMITS:
        ATS_RATE_LIMITS[client_ip] = []
        
    # filter old requests
    ATS_RATE_LIMITS[client_ip] = [req_time for req_time in ATS_RATE_LIMITS[client_ip] if now - req_time < window_seconds]
    
    if len(ATS_RATE_LIMITS[client_ip]) >= limit:
        raise HTTPException(status_code=429, detail="Rate limit exceeded. Please try again later or log in.")
        
    ATS_RATE_LIMITS[client_ip].append(now)

class RewriteRequest(BaseModel):
    text: str

class GrammarCheckRequest(BaseModel):
    text: str


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


def _run_pipeline(file_path: str) -> None:
    """Runs the full processing pipeline as a background task."""
    try:
        result = process_resume(file_path)
        logger.info(f"Pipeline complete → {result['json_path']}")
    except NotImplementedError as e:
        logger.warning(f"Pipeline skipped: {e}")
    except Exception as e:
        logger.error(f"Pipeline FAILED for {file_path}: {e}", exc_info=True)


# ── POST /api/resume/check-ats ────────────────────────────────────────────────
@router.post("/check-ats")
async def check_ats_endpoint(
    request: Request,
    file: UploadFile = File(...),
):
    # Apply rate limiting for guests (5 requests per hour)
    check_ats_rate_limit(request, limit=5, window_seconds=3600)
    
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are supported for ATS Checker.")

    contents = await file.read()
    if len(contents) > MAX_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="File must be under 2 MB.")

    timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    short_id = uuid.uuid4().hex[:8]
    safe_filename = f"ats-check-{timestamp}-{short_id}.pdf"

    # Save to a temporary folder
    temp_folder = UPLOAD_DIR / "temp"
    temp_folder.mkdir(parents=True, exist_ok=True)
    file_path = temp_folder / safe_filename

    with open(file_path, "wb") as f:
        f.write(contents)

    logger.info(f"Saved ATS upload: {file_path}")

    try:
        result = check_ats(str(file_path))
        return result
    except Exception as e:
        logger.error(f"ATS check failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to process resume for ATS compliance.")



# ── POST /api/resume/upload ───────────────────────────────────────────────────
@router.post("/upload")
async def upload_resume(
    request: Request,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(database.get_db),
):
    # Auth
    user = auth_utils.get_user_from_request(request, db)

    # Validate type
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Only PDF or DOCX files are supported.")

    # Read & validate size
    contents = await file.read()
    if len(contents) > MAX_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="File must be under 2 MB.")

    # Build filename: upload-<timestamp>-<uuid8><ext>
    ext = ALLOWED_TYPES[file.content_type]
    timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    short_id = uuid.uuid4().hex[:8]
    safe_filename = f"upload-{timestamp}-{short_id}{ext}"

    # Save raw file
    user_folder = UPLOAD_DIR / str(user.id)
    user_folder.mkdir(parents=True, exist_ok=True)
    file_path = user_folder / safe_filename

    with open(file_path, "wb") as f:
        f.write(contents)

    logger.info(f"Saved upload: {file_path}")

    # Kick off pipeline in background (PDF only; DOCX future)
    if ext == ".pdf":
        background_tasks.add_task(_run_pipeline, str(file_path))

    return {
        "message": "Resume uploaded. Processing started.",
        "filename": safe_filename,
        "user_id": user.id,
        "size_bytes": len(contents),
        "processing": ext == ".pdf",
    }


# ── POST /api/resume/upload-photo ─────────────────────────────────────────────
@router.post("/upload-photo")
async def upload_photo(
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(database.get_db),
):
    # Auth
    user = auth_utils.get_user_from_request(request, db)

    # Validate type
    allowed_photo_types = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}
    if file.content_type not in allowed_photo_types:
        raise HTTPException(status_code=400, detail="Only JPG, PNG or WEBP files are supported.")

    # Read & validate size (e.g. 5MB max for photos)
    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Photo must be under 5 MB.")

    ext = allowed_photo_types[file.content_type]
    short_id = uuid.uuid4().hex[:8]
    safe_filename = f"photo-{short_id}{ext}"

    # Save raw file
    photo_folder = UPLOAD_DIR / str(user.id) / "photos"
    photo_folder.mkdir(parents=True, exist_ok=True)
    file_path = photo_folder / safe_filename

    with open(file_path, "wb") as f:
        f.write(contents)

    logger.info(f"Saved photo: {file_path}")

    # Return URL starting from /uploads/
    return {
        "url": f"/uploads/{user.id}/photos/{safe_filename}"
    }


# ── GET /api/resume/status/{user_id}/{filename} ───────────────────────────────
@router.get("/status/{user_id}/{filename}")
async def get_resume_status(
    user_id: int,
    filename: str,
    request: Request,
    db: Session = Depends(database.get_db),
):
    """
    Poll for pipeline completion.
    The pipeline writes a JSON file when done — its existence signals completion.
    Returns: {"status": "processing"} | {"status": "complete"}
    """
    user = auth_utils.get_user_from_request(request, db)

    if user.id != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    stem = Path(filename).stem
    json_path = UPLOAD_DIR / str(user_id) / "json" / f"{stem}.json"

    if json_path.exists():
        return {"status": "complete"}
    return {"status": "processing"}


# ── GET /api/resume/load/{user_id}/{filename} ─────────────────────────────────
@router.get("/load/{user_id}/{filename:path}")
async def load_parsed_resume(
    user_id: int,
    filename: str,
    request: Request,
    db: Session = Depends(database.get_db),
):
    """
    Return the parsed JSON for a previously uploaded resume.
    Used to pre-populate the resume builder form after pipeline completion.
    The `filename` parameter should be the *stem* of the upload file (no extension),
    e.g. "upload-20260622223059-4dbdec71".
    """
    user = auth_utils.get_user_from_request(request, db)

    if user.id != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    # Strip any extension the client may have sent (e.g. .pdf or .docx)
    import os
    stem = os.path.splitext(filename)[0]
    json_path = UPLOAD_DIR / str(user_id) / "json" / f"{stem}.json"

    if not json_path.exists():
        raise HTTPException(status_code=404, detail="Parsed resume not found")

    import json as json_lib
    with open(json_path, "r", encoding="utf-8") as f:
        data = json_lib.load(f)

    return data


# ── GET /api/resume/ ──────────────────────────────────────────────────────────
@router.get("/")
async def list_resumes(
    request: Request,
    db: Session = Depends(database.get_db),
):
    """
    List all resumes for the authenticated user.
    """
    user = auth_utils.get_user_from_request(request, db)

    resumes = db.query(models.Resume).filter(models.Resume.user_id == user.id).order_by(models.Resume.created_at.desc()).all()
    
    return [
        {
            "id": r.id,
            "document_name": r.document_name,
            "original_upload_filename": r.original_upload_filename,
            "template_id": r.template_id,
            "json_url": r.json_url,
            "canvas_json_url": r.canvas_json_url,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "updated_at": r.updated_at.isoformat() if r.updated_at else None,
        }
        for r in resumes
    ]


# ── GET /api/resume/{resume_id} ───────────────────────────────────────────────
@router.get("/{resume_id}")
async def get_single_resume(
    resume_id: int,
    request: Request,
    db: Session = Depends(database.get_db),
):
    """
    Fetch a single resume by its database ID, including the canvas_json_url.
    """
    user = auth_utils.get_user_from_request(request, db)

    resume = db.query(models.Resume).filter(models.Resume.id == resume_id, models.Resume.user_id == user.id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    return {
        "id": resume.id,
        "document_name": resume.document_name,
        "original_upload_filename": resume.original_upload_filename,
        "template_id": resume.template_id,
        "json_url": resume.json_url,
        "canvas_json_url": resume.canvas_json_url,
        "created_at": resume.created_at.isoformat() if resume.created_at else None,
        "updated_at": resume.updated_at.isoformat() if resume.updated_at else None,
    }


# ── PUT /api/resume/{resume_id}/canvas ────────────────────────────────────────
@router.put("/{resume_id}/canvas")
async def save_resume_canvas(
    resume_id: int,
    request: Request,
    db: Session = Depends(database.get_db),
):
    """
    Saves the user's progress on the canvas as a JSON file and updates canvas_json_url.
    Body: { "canvas_data": "..." }
    """
    import json as json_lib
    import uuid
    from datetime import datetime

    user = auth_utils.get_user_from_request(request, db)

    resume = db.query(models.Resume).filter(models.Resume.id == resume_id, models.Resume.user_id == user.id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    try:
        body = await request.json()
        canvas_data = body.get("canvas_data")
        if not canvas_data:
            raise ValueError("canvas_data is missing")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    if resume.canvas_json_url:
        # Extract filename from existing URL: /uploads/{user_id}/canvas/{filename}
        out_filename = resume.canvas_json_url.split("/")[-1]
    else:
        date_str = datetime.utcnow().strftime("%Y%m%d%H%M%S")
        short_id = uuid.uuid4().hex[:8]
        out_filename = f"canvas-{date_str}-{short_id}.json"

    canvas_dir = UPLOAD_DIR / str(user.id) / "canvas"
    canvas_dir.mkdir(parents=True, exist_ok=True)
    out_path = canvas_dir / out_filename

    with open(out_path, "w", encoding="utf-8") as f:
        # Assuming canvas_data is a stringified JSON (the multi-page structure). 
        # If it's already a dict, we just dump it.
        if isinstance(canvas_data, str):
            f.write(canvas_data)
        else:
            json_lib.dump(canvas_data, f, ensure_ascii=False)

    if not resume.canvas_json_url:
        canvas_json_url = f"/uploads/{user.id}/canvas/{out_filename}"
        resume.canvas_json_url = canvas_json_url
        db.commit()
        db.refresh(resume)
    else:
        canvas_json_url = resume.canvas_json_url

    logger.info(f"Saved canvas data for resume {resume.id} → {out_path}")

    return {
        "message": "Canvas saved successfully.",
        "canvas_json_url": canvas_json_url,
    }


# ── POST /api/resume/save ─────────────────────────────────────────────────────
@router.post("/save")
async def save_resume(
    request: Request,
    db: Session = Depends(database.get_db),
):
    """
    Persist a user-edited (or freshly entered) resume as a structured JSON file.

    Body: full resume object matching RESUME_SCHEMA (meta field is stripped automatically).
    Returns: { "filename": "<slug>-<date>-<uuid8>.json", "message": "..." }
    """
    import json as json_lib
    import re
    from resume_schema import RESUME_SCHEMA

    user = auth_utils.get_user_from_request(request, db)

    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    # Strip pipeline-internal meta before validating / saving
    body.pop("meta", None)

    # Validate against schema (meta removed so we relax that field)
    try:
        import jsonschema
        # Build a copy of schema without meta to avoid additionalProperties clash
        schema_copy = {**RESUME_SCHEMA, "required": [r for r in RESUME_SCHEMA.get("required", []) if r != "meta"]}
        jsonschema.validate(instance=body, schema=schema_copy)
    except jsonschema.ValidationError as exc:
        raise HTTPException(status_code=422, detail=f"Schema validation error: {exc.message}")

    # Generate descriptive filename: slug-YYYYMMDD-uuid8.json
    full_name: str = body.get("full_name", "resume")
    slug = re.sub(r"[^a-z0-9]+", "-", full_name.lower()).strip("-")[:40]
    date_str = datetime.utcnow().strftime("%Y%m%d")
    short_id = uuid.uuid4().hex[:8]
    out_filename = f"{slug}-{date_str}-{short_id}.json"

    # Write to uploads/{user_id}/json/
    json_dir = UPLOAD_DIR / str(user.id) / "json"
    json_dir.mkdir(parents=True, exist_ok=True)
    out_path = json_dir / out_filename

    with open(out_path, "w", encoding="utf-8") as f:
        json_lib.dump(body, f, ensure_ascii=False, indent=2)

    json_url = f"/uploads/{user.id}/json/{out_filename}"

    resume_db = models.Resume(
        user_id=user.id,
        document_name=body.get("document_name") or "Untitled Resume",
        original_upload_filename=body.get("original_upload_filename") or "nan",
        template_id=body.get("template_id"),
        json_url=json_url
    )
    db.add(resume_db)
    db.commit()
    db.refresh(resume_db)

    logger.info(f"Saved edited resume → {out_path} and DB")

    return {
        "message": "Resume saved successfully.",
        "filename": out_filename,
        "resume_id": resume_db.id,
        "user_id": user.id,
    }


# ── POST /api/resume/rewrite ──────────────────────────────────────────────────
class RewriteRequest(BaseModel):
    text: str

@router.post("/rewrite")
async def rewrite_text(
    payload: RewriteRequest,
    request: Request,
    db: Session = Depends(database.get_db),
):
    """
    Takes any text and rewrites it to be ATS-friendly using the LLaMA model.
    """
    user = auth_utils.get_user_from_request(request, db)

    from pipeline.ats_rewriter import rewrite_text_for_ats

    try:
        rewritten = rewrite_text_for_ats(payload.text)
        return {"rewritten_text": rewritten}
    except Exception as e:
        logger.error(f"ATS rewrite failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to rewrite text")


# ── POST /api/resume/{resume_id}/publish ──────────────────────────────────────
@router.post("/{resume_id}/publish")
async def publish_resume(
    resume_id: int,
    file: UploadFile,
    request: Request,
    db: Session = Depends(database.get_db),
):
    """
    Saves a PDF generated from the frontend for public sharing and returns a share token.
    """
    user = auth_utils.get_user_from_request(request, db)

    resume = db.query(models.Resume).filter(models.Resume.id == resume_id, models.Resume.user_id == user.id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    import uuid
    import shutil
    
    if not resume.share_token:
        resume.share_token = str(uuid.uuid4())
        
    shared_dir = UPLOAD_DIR / str(user.id) / "shared"
    shared_dir.mkdir(parents=True, exist_ok=True)
    
    file_id = str(uuid.uuid4())[:8]
    pdf_filename = f"{resume.share_token}-{file_id}.pdf"
    pdf_path = shared_dir / pdf_filename
    
    with open(pdf_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    resume.shared_pdf_url = f"/uploads/{user.id}/shared/{pdf_filename}"
    
    db.commit()
    db.refresh(resume)
    
    return {
        "share_token": resume.share_token,
        "shared_pdf_url": resume.shared_pdf_url,
    }


# ── GET /api/resume/shared/{token} ────────────────────────────────────────────
@router.get("/shared/{token}")
async def get_shared_resume(
    token: str,
    db: Session = Depends(database.get_db),
):
    """
    Public unauthenticated endpoint to get shared resume metadata.
    """
    resume = db.query(models.Resume).filter(models.Resume.share_token == token).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Shared resume not found")
        
    if not resume.shared_pdf_url:
        raise HTTPException(status_code=404, detail="PDF not published for this resume")
        
    return {
        "document_name": resume.document_name,
        "shared_pdf_url": resume.shared_pdf_url,
        "updated_at": resume.updated_at or resume.created_at
    }

@router.post("/rewrite")
def rewrite_text(req: RewriteRequest):
    """
    Rewrite text for ATS optimization.
    """
    try:
        rewritten = rewrite_text_for_ats(req.text)
        return {"rewritten_text": rewritten}
    except Exception as e:
        logger.error(f"Rewrite failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to rewrite text")

@router.post("/grammar-check")
def grammar_check(req: GrammarCheckRequest):
    """
    Check text for grammar and ATS issues.
    """
    try:
        issues = grammar_check_text(req.text)
        return {"issues": issues}
    except Exception as e:
        logger.error(f"Grammar check failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to check grammar")
