import asyncio
import json
from typing import AsyncGenerator

from services.scraper import fetch_url
from services.freshness import calculate_freshness, check_wayback
from agents.claim_extractor import extract_claims
from agents.evidence_retriever import retrieve_evidence
from agents.verdict_engine import verdict
from agents.ai_detector import detect_ai
from agents.contradiction_detector import detect_contradictions
from agents.bias_detector import detect_bias
from agents.source_trust import analyze_source_trust
from agents.misinfo_detector import detect_misinfo_patterns
from agents.counter_narrative import batch_counter_narratives


def _emit(data: dict) -> str:
    return f"data: {json.dumps(data)}\n\n"


async def run_pipeline(input_text: str, input_type: str) -> AsyncGenerator[str, None]:

    # ── 1. Fetch text ──────────────────────────────────────────────────────
    yield _emit({"stage": "extracting", "message": "Fetching content…"})
    url = input_text if input_type == "url" else ""
    if input_type == "url":
        text = await fetch_url(input_text)
        yield _emit({"stage": "extracting", "message": "Content fetched.", "preview": text[:200]})
    else:
        text = input_text

    # ── 2. Parallel fast analysis: AI detection + Bias + Source Trust + Misinfo ──
    yield _emit({"stage": "extracting", "message": "Running intelligence analysis…"})

    ai_score_task     = detect_ai(text)
    bias_task         = detect_bias(text)
    trust_task        = analyze_source_trust(text, url)
    misinfo_task      = detect_misinfo_patterns(text)
    wayback_task      = check_wayback(url) if url else asyncio.coroutine(lambda: {"available": False})()

    ai_score, bias_result, trust_result, misinfo_result, wayback_result = await asyncio.gather(
        ai_score_task, bias_task, trust_task, misinfo_task,
        check_wayback(url) if url else asyncio.coroutine(lambda: {"available": False})()
    )

    yield _emit({
        "stage":       "extracting",
        "message":     "Intelligence analysis complete.",
        "aiScore":     ai_score,
        "biasResult":  bias_result,
        "trustResult": trust_result,
        "misinoResult":misinfo_result,
        "wayback":     wayback_result,
    })

    # ── 3. Extract claims ──────────────────────────────────────────────────
    yield _emit({"stage": "extracting", "message": "Decomposing text into atomic claims…"})
    claims = await extract_claims(text)
    yield _emit({
        "stage":       "searching",
        "message":     f"Extracted {len(claims)} claims. Starting evidence search…",
        "claims":      claims,
        "originalText": text[:3000],
    })

    # ── 4. Per-claim: search + verdict ─────────────────────────────────────
    results = []
    all_sources = []

    for i, claim in enumerate(claims):
        claim_text = claim.get("claim", "")
        yield _emit({"stage": "searching", "message": f"Searching evidence for claim {i+1}/{len(claims)}: \"{claim_text[:70]}…\""})
        raw_results, evidence_text = await retrieve_evidence(claim_text)
        all_sources.extend(raw_results)

        yield _emit({"stage": "verifying", "message": f"Verifying claim {i+1}/{len(claims)} with Gemini…"})
        v = await verdict(claim_text, evidence_text, raw_results)

        result = {
            "id":                     claim.get("id", i + 1),
            "claim":                  claim_text,
            "context":                claim.get("context", ""),
            "verdict":                v.get("verdict", "unverifiable"),
            "confidence":             v.get("confidence", 0.0),
            "summary":                v.get("summary", ""),
            "supporting_evidence":    v.get("supporting_evidence", []),
            "contradicting_evidence": v.get("contradicting_evidence", []),
            "sources":                v.get("sources", []),
            "nuance":                 v.get("nuance", ""),
            "images":                 v.get("images", []),
            "image_analysis":         v.get("image_analysis", []),
            "time_sensitive":         v.get("time_sensitive", False),
            "time_sensitive_reason":  v.get("time_sensitive_reason", ""),
            "freshness":              calculate_freshness(v.get("sources", [])),
        }
        results.append(result)
        yield _emit({
            "stage":       "verifying",
            "message":     f"Claim {i+1}: {result['verdict'].upper()} ({round(result['confidence']*100)}% confidence)",
            "claimResult": result,
        })
        await asyncio.sleep(0.2)

    # ── 5. Cross-claim analysis + Counter narratives ────────────────────────
    yield _emit({"stage": "verifying", "message": "Detecting cross-claim contradictions…"})
    contradictions = await detect_contradictions(results)

    yield _emit({"stage": "verifying", "message": "Generating counter-narratives for false claims…"})
    results = await batch_counter_narratives(results)

    # ── 6. Final report ────────────────────────────────────────────────────
    score_map  = {"true": 1.0, "partially true": 0.5, "false": 0.0, "unverifiable": 0.5}
    n          = len(results)
    overall    = sum(score_map.get(r["verdict"], 0.5) for r in results) / n if n else 0.0

    # Build claim network graph data
    graph_nodes = [
        {"id": r["id"], "claim": r["claim"][:60], "verdict": r["verdict"], "confidence": r["confidence"]}
        for r in results
    ]
    graph_edges = []
    for c in contradictions:
        graph_edges.append({"source": c["claim_id_a"], "target": c["claim_id_b"], "type": "contradiction"})

    # Severity summary
    severity_counts = {"high": 0, "medium": 0, "low": 0}
    for r in results:
        cn = r.get("counter_narrative", {})
        sev = cn.get("severity", "")
        if sev in severity_counts:
            severity_counts[sev] += 1

    report = {
        "claims":              results,
        "aiScore":             ai_score,
        "biasResult":          bias_result,
        "trustResult":         trust_result,
        "misinoResult":        misinfo_result,
        "wayback":             wayback_result,
        "contradictions":      contradictions,
        "originalText":        text[:3000],
        "overallAccuracy":     round(overall, 3),
        "totalClaims":         n,
        "trueClaims":          sum(1 for r in results if r["verdict"] == "true"),
        "falseClaims":         sum(1 for r in results if r["verdict"] == "false"),
        "partialClaims":       sum(1 for r in results if r["verdict"] == "partially true"),
        "unverifiableClaims":  sum(1 for r in results if r["verdict"] == "unverifiable"),
        "timeSensitiveClaims": sum(1 for r in results if r.get("time_sensitive")),
        "severityCounts":      severity_counts,
        "graphData":           {"nodes": graph_nodes, "edges": graph_edges},
    }

    yield _emit({"stage": "complete", "message": "Analysis complete!", "report": report})
    yield "data: [DONE]\n\n"
