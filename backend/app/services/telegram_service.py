"""Telegram Bot API Service.

Encapsulates all outbound calls to Telegram Bot API (getFile, download, sendMessage, sendPhoto).
Never hardcodes the bot token. Uses python-telegram-bot or direct requests fallback.
"""

from typing import Optional, Dict, Any, Union
import os
import tempfile
import logging
from pathlib import Path
import requests

from app.config import settings

logger = logging.getLogger(__name__)


class TelegramService:
    """Outbound Telegram Bot API Client."""

    def __init__(self, token: Optional[str] = None):
        self.token = token or settings.TELEGRAM_BOT_TOKEN
        self.base_url = f"https://api.telegram.org/bot{self.token}" if self.token else ""
        self.file_base_url = f"https://api.telegram.org/file/bot{self.token}" if self.token else ""

    def _ensure_token(self) -> None:
        if not self.token:
            raise ValueError("TELEGRAM_BOT_TOKEN is not configured in environment.")

    def get_file_info(self, file_id: str) -> Dict[str, Any]:
        """
        Calls getFile on Telegram Bot API to get file_path and size.
        """
        self._ensure_token()
        url = f"{self.base_url}/getFile"
        resp = requests.get(url, params={"file_id": file_id}, timeout=15)
        if resp.status_code != 200:
            raise RuntimeError(f"Telegram getFile error {resp.status_code}: {resp.text}")

        data = resp.json()
        if not data.get("ok"):
            raise RuntimeError(f"Telegram getFile failed: {data.get('description')}")

        return data.get("result", {})

    def download_file(
        self,
        file_id: str,
        dest_dir: Optional[str] = None,
        max_size_bytes: Optional[int] = None
    ) -> str:
        """
        Downloads a media file from Telegram Bot API using file_id -> getFile -> file_path.
        Streams download to a secure temporary file and validates size limit.
        """
        self._ensure_token()
        file_info = self.get_file_info(file_id)
        remote_path = file_info.get("file_path")
        file_size = file_info.get("file_size", 0)

        max_allowed = max_size_bytes or settings.max_video_size_bytes
        if file_size and file_size > max_allowed:
            raise ValueError(
                f"File size ({file_size / (1024*1024):.1f} MB) exceeds maximum allowed limit of {settings.MAX_VIDEO_SIZE_MB} MB."
            )

        if not remote_path:
            raise ValueError("Telegram did not provide a valid file_path for downloading.")

        download_url = f"{self.file_base_url}/{remote_path}"
        ext = os.path.splitext(remote_path)[1].lower() or ".mp4"

        target_dir = dest_dir or settings.TEMP_VIDEO_DIR
        os.makedirs(target_dir, exist_ok=True)

        fd, temp_file_path = tempfile.mkstemp(prefix="tg_video_", suffix=ext, dir=target_dir)
        os.close(fd)

        logger.info("Downloading Telegram media from %s to %s", remote_path, temp_file_path)

        with requests.get(download_url, stream=True, timeout=settings.ANALYSIS_TIMEOUT_SECONDS) as r:
            if r.status_code != 200:
                try:
                    os.unlink(temp_file_path)
                except OSError:
                    pass
                raise RuntimeError(f"Failed to download file from Telegram (HTTP {r.status_code})")

            total_downloaded = 0
            with open(temp_file_path, "wb") as f:
                for chunk in r.iter_content(chunk_size=65536):
                    if chunk:
                        total_downloaded += len(chunk)
                        if total_downloaded > max_allowed:
                            f.close()
                            try:
                                os.unlink(temp_file_path)
                            except OSError:
                                pass
                            raise ValueError(
                                f"File size exceeds maximum download limit of {settings.MAX_VIDEO_SIZE_MB} MB."
                            )
                        f.write(chunk)

        return temp_file_path

    def send_message(
        self,
        chat_id: Union[int, str],
        text: str,
        parse_mode: str = "Markdown",
        reply_markup: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Sends a text message with optional inline keyboard buttons."""
        if not self.token or self.token.startswith("your_"):
            logger.info("Telegram bot token not configured; skipping real message delivery.")
            return {"status": "skipped", "reason": "token_not_configured"}

        url = f"{self.base_url}/sendMessage"
        payload = {
            "chat_id": chat_id,
            "text": text,
            "parse_mode": parse_mode
        }
        if reply_markup:
            payload["reply_markup"] = reply_markup

        resp = requests.post(url, json=payload, timeout=15)
        if resp.status_code != 200:
            logger.warning("Failed to send Telegram message (HTTP %d): %s", resp.status_code, resp.text)
            # If Markdown parsing fails due to special characters, fallback to plain text
            if "can't parse entities" in resp.text:
                payload.pop("parse_mode", None)
                resp = requests.post(url, json=payload, timeout=15)

        return resp.json() if resp.status_code == 200 else {}

    def send_photo(
        self,
        chat_id: Union[int, str],
        photo_path: str,
        caption: Optional[str] = None
    ) -> Dict[str, Any]:
        """Sends an evidence photo/heatmap to a chat."""
        if not self.token or self.token.startswith("your_"):
            return {}
        if not os.path.isfile(photo_path):
            return {}

        url = f"{self.base_url}/sendPhoto"
        data = {"chat_id": chat_id}
        if caption:
            data["caption"] = caption

        with open(photo_path, "rb") as f:
            resp = requests.post(url, data=data, files={"photo": f}, timeout=20)

        return resp.json() if resp.status_code == 200 else {}


# Singleton instance
telegram_service = TelegramService()
