"""
Document Verification — Two Stage Pipeline
Stage 1: Verify claim ONLY from uploaded document (PDF/DOCX/TXT)
Stage 2: Verify same claim via Tavily live web search (optional)
"""
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import json
from services.gemini_client import flash, parse_json
from services.search import search, format_results
from services.credibility import enrich_sources
from services.vectordb import store_document, query_document

router = APIRouter()


class DocVerifyRequest(BaseModel):
    document_text: str
    query:         str
    stage:         int = 1


def _emit(data: dict) -> str:
    return f"data: {json.dumps(data)}\n\n"


# ── Stage 1 prompt — document ONLY ────────────────────────────────────────
_STAGE1_PROMPT = """You are a fact-checker. Verify the claim below using ONLY the document passages provided.

IMPORTANT RULES:
- Use ONLY the document passages below as your source
- Do NOT use any external knowledge or training data
- If claim is not mentioned in the document, verdict = "not mentioned"
- Quote exact text from the document as evidence

CLAIM: "{query}"

DOCUMENT PASSAGES (from vector search):
{passages}

Respond ONLY with valid JSON — no markdown:
{{
  "verdict": "true|false|partially true|not mentioned",
  "confidence": 0.85,
  "summary": "One clear sentence explaining the verdict based on the document",
  "supporting": ["exact quote from document supporting the claim"],
  "contradicting": ["exact quote from document contradicting the claim"],
  "relevant_section": "The most relevant paragraph from the document"
}}"""


# ── Stage 2 prompt — web search ────────────────────────────────────────────
_STAGE2_PROMPT = """You are a fact-checker. Verify the claim using ONLY the web search results below.

CLAIM: "{query}"

WEB EVIDENCE:
{evidence}

Respond ONLY with valid JSON — no markdown:
{{
  "verdict": "true|false|partially true|unverifiable",
  "confidence": 0.85,
  "summary": "One clear sentence based on web evidence",
  "supporting": ["specific fact from web source"],
  "contradicting": ["contradicting fact if any"],
  "sources": [{{"title": "...", "url": "..."}}]
}}"""


async def _run_stage1(document_text: str, query: str):
    # Index document in vector DB
    yield _emit({"stage": 1, "step": "indexing",
                 "message": "Indexing document in vector database…"})

    store_info = store_document(document_text, "uploaded_document")
    chunks = store_info.get("chunks", 0)
    yield _emit({"stage": 1, "step": "searching",
                 "message": f"Indexed {chunks} chunks. Searching for relevant passages…"})

    # Semantic search
    passages = query_document(query, document_text, top_k=6)
    yield _emit({"stage": 1, "step": "verifying",
                 "message": "Verifying claim against document…"})

    try:
        prompt = _STAGE1_PROMPT.format(query=query, passages=passages[:5000])
        raw    = await flash(prompt, max_tokens=1000)
        result = parse_json(raw)
        if isinstance(result, dict) and "verdict" in result:
            yield _emit({
                "stage":   1,
                "step":    "complete",
                "message": f"Document verdict: {result['verdict'].upper()} ({round(result.get('confidence',0)*100)}% confidence)",
                "result":  result,
            })
        else:
            yield _emit({"stage": 1, "step": "error",
                         "message": "Could not parse result", "result": None})
    except Exception as e:
        print(f"[docverify] Stage 1 error: {e}")
        yield _emit({"stage": 1, "step": "error",
                     "message": f"Error: {str(e)}", "result": None})

    yield "data: [STAGE1_DONE]\n\n"


async def _run_stage2(query: str):
    yield _emit({"stage": 2, "step": "searching",
                 "message": f"Searching web for: {query[:60]}…"})

    try:
        results      = search(query, max_results=5)
        evidence     = format_results(results)
        raw_sources  = [{"title": r["title"], "url": r["url"]} for r in results]
        enriched     = enrich_sources(raw_sources)

        yield _emit({"stage": 2, "step": "verifying",
                     "message": f"Found {len(results)} web sources. Verifying…"})

        prompt = _STAGE2_PROMPT.format(query=query, evidence=evidence[:5000])
        raw    = await flash(prompt, max_tokens=1000)
        result = parse_json(raw)

        if isinstance(result, dict) and "verdict" in result:
            result["sources"] = enriched
            yield _emit({
                "stage":   2,
                "step":    "complete",
                "message": f"Web verdict: {result['verdict'].upper()} ({round(result.get('confidence',0)*100)}% confidence)",
                "result":  result,
            })
        else:
            yield _emit({"stage": 2, "step": "error",
                         "message": "Could not parse web result", "result": None})
    except Exception as e:
        print(f"[docverify] Stage 2 error: {e}")
        yield _emit({"stage": 2, "step": "error",
                     "message": f"Error: {str(e)}", "result": None})

    yield "data: [DONE]\n\n"


@router.post("/docverify")
async def docverify(req: DocVerifyRequest):
    gen = _run_stage1(req.document_text, req.query) if req.stage == 1 \
          else _run_stage2(req.query)
    return StreamingResponse(gen, media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})