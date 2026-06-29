"""
pipeline/cover_letter_pipeline.py
AI Cover Letter Generator — 6-step pipeline.

Steps:
  1. Resume Analyzer    → extract signal from resume JSON
  2. JD Analyzer        → parse job description
  3. Matcher            → logic-only skill/exp matching
  4. Content Planner    → paragraph outline via LLM
  5. LLM Writer         → full cover letter as structured JSON
  6. Quality Checker    → grammar/score check, regenerate if score < 85

Final Output JSON schema:
{
  "greeting":  str,   # e.g. "Dear Hiring Team,"
  "opening":   str,   # ~60 words — hook + role interest
  "body_1":    str,   # ~80 words — top matched experience
  "body_2":    str,   # ~80 words — top matched project / skill
  "body_3":    str,   # ~60 words — growth / enthusiasm (optional, may be "")
  "closing":   str,   # ~50 words — CTA + thank you
  "sign_off":  str    # e.g. "Sincerely,\nJohn Doe"
}

Usage:
    from pipeline.cover_letter_pipeline import generate_cover_letter
    result = generate_cover_letter(resume_json, job_description, preferences)
"""

import json
import logging
import os
import re
import sys
import requests
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

# ── NIM endpoint & model ──────────────────────────────────────────────────────
_NVAI_URL = "https://integrate.api.nvidia.com/v1/chat/completions"
_MODEL    = "meta/llama-3.1-8b-instruct"

# ── Token budget per call (keep low to enforce brevity) ──────────────────────
_PLAN_TOKENS    = 512
_WRITE_TOKENS   = 1024
_QUALITY_TOKENS = 512
_TEMP_PRECISE   = 0.05   # near-deterministic for structured output
_TEMP_CREATIVE  = 0.30   # slight creativity for the actual writing step


def _get_headers() -> dict:
    api_key = os.getenv("NVIDIA_API_KEY")
    if not api_key:
        raise EnvironmentError("NVIDIA_API_KEY is not set. Check backend/.env")
    return {
        "Authorization": f"Bearer {api_key}",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }


def _call_nim(messages: list, max_tokens: int = 512, temperature: float = 0.05,
              guided_json: dict | None = None, timeout: int = 120) -> str:
    """Make one NIM call and return the raw string content."""
    payload = {
        "model": _MODEL,
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": temperature,
    }
    if guided_json:
        payload["guided_json"] = guided_json

    try:
        resp = requests.post(_NVAI_URL, headers=_get_headers(), json=payload, timeout=timeout)
        resp.raise_for_status()
    except requests.HTTPError as e:
        raise RuntimeError(f"NIM HTTP {resp.status_code}: {resp.text[:400]}") from e
    except requests.RequestException as e:
        raise RuntimeError(f"NIM request failed: {e}") from e

    try:
        return resp.json()["choices"][0]["message"]["content"].strip()
    except (KeyError, IndexError) as e:
        raise RuntimeError(f"Unexpected NIM response shape: {resp.text[:300]}") from e


def _parse_json_response(raw: str) -> dict | list:
    """Strip markdown fences then parse JSON — raise RuntimeError on failure."""
    cleaned = re.sub(r"^```(?:json)?\s*", "", raw.strip())
    cleaned = re.sub(r"\s*```$", "", cleaned).strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as e:
        raise RuntimeError(f"Model returned non-JSON output.\nFirst 300 chars:\n{cleaned[:300]}") from e


# ─────────────────────────────────────────────────────────────────────────────
# STEP 1 — Resume Analyzer
# Extract ONLY the strongest signal from the resume JSON.
# ─────────────────────────────────────────────────────────────────────────────
_RESUME_ANALYZER_SYSTEM = """You are a senior career consultant reviewing a resume to identify ONLY the content that belongs in a cover letter.

STRICT RULES:
1. Output ONLY a valid JSON object — no markdown, no preamble, no explanation.
2. Extract at most 5 items per list. Quality over quantity.
3. "top_skills": list of strings — the candidate's strongest and most differentiated technical skills.
4. "top_projects": list of objects with keys "name" and "impact" (one sentence max per project).
5. "best_experience": list of objects with keys "role", "company", "achievement" (one strong metric/outcome sentence per role).
6. "achievements": list of strings — quantified wins (e.g. "Generated ₹5L in revenue"). Max 3.
7. "strengths": list of strings — high-level differentiators (e.g. "Full-stack across AI and mobile"). Max 3.
8. DO NOT include soft skills, generic statements, or duplicate content.
9. DO NOT invent anything not in the provided resume."""

