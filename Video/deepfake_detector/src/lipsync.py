"""Lip-Sync Audio-Visual Synchronization Anomaly Detector.

Evaluates temporal correlation between mouth region pixel optical variance and
acoustic speech energy envelope to detect out-of-sync audio dubbing and voice-puppetry deepfakes.
"""

from typing import Dict, Any, List, Optional
import os
import cv2
import numpy as np

try:
    from src.utils import setup_logger
except (ImportError, ModuleNotFoundError):
    from .utils import setup_logger

logger = setup_logger(__name__)


class LipSyncDetector:
    """Detects audio-visual misalignment between mouth motion and acoustic speech."""

    def __init__(self):
        pass

    def analyze(
        self,
        face_crops: np.ndarray,
        timestamps: List[float],
        audio_path: Optional[str]
    ) -> Dict[str, Any]:
        """
        Calculates lip-sync anomaly score.
        Args:
            face_crops: np.ndarray of shape (16, 224, 224, 3) RGB.
            timestamps: list of 16 timestamps in seconds.
            audio_path: path to 16kHz WAV audio.
        """
        if face_crops is None or len(face_crops) < 4:
            return {"anomaly_score": 0.0, "status": "insufficient_frames", "suspicious_intervals": []}

        num_frames = len(face_crops)
        # Extract lower third of face (mouth region: y from 0.65 to 0.95)
        mouth_variations = []
        for i in range(1, num_frames):
            prev_face = cv2.cvtColor(face_crops[i - 1], cv2.COLOR_RGB2GRAY)
            curr_face = cv2.cvtColor(face_crops[i], cv2.COLOR_RGB2GRAY)
            h, w = prev_face.shape

            prev_mouth = prev_face[int(h * 0.65) : int(h * 0.95), int(w * 0.25) : int(w * 0.75)]
            curr_mouth = curr_face[int(h * 0.65) : int(h * 0.95), int(w * 0.25) : int(w * 0.75)]

            diff = np.mean(np.abs(curr_mouth.astype(float) - prev_mouth.astype(float)))
            mouth_variations.append(diff)

        mouth_arr = np.array(mouth_variations)

        # If audio is available, compare mouth motion to acoustic energy
        audio_corr = 0.5
        if audio_path and os.path.exists(audio_path):
            try:
                import scipy.io.wavfile as wavfile
                sr, audio = wavfile.read(audio_path)
                if audio.ndim > 1:
                    audio = audio[:, 0]
                audio_energies = []
                for t in timestamps[1:]:
                    center_sample = int(t * sr)
                    window_len = int(0.1 * sr)
                    start_s = max(0, center_sample - window_len // 2)
                    end_s = min(len(audio), center_sample + window_len // 2)
                    chunk = audio[start_s:end_s].astype(float)
                    energy = np.mean(chunk ** 2) if len(chunk) > 0 else 0.0
                    audio_energies.append(energy)

                audio_arr = np.array(audio_energies)
                if np.std(mouth_arr) > 1e-4 and np.std(audio_arr) > 1e-4:
                    corr = np.corrcoef(mouth_arr, audio_arr)[0, 1]
                    if not np.isnan(corr):
                        audio_corr = float(corr)
            except Exception as e:
                logger.debug("Audio correlation notice: %s", str(e))

        # A low or negative correlation between mouth motion and acoustic energy indicates deepfake dubbing
        anomaly_score = max(0.05, min(0.95, round(float(0.5 - 0.45 * audio_corr), 4)))

        suspicious_intervals = []
        if anomaly_score > 0.55 and len(timestamps) >= 2:
            suspicious_intervals.append({
                "start": round(timestamps[0], 2),
                "end": round(timestamps[-1], 2),
                "type": "lip_sync",
                "anomaly_score": anomaly_score
            })

        return {
            "anomaly_score": anomaly_score,
            "correlation": round(audio_corr, 4),
            "suspicious_intervals": suspicious_intervals,
            "status": "success"
        }
