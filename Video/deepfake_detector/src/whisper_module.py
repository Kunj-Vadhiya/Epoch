"""Speech-to-Text Transcription via Whisper.

Transcribes audio tracks supporting English, Hindi, and Hinglish for scam ad
forensic analysis and keyword extraction.
"""

from typing import Dict, Any, Optional
import os
import sys

# Ensure bundled ffmpeg in venv Scripts is on system PATH
scripts_dir = os.path.dirname(sys.executable)
if scripts_dir not in os.environ.get("PATH", ""):
    os.environ["PATH"] = scripts_dir + os.pathsep + os.environ.get("PATH", "")

try:
    from src.utils import setup_logger
except (ImportError, ModuleNotFoundError):
    from .utils import setup_logger

logger = setup_logger(__name__)


class WhisperTranscriber:
    """Lightweight Whisper transcriber with lazy model loading and multilingual support."""

    def __init__(self, model_size: str = "base"):
        self.model_size = model_size
        self._model = None

    def _load_model(self):
        if self._model is not None:
            return self._model
        try:
            import whisper
            logger.info("Loading Whisper (%s) speech model...", self.model_size)
            self._model = whisper.load_model(self.model_size)
        except Exception as e:
            logger.warning("Whisper speech model not available (%s). Using rule-based fallback.", str(e))
            self._model = "fallback"
        return self._model

    def transcribe(self, audio_path: Optional[str]) -> Dict[str, Any]:
        """
        Transcribes audio into text.
        Returns dict with text, language, segments.
        """
        if not audio_path or not os.path.exists(audio_path):
            return {
                "text": "",
                "language": "unknown",
                "segments": []
            }

        model = self._load_model()
        if model == "fallback":
            return {
                "text": "",
                "language": "en",
                "segments": []
            }

        try:
            result = model.transcribe(audio_path, fp16=False)
            return {
                "text": result.get("text", "").strip(),
                "language": result.get("language", "en"),
                "segments": result.get("segments", [])
            }
        except Exception as e:
            logger.warning("Whisper transcription error: %s", str(e))
            return {
                "text": "",
                "language": "unknown",
                "segments": []
            }
