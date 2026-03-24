from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import json
from agents.language_detector import translate_claim_result, translate_to

router = APIRouter()


class TranslateRequest(BaseModel):
    report:   dict
    language: str   # target language e.g. "English" or "Kannada"


async def _translate_stream(report: dict, language: str):
    """Stream translated claim results one by one."""

    def emit(data: dict) -> str:
        return f"data: {json.dumps(data)}\n\n"

    yield emit({"stage": "translating", "message": f"Translating to {language}…"})

    claims = report.get("claims", [])
    translated_claims = []

    for i, claim in enumerate(claims):
        yield emit({
            "stage":   "translating",
            "message": f"Translating claim {i+1}/{len(claims)}…",
        })
        translated = await translate_claim_result(claim, language)
        translated_claims.append(translated)
        yield emit({
            "stage":        "translating",
            "claimResult":  translated,
            "claimIndex":   i,
        })

    # Translate summary fields
    yield emit({"stage": "translating", "message": "Translating analysis panels…"})

    # Build translated report
    translated_report = dict(report)
    translated_report["claims"] = translated_claims
    translated_report["translatedTo"] = language

    yield emit({
        "stage":  "complete",
        "report": translated_report,
        "message": f"Translation to {language} complete!",
    })
    yield "data: [DONE]\n\n"


@router.post("/translate")
async def translate_report(req: TranslateRequest):
    return StreamingResponse(
        _translate_stream(req.report, req.language),
        media_type="text/event-stream",
        headers={
            "Cache-Control":    "no-cache",
            "X-Accel-Buffering": "no",
            "Connection":       "keep-alive",
        },
    )