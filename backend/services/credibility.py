"""
Domain credibility scoring.
Returns 0–100. Based on domain reputation, TLD, and known source quality.
"""

from urllib.parse import urlparse

# Known high-quality domains → score
DOMAIN_SCORES: dict[str, int] = {
    # Science / Academic
    "nature.com": 98, "science.org": 98, "thelancet.com": 97,
    "nejm.org": 97, "pubmed.ncbi.nlm.nih.gov": 96, "scholar.google.com": 90,
    "arxiv.org": 88, "jstor.org": 88, "researchgate.net": 78,
    # Government
    "nasa.gov": 97, "cdc.gov": 96, "who.int": 95, "nih.gov": 96,
    "fda.gov": 95, "un.org": 93, "worldbank.org": 90, "imf.org": 90,
    # Premium news
    "reuters.com": 95, "apnews.com": 95, "bbc.com": 93, "bbc.co.uk": 93,
    "theguardian.com": 88, "nytimes.com": 87, "washingtonpost.com": 87,
    "wsj.com": 88, "ft.com": 89, "economist.com": 90, "bloomberg.com": 88,
    "time.com": 82, "theatlantic.com": 84, "newyorker.com": 86,
    # Tech / Business
    "techcrunch.com": 78, "wired.com": 80, "arstechnica.com": 82,
    "theverge.com": 78, "forbes.com": 76, "businessinsider.com": 72,
    "cnbc.com": 80, "marketwatch.com": 78,
    # Reference
    "wikipedia.org": 74, "britannica.com": 85, "snopes.com": 82,
    "factcheck.org": 90, "politifact.com": 88,
    # Social / Low quality
    "reddit.com": 42, "twitter.com": 38, "x.com": 38,
    "facebook.com": 35, "quora.com": 40, "medium.com": 52,
}

# TLD bonuses
TLD_BONUS: dict[str, int] = {
    ".gov": 15, ".edu": 12, ".org": 5, ".int": 10,
}

# TLD penalties
TLD_PENALTY: dict[str, int] = {
    ".info": -8, ".biz": -10, ".click": -15, ".xyz": -12,
}


def score_domain(url: str) -> int:
    """Return credibility score 0–100 for a given URL."""
    try:
        parsed = urlparse(url)
        host   = parsed.netloc.lower().lstrip("www.")

        # Direct match
        if host in DOMAIN_SCORES:
            return DOMAIN_SCORES[host]

        # Subdomain match (e.g. health.bbc.com → bbc.com)
        parts = host.split(".")
        for i in range(1, len(parts)):
            parent = ".".join(parts[i:])
            if parent in DOMAIN_SCORES:
                return max(DOMAIN_SCORES[parent] - 5, 0)

        # TLD-based fallback
        base = 55   # neutral unknown
        for tld, bonus in TLD_BONUS.items():
            if host.endswith(tld):
                base += bonus
        for tld, penalty in TLD_PENALTY.items():
            if host.endswith(tld):
                base += penalty

        return max(0, min(100, base))
    except Exception:
        return 50


def credibility_label(score: int) -> str:
    if score >= 90: return "Very High"
    if score >= 75: return "High"
    if score >= 60: return "Medium"
    if score >= 40: return "Low"
    return "Very Low"


def credibility_color(score: int) -> str:
    if score >= 90: return "#16a34a"
    if score >= 75: return "#2563eb"
    if score >= 60: return "#d97706"
    if score >= 40: return "#dc2626"
    return "#7f1d1d"


def enrich_sources(sources: list[dict]) -> list[dict]:
    """Add credibility score, label, color to each source dict."""
    enriched = []
    for s in sources:
        sc = score_domain(s.get("url", ""))
        enriched.append({
            **s,
            "credibility_score": sc,
            "credibility_label": credibility_label(sc),
            "credibility_color": credibility_color(sc),
        })
    # Sort by credibility descending
    return sorted(enriched, key=lambda x: x["credibility_score"], reverse=True)