_RESUME_ANALYZER_SCHEMA = {
    "type": "object",
    "required": ["top_skills", "top_projects", "best_experience", "achievements", "strengths"],
    "additionalProperties": False,
    "properties": {
        "top_skills":       {"type": "array", "items": {"type": "string"}, "maxItems": 5},
        "top_projects":     {
            "type": "array", "maxItems": 5,
            "items": {
                "type": "object",
                "required": ["name", "impact"],
                "properties": {
                    "name":   {"type": "string"},
                    "impact": {"type": "string"}
                }
            }
        },
        "best_experience":  {
            "type": "array", "maxItems": 5,
            "items": {
                "type": "object",
                "required": ["role", "company", "achievement"],
                "properties": {
                    "role":        {"type": "string"},
                    "company":     {"type": "string"},
                    "achievement": {"type": "string"}
                }
            }
        },
        "achievements": {"type": "array", "items": {"type": "string"}, "maxItems": 3},
        "strengths":    {"type": "array", "items": {"type": "string"}, "maxItems": 3},
    }
}


def step1_analyze_resume(resume_json: dict) -> dict:
    logger.info("[CL Step 1] Analyzing resume …")
    user_content = (
        "Analyze this resume JSON and extract cover-letter-worthy content:\n\n"
        f"{json.dumps(resume_json, ensure_ascii=False)}"
    )
    raw = _call_nim(
        messages=[
            {"role": "system", "content": _RESUME_ANALYZER_SYSTEM},
            {"role": "user",   "content": user_content},
        ],
        max_tokens=_PLAN_TOKENS,
        temperature=_TEMP_PRECISE,
        guided_json=_RESUME_ANALYZER_SCHEMA,
    )
    result = _parse_json_response(raw)
    logger.info(f"[CL Step 1] Done — top_skills: {result.get('top_skills', [])}")
    return result


# ─────────────────────────────────────────────────────────────────────────────
# STEP 2 — JD Analyzer
# ─────────────────────────────────────────────────────────────────────────────
_JD_ANALYZER_SYSTEM = """You are a technical recruiter. Extract structured information from the provided job description.

STRICT RULES:
1. Output ONLY a valid JSON object — no markdown, no commentary.
2. "company": extract the company name if mentioned; otherwise use "".
3. "role": the exact job title.
4. "required_skills": list of hard skills explicitly marked as required. Max 10.
5. "preferred_skills": list of nice-to-have skills. Max 5.
6. "responsibilities": list of key responsibilities. Max 5, each one sentence.
7. "soft_skills": explicitly mentioned soft skills only. Max 3.
8. DO NOT fabricate skills or responsibilities not present in the JD."""

_JD_ANALYZER_SCHEMA = {
    "type": "object",
    "required": ["company", "role", "required_skills", "preferred_skills", "responsibilities", "soft_skills"],
    "additionalProperties": False,
    "properties": {
        "company":          {"type": "string"},
        "role":             {"type": "string"},
        "required_skills":  {"type": "array", "items": {"type": "string"}, "maxItems": 10},
        "preferred_skills": {"type": "array", "items": {"type": "string"}, "maxItems": 5},
        "responsibilities": {"type": "array", "items": {"type": "string"}, "maxItems": 5},
        "soft_skills":      {"type": "array", "items": {"type": "string"}, "maxItems": 3},
    }
}


def step2_analyze_jd(job_description: str) -> dict:
    logger.info("[CL Step 2] Analyzing job description …")
    raw = _call_nim(
        messages=[
            {"role": "system", "content": _JD_ANALYZER_SYSTEM},
            {"role": "user",   "content": f"Job Description:\n\n{job_description}"},
        ],
        max_tokens=_PLAN_TOKENS,
        temperature=_TEMP_PRECISE,
        guided_json=_JD_ANALYZER_SCHEMA,
    )
    result = _parse_json_response(raw)
    logger.info(f"[CL Step 2] Done — role: {result.get('role')}, company: {result.get('company')}")
    return result


