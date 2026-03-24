from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from models.request import CheckRequest
from orchestrator import run_pipeline

router = APIRouter()


@router.post("/check")
async def check(req: CheckRequest):
    return StreamingResponse(
        run_pipeline(
            req.input,
            req.input_type,
            web_enabled=req.web_enabled,
            doc_text=req.doc_text,
            doc_query=req.doc_query,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )
