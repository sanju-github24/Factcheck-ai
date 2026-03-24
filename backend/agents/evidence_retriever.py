from services.search import search, format_results


def _build_queries(claim: str, context: str = "") -> list[str]:
    """
    Generate 2 targeted search queries.
    Uses context to anchor generic claims to the right topic.
    e.g. "11 people were killed" + context "RCB stampede Bengaluru"
    becomes "11 people were killed RCB stampede Bengaluru"
    """
    # Extract key context words (named entities, places, events)
    ctx_words = []
    if context:
        filler = {"the","a","an","is","are","was","were","has","have","had",
                  "of","in","on","at","to","for","with","and","or","but",
                  "this","that","these","those","it","by","from","as"}
        ctx_words = [w for w in context.split()
                     if w.lower() not in filler
                     and len(w) > 3
                     and w[0].isupper()][:4]   # take up to 4 capitalized context words

    # Query 1 — full claim + context anchors
    q1 = claim[:100]
    if ctx_words:
        q1 = q1 + " " + " ".join(ctx_words)

    # Query 2 — keywords only + context
    filler2 = {"the","a","an","is","are","was","were","has","have","had",
               "of","in","on","at","to","for","with","and","or","but"}
    keywords = [w for w in claim.split() if w.lower() not in filler2]
    q2 = " ".join(keywords[:7])
    if ctx_words:
        q2 = q2 + " " + " ".join(ctx_words[:2])

    return [q1, q2]


async def retrieve_evidence(claim: str, context: str = "") -> tuple[list[dict], str]:
    """
    Returns (raw_results_list, formatted_string_for_llm).
    Pass context to anchor generic claims to the right event/topic.
    """
    queries = _build_queries(claim, context)
    print(f"[evidence_retriever] Queries: {queries}")

    seen_urls: set[str] = set()
    all_results: list[dict] = []

    for q in queries:
        for r in search(q, max_results=4):
            if r["url"] not in seen_urls:
                seen_urls.add(r["url"])
                all_results.append(r)

    all_results = sorted(all_results, key=lambda x: x.get("score", 0), reverse=True)[:6]
    return all_results, format_results(all_results)