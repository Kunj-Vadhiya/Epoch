"""Audio Extraction and Processing Module.

Extracts audio tracks from arbitrary video files (MP4, MOV, AVI) using FFmpeg
or OpenCV/pydub/subprocess fallback into clean 16kHz WAV format for downstream
speech recognition and voice deepfake analysis.
"""

import os
import subprocess
from typing import Optional, Tuple
import numpy as np

try:
    from src.utils import setup_logger
except (ImportError, ModuleNotFoundError):
    from .utils import setup_logger

logger = setup_logger(__name__)


def get_ffmpeg_binary() -> str:
    """Finds system ffmpeg or imageio_ffmpeg bundled binary."""
    import shutil
    sys_ffmpeg = shutil.which("ffmpeg")
    if sys_ffmpeg:
        return sys_ffmpeg
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        return "ffmpeg"


def extract_audio(
    video_path: str,
    output_wav_path: Optional[str] = None,
    sample_rate: int = 16000
) -> Optional[str]:
    """
    Extracts mono 16kHz audio from a video file using FFmpeg.
    If no audio track exists, returns None gracefully without crashing.
    """
    if not os.path.exists(video_path):
        logger.error("Video file does not exist: %s", video_path)
        return None

    if output_wav_path is None:
        base_dir = os.path.dirname(video_path)
        base_name = os.path.splitext(os.path.basename(video_path))[0]
        output_wav_path = os.path.join(base_dir, f"{base_name}_audio.wav")

    os.makedirs(os.path.dirname(os.path.abspath(output_wav_path)), exist_ok=True)

    ffmpeg_bin = get_ffmpeg_binary()
    cmd = [
        ffmpeg_bin, "-y", "-i", video_path,
        "-vn", "-acodec", "pcm_s16le",
        "-ar", str(sample_rate), "-ac", "1",
        output_wav_path
    ]


    try:
        res = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=30
        )
        if res.returncode == 0 and os.path.exists(output_wav_path) and os.path.getsize(output_wav_path) > 100:
            return output_wav_path
        else:
            logger.debug("Video has no audio track or FFmpeg extraction yielded empty file.")
            return None
    except FileNotFoundError:
        logger.warning("FFmpeg binary not found on system PATH. Attempting fallback.")
        return None
    except Exception as e:
        logger.warning("Audio extraction notice: %s", str(e))
        return None


def convert_to_wav(
    input_audio_path: str,
    output_wav_path: Optional[str] = None,
    sample_rate: int = 16000
) -> Optional[str]:
    """
    Converts any arbitrary audio file (MP3, M4A, AAC, FLAC, OGG, etc.) to 16kHz mono WAV format.
    """
    if not os.path.exists(input_audio_path):
        logger.error("Input audio file does not exist: %s", input_audio_path)
        return None

    if output_wav_path is None:
        base_dir = os.path.dirname(input_audio_path)
        base_name = os.path.splitext(os.path.basename(input_audio_path))[0]
        output_wav_path = os.path.join(base_dir, f"{base_name}_converted_16k.wav")

    os.makedirs(os.path.dirname(os.path.abspath(output_wav_path)), exist_ok=True)

    ffmpeg_bin = get_ffmpeg_binary()
    cmd = [
        ffmpeg_bin, "-y", "-i", input_audio_path,
        "-vn", "-acodec", "pcm_s16le",
        "-ar", str(sample_rate), "-ac", "1",
        output_wav_path
    ]

    try:
        res = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=30
        )
        if res.returncode == 0 and os.path.exists(output_wav_path) and os.path.getsize(output_wav_path) > 100:
            return output_wav_path
        else:
            logger.warning("FFmpeg audio conversion failed: %s", res.stderr)
            return None
    except Exception as e:
        logger.warning("Audio conversion exception: %s", str(e))
        return None

