"""
Document extraction router — POST /api/extract

Accepts a multipart file upload (PDF / DOCX / TXT) and returns clean text
ready to feed into the fact-check pipeline.
"""
from fastapi import APIRouter, File, UploadFile, HTTPException

from services.pdf_extract import extract_document

router = APIRouter()

MAX_UPLOAD = 25 * 1024 * 1024   # 25 MB


@router.post("/extract")
async def extract(file: UploadFile = File(...)):
    data = await file.read()

    if len(data) > MAX_UPLOAD:
        raise HTTPException(413, f"File too large ({len(data)//1024//1024} MB). Max 25 MB.")

    try:
        result = await extract_document(file.filename or "", data)
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        print(f"[extract] {file.filename}: {e}")
        raise HTTPException(500, f"Extraction failed: {e}")

    if not result["text"].strip():
        raise HTTPException(400, "No readable text found in this document.")

    print(f"[extract] {file.filename} → {result['chars']} chars "
          f"via {result['method']} ({result['pages']} pages)")

    return {
        "status":    "ok",
        "filename":  file.filename,
        **result,
    }
