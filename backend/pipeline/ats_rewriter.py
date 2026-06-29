import os
import requests
import logging
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

_NVAI_URL = "https://integrate.api.nvidia.com/v1/chat/completions"
_MODEL = "meta/llama-3.1-8b-instruct"

def _get_headers() -> dict:
    api_key = os.getenv("NVIDIA_API_KEY")
    if not api_key:
        raise EnvironmentError("NVIDIA_API_KEY is not set. Check backend/.env")
    return {
        "Authorization": f"Bearer {api_key}",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }

def _load_prompt() -> str:
    prompt_path = Path(__file__).parent / "ats_prompt.md"
    if not prompt_path.exists():
        raise FileNotFoundError(f"ATS prompt file not found at {prompt_path}")
    with open(prompt_path, "r", encoding="utf-8") as f:
        return f.read().strip()

def rewrite_text_for_ats(
    text: str,
    temperature: float = 0.3,
    max_tokens: int = 4096,
    timeout: int = 60,
) -> str:
    """
    Rewrites the given text to make it ATS-friendly using LLaMA 3.1 8B.
    """
    if not text or not text.strip():
        return ""

    system_prompt = _load_prompt()
    
    # We will pass the ats prompt as the system prompt and append the text to rewrite
    user_content = f"{text}"

    payload = {
        "model": _MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content},
        ],
        "max_tokens": max_tokens,
        "temperature": temperature,
    }

    try:
        resp = requests.post(_NVAI_URL, headers=_get_headers(), json=payload, timeout=timeout)
        resp.raise_for_status()
    except requests.HTTPError as e:
        raise RuntimeError(f"Llama NIM HTTP {resp.status_code}: {resp.text[:400]}") from e
    except requests.RequestException as e:
        raise RuntimeError(f"Llama NIM request failed: {e}") from e

    try:
        raw_content = resp.json()["choices"][0]["message"]["content"]
    except (KeyError, IndexError) as e:
        raise RuntimeError(f"Unexpected Llama NIM response shape: {resp.text[:400]}") from e

    # Sometimes the model replies with "Here is the rewritten text:\n\n" despite instructions.
    # We strip any obvious prefixes/suffixes if present.
    cleaned = raw_content.strip()
    
    logger.info(f"ATS rewrite complete for text length {len(text)}. Output length: {len(cleaned)}")
    return cleaned

if __name__ == "__main__":
    # Test script if executed directly
    sample = "I worked as a software dev made verything work thats it"
    print(rewrite_text_for_ats(sample))


_GRAMMAR_SYSTEM_PROMPT = """You are an expert professional resume editor. Your sole task is to check the provided resume text for grammar, spelling, and ATS optimization issues.

Output ONLY a JSON array with this exact shape (no extra text):
[
  {"type": "grammar", "severity": "error", "original": "...", "suggestion": "...", "message": "Brief explanation"},
  {"type": "ats", "severity": "warning", "original": "...", "suggestion": "...", "message": "Brief explanation"}
]

severity must be one of: "error", "warning", "suggestion"
type must be one of: "grammar", "ats", "clarity"

ATS issues to flag: first-person pronouns (I, me, my), passive voice, weak action verbs, missing quantification in achievement statements, unprofessional phrasing.
Grammar issues: spelling errors, punctuation, capitalization, sentence fragments.
If there are no issues, return an empty array: []

IMPORTANT: Output ONLY the JSON array. No explanations, no markdown fences."""


def grammar_check_text(
    text: str,
    temperature: float = 0.1,
    max_tokens: int = 1024,
    timeout: int = 30,
) -> list:
    """
    Checks the given text for grammar and ATS issues.
    Returns a list of issue dicts: [{ type, severity, original, suggestion, message }]
    """
    import json

    if not text or not text.strip():
        return []

    payload = {
        "model": _MODEL,
        "messages": [
            {"role": "system", "content": _GRAMMAR_SYSTEM_PROMPT},
            {"role": "user", "content": text},
        ],
        "max_tokens": max_tokens,
        "temperature": temperature,
    }

    try:
        resp = requests.post(_NVAI_URL, headers=_get_headers(), json=payload, timeout=timeout)
        resp.raise_for_status()
        raw = resp.json()["choices"][0]["message"]["content"].strip()
        # Strip markdown fences if model wraps it anyway
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        issues = json.loads(raw)
        return issues if isinstance(issues, list) else []
    except Exception as e:
        logger.warning(f"Grammar check failed: {e}")
        return []

