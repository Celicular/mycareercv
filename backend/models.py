from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, JSON
from sqlalchemy.sql import func
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    
    # Password can be null for OAuth users
    hashed_password = Column(String, nullable=True)
    
    # Future proofing for Google OAuth
    google_id = Column(String, unique=True, index=True, nullable=True)
    auth_provider = Column(String, default="local") # "local" or "google"
    
    # Auth states
    is_active = Column(Boolean, default=True)
    role = Column(String, default="user") # "user" or "admin"
    # Subscription / Billing fields
    trial_end_date = Column(DateTime(timezone=True), nullable=True)
    subscription_status = Column(String, default="trial") # "trial", "active", "past_due", "canceled"
    razorpay_customer_id = Column(String, nullable=True)
    razorpay_subscription_id = Column(String, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class ContactLead(Base):
    __tablename__ = "contact_leads"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class ResumeTemplate(Base):
    __tablename__ = "resume_templates"

    id            = Column(Integer, primary_key=True, index=True)
    user_id       = Column(Integer, ForeignKey("users.id"), nullable=True)  # null = global
    name          = Column(String, nullable=False, default="Untitled Template")
    description   = Column(String, nullable=True)
    thumbnail_b64 = Column(Text, nullable=True)    # base64 PNG from canvas.toDataURL()
    fabric_json   = Column(Text, nullable=False)   # canvas.toJSON(['customMeta']) output
    is_public     = Column(Boolean, default=False)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())
    updated_at    = Column(DateTime(timezone=True), onupdate=func.now())

class Resume(Base):
    __tablename__ = "resumes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    template_id = Column(Integer, ForeignKey("resume_templates.id"), nullable=True)
    document_name = Column(String, nullable=False, default="Untitled Resume")
    original_upload_filename = Column(String, nullable=False)
    json_url = Column(String, nullable=False)
    canvas_json_url = Column(String, nullable=True)
    share_token = Column(String, unique=True, index=True, nullable=True)
    shared_pdf_url = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class CoverLetter(Base):
    __tablename__ = "cover_letters"

    id                    = Column(Integer, primary_key=True, index=True)
    user_id               = Column(Integer, ForeignKey("users.id"), nullable=False)
    document_name         = Column(String, nullable=False, default="Untitled Cover Letter")

    # Source resume — one of these two must be set
    source_resume_id      = Column(Integer, ForeignKey("resumes.id"), nullable=True)   # existing DB resume
    resume_file_url       = Column(String, nullable=True)   # uploaded PDF/DOCX path (cover-specific upload)
    resume_json_url       = Column(String, nullable=True)   # path to the parsed resume JSON used for generation

    # Inputs
    job_description       = Column(Text, nullable=False)
    preferences           = Column(JSON, nullable=True)      # tone, length, focus, company_name, etc.

    # Pipeline intermediate data (stored for transparency / debugging)
    analyzer_output       = Column(JSON, nullable=True)      # Step 1 – resume analysis
    jd_analysis           = Column(JSON, nullable=True)      # Step 2 – JD analysis
    match_results         = Column(JSON, nullable=True)      # Step 3 – matching
    content_plan          = Column(JSON, nullable=True)      # Step 4 – outline

    # Final output — structured JSON object with paragraphs
    cover_letter_json     = Column(JSON, nullable=True)      # { greeting, opening, body, closing, sign_off }
    quality_score         = Column(Integer, nullable=True)   # 0–100 from quality checker
    word_count            = Column(Integer, nullable=True)
    matched_skills        = Column(JSON, nullable=True)      # list of matched skills used
    projects_used         = Column(JSON, nullable=True)      # list of project names referenced

    created_at            = Column(DateTime(timezone=True), server_default=func.now())
    updated_at            = Column(DateTime(timezone=True), onupdate=func.now())
