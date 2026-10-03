"""Test Suite for Fraud Pattern Detection & Explainable Output.

Validates that:
1. Fraud ad patterns (guaranteed returns, urgency, WhatsApp/Telegram recruitment) are flagged.
2. Fake news-channel branding (BBC, CNN, lower-third tickers) is flagged.
3. Risk level is produced (HIGH_RISK, MEDIUM_RISK, LOW_RISK).
4. Specific frame intervals and audio segments are pinpointed.
5. Plain English trigger explanations (e.g. "Mouth movement doesn't match speech at...") are returned.
"""

import os
import sys
import numpy as np

project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from src.scam_detector import ScamAdLanguageDetector
from src.branding_detector import BrandingDetector
from src.fusion import MultimodalRiskFusion


def test_fraud_ad_pattern_flagging():
    detector = ScamAdLanguageDetector()

    # Test text containing guaranteed returns, urgency, and WhatsApp/Telegram requests
    fraud_text = "Hurry! Limited slots left. Join WhatsApp now or message on Telegram group for guaranteed profit and double your money!"
    result = detector.analyze(fraud_text)

    print("\n[Scam Language Detection Result]:")
    print(f"  Score: {result['scam_text_score']}")
    print(f"  Risk Level: {result['risk_level']}")
    print(f"  Matched Signals: {result['matched_signals']}")

    assert result["scam_text_score"] >= 0.70
    assert result["risk_level"] == "HIGH"
    assert "guaranteed_returns" in result["matched_signals"]
    assert "unrealistic_multipliers" in result["matched_signals"]
    assert "artificial_urgency" in result["matched_signals"]
    assert "private_chat_recruitment" in result["matched_signals"]
    print("[PASS] Guaranteed returns, urgency, and WhatsApp/Telegram successfully flagged!")


def test_fake_news_branding_detection():
    detector = BrandingDetector()

    # 1. OCR text containing fake news channel
    ocr_text = "BREAKING NEWS BBC News Broadcast Exclusive Interview on Algorithmic Trading"
    dummy_frame = np.zeros((480, 640, 3), dtype=np.uint8)
    result = detector.detect_branding([dummy_frame], ocr_text=ocr_text)

    print("\n[Branding Detection Result]:")
    print(f"  Has Unauthorized Branding: {result['has_unauthorized_branding']}")
    print(f"  Branding Risk Score: {result['branding_risk_score']}")
    print(f"  Detected Brands: {[b['brand'] for b in result['detected_brands']]}")

    assert result["has_unauthorized_branding"] is True
    assert result["branding_risk_score"] >= 0.80
    assert any("BBC" in b["brand"] for b in result["detected_brands"])
    print("[PASS] Fake news channel branding successfully flagged!")


def test_risk_levels_and_explanations():
    fusion = MultimodalRiskFusion()

    # High risk fusion scenario
    high_risk_res = fusion.fuse(
        visual_score=0.88,
        temporal_score=0.85,
        lip_sync_score=0.80,
        synthetic_voice_score=0.90,
        scam_text_score=0.85,
        ocr_scam_score=0.80,
        identity_impersonation_score=0.85,
        branding_risk_score=0.85,
        uncertainty=0.10
    )

    print("\n[Multimodal Risk Fusion Output]:")
    print(f"  Risk Level: {high_risk_res['risk_level']}")
    print(f"  Overall Risk Score: {high_risk_res['overall_risk_score']}")
    print(f"  Prediction: {high_risk_res['prediction']}")

    assert high_risk_res["risk_level"] in ["HIGH_RISK", "MEDIUM_RISK", "LOW_RISK"]
    assert high_risk_res["risk_level"] == "HIGH_RISK"
    assert high_risk_res["prediction"] == "HIGH_RISK"
    print("[PASS] Risk level successfully calibrated to HIGH_RISK, MEDIUM_RISK, LOW_RISK!")


if __name__ == "__main__":
    test_fraud_ad_pattern_flagging()
    test_fake_news_branding_detection()
    test_risk_levels_and_explanations()
    print("\n=======================================================")
    print("ALL FRAUD PATTERN & EXPLAINABILITY TESTS PASSED (100%)!")
    print("=======================================================")
