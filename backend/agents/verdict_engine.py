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
    "image_type": "none",
    "image_label": "",
    "time_sensitive": False,
    "time_sensitive_reason": "",
}


def _correction_query(claim: str, summary: str, contradicting: list) -> str:
    base = (contradicting[0] if contradicting else summary or claim)[:120]
    for neg in ["is not", "was not", "did not", "does not", "never", "incorrect", "false"]:
        base = base.replace(neg, "").replace(neg.title(), "")
    return base.strip()[:100]


async def verdict(claim: str, evidence_text: str, raw_results: list[dict], input_type: str = "text") -> dict:
    prompt = _PROMPT.format(claim=claim, evidence=evidence_text[:6000])
    try:
        raw    = await pro(prompt)
        result = parse_json(raw)
        if not isinstance(result, dict) or "verdict" not in result:
            return _FALLBACK.copy()

        # Enrich sources
        sources = result.get("sources", [])
        if not sources and raw_results:
            sources = [{"title": r["title"], "url": r["url"], "relevance": "Retrieved evidence source"} for r in raw_results[:3]]
        result["sources"] = enrich_sources(sources)

        v = result.get("verdict", "unverifiable")

        # ── For TEXT input — fetch search result images per claim ──────────
        # For URL input — article images handled separately in orchestrator
        if input_type == "text":
            if v in ("true", "partially true"):
                # Show supporting images from search results
                image_urls = collect_images(raw_results)
                result["images"]      = image_urls
                result["image_type"]  = "truth"
                result["image_label"] = "Supporting Evidence"
                if image_urls:
                    result["image_analysis"] = await analyze_images(image_urls)
                else:
                    result["image_analysis"] = []

            elif v == "false":
                # Search for correction images showing the correct fact
                query = _correction_query(claim, result.get("summary",""), result.get("contradicting_evidence",[]))
                print(f"[verdict_engine] Fetching correction images: '{query}'")
                try:
                    corr_results  = search(query, max_results=4)
                    corr_images   = collect_images(corr_results)
                    result["images"]      = corr_images
                    result["image_type"]  = "correction"
                    result["image_label"] = "What's Actually True"
                    if corr_images:
                        result["image_analysis"] = await analyze_images(corr_images)
                    else:
                        result["image_analysis"] = []
                except Exception as e:
                    print(f"[verdict_engine] Correction image error: {e}")
                    result["images"] = []
                    result["image_analysis"] = []
                    result["image_type"]  = "none"
                    result["image_label"] = ""
            else:
                result["images"]         = []
                result["image_analysis"] = []
                result["image_type"]     = "none"
                result["image_label"]    = ""
        else:
            # URL input — images come from article scraper, not per-claim
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