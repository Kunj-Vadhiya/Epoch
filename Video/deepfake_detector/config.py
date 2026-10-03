"""Application Configuration Module.

Reads environment variables for Meta WhatsApp Cloud API, media constraints,
and webhook security. Never hardcodes credentials.
"""

from typing import Optional
import os
from pathlib import Path

# Load .env file manually if python-dotenv is not installed
env_path = Path(__file__).resolve().parent / ".env"
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

    # Meta WhatsApp Cloud API credentials
    WHATSAPP_ACCESS_TOKEN: str = os.getenv("WHATSAPP_ACCESS_TOKEN", "")
    WHATSAPP_PHONE_NUMBER_ID: str = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "")
    WHATSAPP_BUSINESS_ACCOUNT_ID: str = os.getenv("WHATSAPP_BUSINESS_ACCOUNT_ID", "")
    WHATSAPP_VERIFY_TOKEN: str = os.getenv("WHATSAPP_VERIFY_TOKEN", "")
    META_APP_SECRET: str = os.getenv("META_APP_SECRET", "")
    GRAPH_API_VERSION: str = os.getenv("GRAPH_API_VERSION", "v21.0")

    # Media validation & limits
    MAX_VIDEO_SIZE_MB: int = int(os.getenv("MAX_VIDEO_SIZE_MB", "50"))
    MAX_VIDEO_DURATION_SECONDS: int = int(os.getenv("MAX_VIDEO_DURATION_SECONDS", "90"))
    ANALYSIS_TIMEOUT_SECONDS: int = int(os.getenv("ANALYSIS_TIMEOUT_SECONDS", "60"))

    # Temporary storage
    TEMP_MEDIA_DIR: str = os.getenv(
        "TEMP_MEDIA_DIR",
        str(Path(__file__).resolve().parent / "temp_media")
    )

    @property
    def max_video_size_bytes(self) -> int:
        return self.MAX_VIDEO_SIZE_MB * 1024 * 1024

    @property
    def graph_api_base_url(self) -> str:
        return f"https://graph.facebook.com/{self.GRAPH_API_VERSION}"

    @property
    def is_whatsapp_configured(self) -> bool:
        return bool(self.WHATSAPP_ACCESS_TOKEN and self.WHATSAPP_PHONE_NUMBER_ID)


settings = Settings()
