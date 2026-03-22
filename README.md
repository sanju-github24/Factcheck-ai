# FactCheck AI

Multi-agent fact-verification system powered by **Gemini 2.0 Flash** (claim extraction + AI detection) and **Gemini 2.5 Pro** (verdict reasoning), with **Tavily** for live web search.

---

## Quick Start (Manual)

### 1. Get API Keys

| Key | Where to get |
|-----|-------------|
| `GEMINI_API_KEY` | https://aistudio.google.com/apikey |
| `TAVILY_API_KEY` | https://app.tavily.com (free tier: 1000 searches/month) |

### 2. Backend

```bash
cd backend

# Copy and fill in your keys
cp .env .env.local
# Edit .env — paste GEMINI_API_KEY and TAVILY_API_KEY

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Health check → http://localhost:8000/api/health

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open → http://localhost:5173

---

## Quick Start (Docker)

```bash
# Fill in backend/.env with your API keys first
docker-compose up --build
```

- Frontend → http://localhost:5173  
- Backend  → http://localhost:8000

---

## Project Structure

```
factcheck-ai/
├── backend/
│   ├── agents/
│   │   ├── claim_extractor.py     # Gemini 2.0 Flash — extracts atomic claims
│   │   ├── evidence_retriever.py  # Tavily search — 2 queries per claim
│   │   ├── verdict_engine.py      # Gemini 2.5 Pro — deep verdict reasoning
│   │   └── ai_detector.py         # Gemini 2.0 Flash — AI-content detection
│   ├── services/
│   │   ├── gemini_client.py       # google-genai SDK wrapper (Flash + Pro)
│   │   ├── search.py              # Tavily SDK wrapper
│   │   └── scraper.py             # URL → text (Jina Reader + BS4 fallback)
│   ├── routers/
│   │   ├── check.py               # POST /api/check — SSE stream
│   │   └── health.py              # GET /api/health
│   ├── models/
│   │   ├── request.py             # CheckRequest pydantic model
│   │   └── report.py              # Claim, Verdict, Report schemas
│   ├── prompts/
│   │   ├── extract_claims.txt     # CoT extraction prompt
│   │   ├── verify_claim.txt       # Grounded verdict prompt
│   │   └── detect_ai.txt          # Stylometric analysis prompt
│   ├── orchestrator.py            # Pipeline coordinator + SSE emitter
│   ├── config.py                  # Env vars, model names, constants
│   ├── main.py                    # FastAPI app entry point
│   ├── Dockerfile
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── api/client.js          # fetch + ReadableStream SSE client
│   │   ├── hooks/useSSEPipeline.js# React hook — pipeline state machine
│   │   └── components/
│   │       ├── InputPanel.jsx     # Text/URL input + demo buttons
│   │       ├── PipelineProgress.jsx # Stage pills + live log terminal
│   │       ├── SummaryCards.jsx   # Accuracy rings + verdict counts
│   │       ├── AIDetectionPanel.jsx # AI-gen probability bar
│   │       ├── ClaimCard.jsx      # Expandable claim with evidence + sources
│   │       └── VerdictBadge.jsx   # True/False/Partial/Unknown badge
│   ├── index.html
│   ├── vite.config.js             # Proxy /api → localhost:8000
│   ├── Dockerfile
│   └── package.json
│
├── docker-compose.yml
└── README.md
```

---

## Gemini API Allocation

| Model | Used For | Why |
|-------|----------|-----|
| **Gemini 2.0 Flash** | Claim extraction, AI detection | Fast, cheap, high-throughput |
| **Gemini 2.5 Pro** | Verdict engine | Deep reasoning with thinking budget |

## Search: Tavily

Tavily is purpose-built for AI agents — returns full page content (not just snippets), structured JSON, and has `search_depth="advanced"` for multi-hop retrieval. Free tier: 1,000 searches/month.

---

## Pipeline Flow

```
Input (text or URL)
  │
  ├─ [Flash]  AI-content detection  → probability score + signals
  ├─ [Flash]  Claim extraction      → 4–6 atomic verifiable claims
  │
  └─ For each claim:
       ├─ [Tavily]  Evidence retrieval → 2 queries, up to 6 sources
       └─ [Pro]     Verdict engine     → true/false/partial/unverifiable
                                          + confidence + citations + nuance
  │
  └─ SSE stream → React frontend (live log + stage progress)
```

---

## Evaluation Criteria Coverage

| Criterion | Implementation |
|-----------|---------------|
| Claim extraction accuracy | Chain-of-Thought prompt with atomicity constraint |
| Evidence retrieval | Tavily advanced search, 2 distinct queries per claim |
| Verdict logic | Pro model grounded in retrieved evidence only |
| Explainability | Expandable cards with supporting/contradicting evidence |
| Progress UX | SSE streaming, live terminal log, 4-stage progress bar |
| Ambiguity handling | `nuance` field, "partially true" verdict, conflicting evidence shown |
| Error recovery | Jina→BS4 scraper fallback, JSON parse guards, per-claim try/catch |
| AI detection | Gemini Flash stylometric analysis, 0–1 probability + signals |
