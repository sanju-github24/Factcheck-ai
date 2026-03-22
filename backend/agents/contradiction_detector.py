"""
Agent 5 — Cross-Claim Contradiction Detector
Uses Gemini Flash to find claims within the same document that contradict each other.
"""
import json
from services.gemini_client import flash, parse_json

_PROMPT = """
You are an expert at logical analysis. Below is a list of verified claims from the same document.
Your job: find pairs of claims that logically CONTRADICT each other.

CLAIMS:
{claims_json}

Rules:
- Only flag genuine logical contradictions, not just different topics.
- A claim marked "false" does NOT automatically contradict the original text.
- Focus on contradictions BETWEEN claims themselves.
- Return empty array [] if no contradictions exist.

Respond ONLY with valid JSON array. No markdown:
[
  {{
    "claim_id_a": 1,
    "claim_id_b": 3,
    "explanation": "Claim 1 states X while claim 3 states the opposite Y"
  }}
]
"""


async def detect_contradictions(results: list[dict]) -> list[dict]:
    if len(results) < 2:
        return []
    try:
        claims_simple = [
            {"id": r["id"], "claim": r["claim"], "verdict": r["verdict"]}
            for r in results
        ]
        prompt = _PROMPT.format(claims_json=json.dumps(claims_simple, indent=2))
        raw    = await flash(prompt, max_tokens=512)
        parsed = parse_json(raw)
        if isinstance(parsed, list):
            return parsed
    except Exception as e:
        print(f"[contradiction_detector] Error: {e}")
    return []
