"""
Service: Evidence Freshness + Wayback Machine
Analyzes how fresh the supporting evidence is and checks
if a URL has changed significantly over time.
"""
import httpx
from datetime import datetime, timezone


def calculate_freshness(sources: list[dict]) -> dict:
    """
    Analyze publication dates in source titles/content.
    Returns freshness score and categorization.
    """
    # Simple heuristic: check for year mentions in source content
    current_year = datetime.now().year
    years_found  = []

    for s in sources:
        content = (s.get("content", "") + " " + s.get("title", "")).lower()
        for year in range(current_year - 5, current_year + 1):
            if str(year) in content:
                years_found.append(year)

    if not years_found:
        return {
            "freshness_score":  50,
            "freshness_label":  "Unknown",
            "freshness_color":  "#94a3b8",
            "newest_year":      None,
            "freshness_tip":    "Publication dates not found in sources.",
        }

    newest = max(years_found)
    age    = current_year - newest

    if age == 0:
        score, label, color = 98, "Very Fresh", "#4ade80"
        tip = "Sources from this year — highly current evidence."
    elif age == 1:
        score, label, color = 82, "Fresh",      "#86efac"
        tip = "Sources from last year — recent evidence."
    elif age <= 2:
        score, label, color = 65, "Moderate",   "#fbbf24"
        tip = "Sources 1-2 years old — may be slightly outdated."
    elif age <= 4:
        score, label, color = 45, "Aging",      "#fb923c"
        tip = "Sources 3-4 years old — verify with newer sources."
    else:
        score, label, color = 25, "Stale",      "#f87171"
        tip = f"Oldest source from {newest} — consider finding fresher evidence."

    return {
        "freshness_score": score,
        "freshness_label": label,
        "freshness_color": color,
        "newest_year":     newest,
        "freshness_tip":   tip,
    }


async def check_wayback(url: str) -> dict:
    """
    Check if URL exists in Wayback Machine and get snapshot info.
    Free API — no key required.
    """
    if not url or not url.startswith("http"):
        return {"available": False}
    try:
        api_url = f"https://archive.org/wayback/available?url={url}"
        async with httpx.AsyncClient(timeout=8) as client:
            r = await client.get(api_url)
            if r.status_code != 200:
                return {"available": False}
            data = r.json()
            snap = data.get("archived_snapshots", {}).get("closest", {})
            if snap.get("available"):
                return {
                    "available":   True,
                    "wayback_url": snap.get("url", ""),
                    "timestamp":   snap.get("timestamp", ""),
                    "status":      snap.get("status", ""),
                }
    except Exception:
        pass
    return {"available": False}
