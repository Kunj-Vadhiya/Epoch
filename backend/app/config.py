"""Application Configuration Module.

Reads environment variables for DeepTrust AI Telegram Bot, media constraints,
and concurrency limits. Never hardcodes credentials or bot tokens.
"""

from typing import Optional
import os
from pathlib import Path

# Load .env file manually if present
env_path = Path(__file__).resolve().parent.parent / ".env"
if env_path.is_file():
    try:
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, val = line.split("=", 1)
                    key = key.strip()
                    val = val.strip().strip('"').strip("'")
                    if key and key not in os.environ:
                        os.environ[key] = val
    except Exception:
        pass


class Settings:
    """Central configuration parameters."""

    # Telegram Bot API Configuration
    TELEGRAM_BOT_TOKEN: str = os.getenv("TELEGRAM_BOT_TOKEN", "")
    TELEGRAM_MODE: str = os.getenv("TELEGRAM_MODE", "polling").lower()  # "polling" or "webhook"
    TELEGRAM_WEBHOOK_URL: str = os.getenv("TELEGRAM_WEBHOOK_URL", "")
    TELEGRAM_WEBHOOK_SECRET: str = os.getenv("TELEGRAM_WEBHOOK_SECRET", "")

    # Media validation & limits
    MAX_VIDEO_SIZE_MB: int = int(os.getenv("MAX_VIDEO_SIZE_MB", "20"))  # Telegram download limit is 20MB
    MAX_VIDEO_DURATION_SECONDS: int = int(os.getenv("MAX_VIDEO_DURATION_SECONDS", "90"))
    ANALYSIS_TIMEOUT_SECONDS: int = int(os.getenv("ANALYSIS_TIMEOUT_SECONDS", "120"))

    # Concurrency control (prevents GPU/CPU exhaustion)
    MAX_CONCURRENT_ANALYSES: int = int(os.getenv("MAX_CONCURRENT_ANALYSES", "1"))

    # Temporary storage
    TEMP_VIDEO_DIR: str = os.getenv(
        "TEMP_VIDEO_DIR",
        str(Path(__file__).resolve().parent.parent / "tmp" / "videos")
    )

    # Central analyzer connection
    CENTRAL_ANALYZER_URL: str = os.getenv("CENTRAL_ANALYZER_URL", "http://localhost:8000/api/v1/video/analyze")

    @property
    def max_video_size_bytes(self) -> int:
        return self.MAX_VIDEO_SIZE_MB * 1024 * 1024

    @property
    def is_telegram_configured(self) -> bool:
        return bool(self.TELEGRAM_BOT_TOKEN and not self.TELEGRAM_BOT_TOKEN.startswith("your_"))


settings = Settings()
