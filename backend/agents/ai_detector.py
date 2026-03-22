import pathlib
from services.gemini_client import flash, parse_json

_PROMPT = (pathlib.Path(__file__).parent.parent / "prompts" / "detect_ai.txt").read_text()


async def detect_ai(text: str) -> dict:
    """
    Uses Gemini 2.0 Flash.
    Returns {ai_probability, reasoning, signals}
    """
    prompt = _PROMPT.format(text=text[:2500])
    try:
        raw = await flash(prompt)
        result = parse_json(raw)
        if isinstance(result, dict) and "ai_probability" in result:
            return result
    except Exception as e:
        print(f"[ai_detector] Error: {e}")
    return {"ai_probability": 0.35, "reasoning": "Detection unavailable.", "signals": []}
