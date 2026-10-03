"""Unit Tests for Media Security and Video Validation.
"""

import os
import sys
import tempfile
from pathlib import Path
import numpy as np
import cv2
import pytest

backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.services.media_service import (
    is_safe_url,
    validate_video,
    cleanup_temp_file
)


def test_ssrf_blocks_localhost():
    safe, msg = is_safe_url("http://localhost:8000/video.mp4")
    assert safe is False
    assert "localhost" in msg.lower() or "restricted" in msg.lower()


def test_ssrf_blocks_private_ip():
    safe, msg = is_safe_url("http://192.168.1.1/video.mp4")
    assert safe is False
    assert "restricted" in msg.lower() or "private" in msg.lower()

    safe2, _ = is_safe_url("http://10.0.0.1/video.mp4")
    assert safe2 is False


def test_ssrf_blocks_cloud_metadata():
    safe, msg = is_safe_url("http://169.254.169.254/latest/meta-data")
    assert safe is False


def test_ssrf_blocks_unsupported_protocol():
    safe, msg = is_safe_url("file:///etc/passwd")
    assert safe is False
    assert "protocol" in msg.lower()


def test_video_validation_valid_clip():
    """Creates a tiny valid video file with OpenCV and tests validation."""
    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as f:
        temp_path = f.name

    try:
        # Create a tiny 1-second 30fps video
        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        writer = cv2.VideoWriter(temp_path, fourcc, 30.0, (128, 128))
        for _ in range(30):
            frame = np.zeros((128, 128, 3), dtype=np.uint8)
            writer.write(frame)
        writer.release()

        is_valid, err_msg, duration = validate_video(temp_path, max_size_bytes=10*1024*1024, max_duration_seconds=90)
        assert is_valid is True
        assert err_msg is None
        assert duration is not None
        assert 0.8 <= duration <= 1.2
    finally:
        cleanup_temp_file(temp_path)


def test_video_validation_corrupted_file():
    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as f:
        f.write(b"NOT_A_REAL_VIDEO_DATA_GARBAGE")
        temp_path = f.name

    try:
        is_valid, err_msg, duration = validate_video(temp_path)
        assert is_valid is False
        assert "Corrupted" in err_msg or "error" in err_msg.lower()
    finally:
        cleanup_temp_file(temp_path)


def test_cleanup_temp_file():
    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as f:
        temp_path = f.name
    assert os.path.exists(temp_path)

    cleanup_temp_file(temp_path)
    assert not os.path.exists(temp_path)
