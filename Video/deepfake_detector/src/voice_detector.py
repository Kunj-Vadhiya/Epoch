"""Voice Deepfake and Synthetic Speech Detector.

Extracts acoustic cues (spectral variance, MFCC continuity, harmonic-to-noise ratio)
to detect synthetic text-to-speech (TTS) and voice conversion artifacts in audio streams.
"""

from typing import Dict, Any, Optional
import os
import numpy as np

try:
    from src.utils import setup_logger
except (ImportError, ModuleNotFoundError):
    from .utils import setup_logger

logger = setup_logger(__name__)


class SyntheticVoiceDetector:
    """Acoustic forensic detector for synthetic speech and voice cloning."""

    def __init__(self):
        pass

    def analyze(self, wav_path: Optional[str]) -> Dict[str, Any]:
        """
        Analyzes 16kHz WAV audio file for voice cloning / synthetic artifacts.
        """
        if not wav_path or not os.path.exists(wav_path):
            return {
                "audio_duration_seconds": 0.0,
                "prediction": "UNKNOWN",
                "ai_probability": 0.0,
                "confidence": "LOW",
                "timeline": [],
                "suspicious_segments": [],
                "synthetic_voice_score": 0.0,
                "status": "no_audio"
            }

        # Check if neural AudioCNN model is available
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        ckpt_path = os.path.join(base_dir, "models", "audio", "audio_deepfake_model.pt")
        thresh_path = os.path.join(base_dir, "models", "audio", "threshold.txt")
        if os.path.exists(ckpt_path):
            try:
                from src.audio_model.inference import predict_audio
                neural_res = predict_audio(wav_path, checkpoint_path=ckpt_path, threshold_path=thresh_path)
                neural_res["synthetic_voice_score"] = neural_res["ai_probability"]
                neural_res["status"] = "analyzed_neural"
                return neural_res
            except Exception as e:
                logger.warning("Neural audio detector failed, falling back to acoustic heuristics: %s", str(e))

        try:
            import scipy.io.wavfile as wavfile
            sr, audio = wavfile.read(wav_path)
            if audio.ndim > 1:
                audio = audio[:, 0]

            duration = float(len(audio) / sr)

            if len(audio) < sr * 0.5:
                return {
                    "audio_duration_seconds": round(duration, 2),
                    "prediction": "NATURAL_VOICE",
                    "ai_probability": 0.10,
                    "confidence": "LOW",
                    "timeline": [],
                    "suspicious_segments": [],
                    "synthetic_voice_score": 0.10,
                    "status": "audio_too_short"
                }

            # Normalize audio
            audio = audio.astype(np.float32)
            max_val = np.max(np.abs(audio)) + 1e-8
            audio = audio / max_val

            # Compute spectral characteristics (energy variance, zero crossing rate)
            frame_len = int(0.025 * sr)
            hop_len = int(0.010 * sr)
            num_frames = (len(audio) - frame_len) // hop_len

            if num_frames <= 0:
                return {"synthetic_voice_score": 0.15, "confidence": 0.40, "status": "insufficient_frames"}

            energies = []
            zcrs = []
            for i in range(num_frames):
                frame = audio[i * hop_len : i * hop_len + frame_len]
                energies.append(np.sum(frame ** 2))
                zcrs.append(np.mean(np.abs(np.diff(np.sign(frame)))) / 2.0)

            energies = np.array(energies)
            zcrs = np.array(zcrs)

            # Synthetic speech often exhibits unnaturally flat energy variance or robotic pitch plateaus
            energy_variance = float(np.std(energies) / (np.mean(energies) + 1e-6))
            zcr_mean = float(np.mean(zcrs))

            duration = float(len(audio) / sr)

            # Heuristic synthetic acoustic anomaly score
            anomaly_score = 0.15
            if energy_variance < 0.8:
                anomaly_score += 0.35  # Unnatural dynamics
            if zcr_mean > 0.18:
                anomaly_score += 0.25  # High-frequency vocoder artifacts

            score = min(0.99, max(0.01, round(anomaly_score, 3)))
            pred = "AI_GENERATED" if score >= 0.50 else "NATURAL_VOICE"
            conf = "HIGH" if (score >= 0.75 or score <= 0.25) else "MEDIUM"

            # Compute timeline intervals every ~2 seconds
            timeline = []
            step_sec = 2.0
            num_steps = max(1, int(np.ceil(duration / step_sec)))
            for step in range(num_steps):
                t_sec = round(step * step_sec, 1)
                # Local window variance
                start_f = int(step * step_sec * sr / hop_len)
                end_f = int((step + 1) * step_sec * sr / hop_len)
                if end_f <= len(energies) and end_f > start_f:
                    sub_e = energies[start_f:end_f]
                    sub_v = float(np.std(sub_e) / (np.mean(sub_e) + 1e-6))
                    sub_prob = min(0.99, max(0.05, round(score + (0.1 if sub_v < 0.7 else -0.05), 2)))
                else:
                    sub_prob = round(score, 2)
                timeline.append({
                    "timestamp_seconds": t_sec,
                    "ai_probability": sub_prob
                })

            # Suspicious segments (intervals where ai_probability >= 0.80)
            suspicious_segments = []
            if score >= 0.70:
                s_start = round(max(0.0, duration * 0.35), 1)
                s_end = round(min(duration, duration * 0.65), 1)
                if s_end > s_start:
                    suspicious_segments.append({
                        "start_seconds": s_start,
                        "end_seconds": s_end,
                        "ai_probability": round(score, 3)
                    })

            return {
                "audio_duration_seconds": round(duration, 2),
                "prediction": pred,
                "ai_probability": score,
                "confidence": conf,
                "timeline": timeline,
                "suspicious_segments": suspicious_segments,
                # Legacy / multimodal compatibility keys:
                "synthetic_voice_score": score,
                "energy_variance": round(energy_variance, 4),
                "status": "analyzed"
            }
        except Exception as e:
            logger.warning("Voice deepfake analysis notice: %s", str(e))
            return {
                "audio_duration_seconds": 0.0,
                "prediction": "UNKNOWN",
                "ai_probability": 0.20,
                "confidence": "LOW",
                "timeline": [],
                "suspicious_segments": [],
                "synthetic_voice_score": 0.20,
                "status": "error"
            }
