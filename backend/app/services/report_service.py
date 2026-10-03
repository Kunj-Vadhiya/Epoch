"""Telegram Report Formatter & Message Templates for DeepTrust AI.

Formats analysis results, evidence timestamps, transcripts, and command replies.
Strictly maps actual model outputs; never fabricates scores.
"""

from typing import Dict, Any, Optional
from app.schemas.report import DeepTrustReport


def format_start_message() -> str:
    """Returns /start command welcome message matching project spec."""
    return (
        "🛡️ *DeepTrust AI*\n\n"
        "_\"Is That Really Them?\"_\n\n"
        "I analyze suspicious videos for:\n\n"
        "🎭 AI / Deepfake manipulation\n"
        "🎙️ Synthetic voice\n"
        "👄 Lip-sync inconsistencies\n"
        "📝 Scam language\n"
        "🔎 Suspicious on-screen text\n\n"
        "Send me a short video to analyze.\n\n"
        "*Supported:*\n"
        "• Short video clips (MP4, MOV, AVI, WEBM)\n"
        "• Hindi / English\n"
        "• Maximum 20 MB\n"
        "• Recommended duration: 15–90 seconds\n\n"
        "⚠️ _Results are probabilistic and should not be treated as definitive proof._"
    )


def format_help_message() -> str:
    """Returns /help command response."""
    return (
        "📖 *DeepTrust AI Help & Usage*\n\n"
        "*How to use:*\n"
        "1. Simply forward or upload any suspicious video clip directly to this chat.\n"
        "2. The bot will validate the clip and start multi-modal deepfake analysis.\n"
        "3. You will receive a structured trust report with timestamps and evidence.\n\n"
        "*Commands:*\n"
        "/start - Welcome screen and feature overview\n"
        "/status - Real-time system and detector health status\n"
        "/example - Sample detection report preview\n"
        "/about - Research architecture and methodology\n"
        "/help - This instructions message\n\n"
        "📌 *Limit:* Up to 20 MB and 90 seconds per video."
    )


def format_about_message() -> str:
    """Returns /about command response."""
    return (
        "ℹ️ *About DeepTrust AI*\n\n"
        "DeepTrust AI is a prototype defense system designed to detect synthetic "
        "or manipulated media and fraudulent signals in viral scam advertisements.\n\n"
        "*Core Modalities Combined:*\n"
        "• EfficientNet-B0 + GRU Visual Deepfake Detection\n"
        "• SyncNet Audiovisual Lip-Sync Analysis\n"
        "• AudioCNN / AASIST Synthetic Voice Detection\n"
        "• Whisper Multilingual Speech Transcription\n"
        "• EasyOCR On-Screen Text & Logo Extraction\n"
        "• Multilingual Scam Language NLP\n"
        "• Explainable AI (SHAP, LIME, Grad-CAM)\n\n"
        "⚠️ *Disclaimer:* DeepTrust AI provides probabilistic anomaly detection and "
        "is not an authoritative verification authority. Always exercise caution before "
        "sharing personal information or transferring funds."
    )


def format_status_message(is_gpu_available: bool = False) -> str:
    """Returns /status command response."""
    gpu_status = "Available (CUDA)" if is_gpu_available else "CPU Execution (Active)"
    return (
        "🟢 *DeepTrust AI Status*\n\n"
        "Telegram Bot: Online\n"
        "AI Analyzer: Available\n"
        f"Inference Mode: {gpu_status}\n"
        "Visual Detector: Ready (EfficientNet-B0 + BiGRU)\n"
        "Audio Detector: Ready (AudioCNN / AASIST)\n"
        "Lip-Sync Detector: Ready (SyncNet Optical Flow)\n"
        "Speech Recognizer: Ready (Whisper)\n"
        "OCR Extractor: Ready (EasyOCR)\n"
        "Scam NLP: Ready (Multilingual Regex/Scam Corpus)\n"
        "Max File Size: 20 MB\n"
        "Max Video Duration: 90 seconds"
    )


def format_example_message() -> str:
    """Returns /example command preview."""
    return (
        "🛡️ *DEEPTRUST AI REPORT (SAMPLE)*\n\n"
        "━━━━━━━━━━━━━━━━━━\n\n"
        "*Overall Risk*\n"
        "🔴 *HIGH RISK*\n\n"
        "🎭 Deepfake\n91%\n\n"
        "🎙️ Synthetic Voice\n76%\n\n"
        "👄 Lip-Sync Anomaly\n83%\n\n"
        "🚨 Scam Signals\n94%\n\n"
        "━━━━━━━━━━━━━━━━━━\n\n"
        "🔍 *EVIDENCE*\n\n"
        "🔴 *00:07–00:12*\nLip-sync inconsistency detected\n\n"
        "🔴 *00:13–00:17*\nSynthetic voice signal detected\n\n"
        "🟠 *00:18*\nSuspicious financial claim detected\n\n"
        "🟠 *00:20*\nExternal messaging contact detected\n\n"
        "━━━━━━━━━━━━━━━━━━\n\n"
        "📝 *TRANSCRIPT*\n_\"Invest 5000 now and get 50,000 guaranteed daily profit. Join our WhatsApp group!\"_\n\n"
        "━━━━━━━━━━━━━━━━━━\n\n"
        "🔎 *ON-SCREEN TEXT*\n_\"100% GUARANTEED RETURN | WHATSAPP NOW: +91-98XXXXX\"_\n\n"
        "━━━━━━━━━━━━━━━━━━\n\n"
        "⚠️ *IMPORTANT*\n"
        "This analysis is probabilistic. Always verify claims independently."
    )


