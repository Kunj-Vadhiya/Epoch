"""Telegram Update Handlers for DeepTrust AI.

Processes incoming bot commands, video uploads, text messages, and inline button callbacks.
"""

from typing import Dict, Any, Optional
import asyncio
import logging
from telegram import Update
from telegram.ext import ContextTypes

from app.config import settings
from app.services.telegram_service import telegram_service
from app.services.job_service import (
    create_analysis_job,
    is_telegram_message_already_processed,
    process_analysis_job_async,
    get_job
)
from app.telegram.formatter import (
    format_start_message,
    format_help_message,
    format_about_message,
    format_status_message,
    format_example_message,
    format_analyzing_message,
    format_oversized_message,
    format_unsupported_message
)

logger = logging.getLogger(__name__)


# -------------------------------------------------------------
# COMMAND HANDLERS
# -------------------------------------------------------------

async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handles /start command."""
    if not update.effective_chat:
        return
    await context.bot.send_message(
        chat_id=update.effective_chat.id,
        text=format_start_message(),
        parse_mode="Markdown"
    )


async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handles /help command."""
    if not update.effective_chat:
        return
    await context.bot.send_message(
        chat_id=update.effective_chat.id,
        text=format_help_message(),
        parse_mode="Markdown"
    )


async def about_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handles /about command."""
    if not update.effective_chat:
        return
    await context.bot.send_message(
        chat_id=update.effective_chat.id,
        text=format_about_message(),
        parse_mode="Markdown"
    )


async def status_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handles /status command."""
    if not update.effective_chat:
        return
    import torch
    is_gpu = torch.cuda.is_available()
    await context.bot.send_message(
        chat_id=update.effective_chat.id,
        text=format_status_message(is_gpu_available=is_gpu),
        parse_mode="Markdown"
    )


