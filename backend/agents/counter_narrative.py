"""
Agent: Counter-Narrative Generator
For FALSE or PARTIALLY TRUE claims, generates the accurate correction
and rates claim severity/danger level.
"""
from services.gemini_client import flash, parse_json

_PROMPT = """
You are a fact-correction specialist. A claim has been verified as "{verdict}".

CLAIM: "{claim}"
EVIDENCE SUMMARY: "{summary}"
SUPPORTING EVIDENCE: {supporting}
CONTRADICTING EVIDENCE: {contradicting}

Your tasks:
1. Write the CORRECT version of this fact in one clear sentence (if claim is false/partial)
2. Explain WHY the original claim is wrong/misleading in simple terms
3. Rate the SEVERITY of this misinformation:
   - "low": minor factual error, little real-world impact
   - "medium": misleading, could cause confusion or poor decisions
   - "high": dangerous misinformation — health, safety, or democracy risk
4. Suggest what someone should do to verify this themselves

Respond ONLY with valid JSON:
{{
  "correction": "The correct fact is: ...",
  "why_wrong": "One sentence explaining the error",
  "severity": "low|medium|high",
  "severity_reason": "why this severity level",
  "verify_tip": "How to verify this yourself: ...",
  "flame_count": 1
}}

flame_count: 1=low, 2=medium, 3=high severity
"""


async def generate_counter_narrative(claim_result: dict) -> dict:
    """Only runs for false or partially true claims."""
    verdict = claim_result.get("verdict", "")
    if verdict not in ("false", "partially true"):
        return {}

    try:
        prompt = _PROMPT.format(
            verdict    = verdict,
            claim      = claim_result.get("claim", ""),
            summary    = claim_result.get("summary", ""),
            supporting = claim_result.get("supporting_evidence", []),
            contradicting = claim_result.get("contradicting_evidence", []),
        )
        raw    = await flash(prompt, max_tokens=512)
        result = parse_json(raw)
        if isinstance(result, dict) and "correction" in result:
            return result
    except Exception as e:
        print(f"[counter_narrative] Error: {e}")
    return {}


async def batch_counter_narratives(results: list[dict]) -> list[dict]:
    """Add counter-narratives to all false/partial claims."""
    import asyncio
    tasks = [generate_counter_narrative(r) for r in results]
    narratives = await asyncio.gather(*tasks)
    for i, narr in enumerate(narratives):
        results[i]["counter_narrative"] = narr
    return results
