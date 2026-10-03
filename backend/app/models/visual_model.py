"""Visual and Spatiotemporal Deepfake Model Facade.

References the central EfficientNet-B0 + BiGRU temporal detection pipeline.
Never duplicates model architectures.
"""

from typing import Dict, Any, Optional
import sys
from pathlib import Path

# Add central detector path
detector_path = Path(__file__).resolve().parent.parent.parent.parent / "Video" / "deepfake_detector"
if detector_path.is_dir() and str(detector_path) not in sys.path:
    sys.path.insert(0, str(detector_path))


def get_visual_detector():
    """Returns the central visual feature extractor instance."""
    try:
        from src.inference import get_inference_pipeline
        pipeline = get_inference_pipeline()
        return pipeline.get("video_model")
    except Exception as e:
        return None
