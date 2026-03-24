"""
Comparison Pipeline
Runs two inputs through claim extraction + verification in parallel,
then finds agreements and contradictions between them.
"""
import asyncio
import json
from typing import AsyncGenerator

from services.scraper import fetch_url
from agents.claim_extractor import extract_claims
from agents.evidence_retriever import retrieve_evidence
from agents.verdict_engine import verdict
from services.gemini_client import flash, parse_json


def _emit(data: dict) -> str:
    return f"data: {json.dumps(data)}\n\n"


async def _process_one(text: str, label: str) -> list[dict]:
    """Extract and verify claims from one source."""
    claims  = await extract_claims(text)
    results = []
    for i, claim in enumerate(claims):
        claim_text         = claim.get("claim", "")
        raw_results, evid  = await retrieve_evidence(claim_text, context=claim.get("context", ""))
        v                  = await verdict(claim_text, evid, raw_results)
        results.append({
            "id":       claim.get("id", i + 1),
            "claim":    claim_text,
            "context":  claim.get("context", ""),
            "verdict":  v.get("verdict", "unverifiable"),
            "confidence": v.get("confidence", 0.0),
            "summary":  v.get("summary", ""),
            "sources":  v.get("sources", []),
            "nuance":   v.get("nuance", ""),
            "label":    label,
        })
        await asyncio.sleep(0.15)
    return results


_COMPARE_PROMPT = """
You are a media analyst comparing two sources covering the same or related topic.

SOURCE A ({label_a}) CLAIMS:
{claims_a}

SOURCE B ({label_b}) CLAIMS:
{claims_b}

Find:
1. AGREEMENTS — claims both sources agree on (same fact, both true)
2. CONTRADICTIONS — claims where the two sources directly conflict
3. UNIQUE TO A — important claims only Source A makes
4. UNIQUE TO B — important claims only Source B makes
5. OVERALL BIAS COMPARISON — which source seems more balanced/biased and why

Respond ONLY with valid JSON:
{{
  "agreements": [
    {{"claim": "the shared fact", "confidence": 0.9}}
  ],
  "contradictions": [
    {{"claim_a": "what A says", "claim_b": "what B says", "topic": "what they disagree on"}}
  ],
  "unique_to_a": ["claim only in A"],
  "unique_to_b": ["claim only in B"],
  "bias_comparison": "one paragraph comparing the two sources' balance and perspective",
  "credibility_winner": "a|b|equal",
  "credibility_reason": "why one is more credible"
}}
"""


async def compare_pipeline(
    input_a: str, type_a: str, label_a: str,
    input_b: str, type_b: str, label_b: str,
) -> AsyncGenerator[str, None]:

    # ── Fetch texts ────────────────────────────────────────────────────────
    yield _emit({"stage": "fetching", "message": f"Fetching {label_a}…"})
    text_a = await fetch_url(input_a) if type_a == "url" else input_a

    yield _emit({"stage": "fetching", "message": f"Fetching {label_b}…"})
    text_b = await fetch_url(input_b) if type_b == "url" else input_b

    # ── Extract + verify both in parallel ──────────────────────────────────
    yield _emit({"stage": "extracting", "message": f"Extracting and verifying claims from both sources…"})

    results_a, results_b = await asyncio.gather(
        _process_one(text_a, label_a),
        _process_one(text_b, label_b),
    )

    yield _emit({
        "stage":    "comparing",
        "message":  f"Found {len(results_a)} claims in {label_a}, {len(results_b)} in {label_b}. Running comparison…",
        "resultsA": results_a,
        "resultsB": results_b,
    })

    # ── Cross-source comparison ────────────────────────────────────────────
    def _fmt(results):
        return "\n".join(f"- [{r['verdict'].upper()}] {r['claim']}" for r in results)

    prompt = _COMPARE_PROMPT.format(
        label_a  = label_a,
        label_b  = label_b,
        claims_a = _fmt(results_a),
        claims_b = _fmt(results_b),
    )

    try:
        raw        = await flash(prompt, max_tokens=1200)
        comparison = parse_json(raw)
    except Exception as e:
        print(f"[compare] Comparison error: {e}")
        comparison = {
            "agreements": [], "contradictions": [],
            "unique_to_a": [], "unique_to_b": [],
            "bias_comparison": "Comparison analysis unavailable.",
            "credibility_winner": "equal", "credibility_reason": "",
        }

    # ── Accuracy scores ────────────────────────────────────────────────────
    def _accuracy(results):
        if not results: return 0
        score_map = {"true": 1.0, "partially true": 0.5, "false": 0.0, "unverifiable": 0.5}
        return round(sum(score_map.get(r["verdict"], 0.5) for r in results) / len(results), 3)

    yield _emit({
        "stage":      "complete",
        "message":    "Comparison complete!",
        "comparison": {
            "resultsA":    results_a,
            "resultsB":    results_b,
            "accuracyA":   _accuracy(results_a),
            "accuracyB":   _accuracy(results_b),
            "labelA":      label_a,
            "labelB":      label_b,
            "analysis":    comparison,
            "totalA":      len(results_a),
            "totalB":      len(results_b),
        }
    })
    yield "data: [DONE]\n\n"