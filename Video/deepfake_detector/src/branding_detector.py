"""Fake Branding and Logo Detection Module.

Detects unauthorized logos, news lower-thirds, regulatory seals, and crypto/fintech
branding commonly pasted into deepfake scam videos (e.g. RBI, SEBI, BBC, CNN,
Binance, Tesla, Apple, Telegram, WhatsApp).
"""

from typing import Dict, Any, List, Optional, Tuple
import numpy as np
import cv2

try:
    from ultralytics import YOLO
    HAS_YOLO = True
except (ImportError, ModuleNotFoundError):
    HAS_YOLO = False

try:
    from src.utils import setup_logger
except (ImportError, ModuleNotFoundError):
    from .utils import setup_logger

logger = setup_logger(__name__)


# Registry of sensitive brands commonly abused in financial deepfakes
SUSPICIOUS_BRANDS = {
    "rbi": {"brand": "Reserve Bank of India (RBI)", "type": "Government / Central Bank", "risk_weight": 0.95},
    "sebi": {"brand": "Securities and Exchange Board of India (SEBI)", "type": "Financial Regulator", "risk_weight": 0.90},
    "sec": {"brand": "US Securities and Exchange Commission (SEC)", "type": "Financial Regulator", "risk_weight": 0.90},
    "bbc": {"brand": "BBC News Broadcast", "type": "Global News Media", "risk_weight": 0.85},
    "cnn": {"brand": "CNN Breaking News", "type": "Global News Media", "risk_weight": 0.85},
    "cnbc": {"brand": "CNBC Markets", "type": "Financial News Media", "risk_weight": 0.80},
    "binance": {"brand": "Binance Crypto Exchange", "type": "Crypto Trading", "risk_weight": 0.85},
    "tesla": {"brand": "Tesla Corporation", "type": "Corporate Entity", "risk_weight": 0.80},
    "telegram": {"brand": "Telegram Official Channel", "type": "Messaging Recruitment", "risk_weight": 0.85},
    "whatsapp": {"brand": "WhatsApp Business Group", "type": "Messaging Recruitment", "risk_weight": 0.80},
    "zerodha": {"brand": "Zerodha Broking", "type": "Fintech / Broker", "risk_weight": 0.85},
    "jio": {"brand": "Reliance Jio Financial", "type": "Telecom / Conglomerate", "risk_weight": 0.80},
    "bitcoin": {"brand": "Bitcoin Foundation / Crypto Badge", "type": "Cryptocurrency", "risk_weight": 0.75},
}


class BrandingDetector:
    """Detects unauthorized corporate, regulatory, and news logos in video frames."""

    def __init__(self):
        self.yolo_model = None
        self._init_yolo()

    def _init_yolo(self):
        """Initializes YOLO for object/badge region proposals if available."""
        if HAS_YOLO:
            try:
                # Load ultralytics standard nano model for bounding-box proposals
                self.yolo_model = YOLO("yolov8n.pt")
                logger.info("YOLOv8 initialized for logo and watermark region detection.")
            except Exception as e:
                logger.warning("YOLOv8 model download deferred (%s). Using spatial heuristics.", str(e))
                self.yolo_model = None

    def detect_branding(
        self,
        video_frames: List[np.ndarray],
        ocr_text: str = ""
    ) -> Dict[str, Any]:
        """
        Analyzes keyframes for corner watermarks, news lower-thirds, and brand logos.
        """
        detected_brands = []
        brand_locations = []
        ocr_lower = ocr_text.lower()

        # 1. OCR-driven Brand Matching
        for key, info in SUSPICIOUS_BRANDS.items():
            if key in ocr_lower:
                detected_brands.append({
                    "brand": info["brand"],
                    "type": info["type"],
                    "confidence": 0.90,
                    "detection_method": "OCR Text Analysis"
                })

        # 2. Visual Corner / Watermark Analysis (Top-left, Top-right, Lower-third)
        visual_badges_found = self._scan_frame_watermarks(video_frames)
        for badge in visual_badges_found:
            # Avoid duplicate brands
            if not any(b["brand"] == badge["brand"] for b in detected_brands):
                detected_brands.append(badge)
            brand_locations.append(badge.get("location", "screen_corner"))

        # Calculate branding risk
        if detected_brands:
            max_risk = max(
                SUSPICIOUS_BRANDS.get(b["brand"].split()[0].lower(), {}).get("risk_weight", 0.75)
                for b in detected_brands
            )
            branding_risk_score = round(float(max_risk), 2)
            has_unauthorized_branding = True
        else:
            branding_risk_score = 0.05
            has_unauthorized_branding = False

        summary = (
            f"Detected {len(detected_brands)} brand/regulatory indicators: "
            f"{', '.join([b['brand'] for b in detected_brands])}."
            if detected_brands else "No unauthorized corporate or government branding detected."
        )

        return {
            "has_unauthorized_branding": has_unauthorized_branding,
            "branding_risk_score": branding_risk_score,
            "detected_brands": detected_brands,
            "brand_locations": list(set(brand_locations)),
            "summary": summary
        }

    def _scan_frame_watermarks(self, frames: List[np.ndarray]) -> List[Dict[str, Any]]:
        """Inspects corner regions (where logos & broadcaster badges reside) across frames."""
        if not frames:
            return []

        badges = []
        # Sample middle frame
        frame = frames[len(frames) // 2]
        h, w = frame.shape[:2]

        # Extract corners where broadcaster/news logos usually live
        tl = frame[0:int(h * 0.20), 0:int(w * 0.25)]
        tr = frame[0:int(h * 0.20), int(w * 0.75):w]
        lower_third = frame[int(h * 0.78):h, :]

        # Check color variance and high-contrast badge existence
        for name, region, loc in [("Top-Left Banner", tl, "top_left"),
                                  ("Top-Right Watermark", tr, "top_right"),
                                  ("Lower-Third Ticker", lower_third, "lower_third")]:
            gray = cv2.cvtColor(region, cv2.COLOR_BGR2GRAY)
            # High edge density indicates news tickers or logo overlays
            edges = cv2.Canny(gray, 100, 200)
            edge_ratio = float(np.sum(edges > 0) / (region.shape[0] * region.shape[1]))

            if edge_ratio > 0.08 and loc == "lower_third":
                badges.append({
                    "brand": "News Broadcast Lower-Third Ticker",
                    "type": "Media Format Manipulation",
                    "confidence": 0.78,
                    "location": loc,
                    "detection_method": "Edge & Ticker Spatial Analysis"
                })
            elif edge_ratio > 0.12:
                badges.append({
                    "brand": f"Corporate Watermark / Logo ({name})",
                    "type": "Overlay Badge",
                    "confidence": 0.72,
                    "location": loc,
                    "detection_method": "Corner High-Density Badge Detection"
                })

        return badges
