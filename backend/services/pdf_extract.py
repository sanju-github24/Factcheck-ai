"""
Document text extraction — PDF / DOCX / TXT.

Strategy for PDFs (first result that yields usable text wins):
  1. pypdf        — fast, handles most digital PDFs
  2. pdfplumber   — better on multi-column / table-heavy layouts
  3. Gemini OCR   — scanned/image PDFs, sent to Gemini as a native PDF part

Extracted text is normalised (de-hyphenated, ligatures fixed, repeated
headers/footers dropped) so the claim extractor sees clean prose.
"""
import asyncio
import io
import re
from collections import Counter

import pypdf

MAX_CHARS = 200_000          # hard cap on returned text
OCR_MAX_BYTES = 18 * 1024 * 1024   # Gemini inline-data ceiling
OCR_TIMEOUT = 120            # seconds before a scanned-PDF read is abandoned

# A page that yields fewer than this many chars is treated as "no text layer"
_MIN_CHARS_PER_PAGE = 40

_LIGATURES = {
    "ﬀ": "ff", "ﬁ": "fi", "ﬂ": "fl", "ﬃ": "ffi",
    "ﬄ": "ffl", "ﬅ": "st", "ﬆ": "st",
    "‘": "'", "’": "'", "“": '"', "”": '"',
    "–": "-", "—": "—", " ": " ",
}


def _clean(text: str) -> str:
    """Normalise raw PDF text into readable prose."""
    if not text:
        return ""

    for bad, good in _LIGATURES.items():
        text = text.replace(bad, good)

    # Drop control chars that survive some encodings
    text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", "", text)

    # Join words split across a line break: "inter-\nnational" -> "international"
    text = re.sub(r"(\w)-\s*\n\s*(\w)", r"\1\2", text)

    # A single newline inside a sentence is a soft wrap -> space.
    # Two or more newlines is a real paragraph break -> keep.
    text = re.sub(r"\n{2,}", "␟", text)          # placeholder for para break
    text = re.sub(r"\s*\n\s*", " ", text)
    text = text.replace("␟", "\n\n")

    text = re.sub(r"[ \t]{2,}", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


_EDGE_WINDOW = 3   # how many lines at each page edge can be furniture


def _sig(line: str) -> str:
    """Signature that collapses page numbers: 'Page 3' and 'Page 4' -> 'Page #'."""
    return re.sub(r"\d+", "#", line.strip())


def _strip_running_heads(pages: list[str]) -> list[str]:
    """Remove headers/footers that repeat on most pages (page numbers, titles).

    Extractors do not always emit furniture as the very first/last line, so the
    top and bottom `_EDGE_WINDOW` lines of each page are considered.
    """
    if len(pages) < 4:
        return pages

    threshold = max(3, int(len(pages) * 0.6))
    edge = Counter()

    for p in pages:
        lines = [ln.strip() for ln in p.splitlines() if ln.strip()]
        if not lines:
            continue
        # A line seen at both edges of one page still counts once
        for line in set(lines[:_EDGE_WINDOW] + lines[-_EDGE_WINDOW:]):
            if len(line) < 80:
                edge[_sig(line)] += 1

    drop = {k for k, n in edge.items() if n >= threshold}
    if not drop:
        return pages

    out = []
    for p in pages:
        lines = [ln for ln in p.splitlines()]
        # Strip matching lines from the top, allowing gaps within the window
        for _ in range(_EDGE_WINDOW):
            for i in range(min(_EDGE_WINDOW, len(lines))):
                if lines[i].strip() and _sig(lines[i]) in drop:
                    lines.pop(i)
                    break
            else:
                break
        for _ in range(_EDGE_WINDOW):
            for i in range(1, min(_EDGE_WINDOW, len(lines)) + 1):
                if lines[-i].strip() and _sig(lines[-i]) in drop:
                    lines.pop(len(lines) - i)
                    break
            else:
                break
        out.append("\n".join(lines))
    return out


# ── Extractor 1: pypdf ─────────────────────────────────────────────────────
def _extract_pypdf(data: bytes) -> tuple[list[str], int]:
    reader = pypdf.PdfReader(io.BytesIO(data))
    if reader.is_encrypted:
        try:
            reader.decrypt("")          # many PDFs use an empty owner password
        except Exception:
            raise ValueError("PDF is password-protected.")
    pages = []
    for page in reader.pages:
        try:
            pages.append(page.extract_text() or "")
        except Exception:
            pages.append("")
    return pages, len(reader.pages)


# ── Extractor 2: pdfplumber ────────────────────────────────────────────────
def _extract_pdfplumber(data: bytes) -> tuple[list[str], int]:
    import pdfplumber
    pages = []
    with pdfplumber.open(io.BytesIO(data)) as pdf:
        for page in pdf.pages:
            try:
                pages.append(page.extract_text(x_tolerance=1.5) or "")
            except Exception:
                pages.append("")
        return pages, len(pdf.pages)


# ── Extractor 3: Gemini OCR (scanned PDFs) ─────────────────────────────────
async def _extract_gemini_ocr(data: bytes) -> str:
    from services.gemini_client import read_pdf
    return await read_pdf(
        data,
        "Transcribe ALL readable text from this PDF, in reading order. "
        "Preserve paragraph breaks. Do not summarise, do not add commentary, "
        "do not add page markers — output the raw text only.",
    )


def _usable(pages: list[str]) -> bool:
    """True if the text layer produced meaningful content."""
    joined = "".join(pages).strip()
    if len(joined) < _MIN_CHARS_PER_PAGE:
        return False
    # Require a reasonable share of letters — guards against garbled CID output
    letters = sum(c.isalpha() for c in joined)
    return letters / max(len(joined), 1) > 0.5


async def extract_pdf(data: bytes) -> dict:
    """Extract text from PDF bytes, escalating through three strategies."""
    pages, n_pages, method, errors = [], 0, "", []

    for name, fn in (("pypdf", _extract_pypdf), ("pdfplumber", _extract_pdfplumber)):
        try:
            pages, n_pages = fn(data)
            if _usable(pages):
                method = name
                break
        except ValueError:
            raise
        except Exception as e:
            errors.append(f"{name}: {e}")
            pages = []

    if method:
        pages = _strip_running_heads(pages)
        text = _clean("\n\n".join(pages))
    else:
        # Nothing could even open the file structurally — it is corrupt, not
        # scanned. Fail fast rather than paying for an OCR call that cannot help.
        if n_pages == 0:
            print(f"[pdf_extract] unparseable PDF: {'; '.join(errors)}")
            raise ValueError(
                "This PDF could not be opened — it appears to be corrupted or "
                "not a valid PDF file."
            )

        # Parsed fine but no text layer — a scanned document. Try Gemini OCR.
        if len(data) > OCR_MAX_BYTES:
            raise ValueError(
                "This looks like a scanned PDF and it is too large to OCR "
                f"({len(data)//1024//1024} MB). Try a smaller file."
            )
        try:
            text = _clean(await asyncio.wait_for(
                _extract_gemini_ocr(data), timeout=OCR_TIMEOUT))
            method = "gemini-ocr"
        except asyncio.TimeoutError:
            raise ValueError(
                "Reading this scanned PDF timed out. Try a smaller file, or "
                "paste the text directly."
            )
        except Exception as e:
            errors.append(f"gemini-ocr: {e}")
            print(f"[pdf_extract] OCR failed: {e}")
            raise ValueError(
                "Could not read any text from this PDF. It may be a scanned "
                "image, corrupted, or password-protected."
            )

    truncated = len(text) > MAX_CHARS
    return {
        "text":      text[:MAX_CHARS],
        "pages":     n_pages,
        "chars":     min(len(text), MAX_CHARS),
        "method":    method,
        "truncated": truncated,
        "warnings":  errors,
    }


def extract_docx(data: bytes) -> dict:
    import docx
    d = docx.Document(io.BytesIO(data))
    parts = [p.text for p in d.paragraphs if p.text.strip()]
    for table in d.tables:
        for row in table.rows:
            cells = [c.text.strip() for c in row.cells if c.text.strip()]
            if cells:
                parts.append(" | ".join(cells))
    text = _clean("\n\n".join(parts))
    return {
        "text": text[:MAX_CHARS], "pages": 0, "chars": min(len(text), MAX_CHARS),
        "method": "python-docx", "truncated": len(text) > MAX_CHARS, "warnings": [],
    }


def extract_txt(data: bytes) -> dict:
    for enc in ("utf-8", "utf-16", "latin-1"):
        try:
            text = _clean(data.decode(enc))
            break
        except UnicodeDecodeError:
            continue
    else:
        text = _clean(data.decode("utf-8", errors="replace"))
    return {
        "text": text[:MAX_CHARS], "pages": 0, "chars": min(len(text), MAX_CHARS),
        "method": "plain-text", "truncated": len(text) > MAX_CHARS, "warnings": [],
    }


async def extract_document(filename: str, data: bytes) -> dict:
    """Dispatch on file extension. Raises ValueError with a user-facing message."""
    if not data:
        raise ValueError("Uploaded file is empty.")

    name = (filename or "").lower()
    if name.endswith(".pdf") or data[:5] == b"%PDF-":
        return await extract_pdf(data)
    if name.endswith((".docx", ".doc")):
        return extract_docx(data)
    if name.endswith((".txt", ".md", ".csv")):
        return extract_txt(data)

    raise ValueError(f"Unsupported file type: {filename}. Use PDF, DOCX, TXT or MD.")
