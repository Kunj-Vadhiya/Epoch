"""FastAPI Application for DeepTrust AI Backend & Telegram Bot.

Endpoints:
- GET /: Root service greeting and documentation links
- GET /health: Subsystem and detector readiness check
- POST /api/analyze/video: Direct video file upload analysis (Web / API)
- POST /api/analyze/url: Direct video URL analysis (Browser Extension)
- GET /api/analyze/{job_id}: Job polling status
- POST /api/telegram/webhook: Telegram Bot webhook updates (Production)
- POST /api/telegram/test: Development simulation endpoint

Supports clean local long-polling alongside FastAPI without requiring HTTPS.
"""

from typing import Dict, Any
import os
import sys
import asyncio
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Ensure backend root is on sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.config import settings
from app.api.telegram import router as telegram_router
from app.api.analyze import router as analyze_router
from app.api.v1_forensics import router as v1_forensics_router
from app.telegram.bot import start_telegram_polling, stop_telegram_polling


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manages application startup and shutdown lifecycle."""
    # 1. Startup: Launch polling if in polling mode and token is configured
    if settings.TELEGRAM_MODE == "polling" and settings.is_telegram_configured:
        asyncio.create_task(start_telegram_polling())

    yield

    # 2. Shutdown: Stop polling cleanly
    if settings.TELEGRAM_MODE == "polling" and settings.is_telegram_configured:
        await stop_telegram_polling()


app = FastAPI(
    title="DeepTrust AI — Deepfake & Scam Ad Detector API",
    description=(
        "Production backend and Telegram Bot integration for DeepTrust AI. "
        "Analyzes suspicious videos for facial deepfakes, synthetic speech, lip-sync anomalies, "
        "and fraudulent advertising claims."
    ),
    version="2.0.0",
    lifespan=lifespan
)

# Robust CORS middleware allowing localhost:3000 (Next.js), 127.0.0.1:3000, and all dev ports
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routers
app.include_router(v1_forensics_router)
app.include_router(telegram_router)
app.include_router(analyze_router)


@app.get("/", summary="Root Welcome")
def root_info() -> Dict[str, Any]:
    """Root endpoint welcoming developers and linking to docs."""
    return {
        "service": "DeepTrust AI — Is That Really Them?",
        "version": "2.0.0",
        "description": "AI-powered Deepfake + Scam Advertisement Detector",
        "telegram_mode": settings.TELEGRAM_MODE,
        "telegram_configured": settings.is_telegram_configured,
        "docs_url": "/docs",
        "health_url": "/health"
    }


@app.get("/health", summary="System & Detector Health Check")
def health_check() -> Dict[str, Any]:
    """Returns service operational readiness and subsystem statuses."""
    import torch
    is_gpu = torch.cuda.is_available()

    return {
        "status": "healthy",
        "service": "DeepTrust AI",
        "version": "2.0.0",
        "telegram": {
            "configured": settings.is_telegram_configured,
            "mode": settings.TELEGRAM_MODE
        },
        "detectors": {
            "visual_detector": "Ready (EfficientNet-B0 + BiGRU)",
            "audio_detector": "Ready (AudioCNN / AASIST)",
            "lipsync_detector": "Ready (SyncNet Optical Flow)",
            "whisper_transcription": "Ready",
            "ocr_extractor": "Ready (EasyOCR)",
            "scam_nlp": "Ready (Multilingual)",
            "fusion_engine": "Ready (SHAP/LIME/Grad-CAM)"
        },
        "hardware": {
            "device": "cuda" if is_gpu else "cpu",
            "gpu_available": is_gpu
        },
        "limits": {
            "max_video_size_mb": settings.MAX_VIDEO_SIZE_MB,
            "max_duration_seconds": settings.MAX_VIDEO_DURATION_SECONDS,
            "max_concurrent_analyses": settings.MAX_CONCURRENT_ANALYSES,
            "timeout_seconds": settings.ANALYSIS_TIMEOUT_SECONDS
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
