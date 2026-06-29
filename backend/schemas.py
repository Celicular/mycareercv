from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr
    name: str

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(UserBase):
    id: int
    is_active: bool
    role: str
    created_at: datetime
    auth_provider: str
    trial_end_date: Optional[datetime] = None
    subscription_status: Optional[str] = None

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class ForgotPassword(BaseModel):
    email: EmailStr

# ── Template schemas ──────────────────────────────────────────────────────────

class TemplateCreate(BaseModel):
    name: str = "Untitled Template"
    description: Optional[str] = None
    fabric_json: str               # JSON string from canvas.toJSON()
    thumbnail_b64: Optional[str] = None
    is_public: bool = False

class TemplateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    fabric_json: Optional[str] = None
    thumbnail_b64: Optional[str] = None
    is_public: Optional[bool] = None

class TemplateResponse(BaseModel):
    id: int
    user_id: Optional[int]
    name: str
    description: Optional[str]
    thumbnail_b64: Optional[str]
    is_public: bool
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True

class TemplateDetailResponse(TemplateResponse):
    fabric_json: str   # full canvas JSON — only on single-item fetch