# ─────────────────────────────────────────────────────────────────────────────
# STEP 3 — Matcher (pure logic, no LLM)
# ─────────────────────────────────────────────────────────────────────────────
def step3_match(resume_analysis: dict, jd_analysis: dict) -> dict:
    """
    Pure Python matching — no LLM call.
    Compares resume top_skills + experience/project names against JD required/preferred skills.
    """
    logger.info("[CL Step 3] Running matcher …")

    resume_skills = {s.lower() for s in resume_analysis.get("top_skills", [])}
    jd_required   = jd_analysis.get("required_skills", [])
    jd_preferred  = jd_analysis.get("preferred_skills", [])
    all_jd_skills = jd_required + jd_preferred

    matching_skills = [
        s for s in all_jd_skills
        if s.lower() in resume_skills
    ]
    missing_skills = [
        s for s in jd_required
        if s.lower() not in resume_skills
    ]

    # Match projects by name substring against JD responsibilities text
    jd_text = " ".join(jd_analysis.get("responsibilities", [])).lower()
    matching_projects = [
        p["name"] for p in resume_analysis.get("top_projects", [])
        if any(word in jd_text for word in p["name"].lower().split())
    ]

    # Match experience by checking role/achievement keywords vs JD skills
    matching_experience = []
    for exp in resume_analysis.get("best_experience", []):
        exp_text = f"{exp.get('role', '')} {exp.get('achievement', '')}".lower()
        if any(skill.lower() in exp_text for skill in all_jd_skills):
            matching_experience.append(f"{exp['role']} at {exp['company']}")

    result = {
        "matching_skills":     matching_skills,
        "matching_projects":   matching_projects,
        "matching_experience": matching_experience,
        "missing_skills":      missing_skills,
    }
    logger.info(f"[CL Step 3] Done — matched: {matching_skills}, missing: {missing_skills}")
    return result


# ─────────────────────────────────────────────────────────────────────────────
# STEP 4 — Content Planner
# ─────────────────────────────────────────────────────────────────────────────
_PLANNER_SYSTEM = """You are a professional cover letter strategist. Given a resume analysis, JD analysis, and skill match data, create a paragraph-by-paragraph outline for a cover letter.

STRICT RULES:
1. Output ONLY a valid JSON object — no markdown, no explanation.
2. Each value must be a single concise instruction sentence telling the writer what to include in that paragraph.
3. "opening": what hook/interest to open with and which role to mention.
4. "body_1": which specific experience or achievement to highlight and why it fits.
5. "body_2": which project or skill to highlight — must reference an actual match.
6. "body_3": optional learning/enthusiasm angle — use "" if there is not enough material.
7. "closing": how to end — CTA, enthusiasm, availability.
8. DO NOT write the cover letter itself — only the outline.
9. DO NOT invent skills or experiences not in the inputs."""

_PLANNER_SCHEMA = {
    "type": "object",
    "required": ["opening", "body_1", "body_2", "body_3", "closing"],
    "additionalProperties": False,
    "properties": {
        "opening": {"type": "string"},
        "body_1":  {"type": "string"},
        "body_2":  {"type": "string"},
        "body_3":  {"type": "string"},
        "closing": {"type": "string"},
    }
}


def step4_plan_content(resume_analysis: dict, jd_analysis: dict,
                        match_results: dict, preferences: dict) -> dict:
    logger.info("[CL Step 4] Planning content outline …")
    user_content = (
        "Create a cover letter outline using the data below.\n\n"
        f"RESUME ANALYSIS:\n{json.dumps(resume_analysis, ensure_ascii=False)}\n\n"
        f"JD ANALYSIS:\n{json.dumps(jd_analysis, ensure_ascii=False)}\n\n"
        f"MATCH RESULTS:\n{json.dumps(match_results, ensure_ascii=False)}\n\n"
        f"USER PREFERENCES:\n{json.dumps(preferences, ensure_ascii=False)}"
    )
    raw = _call_nim(
        messages=[
            {"role": "system", "content": _PLANNER_SYSTEM},
            {"role": "user",   "content": user_content},
        ],
        max_tokens=_PLAN_TOKENS,
        temperature=_TEMP_PRECISE,
        guided_json=_PLANNER_SCHEMA,
    )
    result = _parse_json_response(raw)
    logger.info(f"[CL Step 4] Done — outline keys: {list(result.keys())}")
    return result


