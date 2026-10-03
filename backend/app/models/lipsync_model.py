"""Lip-Sync Analysis Model Facade.

References the central LipSync audiovisual synchronization detector.
"""

import sys
from pathlib import Path

detector_path = Path(__file__).resolve().parent.parent.parent.parent / "Video" / "deepfake_detector"
if detector_path.is_dir() and str(detector_path) not in sys.path:
    sys.path.insert(0, str(detector_path))


def get_lipsync_detector():
    """Returns the central lip-sync detector instance."""
    try:
        from src.inference import get_inference_pipeline
        pipeline = get_inference_pipeline()
        return pipeline.get("lipsync_detector")
    except Exception:
        return None
