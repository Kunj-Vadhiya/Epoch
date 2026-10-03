"""FastAPI Service for Multimodal Deepfake & Scam Detection Suite.

Modular, decoupled architecture supporting:
1. Video Deepfake & Scam Detection (/api/v1/video/analyze) - ACTIVE
2. Image Deepfake Detection       (/api/v1/image/analyze) - STAGED
3. Audio Synthetic Voice Detection (/api/v1/audio/analyze) - STAGED

Includes backward-compatible alias:
- POST /analyze-video -> forwards to Video Detection
"""

from typing import Dict, Any
import os
import sys
from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from api.routers.video import router as video_router, analyze_video as analyze_video_handler
from api.routers.image import router as image_router
from api.routers.audio import router as audio_router, analyze_audio as analyze_audio_handler
from src.inference import get_inference_pipeline
from src.utils import setup_logger

logger = setup_logger(__name__)

app = FastAPI(
    title="Multimodal Deepfake & Scam Ad Detection API",
    description=(
        "Comprehensive forensic API suite detecting deepfakes across Video, Image, and Audio. "
        "Each media modality is completely decoupled into its own independent router."
    ),
    version="2.0.0",
    openapi_tags=[
        {"name": "Video Deepfake & Scam Detection", "description": "End-to-end spatiotemporal deepfake and scam ad analysis (ACTIVE)."},
        {"name": "Image Deepfake Detection", "description": "Single-image and photo deepfake detection (STAGED for future models)."},
        {"name": "Audio Synthetic Voice Detection", "description": "Standalone voice cloning and synthetic speech detection (STAGED for future models)."},
        {"name": "System & Health", "description": "Service readiness and module status checks."}
    ]
)

# Enable CORS for all frontends (React / Next.js / Vue / Vite)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Modular Routers under /api/v1
app.include_router(video_router, prefix="/api/v1")
app.include_router(image_router, prefix="/api/v1")
app.include_router(audio_router, prefix="/api/v1")


@app.on_event("startup")
def startup_event():
    """Pre-warm video and audio detector model weights on server start."""
    logger.info("Initializing and pre-warming deepfake detector pipeline...")
    try:
        get_inference_pipeline()
        logger.info("Deepfake video detection pipeline ready for inference.")
    except Exception as e:
        logger.warning("Pipeline pre-warming notice: %s", str(e))

    try:
        from api.routers.audio import get_audio_inference_engine
        get_audio_inference_engine()
        logger.info("AudioCNN deepfake detection model ready for inference.")
    except Exception as e:
        logger.warning("Audio model pre-warming notice: %s", str(e))


@app.get("/health", tags=["System & Health"], summary="Root Health Check")
@app.get("/api/v1/health", tags=["System & Health"], summary="V1 Health & Subsystem Status")
def health_check() -> Dict[str, Any]:
    """Returns service health and operational status of each media modality."""
    return {
        "status": "healthy",
        "service": "Multimodal Deepfake & Scam Detection Suite",
        "version": "2.0.0",
        "modules": {
            "video_detection": {
                "status": "active",
                "endpoint": "/api/v1/video/analyze",
                "models": ["EfficientNet-B0", "BiGRU", "MediaPipe", "Whisper", "EasyOCR", "FaceNet", "YOLOv8", "SHAP", "LIME", "Grad-CAM"],
                "supported_formats": [".mp4", ".mov", ".avi", ".webm", ".mkv"]
            },
            "image_detection": {
                "status": "staged",
                "endpoint": "/api/v1/image/analyze",
                "supported_formats": [".jpg", ".jpeg", ".png", ".webp", ".bmp"]
            },
            "audio_detection": {
                "status": "active",
                "endpoint": "/api/v1/audio/analyze",
                "model": "AudioCNN (log-Mel Spectrogram)",
                "supported_formats": [".wav", ".mp3", ".m4a", ".aac", ".flac", ".ogg"]
            }
        }
    }


# Backward-compatible alias for existing frontend code
@app.post("/analyze-video", tags=["Video Deepfake & Scam Detection"], summary="Legacy Video Endpoint Alias")
async def legacy_analyze_video(
    file: UploadFile = File(..., description="Target video file to analyze for deepfake manipulation")
) -> JSONResponse:
    """Forwarding alias to /api/v1/video/analyze to preserve existing client compatibility."""
    return await analyze_video_handler(file)


@app.post("/analyze-audio", tags=["Audio Synthetic Voice Detection"], summary="Audio Endpoint Alias")
async def legacy_analyze_audio(
    file: UploadFile = File(..., description="Target audio file to analyze for synthetic voice")
) -> JSONResponse:
    """Forwarding alias to /api/v1/audio/analyze."""
    return await analyze_audio_handler(file)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api.main:app", host="0.0.0.0", port=8000, reload=True)
