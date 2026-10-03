"""Multimodal Risk Fusion Model.

Combines visual, temporal, lip-sync, acoustic, transcript, and OCR features into
an overall scam risk score with calibrated uncertainty levels (LOW, MEDIUM, HIGH_RISK, UNCERTAIN).
"""

from typing import Dict, Any, Optional
import os
import pickle
import numpy as np

try:
    from src.utils import setup_logger
except (ImportError, ModuleNotFoundError):
    from .utils import setup_logger

logger = setup_logger(__name__)


class MultimodalRiskFusion:
    """Multimodal risk classifier fusing visual, acoustic, and forensic signals."""

    def __init__(self, model_path: Optional[str] = None):
        self.model_path = model_path
        self.model = None
        if model_path and os.path.exists(model_path):
            self.load(model_path)

    def fuse(
        self,
        visual_score: float,
        temporal_score: float,
        lip_sync_score: float = 0.5,
        synthetic_voice_score: float = 0.5,
        scam_text_score: float = 0.0,
        ocr_scam_score: float = 0.0,
        identity_impersonation_score: float = 0.0,
        branding_risk_score: float = 0.0,
        uncertainty: float = 0.0,
        audio_analysis: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Calculates multimodal risk score from individual modal indicators.
        Accepts optional structured audio_analysis dict (with ai_probability, timeline, segments).
        """
        if audio_analysis and isinstance(audio_analysis, dict):
            if "ai_probability" in audio_analysis:
                synthetic_voice_score = float(audio_analysis["ai_probability"])
            elif "synthetic_voice_score" in audio_analysis:
                synthetic_voice_score = float(audio_analysis["synthetic_voice_score"])

        features = np.array([
            visual_score,
            temporal_score,
            lip_sync_score,
            synthetic_voice_score,
            scam_text_score,
            ocr_scam_score,
            identity_impersonation_score,
            branding_risk_score
        ], dtype=np.float32)

        scam_signals_risk = max(
            scam_text_score,
            ocr_scam_score,
            min(1.0, (scam_text_score + ocr_scam_score) * 0.85)
        )
        if branding_risk_score >= 0.50:
            scam_signals_risk = max(scam_signals_risk, 0.70)
        if identity_impersonation_score >= 0.60:
            scam_signals_risk = max(scam_signals_risk, 0.65)

        is_scam = bool(scam_signals_risk >= 0.50)
        is_deepfake = bool(visual_score >= 0.60 or temporal_score >= 0.60 or synthetic_voice_score >= 0.70 or lip_sync_score >= 0.60)
        prob = self._heuristic_fusion(features)

        # Confidence and uncertainty assessment
        confidence = float(max(prob, 1.0 - prob))
        if prob >= 0.60 or scam_signals_risk >= 0.60:
            risk_level = "HIGH_RISK"
            prediction = "FAKE"
        elif prob >= 0.35 or scam_signals_risk >= 0.35:
            if uncertainty > 0.50 and confidence < 0.55:
                risk_level = "UNCERTAIN"
                prediction = "UNCERTAIN"
            else:
                risk_level = "MEDIUM"
                prediction = "MEDIUM_RISK"
        else:
            risk_level = "LOW"
            prediction = "REAL"

        # Final overall risk score captures either scam fraud or deepfake manipulation
        final_overall_risk_score = round(max(prob, scam_signals_risk), 4)

        return {
            "prediction": prediction,
            "overall_risk_score": final_overall_risk_score,
            "risk_level": risk_level,
            "confidence": round(confidence, 4),
            "is_scam": is_scam,
            "is_deepfake": is_deepfake,
            "scam_verdict": "HIGH_RISK_SCAM" if scam_signals_risk >= 0.60 else ("SUSPICIOUS_SCAM" if scam_signals_risk >= 0.35 else "LEGITIMATE"),
            "media_authenticity": "SYNTHETIC_DEEPFAKE" if is_deepfake else "AUTHENTIC_MEDIA",
            "feature_breakdown": {
                "visual_score": round(visual_score, 4),
                "temporal_score": round(temporal_score, 4),
                "lip_sync_score": round(lip_sync_score, 4),
                "synthetic_voice_score": round(synthetic_voice_score, 4),
                "scam_text_score": round(scam_text_score, 4),
                "ocr_scam_score": round(ocr_scam_score, 4),
                "identity_impersonation_score": round(identity_impersonation_score, 4),
                "branding_risk_score": round(branding_risk_score, 4)
            }
        }

    def _heuristic_fusion(self, features: np.ndarray) -> float:
        """Calibrated weighted heuristic fusion incorporating all forensic modalities."""
        v_score, t_score, lip_score, voice_score, text_score, ocr_score, id_score, brand_score = features
        visual_component = 0.22 * v_score + 0.22 * t_score
        audio_component = 0.10 * lip_score + 0.11 * voice_score
        scam_component = 0.12 * text_score + 0.08 * ocr_score
        forensic_context = 0.08 * id_score + 0.07 * brand_score
        total = visual_component + audio_component + scam_component + forensic_context

        # Multimodal Deception Escalation:
        # If 2 or more distinct forensic modalities detect manipulation
        strong_signals = [
            bool(v_score >= 0.60 or t_score >= 0.60),
            bool(voice_score >= 0.70),
            bool(lip_score >= 0.55),
            bool((text_score + ocr_score) >= 0.35),
            bool(brand_score >= 0.50)
        ]
        active_modalities = sum(1 for s in strong_signals if s)

        if active_modalities >= 2:
            total = max(total, 0.72 + 0.07 * (active_modalities - 2))
        elif voice_score >= 0.85 or (v_score >= 0.75 and t_score >= 0.75):
            total = max(total, 0.75)
        elif (text_score + ocr_score) >= 0.40:
            total = max(total, 0.72)

        return min(0.99, max(0.01, float(total)))

    def save(self, output_path: str) -> None:
        """Saves fusion model."""
        os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
        with open(output_path, "wb") as f:
            pickle.dump(self.model, f)

    def load(self, input_path: str) -> None:
        """Loads fusion model."""
        with open(input_path, "rb") as f:
            self.model = pickle.load(f)