# ─────────────────────────────────────────────────────────────────────────────
# STEP 5 — LLM Writer
# ─────────────────────────────────────────────────────────────────────────────
def _build_writer_system(preferences: dict) -> str:
    tone           = preferences.get("tone", "professional")
    length         = preferences.get("length", "medium")
    company_name   = preferences.get("company_name", "")
    hiring_manager = preferences.get("hiring_manager", "")
    focus          = preferences.get("focus", "experience")
    exp_level      = preferences.get("experience_level", "mid")

    word_map = {"short": "130–160", "medium": "220–280", "long": "350–400"}
    word_range = word_map.get(length, "220–280")

    greeting = f"Dear {hiring_manager}," if hiring_manager else (
        f"Dear Hiring Team at {company_name}," if company_name else "Dear Hiring Team,"
    )

    return f"""You are an elite professional cover letter writer. Write a cover letter strictly following the outline and data provided.

ABSOLUTE RULES — VIOLATION = FAILURE:
1. Output ONLY a valid JSON object — no markdown fences, no preamble, no explanation.
2. JSON keys: "greeting", "opening", "body_1", "body_2", "body_3", "closing", "sign_off".
3. "greeting" must be exactly: "{greeting}"
4. Total word count across all paragraphs MUST be {word_range} words. Count them.
5. Tone: {tone}. Experience level framing: {exp_level}. Focus: {focus}.
6. DO NOT mention any skill, project, or company NOT present in the provided inputs.
7. DO NOT use generic filler phrases like "I am writing to express my interest".
8. DO NOT repeat the same sentence or idea in multiple paragraphs.
9. DO NOT invent achievements, metrics, or facts.
10. Each paragraph must follow its outline instruction exactly.
11. "body_3" should be "" (empty string) if the planner outline says it is optional and not enough material exists.
12. "sign_off" must end with the candidate's full name on a new line (use \\n as separator)."""


_WRITER_SCHEMA = {
    "type": "object",
    "required": ["greeting", "opening", "body_1", "body_2", "body_3", "closing", "sign_off"],
    "additionalProperties": False,
    "properties": {
        "greeting": {"type": "string"},
        "opening":  {"type": "string"},
        "body_1":   {"type": "string"},
        "body_2":   {"type": "string"},
        "body_3":   {"type": "string"},
        "closing":  {"type": "string"},
        "sign_off": {"type": "string"},
    }
}


def step5_write_letter(resume_analysis: dict, match_results: dict,
                        jd_analysis: dict, content_plan: dict,
                        preferences: dict, candidate_name: str) -> dict:
    logger.info("[CL Step 5] Writing cover letter …")

    sign_off_hint = f"Sincerely,\\n{candidate_name}"

    user_content = (
        "Write the cover letter now. Use ONLY the data provided below.\n\n"
        f"CANDIDATE NAME: {candidate_name}\n"
        f"SIGN-OFF (use exactly): {sign_off_hint}\n\n"
        f"RESUME SUMMARY:\n"
        f"  Top Skills: {', '.join(resume_analysis.get('top_skills', []))}\n"
        f"  Achievements: {'; '.join(resume_analysis.get('achievements', []))}\n"
        f"  Strengths: {'; '.join(resume_analysis.get('strengths', []))}\n\n"
        f"MATCHING DATA:\n"
        f"  Matching Skills: {', '.join(match_results.get('matching_skills', []))}\n"
        f"  Matching Experience: {'; '.join(match_results.get('matching_experience', []))}\n"
        f"  Matching Projects: {', '.join(match_results.get('matching_projects', []))}\n\n"
        f"JD ROLE: {jd_analysis.get('role', '')}\n"
        f"JD COMPANY: {jd_analysis.get('company', '')}\n\n"
        f"PARAGRAPH OUTLINE (follow exactly):\n{json.dumps(content_plan, ensure_ascii=False)}"
    )

    raw = _call_nim(
        messages=[
            {"role": "system", "content": _build_writer_system(preferences)},
            {"role": "user",   "content": user_content},
        ],
        max_tokens=_WRITE_TOKENS,
        temperature=_TEMP_CREATIVE,
        guided_json=_WRITER_SCHEMA,
    )
    result = _parse_json_response(raw)
    logger.info("[CL Step 5] Done — cover letter written")
    return result


# ─────────────────────────────────────────────────────────────────────────────
# STEP 6 — Quality Checker
# ─────────────────────────────────────────────────────────────────────────────
_QUALITY_SYSTEM = """You are a meticulous cover letter quality auditor. Review the provided cover letter JSON and score it.

STRICT RULES:
1. Output ONLY a valid JSON object — no markdown, no explanation.
2. "score": integer 0–100.
3. "issues": list of strings — each issue must be a specific, actionable critique. Empty list if no issues.
4. Check for: grammar errors, repeated sentences/ideas, invented facts, generic filler phrases,
   missing company name (if it was provided), word count violations (too long > 400 or too short < 130),
   weak ending, tone mismatch.
5. If score >= 85 with zero critical issues, "approved" must be true.
6. If score < 85 OR any critical issue exists, "approved" must be false."""

