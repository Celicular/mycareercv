"""
pipeline/schema_validator.py
Stage 4 — Validate structured resume dict against RESUME_SCHEMA.

Usage:
    from pipeline.schema_validator import validate_resume_json, ValidationResult

    result = validate_resume_json(data)
    if result.valid:
        print("All good:", result.data)
    else:
        print("Warnings:", result.errors)
        print("Partial data:", result.data)  # still returned even on soft failure
"""

import logging
import os
import sys
from dataclasses import dataclass, field

import jsonschema

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from resume_schema import RESUME_SCHEMA

logger = logging.getLogger(__name__)


@dataclass
class ValidationResult:
    valid:  bool
    data:   dict
    errors: list[str] = field(default_factory=list)


def validate_resume_json(data: dict, strict: bool = False) -> ValidationResult:
    """
    Validate a structured resume dict against RESUME_SCHEMA.

    Args:
        data:   The dict to validate (output of llama_structurer.markdown_to_json).
        strict: If True, raise jsonschema.ValidationError on failure.
                If False (default), log warnings and return a ValidationResult
                with valid=False so the pipeline can continue with partial data.

    Returns:
        ValidationResult(valid, data, errors)
    """
    errors: list[str] = []

    try:
        jsonschema.validate(instance=data, schema=RESUME_SCHEMA)
        logger.info("Schema validation passed ✓")
        return ValidationResult(valid=True, data=data)

    except jsonschema.ValidationError as e:
        msg = f"{e.json_path}: {e.message}" if e.json_path else e.message
        errors.append(msg)
        logger.warning(f"Schema validation warning — {msg}")

        if strict:
            raise

        return ValidationResult(valid=False, data=data, errors=errors)

    except jsonschema.SchemaError as e:
        # The schema itself is malformed — this is a developer error
        logger.critical(f"RESUME_SCHEMA is invalid: {e.message}")
        raise
