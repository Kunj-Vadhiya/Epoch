"""Video Detection Router.

Handles video uploads, temporary file persistence, multimodal analysis,
and structured response formatting for unseen video scam detection.
"""

from typing import Dict, Any
import os
import uuid
import shutil
import tempfile
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse

from src.inference import predict_video
from src.utils import setup_logger

logger = setup_logger(__name__)

router = APIRouter(prefix="/video", tags=["Video Deepfake & Scam Detection"])

SUPPORTED_VIDEO_FORMATS = [".mp4", ".mov", ".avi", ".webm", ".mkv"]


@router.post("/analyze", summary="Analyze Unseen Video for Deepfakes and Scams")
async def analyze_video(
    file: UploadFile = File(..., description="Video file to analyze (.mp4, .mov, .avi, .webm, .mkv)")
) -> JSONResponse:
    """
    Receives an unseen video upload, decodes frames, tracks faces, executes
    the trained EfficientNet-B0 + BiGRU sequence network, extracts audio for Whisper & voice analysis,
    scans on-screen text with EasyOCR, matches VIP identity with FaceNet, detects branding with YOLOv8,
    and returns comprehensive explainable results (SHAP, LIME, Grad-CAM).
    """
    filename = file.filename or "uploaded_video.mp4"
    ext = os.path.splitext(filename)[1].lower()

    if ext not in SUPPORTED_VIDEO_FORMATS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported video format '{ext}'. Supported formats: {', '.join(SUPPORTED_VIDEO_FORMATS)}"
        )

    temp_dir = tempfile.gettempdir()
    unique_id = str(uuid.uuid4())[:8]
    temp_video_path = os.path.join(temp_dir, f"df_video_{unique_id}{ext}")

    try:
        with open(temp_video_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Execute end-to-end inference
        report = predict_video(temp_video_path)
        report["uploaded_filename"] = filename
        report["media_type"] = "video"
        report["status"] = "success"

        return JSONResponse(content=report, status_code=200)

    except Exception as e:
        logger.error("Error analyzing video %s: %s", filename, str(e), exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to analyze video: {str(e)}")

    finally:
        # Guarantee temp video cleanup
        if os.path.exists(temp_video_path):
            try:
                os.remove(temp_video_path)
            except Exception:
                pass