_QUALITY_SCHEMA = {
    "type": "object",
    "required": ["score", "issues", "approved"],
    "additionalProperties": False,
    "properties": {
        "score":    {"type": "integer", "minimum": 0, "maximum": 100},
        "issues":   {"type": "array", "items": {"type": "string"}},
        "approved": {"type": "boolean"},
    }
}


def step6_quality_check(cover_letter_json: dict, preferences: dict) -> dict:
    logger.info("[CL Step 6] Running quality check …")
    user_content = (
        "Audit this cover letter JSON:\n\n"
        f"{json.dumps(cover_letter_json, ensure_ascii=False)}\n\n"
        f"User preferences context:\n{json.dumps(preferences, ensure_ascii=False)}"
    )
    raw = _call_nim(
        messages=[
            {"role": "system", "content": _QUALITY_SYSTEM},
            {"role": "user",   "content": user_content},
        ],
        max_tokens=_QUALITY_TOKENS,
        temperature=_TEMP_PRECISE,
        guided_json=_QUALITY_SCHEMA,
    )
    result = _parse_json_response(raw)
    logger.info(f"[CL Step 6] Score: {result.get('score')}, Approved: {result.get('approved')}")
    return result


# ─────────────────────────────────────────────────────────────────────────────
# PUBLIC API — Orchestrator
# ─────────────────────────────────────────────────────────────────────────────
def generate_cover_letter(
    resume_json: dict,
    job_description: str,
    preferences: dict | None = None,
) -> dict:
    """
    Run the full 6-step cover letter pipeline.

    Args:
        resume_json:      Parsed resume JSON (from the existing resume pipeline).
        job_description:  Raw job description text.
        preferences:      Optional dict with tone, length, experience_level,
                          focus, company_name, hiring_manager.

    Returns:
        {
          "cover_letter_json": { greeting, opening, body_1, body_2, body_3, closing, sign_off },
          "word_count":        int,
          "quality_score":     int,
          "matched_skills":    list[str],
          "projects_used":     list[str],
          "analyzer_output":   dict,
          "jd_analysis":       dict,
          "match_results":     dict,
          "content_plan":      dict,
        }
    """
    if not preferences:
        preferences = {}

    # Extract candidate name for the sign-off
    candidate_name = (
        resume_json.get("full_name")
        or resume_json.get("name")
        or "Candidate"
    )

    # ── Step 1: Resume Analysis ───────────────────────────────────────────
    resume_analysis = step1_analyze_resume(resume_json)

    # ── Step 2: JD Analysis ───────────────────────────────────────────────
    jd_analysis = step2_analyze_jd(job_description)

    # ── Step 3: Matching (pure logic) ─────────────────────────────────────
    match_results = step3_match(resume_analysis, jd_analysis)

    # ── Step 4: Content Planning ──────────────────────────────────────────
    content_plan = step4_plan_content(resume_analysis, jd_analysis, match_results, preferences)

    # ── Step 5: Write + Step 6: Quality (with 1 retry) ────────────────────
    max_attempts = 2
    cover_letter_json = None
    quality = None

    for attempt in range(1, max_attempts + 1):
        logger.info(f"[CL] Write attempt {attempt}/{max_attempts}")
        cover_letter_json = step5_write_letter(
            resume_analysis, match_results, jd_analysis, content_plan, preferences, candidate_name
        )
        quality = step6_quality_check(cover_letter_json, preferences)

        if quality.get("approved", False):
            logger.info(f"[CL] Quality check passed on attempt {attempt} — score: {quality['score']}")
            break
        else:
            logger.warning(
                f"[CL] Quality check FAILED on attempt {attempt} — "
                f"score: {quality['score']}, issues: {quality.get('issues', [])}"
            )
            if attempt < max_attempts:
                # Inject issues as feedback into next writer call via preferences
                preferences["_quality_feedback"] = quality.get("issues", [])

    # ── Count words across all paragraphs ─────────────────────────────────
    all_text = " ".join([
        cover_letter_json.get("opening", ""),
        cover_letter_json.get("body_1", ""),
        cover_letter_json.get("body_2", ""),
        cover_letter_json.get("body_3", ""),
        cover_letter_json.get("closing", ""),
    ])
    word_count = len(all_text.split())

    return {
        "cover_letter_json": cover_letter_json,
        "word_count":        word_count,
        "quality_score":     quality.get("score", 0) if quality else 0,
        "matched_skills":    match_results.get("matching_skills", []),
        "projects_used":     match_results.get("matching_projects", []),
        "analyzer_output":   resume_analysis,
        "jd_analysis":       jd_analysis,
        "match_results":     match_results,
        "content_plan":      content_plan,
    }
