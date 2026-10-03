"""Central DeepTrust Video Analysis Service.

Connects directly to the existing central deepfake detector engine without rebuilding or duplicating models.
Returns normalized DeepTrustReport dataclass / Pydantic object.
"""

from typing import Dict, Any, Optional
import os
import sys
import logging
from pathlib import Path

from app.config import settings
from app.schemas.report import DeepTrustReport

logger = logging.getLogger(__name__)


def analyze_video(video_path: str) -> DeepTrustReport:
    """
    Executes deepfake, synthetic speech, lip-sync, and scam ad analysis on an input video.
    Reuses existing predict_video() from src.inference in deepfake_detector.
    """
    if not os.path.isfile(video_path):
        return DeepTrustReport(
            video_id=os.path.basename(video_path),
            status="failed",
            error="Video file does not exist."
        )

    # 1. Attempt direct python invocation from existing deepfake_detector package
    raw_result: Optional[Dict[str, Any]] = None
    try:
        detector_dir = Path(__file__).resolve().parent.parent.parent.parent / "Video" / "deepfake_detector"
        if detector_dir.is_dir() and str(detector_dir) not in sys.path:
            sys.path.insert(0, str(detector_dir))

        from src.inference import predict_video
        logger.info("Executing central analyzer via direct module call on: %s", video_path)
        raw_result = predict_video(video_path)

    except Exception as exc:
        logger.warning("Direct import of predict_video failed (%s). Attempting HTTP microservice...", str(exc))

    # 2. HTTP Fallback to running FastAPI server if microservice architecture
    if raw_result is None:
        try:
            import requests
            api_url = settings.CENTRAL_ANALYZER_URL
            logger.info("Calling central analyzer HTTP endpoint: %s", api_url)
            with open(video_path, "rb") as f:
                resp = requests.post(
                    api_url,
                    files={"file": (os.path.basename(video_path), f, "video/mp4")},
                    timeout=settings.ANALYSIS_TIMEOUT_SECONDS + 30
                )
            if resp.status_code == 200:
                raw_result = resp.json()
            else:
                raise RuntimeError(f"Central analyzer HTTP error {resp.status_code}: {resp.text}")
        except Exception as http_exc:
            logger.error("Failed to execute central analysis: %s", str(http_exc))
            return DeepTrustReport(
                video_id=os.path.basename(video_path),
                status="failed",
                error=f"Central analysis engine unavailable: {str(http_exc)}"
            )

    # 3. Normalize into DeepTrustReport
    return normalize_central_result(video_path, raw_result)


def normalize_central_result(video_path: str, raw: Dict[str, Any]) -> DeepTrustReport:
    """Converts the raw central detector dictionary into a structured DeepTrustReport."""
    video_id = os.path.basename(video_path)
    duration = float(raw.get("video_duration_seconds", 0.0))

    # Deepfake Visual/Temporal Score
    deepfake_score = None
    deepfake_label = "UNKNOWN"
    if "deepfake" in raw and isinstance(raw["deepfake"], dict):
        deepfake_score = raw["deepfake"].get("probability")
        deepfake_label = raw["deepfake"].get("label", "UNKNOWN")
    elif "visual" in raw and isinstance(raw["visual"], dict):
        deepfake_score = raw["visual"].get("score")

    # Synthetic Voice Score
    synthetic_voice_score = None
    if "voice" in raw and isinstance(raw["voice"], dict):
        synthetic_voice_score = raw["voice"].get("ai_probability", raw["voice"].get("synthetic_score"))
    elif "audio" in raw and isinstance(raw["audio"], dict):
        synthetic_voice_score = raw["audio"].get("ai_probability")

    # Lip-Sync Score
    lip_sync_score = None
    if "lip_sync" in raw and isinstance(raw["lip_sync"], dict):
        lip_sync_score = raw["lip_sync"].get("anomaly_score")

    # Scam Score
    scam_score = None
    if "scam" in raw and isinstance(raw["scam"], dict):
        scam_score = max(
            raw["scam"].get("text_score", 0.0),
            raw["scam"].get("ocr_score", 0.0)
        )

    # Transcripts & Text
    transcript = raw.get("transcript", "")
    ocr_lines = raw.get("ocr_text", [])
    ocr_text = " | ".join(ocr_lines) if isinstance(ocr_lines, list) else str(ocr_lines)

    # Risk level & Confidence
    overall_risk = str(raw.get("risk_level", raw.get("prediction", "UNCERTAIN"))).upper()
    overall_risk_score = float(raw.get("overall_risk_score", 0.0))
    confidence = float(raw.get("confidence", 0.0))

    # Intervals & Evidence
    suspicious_intervals = raw.get("suspicious_intervals", [])
    trigger_explanations = raw.get("trigger_explanations", [])

    evidence = []
    if trigger_explanations:
        evidence = list(trigger_explanations)
    else:
        for item in suspicious_intervals:
            tf = item.get("time_frame", f"{item.get('start_seconds', 0)}s - {item.get('end_seconds', 0)}s")
            expl = item.get("explanation", f"{item.get('type', 'anomaly')} detected.")
            evidence.append(f"{tf}: {expl}")

    # VIP & Branding
    vip_info = raw.get("identity_verification", {})
    vip_impersonation = None
    if vip_info.get("is_impersonation_risk"):
        vip_impersonation = vip_info.get("matched_identity")

    branding_info = raw.get("branding_detection", {})
    branding_detected = None
    if branding_info.get("has_unauthorized_branding"):
        branding_detected = branding_info.get("summary")

    # Dual verdicts and Gemini Fact-Check
    is_scam = bool(raw.get("is_scam", False))
    is_fake_news = bool(raw.get("is_fake_news", False))
    fake_news_score = raw.get("fake_news_score")
    scam_verdict = str(raw.get("scam_verdict", "LEGITIMATE"))
    media_authenticity = str(raw.get("media_authenticity", "AUTHENTIC_MEDIA"))
    gemini_fact_check = raw.get("gemini_fact_check")

    return DeepTrustReport(
        video_id=video_id,
        duration=duration,
        overall_risk=overall_risk,
        overall_risk_score=overall_risk_score,
        confidence=confidence,
        deepfake_score=deepfake_score,
        deepfake_label=deepfake_label,
        synthetic_voice_score=synthetic_voice_score,
        lip_sync_score=lip_sync_score,
        scam_score=scam_score,
        is_scam=is_scam,
        is_fake_news=is_fake_news,
        fake_news_score=fake_news_score,
        scam_verdict=scam_verdict,
        media_authenticity=media_authenticity,
        gemini_fact_check=gemini_fact_check,
        transcript=transcript,
        ocr_text=ocr_text,
        suspicious_intervals=suspicious_intervals,
        evidence=evidence,
        trigger_explanations=trigger_explanations,
        vip_impersonation=vip_impersonation,
        branding_detected=branding_detected,
        status="completed"
    )
