"""
Agent: Source Trust Scorer
Analyzes the full article/source for credibility BEFORE claim extraction.
Returns a 0-100 trust score with breakdown.
"""
import re
from urllib.parse import urlparse
from services.gemini_client import flash, parse_json
from services.credibility import score_domain, credibility_label, credibility_color

_PROMPT = """
You are a media credibility analyst. Analyze this text for source trustworthiness.

Evaluate:
1. Writing quality — grammar, clarity, professional tone
2. Citation presence — does it reference sources, studies, or experts?
3. Emotional language — sensationalist, fear-mongering, or neutral?
4. Balance — does it present multiple perspectives or only one?
5. Specificity — specific dates, names, figures vs vague claims?
6. Transparency — clear authorship, publication context?

TEXT:
{text}

Respond ONLY with valid JSON:
{{
  "trust_score": 72,
  "writing_quality": 80,
  "citation_score": 60,
  "emotional_score": 75,
  "balance_score": 65,
  "specificity_score": 70,
  "transparency_score": 68,
  "grade": "B",
  "summary": "One sentence describing the overall trustworthiness",
  "red_flags": ["list of specific concerns"],
  "green_flags": ["list of positive credibility signals"]
}}
"""

GRADE_MAP = [
    (90, "A+"), (85, "A"), (80, "A-"),
    (75, "B+"), (70, "B"), (65, "B-"),
    (60, "C+"), (55, "C"), (50, "C-"),
    (40, "D"),  (0,  "F"),
]

def score_to_grade(score: int) -> str:
    for threshold, grade in GRADE_MAP:
        if score >= threshold:
            return grade
    return "F"


async def analyze_source_trust(text: str, url: str = "") -> dict:
    """Full source trust analysis combining domain + content signals."""
    # Domain credibility
    domain_score = score_domain(url) if url else 55
    domain_label = credibility_label(domain_score)
    domain_color = credibility_color(domain_score)

    # Content analysis via Gemini Flash
    try:
        prompt = _PROMPT.format(text=text[:3000])
        raw    = await flash(prompt, max_tokens=512)
        result = parse_json(raw)
        if isinstance(result, dict) and "trust_score" in result:
            # Blend domain score with content score
            content_score = result.get("trust_score", 60)
            blended       = round(domain_score * 0.35 + content_score * 0.65)
            result["trust_score"]    = blended
            result["domain_score"]   = domain_score
            result["domain_label"]   = domain_label
            result["domain_color"]   = domain_color
            result["grade"]          = score_to_grade(blended)
            result["url"]            = url
            return result
    except Exception as e:
        print(f"[source_trust] Error: {e}")

    # Fallback
    blended = domain_score
    return {
        "trust_score":       blended,
        "domain_score":      domain_score,
        "domain_label":      domain_label,
        "domain_color":      domain_color,
        "grade":             score_to_grade(blended),
        "writing_quality":   60,
        "citation_score":    50,
        "emotional_score":   60,
        "balance_score":     55,
        "specificity_score": 55,
        "transparency_score":50,
        "summary":           "Trust analysis unavailable — domain score used.",
        "red_flags":         [],
        "green_flags":       [],
        "url":               url,
    }
