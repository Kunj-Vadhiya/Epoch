"""Speech Recognition Model Facade.

References the central Whisper transcription component.
"""

import sys
from pathlib import Path

detector_path = Path(__file__).resolve().parent.parent.parent.parent / "Video" / "deepfake_detector"
if detector_path.is_dir() and str(detector_path) not in sys.path:
    sys.path.insert(0, str(detector_path))


def get_transcriber():
    """Returns the central speech transcriber instance."""
    try:
        from src.inference import get_inference_pipeline
        pipeline = get_inference_pipeline()
        return pipeline.get("transcriber")
    except Exception:
        return None
