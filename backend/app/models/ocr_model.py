"""On-Screen Text OCR Model Facade.

References the central OCR extraction pipeline.
"""

import sys
from pathlib import Path

detector_path = Path(__file__).resolve().parent.parent.parent.parent / "Video" / "deepfake_detector"
if detector_path.is_dir() and str(detector_path) not in sys.path:
    sys.path.insert(0, str(detector_path))


def get_ocr_extractor():
    """Returns the central OCR extractor instance."""
    try:
        from src.inference import get_inference_pipeline
        pipeline = get_inference_pipeline()
        return pipeline.get("ocr_extractor")
    except Exception:
        return None
