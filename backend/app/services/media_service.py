"""Media Processing, Security & Validation Service for DeepTrust AI.

Provides:
- Video validation (size limit, duration limit, OpenCV integrity decoding)
- SSRF protection for direct video URLs
- Safe temporary file lifecycle and cleanup
"""

from typing import Tuple, Optional
import os
import socket
import ipaddress
import tempfile
import logging
from urllib.parse import urlparse
import requests
import cv2

from app.config import settings

logger = logging.getLogger(__name__)

SUPPORTED_VIDEO_EXTENSIONS = [".mp4", ".mov", ".avi", ".webm", ".mkv"]
SUPPORTED_MIME_TYPES = [
    "video/mp4",
    "video/quicktime",
    "video/x-msvideo",
    "video/webm",
    "video/x-matroska"
]


def validate_video(
    file_path: str,
    max_size_bytes: Optional[int] = None,
    max_duration_seconds: Optional[int] = None
) -> Tuple[bool, Optional[str], Optional[float]]:
    """
    Validates that a video file:
    1. Exists and is not empty
    2. Does not exceed maximum file size (20 MB default)
    3. Can be opened and decoded by OpenCV
    4. Does not exceed maximum duration (90s default)
    Returns (is_valid, error_message, duration_seconds).
    """
    if not os.path.isfile(file_path):
        return False, "Video file does not exist on disk.", None

    file_size = os.path.getsize(file_path)
    if file_size == 0:
        return False, "Video file is empty (0 bytes).", None

    max_size = max_size_bytes or settings.max_video_size_bytes
    if file_size > max_size:
        return False, f"Video size ({file_size / (1024*1024):.1f} MB) exceeds limit of {settings.MAX_VIDEO_SIZE_MB} MB.", None

    max_duration = max_duration_seconds or settings.MAX_VIDEO_DURATION_SECONDS

    # OpenCV decode validation
    cap = cv2.VideoCapture(file_path)
    if not cap.isOpened():
        return False, "Corrupted video file: Unable to open video stream.", None

    fps = cap.get(cv2.CAP_PROP_FPS)
    frame_count = cap.get(cv2.CAP_PROP_FRAME_COUNT)

    ret, first_frame = cap.read()
    cap.release()

    if not ret or first_frame is None or first_frame.size == 0:
        return False, "Video decoding error: Unable to read any frames from video.", None

    if fps <= 0 or frame_count <= 0:
        duration = 0.0
    else:
        duration = round(frame_count / fps, 2)

    if duration > max_duration:
        return False, f"Video duration ({duration}s) exceeds maximum allowed limit of {max_duration} seconds.", duration

    return True, None, duration


def is_safe_url(url: str) -> Tuple[bool, Optional[str]]:
    """
    Validates a URL against Server-Side Request Forgery (SSRF) vulnerabilities.
    Blocks private IP addresses, loopback (localhost), link-local, and cloud metadata endpoints.
    """
    try:
        parsed = urlparse(url)
    except Exception as e:
        return False, f"Invalid URL structure: {str(e)}"

    if parsed.scheme.lower() not in ("http", "https"):
        return False, "Unsupported protocol: only HTTP and HTTPS are permitted."

    hostname = parsed.hostname
    if not hostname:
        return False, "URL is missing a valid hostname."

    # Immediate rejection of known dangerous hostnames
    lower_host = hostname.lower()
    if lower_host in ("localhost", "127.0.0.1", "0.0.0.0", "::1", "metadata.google.internal"):
        return False, "Access to localhost or internal metadata services is prohibited."

    # DNS resolution and IP validation
    try:
        addr_info = socket.getaddrinfo(hostname, None)
    except socket.gaierror:
        return False, f"Could not resolve hostname '{hostname}'."

    for item in addr_info:
        ip_str = item[4][0]
        try:
            ip = ipaddress.ip_address(ip_str)
            if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast:
                return False, f"URL resolves to restricted IP address: {ip_str}"
            if str(ip) == "169.254.169.254":
                return False, "Access to cloud metadata service (169.254.169.254) is prohibited."
        except ValueError:
            return False, f"Invalid IP address format: {ip_str}"

    return True, None


def download_url_safely(
    url: str,
    output_dir: Optional[str] = None,
    max_size_bytes: Optional[int] = None,
    timeout_seconds: Optional[int] = None
) -> str:
    """
    Safely downloads a video from a direct public URL with streaming size limits.
    """
    safe, err_msg = is_safe_url(url)
    if not safe:
        raise ValueError(f"SSRF Protection Error: {err_msg}")

    max_allowed = max_size_bytes or settings.max_video_size_bytes
    timeout = timeout_seconds or settings.ANALYSIS_TIMEOUT_SECONDS
    target_dir = output_dir or settings.TEMP_VIDEO_DIR
    os.makedirs(target_dir, exist_ok=True)

    path_ext = os.path.splitext(urlparse(url).path)[1].lower()
    ext = path_ext if path_ext in SUPPORTED_VIDEO_EXTENSIONS else ".mp4"

    fd, temp_file_path = tempfile.mkstemp(prefix="url_video_", suffix=ext, dir=target_dir)
    os.close(fd)

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) DeepTrustAI/2.0"
    }

    try:
        with requests.get(url, headers=headers, stream=True, timeout=timeout, allow_redirects=True) as r:
            if r.status_code != 200:
                raise RuntimeError(f"HTTP {r.status_code}: Unable to download video from URL.")

            content_length = r.headers.get("Content-Length")
            if content_length and int(content_length) > max_allowed:
                raise ValueError(
                    f"Video file size ({int(content_length) / (1024*1024):.1f} MB) exceeds maximum allowed {settings.MAX_VIDEO_SIZE_MB} MB."
                )

            total_downloaded = 0
            with open(temp_file_path, "wb") as f:
                for chunk in r.iter_content(chunk_size=65536):
                    if chunk:
                        total_downloaded += len(chunk)
                        if total_downloaded > max_allowed:
                            raise ValueError(
                                f"Video exceeds maximum download size limit of {settings.MAX_VIDEO_SIZE_MB} MB."
                            )
                        f.write(chunk)

        return temp_file_path

    except Exception:
        cleanup_temp_file(temp_file_path)
        raise


def cleanup_temp_file(file_path: Optional[str]) -> None:
    """Safely removes a temporary file without throwing errors."""
    if file_path and os.path.exists(file_path):
        try:
            os.unlink(file_path)
            logger.debug("Cleaned up temporary file: %s", file_path)
        except OSError as e:
            logger.warning("Could not delete temporary file '%s': %s", file_path, str(e))
