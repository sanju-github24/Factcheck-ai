"""
Document Q&A Router
Ask questions from uploaded document content using Gemini.
"""
from fastapi import APIRouter
from pydantic import BaseModel
from services.gemini_client import flash
from services.search import search, format_results

router = APIRouter()


class DocQARequest(BaseModel):
    document_text: str
    question:      str
    history:       list[dict] = []
    web_search:    bool = False   # True = augment with web evidence


@router.post("/docqa")
async def doc_qa(req: DocQARequest):
    """Answer question from document. Optionally augment with web search."""

    history_text = ""
    for msg in req.history[-6:]:
        role = "User" if msg["role"] == "user" else "Assistant"
        history_text += f"{role}: {msg['content']}\n"

    web_context = ""
    if req.web_search:
        try:
            print(f"[docqa] Web search ON — searching: {req.question[:60]}")
            results = search(req.question, max_results=3)
            web_context = format_results(results)
        except Exception as e:
            print(f"[docqa] Web search error: {e}")

    if req.web_search and web_context:
        prompt = f"""You are a helpful assistant. Answer the question using BOTH the document AND web search results.
Clearly indicate when information comes from the document vs the web.
If they contradict each other, highlight the difference.

DOCUMENT:
{req.document_text[:4000]}

WEB SEARCH RESULTS:
{web_context[:2000]}

{f"Previous conversation:{chr(10)}{history_text}" if history_text else ""}

Question: {req.question}

Answer (cite source — document or web):"""
    else:
        prompt = f"""You are a document reader. Your ONLY source of information is the document below.

STRICT RULES:
- Answer ONLY from the document text provided
- Do NOT use any external knowledge, training data, or general knowledge
- If the answer is not in the document, say exactly: "This information is not in the document."
- Quote the exact sentence from the document that answers the question

DOCUMENT START
{req.document_text[:6000]}
DOCUMENT END

{f"Previous conversation:{chr(10)}{history_text}" if history_text else ""}

Question: {req.question}

Answer (from document only):"""

    try:
        print(f"[docqa] web={req.web_search} | doc={len(req.document_text)} chars | Q: {req.question[:60]}")
        answer = await flash(prompt, max_tokens=800)
        return {
            "answer":     answer.strip(),
            "status":     "ok",
            "web_used":   req.web_search and bool(web_context),
        }
    except Exception as e:
        return {"answer": f"Error: {str(e)}", "status": "error", "web_used": False}