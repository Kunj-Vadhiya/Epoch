"""Job Management, Concurrency & Asynchronous Pipeline Runner for DeepTrust AI.

Enforces:
- Idempotency using chat_id + message_id to prevent duplicate processing
- Concurrency limiting via asyncio.Semaphore (MAX_CONCURRENT_ANALYSES)
- Central analyzer invocation without duplicating models
- Telegram outbound delivery and temporary file cleanup
"""

from typing import Dict, Optional, Any
import os
import time
import uuid
import asyncio
import logging
from datetime import datetime, timezone

from app.config import settings
from app.schemas.jobs import AnalysisJob, JobState
from app.schemas.report import DeepTrustReport
from app.services.media_service import validate_video, cleanup_temp_file, download_url_safely
from app.services.telegram_service import telegram_service
from app.services.analysis_service import analyze_video
from app.services.report_service import format_telegram_report, format_error_message

logger = logging.getLogger(__name__)

# In-memory job repository & idempotency cache
_JOBS: Dict[str, AnalysisJob] = {}
_TELEGRAM_MESSAGE_ID_INDEX: Dict[str, str] = {}  # "chat_id:message_id" -> job_id

# Concurrency semaphore (default 1 to prevent GPU/CPU exhaustion)
_CONCURRENCY_SEMAPHORE: Optional[asyncio.Semaphore] = None


def get_concurrency_semaphore() -> asyncio.Semaphore:
    global _CONCURRENCY_SEMAPHORE
    if _CONCURRENCY_SEMAPHORE is None:
        _CONCURRENCY_SEMAPHORE = asyncio.Semaphore(settings.MAX_CONCURRENT_ANALYSES)
    return _CONCURRENCY_SEMAPHORE


def is_telegram_message_already_processed(chat_id: Any, message_id: Any) -> bool:
    """Checks if a Telegram message has already been received and enqueued."""
    if not chat_id or not message_id:
        return False
    key = f"{chat_id}:{message_id}"
    return key in _TELEGRAM_MESSAGE_ID_INDEX


def create_analysis_job(
    source: str = "telegram",
    chat_id: Optional[str] = None,
    message_id: Optional[str] = None,
    file_id: Optional[str] = None,
    input_url: Optional[str] = None
) -> AnalysisJob:
    """Creates a new analysis job and registers the idempotency key."""
    job_id = f"dt_{uuid.uuid4().hex[:12]}"
    job = AnalysisJob(
        job_id=job_id,
        source=source,
        sender_id=str(chat_id) if chat_id else None,
        whatsapp_message_id=str(message_id) if message_id else None,
        media_id=file_id,
        input_url=input_url,
        status=JobState.QUEUED,
        stage="queued"
    )
    _JOBS[job_id] = job

    if chat_id and message_id:
        key = f"{chat_id}:{message_id}"
        _TELEGRAM_MESSAGE_ID_INDEX[key] = job_id

    logger.info("Created DeepTrust analysis job %s (source: %s)", job_id, source)
    return job


def get_job(job_id: str) -> Optional[AnalysisJob]:
    """Retrieves an analysis job by its ID."""
    return _JOBS.get(job_id)


