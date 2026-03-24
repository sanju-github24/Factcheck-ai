import pathlib
from services.gemini_client import pro, parse_json
from services.rag import rag_evidence
from services.search import search, search_for_claim, collect_images
from services.credibility import enrich_sources
from services.image_detector import analyze_images

_PROMPT     = (pathlib.Path(__file__).parent.parent / "prompts" / "verify_claim.txt").read_text()
_PROMPT_DOC = (pathlib.Path(__file__).parent.parent / "prompts" / "verify_claim_doc.txt").read_text()

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


def _build_prompt(template: str, claim: str, evidence: str) -> str:
    """
    Safely inject claim and evidence into a prompt template.
    Uses .replace() so Python never interprets JSON braces as format placeholders.
    Also unescapes any {{ }} left over from old .format()-style escaping.
    """
    prompt = template.replace("{claim}", claim).replace("{evidence}", evidence)
    prompt = prompt.replace("{{", "{").replace("}}", "}")
    return prompt


def _correction_query(claim: str, summary: str, contradicting: list) -> str:
    base = (contradicting[0] if contradicting else summary or claim)[:120]
    for neg in ["is not", "was not", "did not", "does not", "never", "incorrect", "false"]:
        base = base.replace(neg, "").replace(neg.title(), "")
    return base.strip()[:100]


async def verdict(
    claim: str,
    evidence_text: str,
    raw_results: list[dict],
    input_type: str = "text"
) -> dict:
    print(f"\n[verdict_engine] claim: {claim[:80]}")
    print(f"[verdict_engine] input_type: {input_type} | results: {len(raw_results)}")

    # ── Build prompt ──────────────────────────────────────────────────────────
    if input_type == "doc":
        prompt = _build_prompt(_PROMPT_DOC, claim, evidence_text[:8000])
    else:
        # Per-claim targeted search for better evidence quality
        if not raw_results:
            print(f"[verdict_engine] No raw_results — running per-claim search")
            raw_results = search_for_claim(claim)

        try:
            rag_text = await rag_evidence(claim, raw_results)
        except Exception as e:
            print(f"[verdict_engine] rag_evidence FAILED: {e}")
            return _FALLBACK.copy()

        prompt = _build_prompt(_PROMPT, claim, rag_text[:6000])

    # ── Call Gemini ───────────────────────────────────────────────────────────
    try:
        raw    = await pro(prompt)
        result = parse_json(raw)

        if not isinstance(result, dict):
            print(f"[verdict_engine] FALLBACK: not a dict — got {type(result)}")
            return _FALLBACK.copy()

        if "verdict" not in result:
            print(f"[verdict_engine] FALLBACK: missing 'verdict' key — keys: {list(result.keys())}")
            return _FALLBACK.copy()

        # ── Sources ───────────────────────────────────────────────────────────
        if input_type == "doc":
            result["sources"] = []
        else:
            sources = result.get("sources", [])
            if not sources and raw_results:
                sources = [
                    {
                        "title":     r["title"],
                        "url":       r["url"],
                        "relevance": "Retrieved evidence source"
                    }
                    for r in raw_results[:3]
                ]
            result["sources"] = enrich_sources(sources)

        v = result.get("verdict", "unverifiable")
        print(f"[verdict_engine] verdict={v} confidence={result.get('confidence')}")

        # ── Images ────────────────────────────────────────────────────────────
        if input_type == "doc":
            result["images"]         = []
            result["image_analysis"] = []
            result["image_type"]     = "none"
            result["image_label"]    = ""
            result["source_mode"]    = "document"

        elif input_type == "text":
            if v in ("true", "partially true"):
                image_urls = collect_images(raw_results)
                result["images"]      = image_urls
                result["image_type"]  = "truth"
                result["image_label"] = "Supporting Evidence"
                result["image_analysis"] = await analyze_images(image_urls) if image_urls else []

            elif v == "false":
                query = _correction_query(
                    claim,
                    result.get("summary", ""),
                    result.get("contradicting_evidence", [])
                )
                print(f"[verdict_engine] Fetching correction images: '{query}'")
                try:
                    corr_results = search(query, max_results=4)
                    corr_images  = collect_images(corr_results)
                    result["images"]         = corr_images
                    result["image_type"]     = "correction"
                    result["image_label"]    = "What's Actually True"
                    result["image_analysis"] = await analyze_images(corr_images) if corr_images else []
                except Exception as e:
                    print(f"[verdict_engine] Correction image error: {e}")
                    result["images"]         = []
                    result["image_analysis"] = []
                    result["image_type"]     = "none"
                    result["image_label"]    = ""
            else:
                result["images"]         = []
                result["image_analysis"] = []
                result["image_type"]     = "none"
                result["image_label"]    = ""
        else:
            # URL input — images handled by orchestrator
            result["images"]         = []
            result["image_analysis"] = []
            result["image_type"]     = "none"
            result["image_label"]    = ""

        result.setdefault("time_sensitive", False)
        result.setdefault("time_sensitive_reason", "")
        return result

    except Exception as e:
        import traceback
        print(f"[verdict_engine] EXCEPTION: {e}")
        print(traceback.format_exc())

    return _FALLBACK.copy()