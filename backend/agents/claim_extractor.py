import re
import json
import pathlib
from services.gemini_client import flash
from config import MAX_CLAIMS

_PROMPT = (pathlib.Path(__file__).parent.parent / "prompts" / "extract_claims.txt").read_text()


def _parse_claims(raw: str) -> list[dict] | None:
    """Try multiple strategies to extract a JSON array from raw response."""
    if not raw or not raw.strip():
        return None

    # Strategy 1: direct parse after stripping fences
    clean = re.sub(r"```json|```", "", raw).strip()
    try:
        result = json.loads(clean)
        if isinstance(result, list):
            return result
    except Exception:
        pass

    # Strategy 2: find first [...] block in the response
    match = re.search(r'\[.*\]', clean, re.DOTALL)
    if match:
        try:
            result = json.loads(match.group())
            if isinstance(result, list):
                return result
        except Exception:
            pass

    # Strategy 3: extract individual {...} objects
    objects = re.findall(r'\{[^{}]+\}', clean, re.DOTALL)
    if objects:
        claims = []
        for i, obj in enumerate(objects):
            try:
                c = json.loads(obj)
                if "claim" in c:
                    claims.append(c)
            except Exception:
                pass
        if claims:
            return claims

    return None


async def extract_claims(text: str) -> list[dict]:
    """
    Extract atomic verifiable claims from text.
    Retries once with a simpler prompt if first attempt returns empty/invalid JSON.
    """
    prompt = _PROMPT.format(text=text[:4000], max_claims=MAX_CLAIMS)

    # Attempt 1 — full CoT prompt
    for attempt in range(2):
        try:
            raw    = await flash(prompt)
            claims = _parse_claims(raw)
            if claims:
                return claims[:MAX_CLAIMS]
            print(f"[claim_extractor] Empty/invalid response on attempt {attempt+1}, raw: {repr(raw[:200])}")
        except Exception as e:
            print(f"[claim_extractor] Error attempt {attempt+1}: {e}")

        # Attempt 2 — simpler fallback prompt
        prompt = f"""Extract 4-6 verifiable factual claims from this text as a JSON array.
Each item: {{"id": 1, "claim": "one sentence fact", "context": "surrounding sentence", "checkworthy": true}}
Only respond with the JSON array, nothing else.

TEXT: {text[:2000]}"""

    # Hard fallback — split text into sentences and use first 4
    sentences = [s.strip() for s in re.split(r'[.!?]', text) if len(s.strip()) > 20][:4]
    return [
        {"id": i+1, "claim": s, "context": s, "checkworthy": True}
        for i, s in enumerate(sentences)
    ] or [{"id": 1, "claim": text[:120], "context": "", "checkworthy": True}]
