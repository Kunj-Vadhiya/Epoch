"""Telegram Bot Application Initialization and Lifecycle Management.

Supports:
- Development mode: Long polling alongside FastAPI
- Production mode: Webhook update processing
- Clean handler registration
"""

from typing import Optional
import asyncio
import logging
from telegram import Update
from telegram.ext import (
    Application,
    ApplicationBuilder,
    CommandHandler,
    MessageHandler,
    CallbackQueryHandler,
    filters
)

from app.config import settings
from app.telegram.handlers import (
    start_command,
    help_command,
    about_command,
    status_command,
    example_command,
    handle_video,
    handle_document,
    handle_text,
    handle_callback_query
)

logger = logging.getLogger(__name__)

_TELEGRAM_APP: Optional[Application] = None
_POLLING_TASK: Optional[asyncio.Task] = None


def build_telegram_application() -> Optional[Application]:
    """Builds and configures the python-telegram-bot Application instance."""
    token = settings.TELEGRAM_BOT_TOKEN
    if not token or token.startswith("your_"):
        logger.warning("TELEGRAM_BOT_TOKEN is not configured. Telegram bot features will be inactive.")
        return None

    app = ApplicationBuilder().token(token).build()

    # Register Command Handlers
    app.add_handler(CommandHandler("start", start_command))
    app.add_handler(CommandHandler("help", help_command))
    app.add_handler(CommandHandler("about", about_command))
    app.add_handler(CommandHandler("status", status_command))
    app.add_handler(CommandHandler("example", example_command))

    # Register Media & Message Handlers
    app.add_handler(MessageHandler(filters.VIDEO, handle_video))
    app.add_handler(MessageHandler(filters.Document.ALL, handle_document))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_text))

    # Register Callback Query Handler for Inline Buttons
    app.add_handler(CallbackQueryHandler(handle_callback_query))

    logger.info("Telegram Bot Application built and handlers registered successfully.")
    return app


def get_telegram_application() -> Optional[Application]:
    """Returns singleton Telegram Application."""
    global _TELEGRAM_APP
    if _TELEGRAM_APP is None and settings.is_telegram_configured:
        _TELEGRAM_APP = build_telegram_application()
    return _TELEGRAM_APP


async def start_telegram_polling() -> None:
    """Starts Telegram long polling in an asynchronous background task (Local Dev Mode)."""
    global _POLLING_TASK, _TELEGRAM_APP
    if not settings.is_telegram_configured:
        logger.info("Skipping Telegram polling: TELEGRAM_BOT_TOKEN not configured.")
        return

    _TELEGRAM_APP = build_telegram_application()
    if not _TELEGRAM_APP:
        return

    logger.info("Starting Telegram bot in LONG POLLING mode (Local Development)...")
    await _TELEGRAM_APP.initialize()
    await _TELEGRAM_APP.start()
    await _TELEGRAM_APP.updater.start_polling(drop_pending_updates=True)
    logger.info("Telegram Bot long polling is ACTIVE.")


async def stop_telegram_polling() -> None:
    """Stops Telegram bot polling on server shutdown."""
    global _TELEGRAM_APP
    if _TELEGRAM_APP and _TELEGRAM_APP.updater and _TELEGRAM_APP.updater.running:
        logger.info("Stopping Telegram updater...")
        await _TELEGRAM_APP.updater.stop()
        await _TELEGRAM_APP.stop()
        await _TELEGRAM_APP.shutdown()
        logger.info("Telegram Bot stopped successfully.")
