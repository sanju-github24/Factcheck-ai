import httpx
import re
from urllib.parse import urljoin
from services.image_detector import analyze_images

_IMG_EXTS = (".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif")
_CDN_DOMAINS = [
    "toiimg.com", "indiatimes.com", "wp.com", "wordpress.com",
    "upload.wikimedia.org", "i.imgur.com", "cloudfront.net",
    "amazonaws.com", "akamaized.net", "fastly.net",
    "cdn.vox-cdn.com", "ichef.bbci.co.uk",
    "res.cloudinary.com", "images.ctfassets.net",
    "staticflickr.com", "miro.medium.com",
]
_SKIP_WORDS = [
    "logo","icon","avatar","sprite","placeholder","tracking",
    "pixel","beacon","1x1","transparent","button","arrow",
    "star","rating","emoji","badge","spacer","blank","spinner",
    # Wikipedia specific UI elements to skip
    "wikipedia-wordmark","wikipedia-tagline","Wikimedia",
    "powered_by","protect-shackle","fund","donate",
    "commons-logo","wikidata","sister-logo","footer",
    "wikimedia-button","enwiki","puzzle","globe",
    "CC-","copyleft","public_domain",
]

# Minimum image path length to filter out tiny UI images
_MIN_PATH_LENGTH = 20
_JINA_URL = "https://r.jina.ai/"


def _is_valid(src):
    clean = src.lower().split("?")[0].split("#")[0]
    if len(clean) < 12:
        return False
    if any(w in clean for w in _SKIP_WORDS):
        return False

    # Skip very small Wikipedia thumbnails (under 100px wide)
    import re as _re
    size_match = _re.search(r"/([0-9]+)px-", clean)
    if size_match and int(size_match.group(1)) < 120:
        return False

    if any(clean.endswith(e) for e in _IMG_EXTS):
        return True
    if any(cdn in clean for cdn in _CDN_DOMAINS):
        return True
    if any(seg in clean for seg in ["/photo/","/image/","/img/","/images/","/media/","/photos/"]):
        return True
    return False


def _absolute(src, base_url):
    if src.startswith("http"):
        return src
    if src.startswith("//"):
        return "https:" + src
    return urljoin(base_url, src)


def _extract_imgs(html, base_url, max_images):
    raw = []
    raw += re.findall(r'<img[^>]+src=["\']([^"\']{10,})["\']', html, re.IGNORECASE)
    raw += re.findall(r'<img[^>]+data-src=["\']([^"\']{10,})["\']', html, re.IGNORECASE)
    for ss in re.findall(r'srcset=["\']([^"\']+)["\']', html, re.IGNORECASE):
        parts = [p.strip().split(" ")[0] for p in ss.split(",") if p.strip()]
        if parts:
            raw.append(parts[-1])
    raw += re.findall(r'property=["\']og:image["\'][^>]+content=["\']([^"\']+)["\']', html, re.IGNORECASE)
    raw += re.findall(r'content=["\']([^"\']+)["\'][^>]+property=["\']og:image["\']', html, re.IGNORECASE)
    raw += re.findall(r'name=["\']twitter:image["\'][^>]+content=["\']([^"\']+)["\']', html, re.IGNORECASE)
    raw += re.findall(r'"image"\s*:\s*"(https?://[^"]+)"', html)
    raw += re.findall(r'"thumbnailUrl"\s*:\s*"(https?://[^"]+)"', html)

    seen, valid = set(), []
    for src in raw:
        src = src.strip()
        if not src:
            continue
        abs_src = _absolute(src, base_url)
        if abs_src not in seen and _is_valid(abs_src):
            seen.add(abs_src)
            valid.append(abs_src)
        if len(valid) >= max_images:
            break
    return valid


async def _fetch_direct(url):
    try:
        async with httpx.AsyncClient(
            timeout=15, follow_redirects=True,
            headers={
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,*/*;q=0.8",
            }
        ) as client:
            r = await client.get(url)
            print("[article_images] Direct status: " + str(r.status_code) + " size: " + str(len(r.text)))
            if r.status_code == 200 and len(r.text) > 500:
                return r.text, "direct"
            return None, "HTTP " + str(r.status_code)
    except Exception as e:
        print("[article_images] Direct error: " + str(type(e).__name__) + ": " + str(e)[:100])
        return None, str(e)


async def _fetch_jina(url):
    try:
        async with httpx.AsyncClient(
            timeout=30, follow_redirects=True,
            headers={"User-Agent": "Mozilla/5.0", "X-Return-Format": "html"}
        ) as client:
            r = await client.get(_JINA_URL + url)
            print("[article_images] Jina status: " + str(r.status_code) + " size: " + str(len(r.text)))
            if r.status_code == 200 and len(r.text) > 200:
                return r.text, "jina"
            return None, "Jina " + str(r.status_code)
    except Exception as e:
        print("[article_images] Jina error: " + str(type(e).__name__) + ": " + str(e)[:100])
        return None, "Jina error: " + str(e)


async def scrape_and_analyze(url, max_images=6):
    if not url or not url.startswith("http"):
        return {"available": False, "images": [], "summary": {}, "reason": "No URL"}

    article_media = {"available": False, "images": [], "summary": {}}

    html, method = await _fetch_direct(url)
    valid = _extract_imgs(html, url, max_images) if html else []
    print("[article_images] After direct: " + str(len(valid)) + " images")

    if not valid:
        html_j, method_j = await _fetch_jina(url)
        if html_j:
            valid = _extract_imgs(html_j, url, max_images)
            method = "jina"
            print("[article_images] After jina: " + str(len(valid)) + " images")

    if not valid:
        return {"available": True, "images": [], "summary": {}, "reason": "No images found"}

    print("[article_images] Running Hive on " + str(len(valid)) + " images")
    analysis = await analyze_images(valid)

    ai_count   = sum(1 for a in analysis if a.get("ai_generated") is True)
    real_count = sum(1 for a in analysis if a.get("ai_generated") is False)

    return {
        "available": True,
        "url":       url,
        "method":    method,
        "images": [
            {
                "url":                  a["url"],
                "ai_generated":         a.get("ai_generated"),
                "ai_probability":       a.get("ai_probability"),
                "deepfake_probability": a.get("deepfake_probability"),
                "label":                a.get("label", "Detection unavailable"),
                "available":            a.get("available", False),
            }
            for a in analysis
        ],
        "summary": {
            "total":     len(valid),
            "ai_count":  ai_count,
            "real_count":real_count,
            "unknown":   len(valid) - ai_count - real_count,
            "method":    method,
        },
        "reason": "OK",
    }