import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers.check import router as check_router
from routers.health import router as health_router
from routers.compare import router as compare_router
from routers.translate import router as translate_router
from routers.docqa import router as docqa_router
from routers.docverify import router as docverify_router
from routers.extract import router as extract_router

app = FastAPI(
    title="FactCheck AI",
    description="Multi-agent fact verification pipeline powered by Gemini + Tavily",
    version="1.0.0",
)

# Comma-separated list of extra allowed origins, e.g.
# ALLOWED_ORIGINS=https://factcheck-ai.vercel.app,https://factcheck-ai-git-main-yourname.vercel.app
_extra_origins = [
    o.strip() for o in os.getenv("ALLOWED_ORIGINS", "").split(",") if o.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", *_extra_origins],
    allow_origin_regex=r"https://.*\.vercel\.app",  # covers Vercel preview deployments
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(check_router, prefix="/api")
app.include_router(health_router, prefix="/api")
app.include_router(compare_router, prefix="/api")
app.include_router(translate_router, prefix="/api")
app.include_router(docqa_router, prefix="/api")
app.include_router(docverify_router, prefix="/api")
app.include_router(extract_router, prefix="/api")


@app.get("/")
async def root():
    return {"message": "FactCheck AI backend running. POST /api/check to verify claims."}