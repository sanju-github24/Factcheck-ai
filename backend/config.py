import os
from dotenv import load_dotenv
load_dotenv()

# ── Primary Gemini key ─────────────────────────────────────────────────────
GEMINI_API_KEY   = os.getenv("GEMINI_API_KEY",   "")
# ── Secondary Gemini key (for rate-limit rotation) ─────────────────────────
GEMINI_API_KEY_2 = os.getenv("GEMINI_API_KEY_2", "")

TAVILY_API_KEY   = os.getenv("TAVILY_API_KEY",   "")
HIVE_API_KEY     = os.getenv("HIVE_API_KEY",     "")

FLASH_MODEL      = "gemini-2.5-flash-lite"
PRO_MODEL        = "gemini-2.5-flash-lite"

MAX_CLAIMS       = 6
SEARCH_DEPTH     = "advanced"
SEARCH_MAX       = 5
REQUEST_TIMEOUT  = 60
