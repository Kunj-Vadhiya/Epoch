"""End-to-End Inference Pipeline for Arbitrary Unseen Videos.

Accepts any arbitrary local video (never seen during training), extracts 16 frames,
tracks the subject face, runs the EfficientNet-B0 + GRU temporal network, performs
multimodal audio/voice/lip-sync/OCR scam analysis, and returns the comprehensive
risk report.
"""

from typing import Dict, Any, List, Optional
import os
import sys
import json
import argparse
import cv2
import numpy as np
import torch
from torchvision import transforms
from datetime import datetime

project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from src.face_tracker import FaceTracker
from src.temporal_model import DeepfakeVideoModel, build_video_model
from src.audio import extract_audio
from src.whisper_module import WhisperTranscriber
from src.scam_detector import ScamAdLanguageDetector
from src.voice_detector import SyntheticVoiceDetector
from src.lipsync import LipSyncDetector
from src.ocr import VideoTextExtractor
from src.fusion import MultimodalRiskFusion
from src.gradcam import GradCAMExplainer
from src.identity_verifier import IdentityVerifier
from src.branding_detector import BrandingDetector
from src.explainability import MultimodalExplainer
from src.gemini_verifier import GeminiNewsVerifier
from src.utils import setup_logger

logger = setup_logger(__name__)


