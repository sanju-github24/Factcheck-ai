import httpx
from bs4 import BeautifulSoup


async def fetch_url(url: str) -> str:
    """Try Jina Reader first, then raw HTML parse, then return URL as-is."""
    # 1. Jina Reader — clean markdown extraction
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            r = await client.get(
                f"https://r.jina.ai/{url}",
                headers={"Accept": "text/plain", "X-Return-Format": "text"},
            )
            if r.status_code == 200 and len(r.text) > 200:
                return r.text[:6000]
    except Exception:
        pass

    # 2. Raw HTML + BeautifulSoup fallback
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(url, follow_redirects=True,
                                 headers={"User-Agent": "Mozilla/5.0"})
            soup = BeautifulSoup(r.text, "html.parser")
            for tag in soup(["script", "style", "nav", "footer", "header"]):
                tag.decompose()
            text = " ".join(soup.get_text(separator=" ").split())
            return text[:6000]
    except Exception:
        pass

    return f"Could not fetch content from {url}"
