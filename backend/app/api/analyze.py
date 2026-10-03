"""Direct Video & URL Analysis Endpoints for DeepTrust AI.

Allows Web Uploads, Browser Extensions, and API Clients to submit videos
to the central DeepTrust analyzer independently from Telegram.
"""

from typing import Dict, Any, Optional
import os
import tempfile
import logging
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse

from app.config import settings
from app.schemas.analysis import UrlAnalysisRequest, UrlAnalysisResponse
from app.schemas.jobs import JobStatusResponse
from app.schemas.report import DeepTrustReport
from app.services.media_service import is_safe_url, validate_video, cleanup_temp_file
from app.services.analysis_service import analyze_video
from app.services.job_service import create_analysis_job, get_job, process_analysis_job_async

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/analyze", tags=["Direct Video & URL Analysis"])


@router.post("/video", response_model=DeepTrustReport, summary="Direct Video File Upload Analysis (Web Frontend)")
async def analyze_uploaded_video(
    file: UploadFile = File(..., description="Target video file (.mp4, .mov, .avi, .webm)")
) -> DeepTrustReport:
    """
    Directly analyzes an uploaded video file using the central DeepTrust AI pipeline.
    Usable by web frontends, mobile apps, or manual test scripts.
    """
    filename = file.filename or "uploaded_video.mp4"
    ext = os.path.splitext(filename)[1].lower() or ".mp4"

    if ext not in [".mp4", ".mov", ".avi", ".webm", ".mkv"]:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported video format '{ext}'. Supported formats: .mp4, .mov, .avi, .webm, .mkv"
        )

    file_bytes = await file.read()
    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded video file is empty.")

    if len(file_bytes) > settings.max_video_size_bytes:
        raise HTTPException(
            status_code=400,
            detail=f"Video size exceeds limit of {settings.MAX_VIDEO_SIZE_MB} MB."
        )

    os.makedirs(settings.TEMP_VIDEO_DIR, exist_ok=True)
    fd, temp_file_path = tempfile.mkstemp(prefix="direct_upload_", suffix=ext, dir=settings.TEMP_VIDEO_DIR)
    os.close(fd)

    try:
        with open(temp_file_path, "wb") as f:
            f.write(file_bytes)

        # Validate video decodability and duration
        valid, err_msg, duration = validate_video(
            temp_file_path,
            settings.max_video_size_bytes,
            settings.MAX_VIDEO_DURATION_SECONDS
        )
        if not valid:
            raise HTTPException(status_code=422, detail=f"Video validation failed: {err_msg}")

        # Run central analysis pipeline
        report = analyze_video(temp_file_path)
        return report

    finally:
        cleanup_temp_file(temp_file_path)


@router.post("/url", response_model=UrlAnalysisResponse, summary="Submit Direct Video URL (Browser Extension)")
def analyze_video_url(
    payload: UrlAnalysisRequest,
    background_tasks: BackgroundTasks
) -> UrlAnalysisResponse:
    """
    Submits a video URL for asynchronous analysis.
    Protects against SSRF and private IP queries before enqueuing.
    """
    url_str = str(payload.url).strip()

    is_safe, error_msg = is_safe_url(url_str)
    if not is_safe:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid or restricted URL: {error_msg}"
        )

    job = create_analysis_job(
        source="direct_url",
        input_url=url_str
    )
    background_tasks.add_task(process_analysis_job_async, job.job_id)

    return UrlAnalysisResponse(
        job_id=job.job_id,
        status="queued",
        message="Video analysis job enqueued successfully."
    )


@router.get("/{job_id}", response_model=JobStatusResponse, summary="Poll Analysis Job Status and Results")
def get_analysis_status(job_id: str) -> JobStatusResponse:
    """Retrieves the current state and results of an analysis job."""
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job ID '{job_id}' not found.")

    return JobStatusResponse(
        job_id=job.job_id,
        status=job.status,
        stage=job.stage,
        created_at=job.created_at,
        completed_at=job.completed_at,
        error=job.error,
        result=job.result
    )
