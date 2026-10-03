"""Lightweight Face Detection Pipeline.

Uses OpenCV Haar Cascade as primary detector with automatic fallback
to center-crop to ensure fast, zero-blocker processing without heavy external C-dependencies.
"""

import os
from typing import Tuple, Dict, Any, Optional
import cv2
import numpy as np
try:
    from src.utils import setup_logger
except (ImportError, ModuleNotFoundError):
    from .utils import setup_logger

logger = setup_logger(__name__)


class LightweightFaceDetector:
    """Lightweight and robust face detector with margin-expansion and fallback."""

    def __init__(self, method: str = "opencv_haar", margin_ratio: float = 0.15, target_size: Tuple[int, int] = (224, 224)):
        self.method = method
        self.margin_ratio = margin_ratio
        self.target_size = target_size
        self._init_detector()

    def _init_detector(self) -> None:
        """Initializes the detector model."""
        try:
            self.cascade = None
            if hasattr(cv2, "CascadeClassifier"):
                cascade_path = None
                if hasattr(cv2, "data") and hasattr(cv2.data, "haarcascades"):
                    cascade_path = os.path.join(cv2.data.haarcascades, "haarcascade_frontalface_default.xml")
                if cascade_path and os.path.exists(cascade_path):
                    self.cascade = cv2.CascadeClassifier(cascade_path)
                elif hasattr(cv2, "samples"):
                    try:
                        self.cascade = cv2.CascadeClassifier(cv2.samples.findFile("haarcascades/haarcascade_frontalface_default.xml", False))
                    except Exception:
                        self.cascade = None

                if self.cascade is not None and self.cascade.empty():
                    self.cascade = None
        except Exception as e:
            logger.debug("Haar cascade initialization notice: %s. Center crop will be used.", str(e))
            self.cascade = None

    def detect_and_crop(
        self,
        frame_rgb: np.ndarray,
        frame_index: int = 0,
        timestamp: float = 0.0
    ) -> Tuple[np.ndarray, Dict[str, Any]]:
        """
        Detects primary face, crops with margin, and resizes to target_size.
        If no face is detected, gracefully falls back to center-crop with face_detected=False.

        Args:
            frame_rgb: Input frame in RGB format (H, W, 3).
            frame_index: Index of the sampled frame.
            timestamp: Video timestamp in seconds.

        Returns:
            cropped_face: Processed image array of shape (target_size[0], target_size[1], 3) in RGB.
            metadata: Dictionary containing frame_index, timestamp, face_detected, and bbox.
        """
        h, w = frame_rgb.shape[:2]
        face_detected = False
        selected_bbox: Optional[Tuple[int, int, int, int]] = None

        if self.cascade is not None:
            gray = cv2.cvtColor(frame_rgb, cv2.COLOR_RGB2GRAY) if frame_rgb.ndim == 3 else frame_rgb
            # Fast multi-scale detection
            faces = self.cascade.detectMultiScale(
                gray,
                scaleFactor=1.1,
                minNeighbors=4,
                minSize=(40, 40),
                flags=cv2.CASCADE_SCALE_IMAGE
            )

            if len(faces) > 0:
                # Select the largest face by area (primary scam advertisement subject)
                faces = sorted(faces, key=lambda b: b[2] * b[3], reverse=True)
                x, y, fw, fh = faces[0]
                face_detected = True
                selected_bbox = (int(x), int(y), int(fw), int(fh))

        if face_detected and selected_bbox is not None:
            x, y, fw, fh = selected_bbox
            # Add margin around face to include boundary artifacts (hairline, jaw)
            margin_x = int(fw * self.margin_ratio)
            margin_y = int(fh * self.margin_ratio)

            x1 = max(0, x - margin_x)
            y1 = max(0, y - margin_y)
            x2 = min(w, x + fw + margin_x)
            y2 = min(h, y + fh + margin_y)

            crop = frame_rgb[y1:y2, x1:x2]
        else:
            # Fallback: square center crop of the frame
            crop = self._center_crop(frame_rgb)

        # Standardize resize to target size
        resized_crop = cv2.resize(crop, self.target_size, interpolation=cv2.INTER_LINEAR)

        metadata = {
            "frame_index": frame_index,
            "timestamp": round(timestamp, 3),
            "face_detected": face_detected,
            "bbox": selected_bbox
        }

        return resized_crop, metadata

    def _center_crop(self, img: np.ndarray) -> np.ndarray:
        """Helper to compute a square center crop from an image."""
        h, w = img.shape[:2]
        min_dim = min(h, w)
        start_x = (w - min_dim) // 2
        start_y = (h - min_dim) // 2
        return img[start_y:start_y + min_dim, start_x:start_x + min_dim]

