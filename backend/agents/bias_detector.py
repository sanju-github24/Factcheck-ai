"""
Agent 6 — Bias Detector
Uses Gemini Flash to detect political, commercial, or ideological bias in source text.
"""
from services.gemini_client import flash, parse_json

_PROMPT = """
You are an expert media analyst specializing in detecting bias in written content.

Analyze the text below for bias. Consider:
- Political leaning (left / center / right)
- Commercial or advertorial bias
- Emotional or sensationalist language
- Selection bias (only presenting one side)
- Loaded or charged language

TEXT:
{text}

Rate overall bias intensity 0.0 (completely neutral) to 1.0 (extremely biased).

Respond ONLY with valid JSON. No markdown:
{{
  "bias_score": 0.XX,
  "bias_type": "political|commercial|ideological|sensationalist|none",
  "political_leaning": "left|center-left|center|center-right|right|none",
  "summary": "One sentence explanation of the bias finding",
  "signals": ["specific phrase or pattern that indicates bias", "..."]
}}
"""


async def detect_bias(text: str) -> dict:
    try:
        prompt = _PROMPT.format(text=text[:2500])
        raw    = await flash(prompt, max_tokens=512)
        result = parse_json(raw)
        if isinstance(result, dict) and "bias_score" in result:
            return result
    except Exception as e:
        print(f"[bias_detector] Error: {e}")
    return {
        "bias_score": 0.0,
        "bias_type": "none",
        "political_leaning": "center",
        "summary": "Bias analysis unavailable.",
        "signals": [],
    }
