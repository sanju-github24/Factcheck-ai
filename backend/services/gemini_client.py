import asyncio
import json
import re
from google import genai
from google.genai import types
import os
from dotenv import load_dotenv
load_dotenv()

FLASH_MODEL = os.getenv("FLASH_MODEL", "gemini-2.5-flash-lite")
PRO_MODEL   = os.getenv("PRO_MODEL",   "gemini-2.5-flash-lite")

_KEY_1 = os.getenv("GEMINI_API_KEY",   "")
_KEY_2 = os.getenv("GEMINI_API_KEY_2", "")

_clients: list[genai.Client] = []
_exhausted: set[int]         = set()
_call_count: list[int]       = [0]

def _boot():
    global _clients
    seen = set()
    for k in [_KEY_1, _KEY_2]:
        if k and k not in seen:
            _clients.append(genai.Client(api_key=k))
            seen.add(k)
    if not _clients:
        raise RuntimeError("No GEMINI_API_KEY set in .env")
    print(f"[gemini] {len(_clients)} API key(s) loaded")

_boot()


def _pick() -> tuple[int, genai.Client]:
    available = [i for i in range(len(_clients)) if i not in _exhausted]
    if not available:
        _exhausted.clear()
        available = list(range(len(_clients)))
        print("[gemini] All keys reset — retrying")
    idx = available[_call_count[0] % len(available)]
    _call_count[0] += 1
    return idx, _clients[idx]


def parse_json(raw: str) -> dict | list:
    """Robust JSON parser — handles fences, partial responses, embedded JSON."""
    if not raw or not raw.strip():
        raise ValueError("Empty response from Gemini")

    # Strip markdown fences
    clean = re.sub(r"```json|```", "", raw).strip()

    # Try direct parse
    try:
        return json.loads(clean)
    except Exception:
        pass

    # Try finding first complete JSON object or array
    for pattern in (r'\[.*\]', r'\{.*\}'):
        match = re.search(pattern, clean, re.DOTALL)
        if match:
            try:
                return json.loads(match.group())
            except Exception:
                pass

    raise ValueError(f"Could not parse JSON from response: {repr(raw[:200])}")


async def _generate(model: str, prompt: str, max_tokens: int, retries: int = 8) -> str:
    for attempt in range(retries):
        idx, client = _pick()
        try:
            resp = client.models.generate_content(
                model=model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    max_output_tokens=max_tokens,
                    temperature=0.1,
                ),
            )
            _exhausted.discard(idx)
            text = resp.text or ""
            if not text.strip():
                print(f"[gemini] Empty response from key {idx+1}, attempt {attempt+1}")
                # Don't mark as exhausted — retry with same or next key
                await asyncio.sleep(2)
                continue
            return text

        except Exception as e:
            err = str(e)
            if "429" in err or "RESOURCE_EXHAUSTED" in err:
                _exhausted.add(idx)
                free = [i for i in range(len(_clients)) if i not in _exhausted]
                if free:
                    print(f"[gemini] Key {idx+1} rate-limited → switching to key {free[0]+1}")
                    continue
                wait = 30 * (attempt + 1)
                print(f"[gemini] All keys exhausted — waiting {wait}s")
                await asyncio.sleep(wait)
                _exhausted.clear()
            else:
                raise

    raise RuntimeError(f"Gemini failed after {retries} attempts — all responses empty or rate-limited")


async def flash(prompt: str, max_tokens: int = 2048) -> str:
    return await _generate(FLASH_MODEL, prompt, max_tokens)


async def pro(prompt: str, max_tokens: int = 4096) -> str:
    return await _generate(PRO_MODEL, prompt, max_tokens)
