from tavily import TavilyClient
from config import TAVILY_API_KEY, SEARCH_DEPTH, SEARCH_MAX

_client = TavilyClient(api_key=TAVILY_API_KEY)

_IMG_EXTS = (".jpg", ".jpeg", ".png", ".webp", ".gif")


def _is_valid_image(url: str) -> bool:
    u = url.lower().split("?")[0]
    return any(u.endswith(e) for e in _IMG_EXTS)


def search(query: str, max_results: int = SEARCH_MAX) -> list[dict]:
    """
    Returns list of:
      { title, url, content, score, images: [url, ...] }
    Falls back to empty list on any error.
    """
    try:
        resp = _client.search(
            query=query,
            search_depth=SEARCH_DEPTH,
            max_results=max_results,
            include_raw_content=False,
            include_images=True,
        )
        results = resp.get("results", [])
        raw_images = [
            img if isinstance(img, str) else img.get("url", "")
            for img in resp.get("images", [])
        ]
        valid_images = [u for u in raw_images if u and _is_valid_image(u)][:4]

        return [
            {
                "title":   r.get("title", ""),
                "url":     r.get("url", ""),
                "content": r.get("content", ""),
                "score":   r.get("score", 0.0),
                "images":  valid_images if i == 0 else [],
            }
            for i, r in enumerate(results)
        ]
    except Exception as e:
        print(f"[search] Tavily error: {e}")
        return []


def search_for_claim(claim: str, max_results: int = SEARCH_MAX) -> list[dict]:
    """
    Targeted search for a specific atomic claim.
    Builds a focused query from the claim text to avoid off-topic results.
    Strips filler words so Tavily gets a clean, specific query.
    """
    # Strip common filler phrases that confuse search
    filler = [
        "is it true that", "is it true", "fact check", "verify that",
        "is this true", "is this correct", "did", "does", "do",
        "today", "currently", "recently", "now"
    ]
    query = claim.strip()
    for f in filler:
        query = query.lower().replace(f, "").strip()

    # Limit query length for focused results
    query = query[:120]
    print(f"[search] Claim search query: '{query}'")

    try:
        resp = _client.search(
            query=query,
            search_depth="advanced",        # always advanced for claim verification
            max_results=max_results,
            include_raw_content=False,
            include_images=True,
        )
        results = resp.get("results", [])
        raw_images = [
            img if isinstance(img, str) else img.get("url", "")
            for img in resp.get("images", [])
        ]
        valid_images = [u for u in raw_images if u and _is_valid_image(u)][:4]

        parsed = [
            {
                "title":   r.get("title", ""),
                "url":     r.get("url", ""),
                "content": r.get("content", ""),
                "score":   r.get("score", 0.0),
                "images":  valid_images if i == 0 else [],
            }
            for i, r in enumerate(results)
        ]
        print(f"[search] Got {len(parsed)} results for claim: '{claim[:60]}'")
        return parsed

    except Exception as e:
        print(f"[search] Tavily error for claim search: {e}")
        return []


def format_results(results: list[dict]) -> str:
    """Flatten results into a readable block for LLM prompts."""
    if not results:
        return "No search results found."
    parts = []
    for i, r in enumerate(results, 1):
        parts.append(
            f"[Source {i}] {r['title']}\nURL: {r['url']}\n{r['content'][:800]}"
        )
    return "\n\n---\n\n".join(parts)


def collect_images(results: list[dict]) -> list[str]:
    """Pull all images from a list of search results, deduped, max 4."""
    seen, out = set(), []
    for r in results:
        for url in r.get("images", []):
            if url and url not in seen:
                seen.add(url)
                out.append(url)
                if len(out) >= 4:
                    return out
    return out