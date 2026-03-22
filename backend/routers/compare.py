from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from compare_pipeline import compare_pipeline

router = APIRouter()


class CompareRequest(BaseModel):
    input_a:  str
    type_a:   str = "text"
    label_a:  str = "Source A"
    input_b:  str
    type_b:   str = "text"
    label_b:  str = "Source B"


@router.post("/compare")
async def compare(req: CompareRequest):
    return StreamingResponse(
        compare_pipeline(
            req.input_a, req.type_a, req.label_a,
            req.input_b, req.type_b, req.label_b,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )
