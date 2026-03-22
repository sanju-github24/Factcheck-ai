import pathlib
from services.gemini_client import pro, parse_json
from services.search import search, collect_images
from services.credibility import enrich_sources
from services.image_detector import analyze_images

_PROMPT = (pathlib.Path(__file__).parent.parent / "prompts" / "verify_claim.txt").read_text()

_FALLBACK = {
    "verdict": "unverifiable",
    "confidence": 0.1,
    "summary": "Evidence retrieval or model call failed for this claim.",
    "supporting_evidence": [],
    "contradicting_evidence": [],
    "sources": [],
    "nuance": "",
    "images": [],
    "image_analysis": [],
    "image_type": "none",      # "truth" | "correction" | "none"
    "image_label": "",
    "time_sensitive": False,
    "time_sensitive_reason": "",
}


def _build_correction_query(claim: str, summary: str, contradicting: list[str]) -> str:
    """
    Build an image search query for the CORRECT fact
    when the original claim is false.
    """
    # Use the first contradicting evidence sentence as the correction query
    if contradicting and contradicting[0]:
        base = contradicting[0][:120]
    elif summary:
        # Strip negation words from summary to get positive search query
        base = summary[:120]
    else:
        base = claim[:80]

    # Remove negation language to get a positive image search
    for neg in ["is not", "was not", "did not", "does not", "never", "incorrect", "false"]:
        base = base.replace(neg, "").replace(neg.title(), "")

    return base.strip()[:100]


async def verdict(claim: str, evidence_text: str, raw_results: list[dict]) -> dict:
    prompt = _PROMPT.format(claim=claim, evidence=evidence_text[:6000])
    try:
        raw    = await pro(prompt)
        result = parse_json(raw)
        if isinstance(result, dict) and "verdict" in result:

            # Enrich sources with credibility scores
            sources = result.get("sources", [])
            if not sources and raw_results:
                sources = [
                    {"title": r["title"], "url": r["url"], "relevance": "Retrieved evidence source"}
                    for r in raw_results[:3]
                ]
            result["sources"] = enrich_sources(sources)

            v = result.get("verdict", "unverifiable")

            # ── TRUE / PARTIALLY TRUE: show supporting images ──────────────
            if v in ("true", "partially true"):
                image_urls = collect_images(raw_results)
                result["images"]      = image_urls
                result["image_type"]  = "truth"
                result["image_label"] = "Supporting Evidence"
                if image_urls:
                    result["image_analysis"] = await analyze_images(image_urls)
                else:
                    result["image_analysis"] = []

            # ── FALSE: search for CORRECTION images ────────────────────────
            elif v == "false":
                correction_query = _build_correction_query(
                    claim,
                    result.get("summary", ""),
                    result.get("contradicting_evidence", []),
                )
                print(f"[verdict_engine] Fetching correction images for: '{correction_query}'")
                try:
                    correction_results = search(correction_query, max_results=4)
                    correction_images  = collect_images(correction_results)
                    result["images"]      = correction_images
                    result["image_type"]  = "correction"
                    result["image_label"] = "What's Actually True"
                    if correction_images:
                        result["image_analysis"] = await analyze_images(correction_images)
                    else:
                        result["image_analysis"] = []
                except Exception as e:
                    print(f"[verdict_engine] Correction image search failed: {e}")
                    result["images"]         = []
                    result["image_analysis"] = []
                    result["image_type"]     = "none"
                    result["image_label"]    = ""

            # ── UNVERIFIABLE: no images ─────────────────────────────────────
            else:
                result["images"]         = []
                result["image_analysis"] = []
                result["image_type"]     = "none"
                result["image_label"]    = ""

            result.setdefault("time_sensitive", False)
            result.setdefault("time_sensitive_reason", "")
            return result

    except Exception as e:
        print(f"[verdict_engine] Error: {e}")
    return _FALLBACK.copy()
