"""
pipeline/ingestion/
  Template ingestion pipeline — Image/PDF → Fabric.js canvas template.

  Public API:
      from pipeline.ingestion import run_ingestion_pipeline

      result = run_ingestion_pipeline("/path/to/resume-template.png")
"""

from pipeline.ingestion.ingestion_pipeline import run_ingestion_pipeline

__all__ = ["run_ingestion_pipeline"]
