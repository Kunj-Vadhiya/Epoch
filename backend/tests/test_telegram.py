"""Unit and Integration Tests for Telegram Bot Commands and Message Handling.

Mocks Telegram API calls; does not require real Telegram credentials.
"""

import sys
from pathlib import Path
from unittest.mock import patch, MagicMock, AsyncMock
import pytest
from fastapi.testclient import TestClient

backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.main import app
from app.config import settings
from app.telegram.formatter import (
    format_start_message,
    format_help_message,
    format_about_message,
    format_status_message,
    format_example_message,
    format_oversized_message,
    format_unsupported_message
)
from app.services.job_service import is_telegram_message_already_processed, create_analysis_job

client = TestClient(app)


def test_start_command_content():
    text = format_start_message()
    assert "DeepTrust AI" in text
    assert "Facial manipulation" in text or "Deepfake" in text
    assert "20 MB" in text
    assert "probabilistic" in text


def test_help_command_content():
    text = format_help_message()
    assert "/start" in text
    assert "/status" in text
    assert "/example" in text
    assert "20 MB" in text


def test_about_command_content():
    text = format_about_message()
    assert "EfficientNet" in text or "Visual" in text
    assert "Lip-Sync" in text
    assert "Synthetic Voice" in text
    assert "Whisper" in text


def test_status_command_content():
    text = format_status_message(is_gpu_available=False)
    assert "Telegram Bot: Online" in text
    assert "AI Analyzer: Available" in text
    assert "Visual Detector" in text
    assert "Lip-Sync Detector" in text


def test_example_command_content():
    text = format_example_message()
    assert "DEEPTRUST AI REPORT" in text
    assert "HIGH RISK" in text
    assert "00:07–00:12" in text


def test_oversized_message():
    text = format_oversized_message(20)
    assert "20 MB" in text
    assert "too large" in text


def test_unsupported_message():
    text = format_unsupported_message()
    assert "send a video file" in text


def test_duplicate_message_idempotency():
    chat_id = "test_chat_101"
    msg_id = "test_msg_999"

    # Before creation
    assert is_telegram_message_already_processed(chat_id, msg_id) is False

    # Create job
    job = create_analysis_job(source="telegram", chat_id=chat_id, message_id=msg_id)

    # After creation
    assert is_telegram_message_already_processed(chat_id, msg_id) is True


def test_telegram_simulation_test_endpoint():
    response = client.post(
        "/api/telegram/test",
        json={
            "chat_id": "12345678",
            "message_id": "99",
            "video_url": "https://httpbin.org/status/200"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "simulation_started"
    assert "job_id" in data
