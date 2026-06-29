"""
resume_schema.py
Authoritative JSON Schema for a structured resume.
Used by:
  - pipeline.py  → passed as guided_json to Llama NIM
  - validation   → jsonschema.validate() post-LLM call
"""

RESUME_SCHEMA = {
    "type": "object",
    "description": "Structured representation of a professional resume.",
    "required": ["full_name", "contact", "work_experience", "education"],
    "additionalProperties": False,
    "properties": {
        "document_name": {
            "type": ["string", "null"],
            "description": "User-provided name for this resume document."
        },
        "original_upload_filename": {
            "type": ["string", "null"],
            "description": "Original filename if uploaded, or 'nan'."
        },
        "profile_pic": {
            "type": ["string", "null"],
            "description": "URL of the uploaded profile picture. Optional."
        },
        "template_id": {
            "type": ["integer", "null"],
            "description": "ID of the selected resume template. Optional."
        },

        # ── IDENTITY ──────────────────────────────────────────────
        "full_name": {
            "type": "string",
            "description": "Candidate's full legal or professional name. REQUIRED."
        },
        "headline": {
            "type": ["string", "null"],
            "description": "Short professional tagline or title. Optional."
        },
        "summary": {
            "type": ["string", "null"],
            "description": "Career summary or objective paragraph. Optional."
        },

        # ── CONTACT ───────────────────────────────────────────────
        "contact": {
            "type": "object",
            "required": ["email"],
            "additionalProperties": False,
            "properties": {
                "email":       {"type": "string"},
                "phone":       {"type": ["string", "null"]},
                "location":    {"type": ["string", "null"]},
                "linkedin":    {"type": ["string", "null"]},
                "github":      {"type": ["string", "null"]},
                "portfolio":   {"type": ["string", "null"]},
                "other_links": {"type": "array", "items": {"type": "string"}}
            }
        },

        # ── WORK EXPERIENCE ───────────────────────────────────────
        "work_experience": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["company", "title"],
                "additionalProperties": False,
                "properties": {
                    "company":          {"type": "string"},
                    "title":            {"type": "string"},
                    "location":         {"type": ["string", "null"]},
                    "start_date":       {"type": ["string", "null"]},
                    "end_date":         {"type": ["string", "null"]},
                    "is_current":       {"type": ["boolean", "null"]},
                    "responsibilities": {"type": "array", "items": {"type": "string"}}
                }
            }
        },

        # ── EDUCATION ─────────────────────────────────────────────
        "education": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["institution"],
                "additionalProperties": False,
                "properties": {
                    "institution":    {"type": "string"},
                    "degree":         {"type": ["string", "null"]},
                    "field_of_study": {"type": ["string", "null"]},
                    "graduation_year":{"type": ["string", "null"]},
                    "gpa":            {"type": ["string", "null"]},
                    "honors":         {"type": ["string", "null"]}
                }
            }
        },

        # ── SKILLS ────────────────────────────────────────────────
        "skills": {
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "technical": {"type": "array", "items": {"type": "string"}},
                "soft":      {"type": "array", "items": {"type": "string"}},
                "languages": {"type": "array", "items": {"type": "string"}},
                "other":     {"type": "array", "items": {"type": "string"}}
            }
        },

        # ── PROJECTS ──────────────────────────────────────────────
        "projects": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["name"],
                "additionalProperties": False,
                "properties": {
                    "name":         {"type": "string"},
                    "description":  {"type": ["string", "null"]},
                    "technologies": {"type": "array", "items": {"type": "string"}},
                    "url":          {"type": ["string", "null"]},
                    "date":         {"type": ["string", "null"]}
                }
            }
        },

        # ── CERTIFICATIONS ────────────────────────────────────────
        "certifications": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["name"],
                "additionalProperties": False,
                "properties": {
                    "name":          {"type": "string"},
                    "issuer":        {"type": ["string", "null"]},
                    "date":          {"type": ["string", "null"]},
                    "credential_id": {"type": ["string", "null"]},
                    "url":           {"type": ["string", "null"]}
                }
            }
        },

        # ── AWARDS & ACHIEVEMENTS ─────────────────────────────────
        "awards": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["title"],
                "additionalProperties": False,
                "properties": {
                    "title":       {"type": "string"},
                    "issuer":      {"type": ["string", "null"]},
                    "date":        {"type": ["string", "null"]},
                    "description": {"type": ["string", "null"]}
                }
            }
        },

        # ── PUBLICATIONS ──────────────────────────────────────────
        "publications": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["title"],
                "additionalProperties": False,
                "properties": {
                    "title":     {"type": "string"},
                    "publisher": {"type": ["string", "null"]},
                    "date":      {"type": ["string", "null"]},
                    "url":       {"type": ["string", "null"]}
                }
            }
        },

        # ── VOLUNTEER ─────────────────────────────────────────────
        "volunteer": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["organisation"],
                "additionalProperties": False,
                "properties": {
                    "organisation": {"type": "string"},
                    "role":         {"type": ["string", "null"]},
                    "start_date":   {"type": ["string", "null"]},
                    "end_date":     {"type": ["string", "null"]},
                    "description":  {"type": ["string", "null"]}
                }
            }
        },

        # ── META ──────────────────────────────────────────────────
        "meta": {
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "parse_confidence":  {"type": ["number", "null"]},
                "detected_language": {"type": ["string", "null"]},
                "total_pages":       {"type": ["integer", "null"]}
            }
        }
    }
}
