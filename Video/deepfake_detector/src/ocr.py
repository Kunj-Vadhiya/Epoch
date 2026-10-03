"""Optical Character Recognition (OCR) for Scam Video Overlays.

Extracts on-screen advertising text from video frames to catch scam slogans,
guaranteed returns, and recruitment phone numbers / links.
"""

from typing import List, Dict, Any
import numpy as np

try:
    from src.utils import setup_logger
except (ImportError, ModuleNotFoundError):
    from .utils import setup_logger

logger = setup_logger(__name__)


class VideoTextExtractor:
    """Extracts on-screen text from video frames."""

    def __init__(self):
        self._ocr = None

    def _init_ocr(self):
        if self._ocr is not None:
            return self._ocr
        try:
            from paddleocr import PaddleOCR
            self._ocr = PaddleOCR(use_angle_cls=False, lang="en", show_log=False)
        except Exception:
            try:
                import easyocr
                self._ocr = easyocr.Reader(["en"])
            except Exception:
                self._ocr = "basic_fallback"
        return self._ocr

    def extract_text_from_frames(self, frames_rgb: List[np.ndarray]) -> List[str]:
        """
        Extracts on-screen text strings from sampled frames.
        """
        if not frames_rgb:
            return []

        ocr = self._init_ocr()
        extracted_lines = []

        if ocr == "basic_fallback":
            return []

        for frame in frames_rgb[::4]:  # Sample every 4th frame
            try:
                # PaddleOCR check
                if hasattr(ocr, "ocr"):
                    res = ocr.ocr(frame, cls=False)
                    if res and res[0]:
                        for line in res[0]:
                            text = line[1][0]
                            if text and len(text.strip()) > 3:
                                extracted_lines.append(text.strip().upper())
                # EasyOCR check
                elif hasattr(ocr, "readtext"):
                    res = ocr.readtext(frame)
                    for item in res:
                        text = item[1]
                        if text and len(text.strip()) > 3:
                            extracted_lines.append(text.strip().upper())
            except Exception as e:
                logger.debug("OCR extraction step notice: %s", str(e))

        return list(dict.fromkeys(extracted_lines))
