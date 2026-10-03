"""Unit Tests for Report Formatting and Telegram Presentation.
"""

import sys
from pathlib import Path
import pytest

backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.schemas.report import DeepTrustReport
from app.services.report_service import format_telegram_report


def test_high_risk_report_formatting():
    report = DeepTrustReport(
        video_id="scam_ad.mp4",
        duration=27.4,
        overall_risk="HIGH_RISK",
        overall_risk_score=0.885,
        confidence=0.91,
        deepfake_score=0.91,
        deepfake_label="FAKE",
        synthetic_voice_score=0.76,
        lip_sync_score=0.83,
        scam_score=0.94,
        transcript="Guaranteed 100% daily profit. Join WhatsApp group now!",
        ocr_text="100% GUARANTEED RETURN",
        trigger_explanations=[
            "Mouth movement doesn't match speech at 00:07–00:12.",
            "Synthetic voice signal detected at 00:13–00:17."
        ]
    )

    msg = format_telegram_report(report)

    assert "DEEPTRUST AI REPORT" in msg
    assert "🔴 HIGH RISK" in msg
    assert "91%" in msg
    assert "76%" in msg
    assert "83%" in msg
    assert "94%" in msg
    assert "00:07–00:12" in msg
    assert "00:13–00:17" in msg
    assert "Guaranteed 100% daily profit" in msg
    assert "probabilistic" in msg


def test_missing_modality_returns_not_available():
    """Validates that unavailable components show NOT_AVAILABLE without fabricating scores."""
    report = DeepTrustReport(
        video_id="silent_clip.mp4",
        duration=15.0,
        overall_risk="LOW_RISK",
        overall_risk_score=0.15,
        confidence=0.80,
        deepfake_score=0.12,
        deepfake_label="REAL",
        synthetic_voice_score=None,  # No audio in clip
        lip_sync_score=None,         # No speech
        scam_score=0.05
    )

    msg = format_telegram_report(report)

    assert "🟢 LOW RISK" in msg
    assert "12%" in msg
    assert "NOT_AVAILABLE" in msg  # Voice and lip-sync are unavailable, never fabricated!


def test_uncertain_report_formatting():
    report = DeepTrustReport(
        video_id="blurry_clip.mp4",
        duration=10.0,
        overall_risk="UNCERTAIN",
        overall_risk_score=0.50,
        confidence=0.40
    )

    msg = format_telegram_report(report)

    assert "⚪ UNCERTAIN" in msg
    assert "Not enough evidence" in msg
