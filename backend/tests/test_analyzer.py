"""Unit Tests for Central Analyzer Normalization and Contract Adherence.
"""

import sys
from pathlib import Path
import pytest

backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.services.analysis_service import normalize_central_result


def test_normalize_central_result_full_pipeline():
    raw_payload = {
        "video_duration_seconds": 21.4,
        "prediction": "HIGH_RISK",
        "risk_level": "HIGH_RISK",
        "overall_risk_score": 0.885,
        "confidence": 0.92,
        "deepfake": {
            "label": "FAKE",
            "probability": 0.91
        },
        "voice": {
            "ai_probability": 0.76
        },
        "lip_sync": {
            "anomaly_score": 0.83
        },
        "scam": {
            "text_score": 0.94,
            "ocr_score": 0.89,
            "matched_signals": ["guaranteed_returns", "private_chat_recruitment"]
        },
        "transcript": "Double your money instantly in our Telegram group!",
        "ocr_text": ["100% PROFIT", "TELEGRAM: @SCAMMER"],
        "trigger_explanations": [
            "Mouth movement doesn't match speech at 00:07–00:12.",
            "Synthetic voice signal detected at 00:13–00:17."
        ]
    }

    report = normalize_central_result("test_video.mp4", raw_payload)

    assert report.video_id == "test_video.mp4"
    assert report.duration == 21.4
    assert report.overall_risk == "HIGH_RISK"
    assert report.deepfake_score == 0.91
    assert report.synthetic_voice_score == 0.76
    assert report.lip_sync_score == 0.83
    assert report.scam_score == 0.94
    assert "Double your money" in report.transcript
    assert len(report.evidence) == 2


def test_normalize_central_result_empty():
    report = normalize_central_result("empty.mp4", {})
    assert report.overall_risk == "UNCERTAIN"
    assert report.deepfake_score is None
    assert report.synthetic_voice_score is None
