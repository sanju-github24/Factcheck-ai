"""
Image AI/Deepfake Detection via Hive Moderation API.
Sign up free at https://hivemoderation.com — get HIVE_API_KEY.
Falls back gracefully if key is not set.
"""

import os
import httpx
from config import GEMINI_API_KEY  # just to confirm config loads

HIVE_API_KEY = os.getenv("HIVE_API_KEY", "")
HIVE_URL     = "https://api.thehive.ai/api/v2/task/sync"

# Score threshold above which we flag as AI-generated
AI_THRESHOLD = 0.7


async def analyze_image(image_url: str) -> dict:
    """
    Analyze a single image URL for AI generation / deepfake.
    Returns:
      {
        url, ai_generated, ai_probability, deepfake_probability,
        label, available
      }
    """
    if not HIVE_API_KEY:
        return _unavailable(image_url)

    try:
        async with httpx.AsyncClient(timeout=20) as client:
            r = await client.post(
                HIVE_URL,
                headers={
                    "Authorization": f"Token {HIVE_API_KEY}",
                    "Content-Type":  "application/json",
                },
                json={"url": image_url},
            )
            if r.status_code != 200:
                return _unavailable(image_url)

            data = r.json()
            return _parse_hive(image_url, data)
    except Exception as e:
        print(f"[image_detector] Hive error for {image_url}: {e}")
        return _unavailable(image_url)


async def analyze_images(image_urls: list[str]) -> list[dict]:
    """Analyze up to 4 images concurrently."""
    import asyncio
    tasks = [analyze_image(url) for url in image_urls[:4]]
    return await asyncio.gather(*tasks)


def _parse_hive(url: str, data: dict) -> dict:
    """Extract AI generation scores from Hive response."""
    try:
        status = data.get("status", [{}])[0]
        output = status.get("response", {}).get("output", [{}])[0]
        classes = output.get("classes", [])

        ai_prob      = 0.0
        deepfake_prob = 0.0

        for cls in classes:
            name  = cls.get("class", "").lower()
            score = cls.get("score", 0.0)
            if "ai_generated" in name or "ai generated" in name:
                ai_prob = score
            if "deepfake" in name:
                deepfake_prob = score

        is_ai = ai_prob >= AI_THRESHOLD or deepfake_prob >= AI_THRESHOLD
        label = (
            "AI Generated" if ai_prob >= AI_THRESHOLD
            else "Deepfake"  if deepfake_prob >= AI_THRESHOLD
            else "Likely Real"
        )

        return {
            "url":               url,
            "ai_generated":      is_ai,
            "ai_probability":    round(ai_prob, 3),
            "deepfake_probability": round(deepfake_prob, 3),
            "label":             label,
            "available":         True,
        }
    except Exception:
        return _unavailable(url)


def _unavailable(url: str) -> dict:
    return {
        "url":               url,
        "ai_generated":      None,
        "ai_probability":    None,
        "deepfake_probability": None,
        "label":             "Detection unavailable",
        "available":         False,
    }
