"""
Agent: Misinformation Pattern Detector
Detects known manipulation and misinformation techniques in text.
"""
from services.gemini_client import flash, parse_json

_PROMPT = """
You are an expert in media literacy and misinformation detection.

Analyze this text for known misinformation and manipulation techniques:

TECHNIQUES TO CHECK:
- Cherry-picking: Selecting only facts that support one conclusion
- False equivalence: Treating unequal things as equal
- Emotional manipulation: Using fear, outrage, or panic to override reason
- Misleading statistics: Technically true numbers used deceptively
- Appeal to false authority: Citing unqualified experts
- Straw man: Misrepresenting opposing views to knock them down
- False causation: Implying X caused Y without evidence
- Bandwagon: "Everyone believes..." without evidence
- Loaded language: Words with strong emotional connotations
- Omission bias: Leaving out crucial context

TEXT:
{text}

SELF-REFLECTION: Are you certain each technique is actually present? Only flag what you can specifically point to in the text.

Respond ONLY with valid JSON:
{{
  "overall_manipulation_score": 0.35,
  "techniques_found": [
    {{
      "technique": "emotional manipulation",
      "severity": "high",
      "evidence": "specific phrase or sentence from text that shows this",
      "explanation": "why this is manipulative"
    }}
  ],
  "techniques_clear": ["list of techniques NOT found"],
  "media_literacy_tip": "one actionable tip for the reader",
  "is_dangerous": false,
  "danger_reason": "why this could cause harm if any"
}}
"""


async def detect_misinfo_patterns(text: str) -> dict:
    try:
        prompt = _PROMPT.format(text=text[:3000])
        raw    = await flash(prompt, max_tokens=800)
        result = parse_json(raw)
        if isinstance(result, dict) and "overall_manipulation_score" in result:
            return result
    except Exception as e:
        print(f"[misinfo_detector] Error: {e}")
    return {
        "overall_manipulation_score": 0.0,
        "techniques_found":   [],
        "techniques_clear":   [],
        "media_literacy_tip": "Analysis unavailable.",
        "is_dangerous":       False,
        "danger_reason":      "",
    }
