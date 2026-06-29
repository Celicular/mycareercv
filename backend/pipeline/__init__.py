"""
pipeline/
  Modular resume processing package.

  Each stage is independently importable:
    from pipeline.pdf_rasterizer   import rasterize_pdf
    from pipeline.nemotron_parser  import extract_page_markdown
    from pipeline.llama_structurer import markdown_to_json
    from pipeline.schema_validator import validate_resume_json
    from pipeline.json_store       import save_resume_json

  The full PDF → JSON orchestration:
    from pipeline import process_resume
"""

from pipeline.resume_pipeline import process_resume

__all__ = ["process_resume"]
