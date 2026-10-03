"""Face Tracking Pipeline for Consistent Temporal Modeling.

Tracks the primary subject across 16 sampled frames using IoU (Intersection-over-Union)
and temporal smoothing to ensure the GRU temporal model receives a coherent sequence of
the same person rather than jumping between unrelated background faces.
"""

from typing import List, Tuple, Dict, Any, Optional
import cv2
import numpy as np

try:
    from src.face_detector import LightweightFaceDetector
    from src.utils import setup_logger
except (ImportError, ModuleNotFoundError):
    from .face_detector import LightweightFaceDetector
    from .utils import setup_logger

logger = setup_logger(__name__)


def compute_iou(box1: Tuple[int, int, int, int], box2: Tuple[int, int, int, int]) -> float:
    """Computes IoU between two bounding boxes (x, y, w, h)."""
    x1, y1, w1, h1 = box1
    x2, y2, w2, h2 = box2

    xi1 = max(x1, x2)
    yi1 = max(y1, y2)
    xi2 = min(x1 + w1, x2 + w2)
    yi2 = min(y1 + h1, y2 + h2)

    inter_w = max(0, xi2 - xi1)
    inter_h = max(0, yi2 - yi1)
    inter_area = inter_w * inter_h

    area1 = w1 * h1
    area2 = w2 * h2
    union_area = area1 + area2 - inter_area

    if union_area <= 0:
        return 0.0
    return float(inter_area / union_area)


class FaceTracker:
    """
    Maintains a consistent face track across 16 temporal video frames.
    Selects the dominant speaker/subject and enforces temporal trajectory continuity.
    """

    def __init__(
        self,
        target_size: Tuple[int, int] = (224, 224),
        margin_ratio: float = 0.20,
        iou_threshold: float = 0.30
    ):
        self.target_size = target_size
        self.margin_ratio = margin_ratio
        self.iou_threshold = iou_threshold
        self.detector = LightweightFaceDetector(margin_ratio=margin_ratio, target_size=target_size)

    def extract_face_track(
        self,
        frames: List[np.ndarray],
        timestamps: List[float]
    ) -> Tuple[np.ndarray, List[Dict[str, Any]]]:
        """
        Extracts tracked face sequence from sampled video frames.

        Args:
            frames: List of 16 RGB frames (H, W, 3).
            timestamps: List of 16 timestamps in seconds.

        Returns:
            face_crops: np.ndarray of shape (16, target_size[0], target_size[1], 3) uint8 RGB.
            track_metadata: List of 16 dicts with bbox, confidence, timestamp, frame_index.
        """
        num_frames = len(frames)
        raw_detections: List[List[Dict[str, Any]]] = []

        # Step 1: Detect all candidate faces in all frames
        for f_idx, (frame_rgb, ts) in enumerate(zip(frames, timestamps)):
            h, w = frame_rgb.shape[:2]
            frame_dets = []

            if self.detector.cascade is not None:
                gray = cv2.cvtColor(frame_rgb, cv2.COLOR_RGB2GRAY)
                faces = self.detector.cascade.detectMultiScale(
                    gray, scaleFactor=1.1, minNeighbors=4, minSize=(36, 36)
                )
                for (x, y, fw, fh) in faces:
                    frame_dets.append({
                        "bbox": (int(x), int(y), int(fw), int(fh)),
                        "area": int(fw * fh),
                        "confidence": 0.90,
                        "frame_index": f_idx,
                        "timestamp": ts
                    })

            raw_detections.append(frame_dets)

        # Step 2: Identify primary subject from the most confident/largest face
        best_initial_bbox = None
        max_area = 0
        best_initial_frame = 0

        for f_idx, dets in enumerate(raw_detections):
            for d in dets:
                if d["area"] > max_area:
                    max_area = d["area"]
                    best_initial_bbox = d["bbox"]
                    best_initial_frame = f_idx

        # If no face detected in any frame, fall back to center crop
        if best_initial_bbox is None:
            crops = []
            metadata = []
            for f_idx, (frame_rgb, ts) in enumerate(zip(frames, timestamps)):
                h, w = frame_rgb.shape[:2]
                min_dim = min(h, w)
                crop = frame_rgb[(h - min_dim) // 2 : (h + min_dim) // 2, (w - min_dim) // 2 : (w + min_dim) // 2]
                resized = cv2.resize(crop, self.target_size)
                crops.append(resized)
                metadata.append({
                    "frame_index": f_idx,
                    "timestamp": round(float(ts), 3),
                    "face_detected": False,
                    "bbox": None,
                    "confidence": 0.0
                })
            return np.stack(crops), metadata

        # Step 3: Track forwards and backwards from best initial frame using IoU
        tracked_bboxes: List[Optional[Tuple[int, int, int, int]]] = [None] * num_frames
        tracked_bboxes[best_initial_frame] = best_initial_bbox

        # Forward tracking
        current_box = best_initial_bbox
        for f_idx in range(best_initial_frame + 1, num_frames):
            candidates = raw_detections[f_idx]
            best_cand = None
            best_iou = 0.0
            for cand in candidates:
                iou = compute_iou(current_box, cand["bbox"])
                if iou > best_iou:
                    best_iou = iou
                    best_cand = cand["bbox"]

            if best_cand is not None and best_iou >= self.iou_threshold:
                current_box = best_cand
                tracked_bboxes[f_idx] = current_box
            else:
                # Keep previous box position with smooth fallback
                tracked_bboxes[f_idx] = current_box

        # Backward tracking
        current_box = best_initial_bbox
        for f_idx in range(best_initial_frame - 1, -1, -1):
            candidates = raw_detections[f_idx]
            best_cand = None
            best_iou = 0.0
            for cand in candidates:
                iou = compute_iou(current_box, cand["bbox"])
                if iou > best_iou:
                    best_iou = iou
                    best_cand = cand["bbox"]

            if best_cand is not None and best_iou >= self.iou_threshold:
                current_box = best_cand
                tracked_bboxes[f_idx] = current_box
            else:
                tracked_bboxes[f_idx] = current_box

        # Step 4: Crop tracked bounding boxes with margin
        final_crops = []
        final_meta = []

        for f_idx, (frame_rgb, ts) in enumerate(zip(frames, timestamps)):
            h, w = frame_rgb.shape[:2]
            bbox = tracked_bboxes[f_idx] or best_initial_bbox
            x, y, fw, fh = bbox

            # Apply margin
            margin_x = int(fw * self.margin_ratio)
            margin_y = int(fh * self.margin_ratio)

            x1 = max(0, x - margin_x)
            y1 = max(0, y - margin_y)
            x2 = min(w, x + fw + margin_x)
            y2 = min(h, y + fh + margin_y)

            crop = frame_rgb[y1:y2, x1:x2]
            if crop.size == 0 or crop.shape[0] < 5 or crop.shape[1] < 5:
                min_dim = min(h, w)
                crop = frame_rgb[(h - min_dim) // 2 : (h + min_dim) // 2, (w - min_dim) // 2 : (w + min_dim) // 2]

            resized = cv2.resize(crop, self.target_size)
            final_crops.append(resized)
            final_meta.append({
                "frame_index": f_idx,
                "timestamp": round(float(ts), 3),
                "face_detected": True,
                "bbox": (int(x1), int(y1), int(x2 - x1), int(y2 - y1)),
                "confidence": 0.85
            })

        return np.stack(final_crops), final_meta
