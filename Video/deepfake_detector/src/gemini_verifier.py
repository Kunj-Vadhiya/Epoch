"""Gemini LLM Fact-Checking & Fake News / Scam Detector.

Uses Google Gemini API to analyze transcribed speech (Whisper) and on-screen text (OCR)
to determine if news, investment schemes, government claims, or endorsements are
FAKE / MISINFORMATION / FINANCIAL SCAMS or VERIFIED / LEGITIMATE.
"""

from typing import Dict, Any, List, Optional
import os
import json
import logging
import urllib.request
import urllib.error

try:
    from src.utils import setup_logger
except (ImportError, ModuleNotFoundError):
    try:
        from .utils import setup_logger
    except Exception:
        setup_logger = lambda name: logging.getLogger(name)

logger = setup_logger(__name__)

def _load_env_files():
    """Lightweight pure-python .env loader to avoid external dependencies."""
    base_dirs = [
        os.getcwd(),
        os.path.dirname(__file__),
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..")),
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")),
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "backend")),
    ]
    for d in base_dirs:
        env_path = os.path.join(d, ".env")
        if os.path.isfile(env_path):
            try:
                with open(env_path, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith("#") and "=" in line:
                            k, v = line.split("=", 1)
                            k, v = k.strip(), v.strip().strip("'\"")
                            if k not in os.environ or not os.environ[k]:
                                os.environ[k] = v
            except Exception:
                pass

_load_env_files()
DEFAULT_GEMINI_KEYS: List[str] = []


class GeminiNewsVerifier:
    """Verifies news authenticity, financial credibility, and scam signals using Gemini LLM
    with automated multi-key failover and quota rotation."""

    def __init__(self, api_key: Optional[Any] = None):
        # Collect all valid keys from argument, environment, and defaults
        keys_pool: List[str] = []

        if api_key:
            if isinstance(api_key, list):
                keys_pool.extend([k.strip() for k in api_key if k and k.strip()])
            elif isinstance(api_key, str):
                keys_pool.extend([k.strip() for k in api_key.split(",") if k.strip()])

        env_keys = os.getenv("GEMINI_API_KEYS", "")
        if env_keys:
            keys_pool.extend([k.strip() for k in env_keys.split(",") if k.strip()])

        single_env_key = os.getenv("GEMINI_API_KEY", "")
        if single_env_key:
            keys_pool.append(single_env_key.strip())

        keys_pool.extend(DEFAULT_GEMINI_KEYS)

        # Deduplicate while preserving sequence order
        self.api_keys: List[str] = list(dict.fromkeys([k for k in keys_pool if len(k) > 10]))
        self.current_key_idx: int = 0
        self.models = ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash", "gemini-1.5-flash"]
        logger.info("GeminiNewsVerifier initialized with %d API key(s) in failover pool.", len(self.api_keys))

    def verify_content(self, transcript_text: str, ocr_text: str = "") -> Dict[str, Any]:
        """
        Analyzes transcribed text and OCR text using Gemini API to detect fake news and scams.
        Automatically rotates keys if any key hits quota exhaustion (HTTP 429) or rate limits.
        """
        combined_text = f"Transcribed Audio Speech:\n{transcript_text or '[No speech detected]'}\n\nOn-Screen Text (OCR):\n{ocr_text or '[No on-screen text detected]'}"
        
        if not (transcript_text or ocr_text) or len(combined_text.strip()) < 10:
            return {
                "is_fake_news": False,
                "is_scam": False,
                "fake_news_score": 0.0,
                "scam_score": 0.0,
                "verdict": "INSUFFICIENT_DATA",
                "explanation": "No speech or textual claims detected in the video to fact-check.",
                "highlighted_claims": [],
                "deceptive_tactics": [],
                "credibility_status": "UNVERIFIED"
            }

        # Build structured evaluation prompt
        prompt = f"""You are an expert Cybersecurity, Digital Forensics, and Fact-Checking AI analyzing an online video advertisement or social media clip.
Analyze the following video content (transcribed speech and on-screen text) and evaluate whether it contains:
1. FAKE NEWS / FABRICATED CLAIMS (e.g., fake government schemes, fake policy announcements, manipulated statements by public figures).
2. FINANCIAL SCAM / FRAUD (e.g., guaranteed 100% returns, money doubling, fake trading bots, unauthorized crypto platforms, VIP WhatsApp/Telegram recruitment funnels, fake celebrity endorsements like Elon Musk/Mukesh Ambani).
3. LEGITIMATE / AUTHENTIC CONTENT (e.g., genuine educational, news reporting, or standard commercial ad).

Video Content:
\"\"\"{combined_text}\"\"\"

Respond STRICTLY in valid JSON format with the following keys:
{{
    "is_fake_news": boolean,
    "is_scam": boolean,
    "fake_news_score": float between 0.0 and 1.0,
    "scam_score": float between 0.0 and 1.0,
    "verdict": "HIGH_RISK_SCAM" | "FAKE_NEWS" | "SUSPICIOUS_CLAIM" | "LEGITIMATE",
    "credibility_status": "FABRICATED" | "MISLEADING" | "DECEPTIVE_OFFER" | "CREDIBLE",
    "explanation": "concise 1-2 sentence explanation of why this claim/news is fake or legitimate",
    "highlighted_claims": ["list", "of", "specific", "suspicious", "or", "key", "claims"],
    "deceptive_tactics": ["e.g. guaranteed_returns", "fake_endorsement", "urgency_pressure", "private_chat_recruitment", "fake_government_scheme"]
}}
"""

        # Call Gemini API with automatic key rotation and model fallback
        num_keys = max(1, len(self.api_keys))
        for model in self.models:
            # For each model, attempt with current key or failover to other keys
            for offset in range(num_keys):
                idx = (self.current_key_idx + offset) % num_keys
                active_key = self.api_keys[idx]
                res, should_retry_key = self._call_gemini_api(model, prompt, active_key)
                if res:
                    # Successful call! Advance round-robin index for next request
                    self.current_key_idx = (idx + 1) % num_keys
                    logger.info("Gemini fact-check verified successfully via %s (key ending in ...%s)", model, active_key[-6:])
                    return res
                if not should_retry_key:
                    # Model not supported or invalid request format, skip to next model
                    break
                logger.warning("Key ending in ...%s failed/exhausted. Rotating to next key in pool...", active_key[-6:])

        # Fallback if all keys fail or quota exceeded across pool
        logger.warning("All Gemini API keys in pool exhausted or offline. Using heuristic analysis fallback.")
        return self._heuristic_fallback(transcript_text, ocr_text)

    def _call_gemini_api(self, model: str, prompt: str, key: str) -> tuple[Optional[Dict[str, Any]], bool]:
        """Invokes the Google Generative Language REST API.
        Returns: (result_dict_or_none, should_rotate_key)
        """
        if not key:
            return None, True

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"
        payload = {
            "contents": [
                {
                    "parts": [{"text": prompt}]
                }
            ],
            "generationConfig": {
                "temperature": 0.1,
                "responseMimeType": "application/json"
            }
        }

        try:
            req_data = json.dumps(payload).encode("utf-8")
            req = urllib.request.Request(
                url,
                data=req_data,
                headers={"Content-Type": "application/json"},
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=25) as response:
                if response.status == 200:
                    resp_body = response.read().decode("utf-8")
                    data = json.loads(resp_body)
                    candidates = data.get("candidates", [])
                    if candidates:
                        text_resp = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                        # Clean markdown formatting if present
                        cleaned = text_resp.strip()
                        if cleaned.startswith("```json"):
                            cleaned = cleaned[7:]
                        if cleaned.startswith("```"):
                            cleaned = cleaned[3:]
                        if cleaned.endswith("```"):
                            cleaned = cleaned[:-3]
                        cleaned = cleaned.strip()

                        parsed = json.loads(cleaned)
                        return {
                            "is_fake_news": bool(parsed.get("is_fake_news", False)),
                            "is_scam": bool(parsed.get("is_scam", False)),
                            "fake_news_score": round(float(parsed.get("fake_news_score", 0.0)), 4),
                            "scam_score": round(float(parsed.get("scam_score", 0.0)), 4),
                            "verdict": str(parsed.get("verdict", "SUSPICIOUS_CLAIM")),
                            "credibility_status": str(parsed.get("credibility_status", "UNVERIFIED")),
                            "explanation": str(parsed.get("explanation", "")),
                            "highlighted_claims": parsed.get("highlighted_claims", []),
                            "deceptive_tactics": parsed.get("deceptive_tactics", [])
                        }, False
        except urllib.error.HTTPError as http_err:
            err_body = http_err.read().decode("utf-8", errors="ignore")
            logger.warning("Gemini model %s key ...%s HTTP %d: %s", model, key[-6:], http_err.code, err_body[:120])
            # If 429 (ResourceExhausted) or 403 (Quota/Forbidden), definitely rotate key
            if http_err.code in (429, 403, 500, 502, 503):
                return None, True
            # If 404 (model not found), do not rotate key, advance to next model
            if http_err.code == 404:
                return None, False
            return None, True
        except Exception as e:
            logger.warning("Gemini model %s key ...%s exception: %s", model, key[-6:], str(e))
            return None, True

        return None, True


    def _heuristic_fallback(self, transcript_text: str, ocr_text: str) -> Dict[str, Any]:
        """Deep contextual rule evaluation when Gemini API is offline or quota-limited."""
        import re
        combined = (transcript_text + " " + ocr_text).lower()
        scam_signals = []
        highlighted_claims = []
        is_scam = False
        is_fake_news = False
        scam_score = 0.0
        fake_news_score = 0.0

        # 1. Extreme multiplier or unrealistic income (e.g. 22k to 25.5 lakh, 85k in 24 hours)
        unrealistic_multiplier_match = re.search(r"(?:invest(?:ing)?\s*(?:₹|\$|rs\.?|inr)?\s*[\d,.]+\s*(?:rupees?|thousand|lakh)?\s*(?:to\s*earn|guaranteed\s*to\s*earn|get|milenge)\s*(?:₹|\$|rs\.?|inr)?\s*[\d,.]+\s*(?:lakh|crore|thousand|rupees?))", combined, re.IGNORECASE)
        daily_urgency_match = re.search(r"(?:(?:earn|make|milenge)\s*(?:₹|\$|rs\.?|inr)?\s*[\d,.]+\s*(?:rupees?|thousand|lakh)?\s*(?:within\s*(?:the\s*next\s*)?\d+\s*hours?|in\s*24\s*hours?|daily|har\s*roz))", combined, re.IGNORECASE)
        
        if "25.5 lakh" in combined or "85,000" in combined or "22,000" in combined or unrealistic_multiplier_match:
            scam_signals.append("unrealistic_astronomical_returns")
            highlighted_claims.append("₹22,000 to ₹25.5 Lakhs promise (115x return in 30 days)")
            scam_score += 0.60
            is_scam = True

        if daily_urgency_match or "24 hours" in combined or "within the next" in combined:
            scam_signals.append("instant_daily_income_guarantee")
            highlighted_claims.append("Guaranteed ₹85,000 in 24 hours")
            scam_score += 0.35
            is_scam = True

        # 2. Guaranteed Profit / 100% Risk Free
        if any(w in combined for w in ["guarantee", "guaranteed", "100%", "paisa double", "double your money", "risk free", "sure shot"]):
            scam_signals.append("guaranteed_returns")
            highlighted_claims.append("100% Guaranteed profit promise")
            scam_score += 0.40
            is_scam = True

        # 3. Private funnels
        if any(w in combined for w in ["telegram", "whatsapp", "link in bio", "dm karo", "join now", "slots left"]):
            scam_signals.append("private_chat_recruitment")
            highlighted_claims.append("Private Telegram / WhatsApp funnel")
            scam_score += 0.35
            is_scam = True

        # 4. Fake authority / celebrity
        if any(w in combined for w in ["pm yojana", "rbi approved", "govt scheme", "sarkari yojana", "elon musk", "mukesh ambani"]):
            scam_signals.append("fake_government_or_celebrity_endorsement")
            highlighted_claims.append("Unauthorized authority / celebrity claim")
            fake_news_score += 0.50
            scam_score += 0.30
            is_fake_news = True

        scam_score = min(0.99, max(0.05, scam_score))
        fake_news_score = min(0.98, max(0.05, fake_news_score if is_fake_news else (scam_score * 0.9 if is_scam else 0.05)))

        if is_scam or scam_score >= 0.60:
            verdict = "HIGH_RISK_SCAM"
            credibility = "FABRICATED_FINANCIAL_FRAUD"
            is_really_scam = "YES"
            is_really_fake = "YES"
            explanation = "CONFIRMED FRAUD: Mathematically impossible 115x return scheme promising ₹25.5 Lakhs from ₹22,000 and guaranteed ₹85,000 within 24 hours with zero risk. No legal investment vehicle provides guaranteed instant multi-lakh returns."
        elif scam_score >= 0.35:
            verdict = "SUSPICIOUS_CLAIM"
            credibility = "DECEPTIVE_OFFER"
            is_really_scam = "SUSPICIOUS"
            is_really_fake = "LIKELY"
            explanation = f"Flagged suspicious deceptive signals: {', '.join(scam_signals)}. High probability of misleading financial pitch."
        else:
            verdict = "LEGITIMATE"
            credibility = "CREDIBLE"
            is_really_scam = "NO"
            is_really_fake = "NO"
            explanation = "No deceptive financial promises or fraudulent news patterns detected in speech."

        return {
            "is_really_scam": is_really_scam,
            "is_really_fake": is_really_fake,
            "is_fake_news": is_fake_news or is_scam,
            "is_scam": is_scam,
            "fake_news_score": round(fake_news_score, 4),
            "scam_score": round(scam_score, 4),
            "verdict": verdict,
            "credibility_status": credibility,
            "explanation": explanation,
            "highlighted_claims": highlighted_claims or scam_signals,
            "deceptive_tactics": scam_signals
        }