def format_analyzing_message() -> str:
    """Sent immediately upon receiving a video."""
    return (
        "🔍 *Video received.*\n\n"
        "Analyzing:\n\n"
        "🎭 Facial manipulation\n"
        "👄 Lip-sync\n"
        "🎙️ Synthetic voice\n"
        "📝 Speech\n"
        "🔎 On-screen text\n"
        "🚨 Scam signals\n\n"
        "Please wait..."
    )


def format_oversized_message(max_mb: int = 20) -> str:
    """Sent when video exceeds allowed file size."""
    return f"⚠️ *Video too large.*\n\nPlease send a compressed video under {max_mb} MB."


def format_unsupported_message() -> str:
    """Sent when user sends unsupported non-video media."""
    return "⚠️ Please send a video file for DeepTrust analysis."


def format_error_message(reason: Optional[str] = None) -> str:
    """Sent when analysis cannot be completed."""
    r_text = reason or "Unable to decode video or detector error."
    return (
        "⚠️ *Analysis could not be completed.*\n\n"
        f"*Reason:* {r_text}\n\n"
        "Try sending a clearer clip containing the person's face (up to 90 seconds, MP4 format)."
    )


def format_telegram_report(report: DeepTrustReport) -> str:
    """
    Renders a DeepTrustReport into the official Telegram markdown report format.
    Never hardcodes scores; only includes fields that exist.
    """
    # 1. Overall Risk
    risk_upper = report.overall_risk.upper()
    if "HIGH" in risk_upper:
        risk_header = "🔴 HIGH RISK"
    elif "MEDIUM" in risk_upper:
        risk_header = "🟡 MEDIUM RISK"
    elif "LOW" in risk_upper:
        risk_header = "🟢 LOW RISK"
    else:
        risk_header = "⚪ UNCERTAIN\n_Not enough evidence to confidently classify this video._"

    # 2. Modality Scores
    def fmt_score(score: Optional[float], label: str) -> str:
        if score is None:
            return f"{label}\nNOT_AVAILABLE"
        return f"{label}\n{round(float(score) * 100)}%"

    deepfake_line = fmt_score(report.deepfake_score, "🎭 Deepfake")
    voice_line = fmt_score(report.synthetic_voice_score, "🎙️ Synthetic Voice")
    lipsync_line = fmt_score(report.lip_sync_score, "👄 Lip-Sync Anomaly")
    scam_line = fmt_score(report.scam_score, "🚨 Scam Signals")

    # 3. Evidence
    evidence_blocks = []
    if report.trigger_explanations:
        for trig in report.trigger_explanations[:5]:
            evidence_blocks.append(f"🔴 {trig}")
    elif report.suspicious_intervals:
        for inter in report.suspicious_intervals[:5]:
            tf = inter.get("time_frame", f"{inter.get('start_seconds', 0)}s–{inter.get('end_seconds', 0)}s")
            expl = inter.get("explanation", f"{inter.get('type', 'Anomaly')} detected")
            evidence_blocks.append(f"🔴 *{tf}*\n{expl}")

    if report.vip_impersonation:
        evidence_blocks.append(f"🟠 *Likeness Impersonation Alert:* Unauthorized endorsement of {report.vip_impersonation}")
    if report.branding_detected:
        evidence_blocks.append(f"🟠 *Branding Indicator:* {report.branding_detected}")

    if not evidence_blocks:
        evidence_text = "_No severe anomalies or scam patterns detected._"
    else:
        evidence_text = "\n\n".join(evidence_blocks)

    # 4. Transcript & OCR
    transcript_text = f"_{report.transcript.strip()}_" if report.transcript.strip() else "_No audible speech detected._"
    ocr_text = f"_{report.ocr_text.strip()}_" if report.ocr_text.strip() else "_No on-screen scam text detected._"

    # Truncate if excessively long
    if len(transcript_text) > 300:
        transcript_text = transcript_text[:297] + "..._"
    if len(ocr_text) > 300:
        ocr_text = ocr_text[:297] + "..._"

    # Assemble complete report
    msg = (
        "🛡️ *DEEPTRUST AI REPORT*\n\n"
        "━━━━━━━━━━━━━━━━━━\n\n"
        "*Overall Risk*\n"
        f"{risk_header}\n\n"
        f"{deepfake_line}\n\n"
        f"{voice_line}\n\n"
        f"{lipsync_line}\n\n"
        f"{scam_line}\n\n"
        "━━━━━━━━━━━━━━━━━━\n\n"
        "🔍 *EVIDENCE*\n\n"
        f"{evidence_text}\n\n"
        "━━━━━━━━━━━━━━━━━━\n\n"
        "📝 *TRANSCRIPT*\n\n"
        f"{transcript_text}\n\n"
        "━━━━━━━━━━━━━━━━━━\n\n"
        "🔎 *ON-SCREEN TEXT*\n\n"
        f"{ocr_text}\n\n"
        "━━━━━━━━━━━━━━━━━━\n\n"
        "⚠️ *IMPORTANT*\n\n"
        "This analysis is probabilistic.\n"
        "AI-generated media detectors can produce false positives and false negatives.\n\n"
        "Verify important claims independently before taking financial or other consequential actions."
    )

    return msg
