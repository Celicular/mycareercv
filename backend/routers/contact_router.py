from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
import database, models
import auth as auth_utils
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/contact", tags=["contact"])

class ContactRequest(BaseModel):
    name: str
    email: EmailStr
    message: str

@router.post("")
async def submit_contact(payload: ContactRequest, db: Session = Depends(database.get_db)):
    """
    Public endpoint to submit a contact form.
    """
    try:
        new_lead = models.ContactLead(
            name=payload.name,
            email=payload.email,
            message=payload.message
        )
        db.add(new_lead)
        db.commit()
        return {"message": "Thank you for reaching out. We will get back to you shortly."}
    except Exception as e:
        logger.error(f"Failed to submit contact lead: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to submit form.")

@router.get("/leads")
async def get_contact_leads(request: Request, db: Session = Depends(database.get_db)):
    """
    Admin-only endpoint to get all contact leads.
    """
    user = auth_utils.get_user_from_request(request, db)
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized. Admins only.")
        
    leads = db.query(models.ContactLead).order_by(models.ContactLead.created_at.desc()).all()
    
    return [
        {
            "id": l.id,
            "name": l.name,
            "email": l.email,
            "message": l.message,
            "created_at": l.created_at.isoformat() if l.created_at else None
        } for l in leads
    ]
