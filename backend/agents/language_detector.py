"""
Language Detector — detects language of input text and translates
content back to that language for the final report.
"""
from services.gemini_client import flash, parse_json

_DETECT_PROMPT = """Detect the language of this text and return metadata.

TEXT:
{text}

Respond ONLY with valid JSON:
{{
  "language": "English",
  "language_code": "en",
  "script": "Latin",
  "confidence": 0.99,
  "is_english": true,
  "rtl": false
}}

Common language codes: en=English, hi=Hindi, ta=Tamil, te=Telugu,
kn=Kannada, ml=Malayalam, mr=Marathi, bn=Bengali, pa=Punjabi,
es=Spanish, fr=French, de=German, ar=Arabic, zh=Chinese, ja=Japanese,
pt=Portuguese, ru=Russian, ko=Korean, it=Italian, tr=Turkish
"""

_TRANSLATE_PROMPT = """Translate the following text to {language}.
Keep all proper nouns, numbers, dates, and technical terms unchanged.
Preserve the meaning exactly.
Return ONLY the translated text, nothing else.

TEXT:
{text}"""


async def detect_language(text: str) -> dict:
    """Detect the language of input text."""
    try:
        prompt = _DETECT_PROMPT.format(text=text[:500])
        raw    = await flash(prompt, max_tokens=200)
        result = parse_json(raw)
        if isinstance(result, dict) and "language_code" in result:
            print(f"[language] Detected: {result['language']} ({result['language_code']})")
            return result
    except Exception as e:
        print(f"[language] Detection error: {e}")
    return {
        "language":      "English",
        "language_code": "en",
        "script":        "Latin",
        "confidence":    1.0,
        "is_english":    True,
        "rtl":           False,
    }


async def translate_to(text: str, language: str) -> str:
    """
    Translate text to any target language including English.
    No early return — always translates.
    """
    if not text or not text.strip():
        return text
    try:
        prompt = _TRANSLATE_PROMPT.format(language=language, text=text[:800])
        result = await flash(prompt, max_tokens=800)
        translated = result.strip()
        print(f"[language] Translated to {language}: {translated[:60]}...")
        return translated
    except Exception as e:
        print(f"[language] Translation error: {e}")
        return text


async def translate_claim_result(result: dict, language: str) -> dict:
    """
    Translate key fields of a claim result to target language.
    Works for ANY direction — Kannada→English, English→Hindi, etc.
    """
    import asyncio

    # Skip only if text is already in the target language
    current_lang = result.get("_lang", "")
    if current_lang.lower() == language.lower():
        print(f"[language] Already in {language}, skipping")
        return result

    print(f"[language] Translating claim to {language}...")

    fields = {
        "summary": result.get("summary", ""),
        "nuance":  result.get("nuance", ""),
    }
    supporting    = result.get("supporting_evidence", [])
    contradicting = result.get("contradicting_evidence", [])

    # Run all translations in parallel
    field_tasks  = [translate_to(v, language) for v in fields.values() if v]
    sup_tasks    = [translate_to(e, language) for e in supporting[:4]]
    contra_tasks = [translate_to(e, language) for e in contradicting[:4]]

    all_results = await asyncio.gather(*field_tasks, *sup_tasks, *contra_tasks)

    # Reassemble
    translated = dict(result)
    idx = 0
    for k in fields:
        if fields[k]:
            translated[k] = all_results[idx]
            idx += 1

    translated["supporting_evidence"]    = list(all_results[idx:idx + len(sup_tasks)])
    idx += len(sup_tasks)
    translated["contradicting_evidence"] = list(all_results[idx:idx + len(contra_tasks)])
    translated["_lang"] = language

    return translated