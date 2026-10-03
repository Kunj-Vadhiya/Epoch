"""Synthetic Voice Model Facade.

References the central AudioCNN and synthetic voice analysis components.
"""

from typing import Dict, Any, Optional
import sys
from pathlib import Path

detector_path = Path(__file__).resolve().parent.parent.parent.parent / "Video" / "deepfake_detector"
if detector_path.is_dir() and str(detector_path) not in sys.path:
    sys.path.insert(0, str(detector_path))


def get_audio_detector():
    """Returns the central voice detector instance."""
    try:
        from src.inference import get_inference_pipeline
        pipeline = get_inference_pipeline()
        return pipeline.get("voice_detector")
    except Exception:
        return None