async def example_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handles /example command."""
    if not update.effective_chat:
        return
    await context.bot.send_message(
        chat_id=update.effective_chat.id,
        text=format_example_message(),
        parse_mode="Markdown"
    )


# -------------------------------------------------------------
# VIDEO & MESSAGE HANDLERS
# -------------------------------------------------------------

async def handle_video(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """
    Handles incoming video messages from Telegram users.
    Validates size, acknowledges immediately, and triggers async deepfake analysis.
    """
    if not update.effective_chat or not update.message or not update.message.video:
        return

    chat_id = update.effective_chat.id
    message_id = update.message.message_id
    video = update.message.video

    # Check Telegram Bot API 20MB limit
    if video.file_size and video.file_size > settings.max_video_size_bytes:
        await context.bot.send_message(
            chat_id=chat_id,
            text=format_oversized_message(settings.MAX_VIDEO_SIZE_MB),
            parse_mode="Markdown"
        )
        return

    # Check idempotency to prevent duplicate jobs on webhook retries
    if is_telegram_message_already_processed(chat_id, message_id):
        logger.info("Ignoring duplicate Telegram message: chat %s, msg %s", chat_id, message_id)
        return

    # 1. Immediately acknowledge video receipt
    await context.bot.send_message(
        chat_id=chat_id,
        text=format_analyzing_message(),
        parse_mode="Markdown"
    )

    # 2. Create job and launch asynchronous worker
    job = create_analysis_job(
        source="telegram",
        chat_id=str(chat_id),
        message_id=str(message_id),
        file_id=video.file_id
    )

    asyncio.create_task(process_analysis_job_async(job.job_id))


async def handle_document(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """
    Handles videos sent as documents/files.
    """
    if not update.effective_chat or not update.message or not update.message.document:
        return

    chat_id = update.effective_chat.id
    message_id = update.message.message_id
    doc = update.message.document

    mime = (doc.mime_type or "").lower()
    fname = (doc.file_name or "").lower()
    is_video = (
        mime.startswith("video/") or
        any(fname.endswith(ext) for ext in [".mp4", ".mov", ".avi", ".webm", ".mkv"])
    )

    if not is_video:
        await context.bot.send_message(
            chat_id=chat_id,
            text=format_unsupported_message(),
            parse_mode="Markdown"
        )
        return

    if doc.file_size and doc.file_size > settings.max_video_size_bytes:
        await context.bot.send_message(
            chat_id=chat_id,
            text=format_oversized_message(settings.MAX_VIDEO_SIZE_MB),
            parse_mode="Markdown"
        )
        return

    if is_telegram_message_already_processed(chat_id, message_id):
        return

    await context.bot.send_message(
        chat_id=chat_id,
        text=format_analyzing_message(),
        parse_mode="Markdown"
    )

    job = create_analysis_job(
        source="telegram",
        chat_id=str(chat_id),
        message_id=str(message_id),
        file_id=doc.file_id
    )

    asyncio.create_task(process_analysis_job_async(job.job_id))


async def handle_text(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """
    Handles text messages. If message contains a URL, routes to direct URL analyzer.
    Otherwise sends unsupported format guidance.
    """
    if not update.effective_chat or not update.message or not update.message.text:
        return

    chat_id = update.effective_chat.id
    message_id = update.message.message_id
    text = update.message.text.strip()

    if text.startswith("http://") or text.startswith("https://"):
        if is_telegram_message_already_processed(chat_id, message_id):
            return

        await context.bot.send_message(
            chat_id=chat_id,
            text="🔍 *Video URL received.*\n\nDownloading and analyzing video from link...\nPlease wait...",
            parse_mode="Markdown"
        )

        job = create_analysis_job(
            source="telegram",
            chat_id=str(chat_id),
            message_id=str(message_id),
            input_url=text
        )
        asyncio.create_task(process_analysis_job_async(job.job_id))
    else:
        await context.bot.send_message(
            chat_id=chat_id,
            text=format_unsupported_message(),
            parse_mode="Markdown"
        )


# -------------------------------------------------------------
# CALLBACK QUERY HANDLER (INLINE BUTTONS)
# -------------------------------------------------------------

async def handle_callback_query(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handles inline buttons: [🎬 Evidence], [📝 Transcript], [🔎 OCR], [📊 Full Report], [🔄 Analyze Again]."""
    query = update.callback_query
    if not query:
        return

    await query.answer()
    data = query.data or ""

    if ":" not in data:
        return

    action, job_id = data.split(":", 1)
    job = get_job(job_id)

    if not job or not job.result:
        await query.message.reply_text("⚠️ Analysis details no longer cached in memory.")
        return

    res = job.result

    if action == "evidence":
        intervals = res.get("suspicious_intervals", [])
        if intervals:
            lines = ["🎬 *Detailed Evidence Breakdown:*\n"]
            for i, item in enumerate(intervals[:6], 1):
                tf = item.get("time_frame", f"{item.get('start_seconds', 0)}s–{item.get('end_seconds', 0)}s")
                expl = item.get("explanation", f"{item.get('type')} anomaly")
                score = item.get("score", 0.0)
                lines.append(f"{i}. *{tf}* (Score: {score:.2f})\n   ↳ _{expl}_\n")
            text = "\n".join(lines)
        else:
            text = "🎬 *Evidence:* No high-confidence anomaly intervals detected in this clip."
        await query.message.reply_text(text, parse_mode="Markdown")

    elif action == "transcript":
        tr = res.get("transcript", "").strip()
        text = f"📝 *Full Audio Transcript:*\n\n_{tr}_" if tr else "📝 *Transcript:* No audible speech detected."
        await query.message.reply_text(text, parse_mode="Markdown")

    elif action == "ocr":
        ocr = res.get("ocr_text", "")
        if isinstance(ocr, list):
            ocr = " | ".join(ocr)
        text = f"🔎 *On-Screen OCR Text:*\n\n_{ocr}_" if ocr.strip() else "🔎 *OCR:* No on-screen scam text identified."
        await query.message.reply_text(text, parse_mode="Markdown")

    elif action == "full":
        diag_lines = [
            "📊 *Full DeepTrust Diagnostics:*\n",
            f"• Video Duration: {res.get('duration', res.get('video_duration_seconds', 0))}s",
            f"• Visual Model Score: {res.get('deepfake_score', res.get('visual', {}).get('score', 'N/A'))}",
            f"• Voice AI Score: {res.get('synthetic_voice_score', 'N/A')}",
            f"• Lip-Sync Anomaly: {res.get('lip_sync_score', 'N/A')}",
            f"• Scam NLP Score: {res.get('scam_score', 'N/A')}",
            f"• Overall Risk: {res.get('overall_risk', res.get('risk_level', 'N/A'))}",
            f"• Confidence: {res.get('confidence', 'N/A')}"
        ]
        await query.message.reply_text("\n".join(diag_lines), parse_mode="Markdown")

    elif action == "again":
        await query.message.reply_text("🔄 Please forward or send another video clip to analyze!")
