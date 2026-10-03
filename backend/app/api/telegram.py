"""Telegram Webhook & Test Endpoints for DeepTrust AI.

Endpoints:
- POST /api/telegram/webhook: Receives Telegram updates in production webhook mode.
- POST /api/telegram/test: Development endpoint to simulate Telegram video uploads without credentials.
"""

from typing import Dict, Any, Optional
import json
import logging
from fastapi import APIRouter, Request, HTTPException, BackgroundTasks, Header
from fastapi.responses import JSONResponse
from telegram import Update

from app.config import settings
from app.telegram.bot import get_telegram_application
from app.services.job_service import create_analysis_job, process_analysis_job_async

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/telegram", tags=["Telegram Bot Webhooks"])


@router.post("/webhook", summary="Receive Telegram Webhook Updates (Production)")
async def telegram_webhook(
    request: Request,
    x_telegram_bot_api_secret_token: Optional[str] = Header(None, alias="X-Telegram-Bot-Api-Secret-Token")
) -> JSONResponse:
    """
    Receives incoming updates from Telegram Bot API when running in webhook mode.
    Validates secret token header if configured.
    """
    if settings.TELEGRAM_WEBHOOK_SECRET:
        if x_telegram_bot_api_secret_token != settings.TELEGRAM_WEBHOOK_SECRET:
            logger.warning("Telegram webhook secret token mismatch.")
            raise HTTPException(status_code=403, detail="Invalid webhook secret token.")

    try:
        body = await request.json()
    except Exception as e:
        logger.error("Failed to parse Telegram webhook JSON: %s", str(e))
        raise HTTPException(status_code=400, detail="Malformed JSON.")

    app = get_telegram_application()
    if not app:
        logger.warning("Telegram bot application not initialized.")
        return JSONResponse(content={"status": "bot_not_configured"}, status_code=200)

    # Convert dictionary to telegram.Update and feed to application queue
    try:
        update = Update.de_json(data=body, bot=app.bot)
        await app.process_update(update)
    except Exception as exc:
        logger.error("Error processing Telegram update: %s", str(exc), exc_info=True)

    return JSONResponse(content={"status": "ok"}, status_code=200)


@router.post("/test", summary="Simulate Telegram Video Submission (Development Test)")
async def telegram_test_submission(
    payload: Dict[str, Any],
    background_tasks: BackgroundTasks
) -> JSONResponse:
    """
    Development endpoint to test the Telegram pipeline flow by simulating a video message.
    Payload: {"chat_id": 12345678, "video_url": "https://...", "message_id": 101}
    """
    chat_id = payload.get("chat_id", "test_chat_001")
    video_url = payload.get("video_url")
    message_id = payload.get("message_id", "test_msg_001")

    if not video_url:
        raise HTTPException(status_code=400, detail="video_url is required for test simulation.")

    job = create_analysis_job(
        source="telegram",
        chat_id=str(chat_id),
        message_id=str(message_id),
        input_url=video_url
    )

    background_tasks.add_task(process_analysis_job_async, job.job_id)

    return JSONResponse(
        content={
            "status": "simulation_started",
            "job_id": job.job_id,
            "message": "Simulated Telegram video analysis job enqueued."
        },
        status_code=200
    )
