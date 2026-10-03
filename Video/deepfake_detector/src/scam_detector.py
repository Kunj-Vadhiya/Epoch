"""Multilingual Scam Ad Language Detector.

Analyzes transcribed speech and OCR video text for deceptive scam patterns:
- Guaranteed high returns / doubling money
- Urgency and fear of missing out ("only 5 slots left", "jaldi join karo")
- Fake celebrity or government endorsement ("PM Scheme", "Elon Musk secret")
- WhatsApp / Telegram group recruitment
- Cryptocurrency / algorithmic trading get-rich-quick claims
"""

import re
from typing import Dict, Any, List

try:
    from src.utils import setup_logger
except (ImportError, ModuleNotFoundError):
    from .utils import setup_logger

logger = setup_logger(__name__)


# High-risk financial scam patterns (English, Hindi, Hinglish)
SCAM_PATTERNS = [
    # Guaranteed Profit / Unrealistic Returns
    (r"(?:guaranteed|100%|sure shot|risk free|guarantee|[gc]uarantee[d]?)\s+(?:profit|return|income|money|paisa|to\s+earn|to\s+make|way\s+to\s+earn|returns?|earning|roi)", 0.40, "guaranteed_returns"),
    (r"(?:double|triple|2x|10x|multipli?er)\s+(?:your\s+money|investment|capital|paisa\s+double|returns?)", 0.35, "unrealistic_multipliers"),
    (r"(?:daily|per day|har roz|rozana|every month|first month)\s+(?:₹|\$|rs\.?|inr)?\s*[\d,.]+\s*(?:lakh|crore|thousand|rupees?|\$)?", 0.35, "unrealistic_daily_income"),
    (r"(?:investing|deposit|lagao)\s+(?:₹|\$|rs\.?|inr)?\s*[\d,.]+\s*(?:rupees?|lakh|thousand)?\s*(?:you\s+are|to\s+earn|get|milenge)", 0.35, "guaranteed_returns"),

    # Urgency & Call-to-action
    (r"(?:hurry|limited\s+slots|only\s+today|last\s+chance|ab\s+hi|jaldi\s+karo|mauka|within\s+(?:the\s+next\s+)?\d+\s*hours?|within\s+24\s*hours?)", 0.30, "artificial_urgency"),
    (r"(?:join\s+telegram|whatsapp\s+now|message\s+me\s+on\s+whatsapp|link\s+in\s+bio|dm\s+karo|whatsapp\s+group|registration\s+link\s+is\s+below|link\s+is\s+below)", 0.35, "private_chat_recruitment"),

    # Fake Endorsement / Government
    (r"(?:pm\s+yojana|rbi\s+approved|govt\s+approved|government\s+scheme|sarkari\s+yojana)", 0.25, "fake_government_claim"),
    (r"(?:elon\s+musk|mukesh\s+ambani|tata|deepfake\s+modi|narendra\s+modi|nirmala\s+sitharaman)\s+(?:platform|app|crypto|investment)", 0.30, "celebrity_impersonation"),

    # Crypto / Forex / Trading bot scams
    (r"(?:automated\s+trading|bot\s+trading|crypto\s+arbitrage|instant\s+withdrawal|ghar\s+baithe)", 0.25, "algorithmic_trading_scam")
]


class ScamAdLanguageDetector:
    """Multilingual Scam Detector for transcribed speech and on-screen text."""

    def __init__(self):
        self.compiled_patterns = [
            (re.compile(pattern, re.IGNORECASE), weight, tag)
            for pattern, weight, tag in SCAM_PATTERNS
        ]

    def analyze(self, text: str) -> Dict[str, Any]:
        """
        Analyzes input text and outputs scam confidence score with matched signals.
        """
        if not text or not text.strip():
            return {
                "scam_text_score": 0.0,
                "risk_level": "LOW",
                "matched_signals": [],
                "highlighted_phrases": []
            }

        matched_signals = []
        highlighted_phrases = []
        raw_score = 0.0

        for regex, weight, tag in self.compiled_patterns:
            matches = regex.findall(text)
            if matches:
                matched_signals.append(tag)
                raw_score += weight
                for m in matches:
                    if isinstance(m, str):
                        highlighted_phrases.append(m)

        # Non-linear probability calibration
        scam_text_score = min(1.0, round(raw_score, 4))

        if scam_text_score >= 0.70:
            risk = "HIGH"
        elif scam_text_score >= 0.35:
            risk = "MEDIUM"
        else:
            risk = "LOW"

        return {
            "scam_text_score": scam_text_score,
            "risk_level": risk,
            "matched_signals": list(set(matched_signals)),
            "highlighted_phrases": list(set(highlighted_phrases))
        }