async def process_analysis_job_async(job_id: str) -> None:
    """
    Asynchronous job worker pipeline with concurrency control:
    1. Acquires concurrency semaphore
    2. Downloads Telegram media or direct URL
    3. Validates video decodability and duration
    4. Runs central deepfake detector
    5. Formats DeepTrust report
    6. Sends report to Telegram user with evidence buttons
    7. Cleans up temporary video files
    """
    job = get_job(job_id)
    if not job:
        logger.error("Job %s not found in registry.", job_id)
        return

    sem = get_concurrency_semaphore()
    async with sem:
        start_time = time.time()
        temp_video_path: Optional[str] = None

        try:
            # 1. DOWNLOADING
            job.status = JobState.DOWNLOADING
            job.stage = "downloading_media"
            logger.info("[%s] Downloading media for analysis...", job_id)

            if job.source == "telegram" and job.media_id:
                # Run blocking download in threadpool
                loop = asyncio.get_running_loop()
                temp_video_path = await loop.run_in_executor(
                    None,
                    telegram_service.download_file,
                    job.media_id,
                    settings.TEMP_VIDEO_DIR,
                    settings.max_video_size_bytes
                )
            elif job.input_url:
                loop = asyncio.get_running_loop()
                temp_video_path = await loop.run_in_executor(
                    None,
                    download_url_safely,
                    job.input_url,
                    settings.TEMP_VIDEO_DIR,
                    settings.max_video_size_bytes
                )
            else:
                raise ValueError("Job contains neither a Telegram file_id nor an input URL.")

            # 2. PREPROCESSING & VALIDATION
            job.status = JobState.PREPROCESSING
            job.stage = "validating_video"
            logger.info("[%s] Validating video integrity...", job_id)

            loop = asyncio.get_running_loop()
            is_valid, err_msg, duration = await loop.run_in_executor(
                None,
                validate_video,
                temp_video_path,
                settings.max_video_size_bytes,
                settings.MAX_VIDEO_DURATION_SECONDS
            )

            if not is_valid:
                raise ValueError(err_msg or "Video failed decode validation.")

            # 3. ANALYZING (Central AI Pipeline)
            job.status = JobState.ANALYZING
            job.stage = "running_central_pipeline"
            logger.info("[%s] Invoking central DeepTrust AI detector...", job_id)

            report: DeepTrustReport = await loop.run_in_executor(
                None,
                analyze_video,
                temp_video_path
            )
            job.result = report.model_dump()

            # 4. GENERATING REPORT
            job.status = JobState.GENERATING_REPORT
            job.stage = "generating_report"
            logger.info("[%s] Formatting DeepTrust trust report...", job_id)

            telegram_report_text = format_telegram_report(report)
            job.whatsapp_report = telegram_report_text

            # 5. DELIVER RESULT TO TELEGRAM USER
            if job.source == "telegram" and job.sender_id:
                # Import inline keyboard helper
                from app.telegram.keyboards import get_evidence_keyboard
                reply_markup = get_evidence_keyboard(job.job_id)

                logger.info("[%s] Delivering report to Telegram chat: %s", job_id, job.sender_id)
                await loop.run_in_executor(
                    None,
                    telegram_service.send_message,
                    job.sender_id,
                    telegram_report_text,
                    "Markdown",
                    reply_markup
                )

            # Mark Completed
            job.status = JobState.COMPLETED
            job.stage = "completed"
            job.completed_at = datetime.now(timezone.utc)
            job.duration_ms = int((time.time() - start_time) * 1000)
            logger.info("[%s] Analysis completed successfully in %d ms.", job_id, job.duration_ms)

        except Exception as exc:
            job.status = JobState.FAILED
            job.stage = "failed"
            job.error = str(exc)
            job.completed_at = datetime.now(timezone.utc)
            job.duration_ms = int((time.time() - start_time) * 1000)
            logger.error("[%s] Analysis job failed after %d ms: %s", job_id, job.duration_ms, str(exc), exc_info=True)

            if job.source == "telegram" and job.sender_id:
                err_text = format_error_message(str(exc) if "Video" in str(exc) or "validation" in str(exc).lower() else None)
                loop = asyncio.get_running_loop()
                await loop.run_in_executor(
                    None,
                    telegram_service.send_message,
                    job.sender_id,
                    err_text,
                    "Markdown"
                )

        finally:
            cleanup_temp_file(temp_video_path)


def process_analysis_job_sync(job_id: str) -> None:
    """Synchronous runner for background tasks or workers."""
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

    if loop.is_running():
        asyncio.create_task(process_analysis_job_async(job_id))
    else:
        loop.run_until_complete(process_analysis_job_async(job_id))
