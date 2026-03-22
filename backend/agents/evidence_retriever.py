from services.search import search, format_results


def _build_queries(claim: str) -> list[str]:
    """Generate 2 targeted search queries from a claim."""
    words = claim.split()
    q1 = claim[:120]
    # Second query: strip filler words for a broader search
    filler = {"the","a","an","is","are","was","were","has","have","had","of","in","on","at","to","for","with","and","or","but"}
    keywords = [w for w in words if w.lower() not in filler]
    q2 = " ".join(keywords[:8])
    return [q1, q2]


async def retrieve_evidence(claim: str) -> tuple[list[dict], str]:
    """
    Returns (raw_results_list, formatted_string_for_llm)
    """
    queries = _build_queries(claim)
    seen_urls: set[str] = set()
    all_results: list[dict] = []

    for q in queries:
        for r in search(q, max_results=4):
            if r["url"] not in seen_urls:
                seen_urls.add(r["url"])
                all_results.append(r)

    # Cap at 6 best results
    all_results = sorted(all_results, key=lambda x: x.get("score", 0), reverse=True)[:6]
    return all_results, format_results(all_results)