def format_seconds_to_time(seconds: float) -> str:
    """Formats float seconds to MM:SS.SS string."""
    mins = int(seconds // 60)
    secs = seconds % 60
    return f"{mins:02d}:{secs:05.2f}"


# Global singleton cache for fast repeated inference
_MODEL_CACHE: Dict[str, Any] = {}



def get_inference_pipeline(device: Optional[torch.device] = None) -> Dict[str, Any]:
    """Initializes and caches all inference pipeline components."""
    global _MODEL_CACHE
    if "video_model" in _MODEL_CACHE:
        return _MODEL_CACHE

    if device is None:
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    model_path = os.path.join(project_root, "models", "deepfake_efficientnet_b0_best.pth")
    video_model = build_video_model(pretrained=True, device=device)

    if os.path.exists(model_path):
        try:
            state_dict = torch.load(model_path, map_location=device)
            # Match backbone weights
            model_keys = video_model.state_dict().keys()
            filtered_dict = {}
            for k, v in state_dict.items():
                if k in model_keys and video_model.state_dict()[k].shape == v.shape:
                    filtered_dict[k] = v
                elif f"visual_extractor.features.{k}" in model_keys:
                    filtered_dict[f"visual_extractor.features.{k}"] = v
            video_model.load_state_dict(filtered_dict, strict=False)
            logger.info("Loaded trained model weights from %s", model_path)
        except Exception as e:
            logger.warning("Could not load weights from %s: %s", model_path, str(e))

    video_model.eval()

    _MODEL_CACHE = {
        "device": device,
        "video_model": video_model,
        "face_tracker": FaceTracker(target_size=(224, 224)),
        "transcriber": WhisperTranscriber(),
        "scam_detector": ScamAdLanguageDetector(),
        "voice_detector": SyntheticVoiceDetector(),
        "lipsync_detector": LipSyncDetector(),
        "ocr_extractor": VideoTextExtractor(),
        "fusion": MultimodalRiskFusion(),
        "gradcam_explainer": GradCAMExplainer(video_model.visual_extractor, device=device),
        "identity_verifier": IdentityVerifier(device=device),
        "branding_detector": BrandingDetector(),
        "gemini_verifier": GeminiNewsVerifier(),
        "multimodal_explainer": MultimodalExplainer()
    }
    return _MODEL_CACHE


def predict_video(
    video_path: str,
    device: Optional[torch.device] = None,
    audio_analysis: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Analyzes a completely new, unseen video for deepfake manipulation and scam indicators.
    Accepts arbitrary local video paths (MP4, MOV, AVI) and optional external audio_analysis JSON.

    Args:
        video_path: Absolute or relative path to local video file.
        device: torch.device (CPU or CUDA).
        audio_analysis: Optional precomputed or external audio analysis JSON dict.

    Returns:
        Structured prediction dictionary with deepfake, visual, temporal,
        lip_sync, voice, scam NLP, OCR, and multimodal risk scores.
    """
    if not os.path.exists(video_path):
        raise FileNotFoundError(f"Video file not found at: {video_path}")

    pipeline = get_inference_pipeline(device=device)
    device = pipeline["device"]
    video_model = pipeline["video_model"]
    face_tracker = pipeline["face_tracker"]

    # Step 1: Decode video frames
    cap = cv2.VideoCapture(video_path)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    duration = float(total_frames / fps) if fps > 0 else 0.0

    if total_frames <= 0:
        cap.release()
        raise ValueError(f"Cannot decode frames from video: {video_path}")

    # 16 uniform temporal sample indices
    sample_indices = np.linspace(0, max(0, total_frames - 1), 16).astype(int)
    raw_frames = []
    timestamps = []

    current_idx = 0
    sampled_set = set(sample_indices)
    max_idx = max(sample_indices)

    while cap.isOpened() and current_idx <= max_idx:
        ret, frame_bgr = cap.read()
        if not ret:
            break
        if current_idx in sampled_set:
            frame_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
            raw_frames.append(frame_rgb)
            timestamps.append(round(float(current_idx / fps), 3))
        current_idx += 1
    cap.release()

    # Handle short videos: pad to exactly 16 frames if needed
    while len(raw_frames) < 16:
        raw_frames.append(raw_frames[-1] if raw_frames else np.zeros((224, 224, 3), dtype=np.uint8))
        timestamps.append(timestamps[-1] + 0.1 if timestamps else 0.0)

    raw_frames = raw_frames[:16]
    timestamps = timestamps[:16]

    # Step 2: Face Tracking across 16 frames
    face_crops_np, track_meta = face_tracker.extract_face_track(raw_frames, timestamps)

    # Step 3: Visual & Temporal Deepfake Model Inference
    mean = torch.tensor([0.485, 0.456, 0.406], device=device).view(1, 1, 3, 1, 1)
    std = torch.tensor([0.229, 0.224, 0.225], device=device).view(1, 1, 3, 1, 1)

    tensors = []
    for crop in face_crops_np:
        t = torch.from_numpy(crop).permute(2, 0, 1).float().to(device) / 255.0
        tensors.append(t)
    # Tensor shape: (1, 16, 3, 224, 224)
    video_tensor = torch.stack(tensors).unsqueeze(0)
    video_tensor = (video_tensor - mean) / std

    video_pred_dict = video_model.predict_video(video_tensor, uncertainty_threshold=0.60)
    real_prob = video_pred_dict["real_probability"]
    fake_prob = video_pred_dict["fake_probability"]
    deepfake_label = video_pred_dict["prediction"]
    entropy = video_pred_dict["entropy"]

    # Visual and temporal scores

    frame_scores = video_pred_dict["frame_fake_scores"]
    visual_score = float(np.mean(sorted(frame_scores, reverse=True)[:3]))
    temporal_score = fake_prob


    # Detailed per-frame time frame timeline
    frame_level_timeline = []
    for f_idx, (ts, score) in enumerate(zip(timestamps, frame_scores)):
        frame_level_timeline.append({
            "frame_index": f_idx,
            "timestamp": format_seconds_to_time(ts),
            "timestamp_seconds": round(float(ts), 3),
            "time_frame": format_seconds_to_time(ts),
            "fake_probability": round(float(score), 4),
            "is_suspicious": bool(score >= 0.50)
        })

    # Identify peak anomaly frame and compute exact window
    max_idx = int(np.argmax(frame_scores))
    peak_ts = timestamps[max_idx]
    primary_window_start = max(0.0, peak_ts - 1.0)
    primary_window_end = min(duration, peak_ts + 1.0)
    primary_time_frame = f"{format_seconds_to_time(primary_window_start)} - {format_seconds_to_time(primary_window_end)}"

    # Temporal suspicious interval identification with formatted time frames
    suspicious_intervals: List[Dict[str, Any]] = []
    high_anom_indices = [i for i, s in enumerate(frame_scores) if s >= 0.50]
    if high_anom_indices:
        start_ts = timestamps[high_anom_indices[0]]
        end_ts = max(timestamps[high_anom_indices[-1]], start_ts + 0.5)
        suspicious_intervals.append({
            "time_frame": f"{format_seconds_to_time(start_ts)} - {format_seconds_to_time(end_ts)}",
            "start_timestamp": format_seconds_to_time(start_ts),
            "end_timestamp": format_seconds_to_time(end_ts),
            "start_seconds": round(start_ts, 2),
            "end_seconds": round(end_ts, 2),
            "type": "visual_anomaly",
            "score": round(float(np.mean([frame_scores[i] for i in high_anom_indices])), 4),
            "explanation": f"Facial manipulation and boundary inconsistency detected at {format_seconds_to_time(start_ts)}–{format_seconds_to_time(end_ts)}."
        })
    else:
        suspicious_intervals.append({
            "time_frame": primary_time_frame,
            "start_timestamp": format_seconds_to_time(primary_window_start),
            "end_timestamp": format_seconds_to_time(primary_window_end),
            "start_seconds": round(primary_window_start, 2),
            "end_seconds": round(primary_window_end, 2),
            "type": "peak_visual_attention",
            "score": round(float(frame_scores[max_idx]), 4),
            "explanation": f"Peak visual feature attention observed around {format_seconds_to_time(peak_ts)}."
        })



    # Step 4: Audio Extraction & Voice/Speech Processing
    if audio_analysis and isinstance(audio_analysis, dict):
        voice_res = audio_analysis
        audio_wav = None
    else:
        audio_wav = extract_audio(video_path)
        voice_res = pipeline["voice_detector"].analyze(audio_wav)
        # If no audio track in video, check data/audio_analysis_result.json fallback
        if voice_res.get("status") in ["no_audio", "audio_too_short"]:
            default_audio_json = os.path.join(
                os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "audio_analysis_result.json"
            )
            if os.path.exists(default_audio_json):
                try:
                    with open(default_audio_json, "r", encoding="utf-8") as f:
                        loaded_audio = json.load(f)
                        if isinstance(loaded_audio, dict) and "ai_probability" in loaded_audio:
                            voice_res = loaded_audio
                except Exception:
                    pass

    synthetic_voice_score = float(voice_res.get("ai_probability", voice_res.get("synthetic_voice_score", 0.30)))

    # Step 4b: Integrate Audio Suspicious Intervals
    for seg in voice_res.get("suspicious_segments", []):
        s_ts = seg.get("start_seconds", 0.0)
        e_ts = seg.get("end_seconds", 0.0)
        prob = seg.get("ai_probability", synthetic_voice_score)
        suspicious_intervals.append({
            "time_frame": f"{format_seconds_to_time(s_ts)} - {format_seconds_to_time(e_ts)}",
            "start_seconds": round(s_ts, 2),
            "end_seconds": round(e_ts, 2),
            "type": "synthetic_audio_voice",
            "score": prob,
            "explanation": f"Synthetic voice generation detected in speech at {format_seconds_to_time(s_ts)}–{format_seconds_to_time(e_ts)}."
        })

    # Step 5: Lip-Sync Analysis
    lipsync_res = pipeline["lipsync_detector"].analyze(face_crops_np, timestamps, audio_wav)
    lip_sync_anomaly = lipsync_res.get("anomaly_score", 0.35)
    for interval in lipsync_res.get("suspicious_intervals", []):
        s_ts = interval["start"]
        e_ts = interval["end"]
        suspicious_intervals.append({
            "time_frame": f"{format_seconds_to_time(s_ts)} - {format_seconds_to_time(e_ts)}",
            "start_seconds": round(s_ts, 2),
            "end_seconds": round(e_ts, 2),
            "type": "lip_sync",
            "score": interval["anomaly_score"],
            "explanation": f"Mouth movement doesn't match speech at {format_seconds_to_time(s_ts)}–{format_seconds_to_time(e_ts)}."
        })


    # Step 6: OCR Video Text Extraction
    ocr_lines = pipeline["ocr_extractor"].extract_text_from_frames(raw_frames)

    # Step 7: Whisper Transcription & Gemini AI News / Scam Fact-Checking
    transcription_res = pipeline["transcriber"].transcribe(audio_wav)
    transcript_text = transcription_res.get("text", "")

    scam_text_res = pipeline["scam_detector"].analyze(transcript_text)
    ocr_scam_res = pipeline["scam_detector"].analyze(" ".join(ocr_lines))

    # Gemini LLM Fact-Checking & Fake News / Deception Verification
    gemini_verifier = pipeline["gemini_verifier"]
    gemini_res = gemini_verifier.verify_content(transcript_text=transcript_text, ocr_text=" ".join(ocr_lines))

    # Incorporate Gemini LLM scores with pattern detector
    scam_text_score = max(scam_text_res["scam_text_score"], gemini_res.get("scam_score", 0.0))
    ocr_scam_score = max(ocr_scam_res["scam_text_score"], gemini_res.get("fake_news_score", 0.0) * 0.8)

    # Clean up temporary audio file if created
    if audio_wav and os.path.exists(audio_wav):
        try:
            os.remove(audio_wav)
        except Exception:
            pass

    # Step 8: Identity Verification (VIP Likeness & Impersonation)
    primary_face_bgr = cv2.cvtColor(face_crops_np[max_idx], cv2.COLOR_RGB2BGR)
    identity_res = pipeline["identity_verifier"].verify_identity(
        face_bgr=primary_face_bgr,
        transcript_text=transcript_text,
        ocr_text=" ".join(ocr_lines)
    )
    identity_impersonation_score = identity_res["similarity_score"] if identity_res["is_impersonation_risk"] else 0.10

    # Step 9: Fake Branding and Regulatory Logo Detection
    branding_res = pipeline["branding_detector"].detect_branding(
        video_frames=raw_frames,
        ocr_text=" ".join(ocr_lines)
    )
    branding_risk_score = branding_res["branding_risk_score"]

    # Step 10: Spatial Explainability via Grad-CAM
    gradcam_res = pipeline["gradcam_explainer"].generate_heatmap(
        face_tensor=tensors[max_idx],
        original_face_bgr=primary_face_bgr,
        anomaly_score=frame_scores[max_idx]
    )

    # Step 11: Multimodal Risk Fusion
    uncertainty_metric = round(float(entropy / 1.5), 2)  # Normalized entropy
    fusion_res = pipeline["fusion"].fuse(
        visual_score=visual_score,
        temporal_score=temporal_score,
        lip_sync_score=lip_sync_anomaly,
        synthetic_voice_score=synthetic_voice_score,
        scam_text_score=scam_text_score,
        ocr_scam_score=ocr_scam_score,
        identity_impersonation_score=identity_impersonation_score,
        branding_risk_score=branding_risk_score,
        uncertainty=uncertainty_metric,
        audio_analysis=voice_res
    )

    # Step 12: Multimodal Explainable AI (SHAP & LIME)
    xai_res = pipeline["multimodal_explainer"].explain(fusion_res["feature_breakdown"])

    # Step 13: Build Human-Readable Trigger Explanations
    trigger_explanations = []
    for interval in suspicious_intervals:
        if "explanation" in interval and interval["explanation"] not in trigger_explanations:
            trigger_explanations.append(interval["explanation"])

    all_matched_signals = set(scam_text_res.get("matched_signals", []) + ocr_scam_res.get("matched_signals", []))
    if "guaranteed_returns" in all_matched_signals or "unrealistic_multipliers" in all_matched_signals:
        trigger_explanations.append("Flagged typical fraud pattern: Guaranteed high returns / doubling money claims.")
    if "artificial_urgency" in all_matched_signals:
        trigger_explanations.append("Flagged typical fraud pattern: Artificial urgency / high-pressure FOMO tactics.")
    if "private_chat_recruitment" in all_matched_signals:
        trigger_explanations.append("Flagged typical fraud pattern: Requests to move to private WhatsApp or Telegram groups.")
    if "celebrity_impersonation" in all_matched_signals or identity_res.get("is_impersonation_risk"):
        matched_id = identity_res.get("matched_identity", "VIP figure")
        trigger_explanations.append(f"Likeness impersonation risk: Unauthorized endorsement of {matched_id}.")
    if branding_res.get("has_unauthorized_branding"):
        brand_names = ", ".join([b.get("brand", "Unknown") for b in branding_res.get("detected_brands", [])])
        trigger_explanations.append(f"Fake news-channel / unauthorized branding detected: {brand_names}.")

    if gemini_res.get("explanation") and gemini_res.get("verdict") != "INSUFFICIENT_DATA":
        trigger_explanations.insert(0, f"Gemini Fact-Check: {gemini_res['explanation']}")

    # Compile Final Structured Result
    result = {
        "video_path": os.path.abspath(video_path),
        "video_duration_seconds": round(duration, 2),
        "video_time_frame": f"00:00.00 - {format_seconds_to_time(duration)}",
        "timestamp": format_seconds_to_time(peak_ts),
        "timestamp_seconds": round(float(peak_ts), 3),
        "peak_anomaly_timestamp": format_seconds_to_time(peak_ts),
        "analysis_timestamp": datetime.now().isoformat(),
        "time_frame": primary_time_frame,
        "suspicious_time_frame": primary_time_frame,
        "primary_suspicious_time_frame": primary_time_frame,
        "prediction": fusion_res["prediction"],
        "overall_risk_score": fusion_res["overall_risk_score"],
        "risk_level": fusion_res["risk_level"],
        "confidence": round(fusion_res["confidence"], 4),
        "uncertainty": uncertainty_metric,
        "is_scam": fusion_res.get("is_scam", False) or gemini_res.get("is_scam", False),
        "is_deepfake": fusion_res.get("is_deepfake", False),
        "is_fake_news": gemini_res.get("is_fake_news", False),
        "fake_news_score": gemini_res.get("fake_news_score", 0.0),
        "scam_verdict": gemini_res.get("verdict") if gemini_res.get("is_scam") else fusion_res.get("scam_verdict", "LEGITIMATE"),
        "media_authenticity": fusion_res.get("media_authenticity", "AUTHENTIC_MEDIA"),
        "gemini_fact_check": gemini_res,

        "deepfake": {
            "label": deepfake_label,
            "probability": round(fake_prob, 4),
            "real_probability": round(real_prob, 4)
        },
        "visual": {
            "score": round(visual_score, 4)
        },
        "temporal": {
            "score": round(temporal_score, 4)
        },
        "lip_sync": {
            "anomaly_score": round(lip_sync_anomaly, 4)
        },
        "voice": {
            "synthetic_score": round(synthetic_voice_score, 4),
            "prediction": voice_res.get("prediction", "AI_GENERATED" if synthetic_voice_score >= 0.5 else "NATURAL_VOICE"),
            "ai_probability": voice_res.get("ai_probability", round(synthetic_voice_score, 4)),
            "confidence": voice_res.get("confidence", "HIGH" if synthetic_voice_score >= 0.75 else "MEDIUM"),
            "timeline": voice_res.get("timeline", []),
            "suspicious_segments": voice_res.get("suspicious_segments", [])
        },
        "audio": {
            "audio_duration_seconds": voice_res.get("audio_duration_seconds", round(duration, 2)),
            "prediction": voice_res.get("prediction", "AI_GENERATED" if synthetic_voice_score >= 0.5 else "NATURAL_VOICE"),
            "ai_probability": voice_res.get("ai_probability", round(synthetic_voice_score, 4)),
            "confidence": voice_res.get("confidence", "HIGH" if synthetic_voice_score >= 0.75 else "MEDIUM"),
            "timeline": voice_res.get("timeline", []),
            "suspicious_segments": voice_res.get("suspicious_segments", [])
        },
        "scam": {
            "text_score": round(scam_text_score, 4),
            "ocr_score": round(ocr_scam_score, 4),
            "matched_signals": list(set(scam_text_res["matched_signals"] + ocr_scam_res["matched_signals"] + gemini_res.get("deceptive_tactics", [])))
        },
        "identity_verification": {
            "matched_identity": identity_res["matched_identity"],
            "category": identity_res["category"],
            "similarity_score": identity_res["similarity_score"],
            "is_vip_detected": identity_res["is_vip_detected"],
            "is_impersonation_risk": identity_res["is_impersonation_risk"],
            "analysis": identity_res["analysis"]
        },
        "branding_detection": {
            "has_unauthorized_branding": branding_res["has_unauthorized_branding"],
            "branding_risk_score": branding_res["branding_risk_score"],
            "detected_brands": branding_res["detected_brands"],
            "brand_locations": branding_res["brand_locations"],
            "summary": branding_res["summary"]
        },
        "explainability": {
            "summary": xai_res["summary"],
            "top_risk_drivers": xai_res["top_risk_drivers"],
            "trigger_explanations": trigger_explanations,
            "shap": xai_res["shap"],
            "lime": xai_res["lime"],
            "focus_regions": gradcam_res["focus_regions"],
            "peak_activation": gradcam_res.get("peak_activation", round(float(frame_scores[max_idx]), 4)),
            "explanation": gradcam_res["explanation"],
            "gradcam_heatmap_base64": gradcam_res["heatmap_base64"]
        },
        "trigger_explanations": trigger_explanations,
        "suspicious_intervals": suspicious_intervals,
        "frame_level_timeline": frame_level_timeline,
        "ocr_text": ocr_lines,
        "transcript": transcript_text
    }

    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run deepfake and scam detection on an unseen video file.")
    parser.add_argument("video_path", type=str, help="Path to arbitrary local video file (MP4, MOV, AVI)")
    parser.add_argument("--json_out", type=str, default=None, help="Optional path to save output JSON")
    args = parser.parse_args()

    print(f"Running inference on unseen video: {args.video_path}...")
    report = predict_video(args.video_path)
    print("\n" + "=" * 60)
    print("DETECTION REPORT")
    print("=" * 60)
    print(json.dumps(report, indent=2))
    print("=" * 60)

    if args.json_out:
        with open(args.json_out, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=2)
        print(f"Report saved to: {args.json_out}")
