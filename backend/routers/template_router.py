from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
from jose import JWTError, jwt
import shutil
from pathlib import Path

import database
import models
import schemas
import auth   # uses auth.SECRET_KEY, auth.ALGORITHM
from pipeline.ingestion.ingestion_pipeline import (
    run_ingestion_pipeline,
    get_job_status,
    get_job_result,
)

router = APIRouter(prefix="/api/templates", tags=["templates"])


# ── Auth helpers (self-contained — no circular imports) ───────────────────────

def _resolve_user(request: Request, db: Session) -> Optional[models.User]:
    """Return the User from the Bearer token, or None if absent/invalid."""
    try:
        return auth.get_user_from_request(request, db)
    except HTTPException:
        return None


def _require_user(request: Request, db: Session) -> models.User:
    user = _resolve_user(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


# ── POST /api/templates/ ── create ───────────────────────────────────────────
@router.post("/", response_model=schemas.TemplateDetailResponse, status_code=201)
def create_template(
    body: schemas.TemplateCreate,
    request: Request,
    db: Session = Depends(database.get_db),
):
    user = _resolve_user(request, db)
    tmpl = models.ResumeTemplate(
        user_id       = user.id if user else None,
        name          = body.name,
        description   = body.description,
        fabric_json   = body.fabric_json,
        thumbnail_b64 = body.thumbnail_b64,
        is_public     = body.is_public,
    )
    db.add(tmpl)
    db.commit()
    db.refresh(tmpl)
    return tmpl


# ── GET /api/templates/ ── list ──────────────────────────────────────────────
@router.get("/", response_model=List[schemas.TemplateResponse])
def list_templates(
    request: Request,
    db: Session = Depends(database.get_db),
):
    user = _resolve_user(request, db)
    q = db.query(models.ResumeTemplate)
    if user and getattr(user, 'role', '') == 'admin':
        # Admin sees all templates
        pass
    elif user:
        q = q.filter(
            (models.ResumeTemplate.user_id == user.id) |
            (models.ResumeTemplate.is_public == True)
        )
    else:
        q = q.filter(models.ResumeTemplate.is_public == True)
    return q.order_by(models.ResumeTemplate.created_at.desc()).all()


# ── GET /api/templates/{id} ── load one ──────────────────────────────────────
@router.get("/{template_id}", response_model=schemas.TemplateDetailResponse)
def get_template(
    template_id: int,
    request: Request,
    db: Session = Depends(database.get_db),
):
    tmpl = db.query(models.ResumeTemplate).filter(models.ResumeTemplate.id == template_id).first()
    if not tmpl:
        raise HTTPException(status_code=404, detail="Template not found")
    if not tmpl.is_public:
        user = _require_user(request, db)
        if getattr(user, 'role', '') != 'admin' and (tmpl.user_id and tmpl.user_id != user.id):
            raise HTTPException(status_code=403, detail="Forbidden")
    return tmpl


# ── PUT /api/templates/{id} ── update ────────────────────────────────────────
@router.put("/{template_id}", response_model=schemas.TemplateDetailResponse)
def update_template(
    template_id: int,
    body: schemas.TemplateUpdate,
    request: Request,
    db: Session = Depends(database.get_db),
):
    user  = _require_user(request, db)
    tmpl  = db.query(models.ResumeTemplate).filter(models.ResumeTemplate.id == template_id).first()
    if not tmpl:
        raise HTTPException(status_code=404, detail="Template not found")
    if getattr(user, 'role', '') != 'admin' and (tmpl.user_id and tmpl.user_id != user.id):
        raise HTTPException(status_code=403, detail="Forbidden")
    for field, val in body.model_dump(exclude_none=True).items():
        setattr(tmpl, field, val)
    db.commit()
    db.refresh(tmpl)
    return tmpl


# ── DELETE /api/templates/{id} ───────────────────────────────────────────────
@router.delete("/{template_id}", status_code=204)
def delete_template(
    template_id: int,
    request: Request,
    db: Session = Depends(database.get_db),
):
    user = _require_user(request, db)
    tmpl = db.query(models.ResumeTemplate).filter(models.ResumeTemplate.id == template_id).first()
    if not tmpl:
        raise HTTPException(status_code=404, detail="Template not found")
    if getattr(user, 'role', '') != 'admin' and (tmpl.user_id and tmpl.user_id != user.id):
        raise HTTPException(status_code=403, detail="Forbidden")
    db.delete(tmpl)
    db.commit()


# ── POST /api/templates/{id}/clone ───────────────────────────────────────────
@router.post("/{template_id}/clone", response_model=schemas.TemplateDetailResponse, status_code=201)
def clone_template(
    template_id: int,
    request: Request,
    db: Session = Depends(database.get_db),
):
    user = _resolve_user(request, db)
    tmpl = db.query(models.ResumeTemplate).filter(models.ResumeTemplate.id == template_id).first()
    if not tmpl:
        raise HTTPException(status_code=404, detail="Template not found")
    clone = models.ResumeTemplate(
        user_id       = user.id if user else None,
        name          = f"{tmpl.name} (Copy)",
        description   = tmpl.description,
        fabric_json   = tmpl.fabric_json,
        thumbnail_b64 = tmpl.thumbnail_b64,
        is_public     = False,
    )
    db.add(clone)
    db.commit()
    db.refresh(clone)
    return clone


# ── POST /api/templates/ingest ── start ingestion ────────────────────────────
_ALLOWED_MIMES = {
    "image/jpeg", "image/png", "image/webp", "application/pdf",
    # Some browsers send these for PDFs
    "application/x-pdf",
}
_ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".pdf"}

# Upload directory for ingestion files
_UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads" / "ingestion"


@router.post("/ingest", status_code=202)
async def ingest_template(
    file: UploadFile = File(...),
):
    """
    Upload an image or PDF of a resume template and start the
    AI ingestion pipeline to convert it into a Fabric.js canvas template.
    """
    # Validate file type
    ext = Path(file.filename or "").suffix.lower()
    if ext not in _ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=422,
            detail=f"Unsupported file type '{ext}'. Accepted: {', '.join(_ALLOWED_EXTENSIONS)}",
        )

    # Save uploaded file to disk
    _UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    import uuid
    file_id = str(uuid.uuid4())[:8]
    save_path = _UPLOAD_DIR / f"{file_id}{ext}"

    with open(str(save_path), "wb") as out:
        content = await file.read()
        out.write(content)

    # Start the ingestion pipeline in a background thread
    job_id = run_ingestion_pipeline(str(save_path))

    return {"job_id": job_id, "message": "Ingestion pipeline started"}


# ── GET /api/templates/ingestion/{job_id}/status ─────────────────────────────
@router.get("/ingestion/{job_id}/status")
def ingestion_status(job_id: str):
    """Poll the status of an ongoing ingestion job."""
    status = get_job_status(job_id)
    if status is None:
        raise HTTPException(status_code=404, detail="Ingestion job not found")
    return status


# ── GET /api/templates/ingestion/{job_id}/result ─────────────────────────────
@router.get("/ingestion/{job_id}/result")
def ingestion_result(job_id: str):
    """Retrieve the result of a completed ingestion job."""
    status = get_job_status(job_id)
    if status is None:
        raise HTTPException(status_code=404, detail="Ingestion job not found")
    if status["status"] == "failed":
        raise HTTPException(status_code=422, detail=status.get("error", "Ingestion failed"))
    if status["status"] != "complete":
        raise HTTPException(status_code=409, detail="Ingestion job is still processing")

    result = get_job_result(job_id)
    if result is None:
        raise HTTPException(status_code=500, detail="Result missing for completed job")

    return result
