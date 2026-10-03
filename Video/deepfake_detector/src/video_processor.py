"""Robust Video Decoding and Frame Extraction Module.

Uniformly samples exactly N frames (default 8) from short videos,
extracts faces using LightweightFaceDetector, and formats output for EfficientNet.
"""

import os
from typing import List, Dict, Any, Tuple, Optional
import cv2
import numpy as np
try:
    from src.face_detector import LightweightFaceDetector
    from src.utils import setup_logger
except (ImportError, ModuleNotFoundError):
    from .face_detector import LightweightFaceDetector
    from .utils import setup_logger

logger = setup_logger(__name__)


class VideoProcessor:
    """Handles uniform frame sampling, face detection, and video metadata extraction."""

    def __init__(
        self,
        num_frames: int = 8,
        target_size: Tuple[int, int] = (224, 224),
        face_detector: Optional[LightweightFaceDetector] = None
    ):
        self.num_frames = num_frames
        self.target_size = target_size
        self.face_detector = face_detector or LightweightFaceDetector(target_size=target_size)

    def process_video(
        self,
        video_path: str
    ) -> Tuple[np.ndarray, List[Dict[str, Any]], Dict[str, Any]]:
        """
        Extracts exactly `self.num_frames` uniformly sampled frames from video.

        Args:
            video_path: Local filesystem path to MP4 or video file.

        Returns:
            frames: Numpy array of shape (num_frames, target_size[0], target_size[1], 3) in RGB format.
            frame_metadata: List of metadata dicts for each sampled frame (index, timestamp, face_detected, bbox).
            video_info: Dict containing total_frames, fps, and duration_seconds.
        """
        if not os.path.exists(video_path):
            raise FileNotFoundError(f"Video file not found: {video_path}")

        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError(f"Could not open video file: {video_path}")

        try:
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            fps = cap.get(cv2.CAP_PROP_FPS)
            if fps <= 0 or np.isnan(fps):
                fps = 25.0  # Fallback standard FPS
            
            # If total_frames is 0 or negative, count frames manually
            if total_frames <= 0:
                total_frames = self._count_frames_manually(video_path)
                cap.release()
                cap = cv2.VideoCapture(video_path) # Reopen after counting

            duration = total_frames / fps if total_frames > 0 else 0.0

            video_info = {
                "total_frames": total_frames,
                "fps": round(fps, 2),
                "duration_seconds": round(duration, 2)
            }

            # Handle edge cases: empty video
            if total_frames <= 0:
                logger.warning("Empty video file: %s. Returning blank padded frames.", video_path)
                blank_frame = np.zeros((*self.target_size, 3), dtype=np.uint8)
                frames = np.stack([blank_frame] * self.num_frames)
                meta = [{"frame_index": i, "timestamp": 0.0, "face_detected": False, "bbox": None} for i in range(self.num_frames)]
                return frames, meta, video_info

            # Compute uniform sample indices
            if total_frames >= self.num_frames:
                frame_indices = np.linspace(0, total_frames - 1, self.num_frames).astype(int)
            else:
                # Video has fewer than 8 frames: pad with duplicates
                frame_indices = np.array(
                    list(range(total_frames)) + [total_frames - 1] * (self.num_frames - total_frames),
                    dtype=int
                )

            extracted_frames: List[np.ndarray] = []
            frame_metadata: List[Dict[str, Any]] = []

            # Extract specific frame indices
            for target_idx in frame_indices:
                cap.set(cv2.CAP_PROP_POS_FRAMES, target_idx)
                ret, frame_bgr = cap.read()
                
                if not ret or frame_bgr is None:
                    # If seek failed, duplicate last good frame or create zero frame
                    if len(extracted_frames) > 0:
                        extracted_frames.append(extracted_frames[-1].copy())
                        frame_metadata.append(frame_metadata[-1].copy())
                    else:
                        blank = np.zeros((*self.target_size, 3), dtype=np.uint8)
                        extracted_frames.append(blank)
                        frame_metadata.append({
                            "frame_index": int(target_idx),
                            "timestamp": float(target_idx / fps),
                            "face_detected": False,
                            "bbox": None
                        })
                    continue

                frame_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
                timestamp = float(target_idx / fps)

                # Face detection and crop
                face_crop, meta = self.face_detector.detect_and_crop(
                    frame_rgb=frame_rgb,
                    frame_index=int(target_idx),
                    timestamp=timestamp
                )

                extracted_frames.append(face_crop)
                frame_metadata.append(meta)

            # Ensure exact length
            while len(extracted_frames) < self.num_frames:
                extracted_frames.append(extracted_frames[-1].copy() if extracted_frames else np.zeros((*self.target_size, 3), dtype=np.uint8))
                frame_metadata.append(frame_metadata[-1].copy() if frame_metadata else {"frame_index": 0, "timestamp": 0.0, "face_detected": False, "bbox": None})

            return np.array(extracted_frames[:self.num_frames]), frame_metadata[:self.num_frames], video_info

        finally:
            cap.release()

    def _count_frames_manually(self, video_path: str) -> int:
        """Counts frames when metadata properties are missing or corrupted."""
        cap = cv2.VideoCapture(video_path)
        count = 0
        while True:
            ret, _ = cap.read()
            if not ret:
                break
            count += 1
        cap.release()
        return count


def create_synthetic_video(
    output_path: str,
    num_frames: int = 30,
    fps: int = 25,
    width: int = 320,
    height: int = 240,
    is_fake: bool = False
) -> str:
    """
    Creates a synthetic test video with a moving face-like circle pattern.
    Useful for local testing, CI/CD, and offline verification.
    """
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))

    for i in range(num_frames):
        # Create background
        frame = np.full((height, width, 3), 40, dtype=np.uint8)
        
        # Draw face oval
        center_x = int(width // 2 + 10 * np.sin(i / 5.0))
        center_y = int(height // 2 + 5 * np.cos(i / 5.0))
        cv2.ellipse(frame, (center_x, center_y), (40, 55), 0, 0, 360, (210, 180, 160), -1)
        
        # Draw eyes
        cv2.circle(frame, (center_x - 15, center_y - 12), 5, (255, 255, 255), -1)
        cv2.circle(frame, (center_x + 15, center_y - 12), 5, (255, 255, 255), -1)
        cv2.circle(frame, (center_x - 15, center_y - 12), 2, (30, 30, 30), -1)
        cv2.circle(frame, (center_x + 15, center_y - 12), 2, (30, 30, 30), -1)
        
        # Draw mouth
        cv2.ellipse(frame, (center_x, center_y + 20), (12, 6), 0, 0, 180, (180, 50, 50), 2)

        # If fake, add high-frequency tampering noise in mouth/eye region
        if is_fake:
            noise = np.random.normal(0, 25, (30, 40, 3))
            y1 = max(0, center_y - 15)
            y2 = min(height, center_y + 15)
            x1 = max(0, center_x - 20)
            x2 = min(width, center_x + 20)
            h_slice = y2 - y1
            w_slice = x2 - x1
            if h_slice > 0 and w_slice > 0:
                region = frame[y1:y2, x1:x2].astype(np.float32)
                noisy_region = np.clip(region + noise[:h_slice, :w_slice], 0, 255).astype(np.uint8)
                frame[y1:y2, x1:x2] = noisy_region

        out.write(frame)

    out.release()
    return output_path

