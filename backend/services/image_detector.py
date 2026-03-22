"""
Image AI/Deepfake Detection via Sightengine API.
Free tier: 2000 operations/month.
Sign up at https://sightengine.com — get api_user + api_secret.
"""
import os
import httpx
from dotenv import load_dotenv

load_dotenv()

SIGHTENGINE_URL = "https://api.sightengine.com/1.0/check.json"
AI_THRESHOLD    = 0.5


def _get_creds() -> tuple[str, str]:
    user   = os.getenv("SIGHTENGINE_USER",   "").strip()
    secret = os.getenv("SIGHTENGINE_SECRET", "").strip()
    return user, secret


async def analyze_image(image_url: str) -> dict:
    user, secret = _get_creds()
    if not user or not secret:
        print("[image_detector] No SIGHTENGINE_USER/SECRET — skipping")
        return _unavailable(image_url)

    try:
        async with httpx.AsyncClient(timeout=20) as client:
            r = await client.get(
                SIGHTENGINE_URL,
                params={
                    "url":        image_url,
                    "models":     "genai",
                    "api_user":   user,
                    "api_secret": secret,
                },
            )
            print(f"[image_detector] Sightengine {r.status_code} for {image_url[:60]}")
            if r.status_code != 200:
                print(f"[image_detector] Error: {r.text[:200]}")
                return _unavailable(image_url)
            return _parse(image_url, r.json())
    except Exception as e:
        print(f"[image_detector] Exception: {type(e).__name__}: {e}")
        return _unavailable(image_url)


def _parse(url: str, data: dict) -> dict:
    try:
        # Sightengine returns: {"type": {"ai_generated": 0.99}, ...}
        ai_prob = data.get("type", {}).get("ai_generated", 0.0)
        is_ai   = ai_prob >= AI_THRESHOLD
        label   = "AI Generated" if is_ai else "Likely Real"

        print(f"[image_detector] → {label} ({round(ai_prob * 100)}% AI)")

        return {
            "url":                  url,
            "ai_generated":         is_ai,
            "ai_probability":       round(ai_prob, 3),
            "deepfake_probability": 0.0,
            "label":                label,
            "available":            True,
        }
    except Exception as e:
        print(f"[image_detector] Parse error: {e} | data: {str(data)[:200]}")
        return _unavailable(url)


async def analyze_images(image_urls: list[str]) -> list[dict]:
    import asyncio
    tasks = [analyze_image(url) for url in image_urls[:6]]
    return await asyncio.gather(*tasks)


def _unavailable(url: str) -> dict:
    return {
        "url":                  url,
        "ai_generated":         None,
        "ai_probability":       None,
        "deepfake_probability": None,
        "label":                "Detection unavailable",
        "available":            False,
    }