"""DeepTrust AI Report Schema.

Defines the normalized data structure returned by the central analysis pipeline.
All user-facing channels (Telegram, Web, REST API) consume this unified contract.
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class SuspiciousInterval(BaseModel):
    time_frame: str
    start_seconds: float
    end_seconds: float
    type: str  # "visual_anomaly", "lip_sync", "synthetic_audio_voice"
    score: float
    explanation: Optional[str] = None


class DeepTrustReport(BaseModel):
    video_id: str
    duration: float = 0.0
    overall_risk: str = "UNCERTAIN"  # "LOW_RISK", "MEDIUM_RISK", "HIGH_RISK", "UNCERTAIN"
    overall_risk_score: float = 0.0
    confidence: float = 0.0

    # Model scores (raw or calibrated, never fabricated)
    deepfake_score: Optional[float] = None
    deepfake_label: str = "UNKNOWN"

    synthetic_voice_score: Optional[float] = None
    lip_sync_score: Optional[float] = None
    scam_score: Optional[float] = None

    # Dual Verdict: Scam Ad vs Media Authenticity & News Credibility
    is_scam: bool = False
    is_fake_news: bool = False
    fake_news_score: Optional[float] = None
    scam_verdict: str = "LEGITIMATE"  # "HIGH_RISK_SCAM", "SUSPICIOUS_SCAM", "LEGITIMATE"
    media_authenticity: str = "AUTHENTIC_MEDIA"  # "SYNTHETIC_DEEPFAKE", "AUTHENTIC_MEDIA"
    gemini_fact_check: Optional[Dict[str, Any]] = None

    # Text modalities
    transcript: str = ""
    ocr_text: str = ""

    # Explainability & Evidence
    suspicious_intervals: List[Dict[str, Any]] = Field(default_factory=list)
    evidence: List[str] = Field(default_factory=list)
    trigger_explanations: List[str] = Field(default_factory=list)

    # Impersonation & Branding
    vip_impersonation: Optional[str] = None
    branding_detected: Optional[str] = None

    # Status & Diagnostic flags
    is_face_detected: bool = True
    is_audio_detected: bool = True
    status: str = "completed"
    error: Optional[str] = None
