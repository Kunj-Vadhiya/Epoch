"""Windowed inference and dashboard JSON construction."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import numpy as np
import torch

from .model import AudioCNN, load_checkpoint
from .preprocessing import SAMPLE_RATE, WINDOW_SAMPLES, load_wav, log_mel_window

WINDOW_SECONDS = WINDOW_SAMPLES / SAMPLE_RATE
# A 2-second stride gives the dashboard approximately one point every 2
# seconds while retaining 10-second context for every model prediction.
WINDOW_STRIDE_SAMPLES = 2 * SAMPLE_RATE
SUSPICIOUS_THRESHOLD = 0.70
MAX_TIMELINE_POINTS = 20


@dataclass(frozen=True)
class WindowPrediction:
    start: float
    end: float
    center: float
    ai_probability: float


def read_threshold(path: str | Path) -> float:
    try:
        threshold = float(Path(path).read_text(encoding="utf-8").strip())
    except (OSError, ValueError) as exc:
        raise ValueError(f"Invalid prediction threshold file: {exc}") from exc
    if not 0.0 < threshold < 1.0:
        raise ValueError("Prediction threshold must be between 0 and 1")
    return threshold


def _window_predictions(audio: np.ndarray, model: AudioCNN) -> list[WindowPrediction]:
    predictions: list[WindowPrediction] = []
    total_samples = audio.size
    for start_sample in range(0, total_samples, WINDOW_STRIDE_SAMPLES):
        end_sample = min(start_sample + WINDOW_SAMPLES, total_samples)
        segment = audio[start_sample:end_sample]
        features = log_mel_window(segment)
        with torch.inference_mode():
            probabilities = torch.softmax(model(features.unsqueeze(0)), dim=1)[0]
        ai_probability = float(probabilities[1].item())
        if not 0.0 <= ai_probability <= 1.0:
            raise RuntimeError("Model produced an invalid AI probability")
        start = start_sample / SAMPLE_RATE
        end = end_sample / SAMPLE_RATE
        predictions.append(
            WindowPrediction(
                start=start,
                end=end,
                center=start + (end - start) / 2,
                ai_probability=ai_probability,
            )
        )
    if not predictions:
        raise ValueError("Audio contains no samples")
    return predictions


def _timeline(windows: list[WindowPrediction]) -> list[dict[str, float]]:
    if len(windows) <= MAX_TIMELINE_POINTS:
        selected = windows
    else:
        indices = np.linspace(
            0, len(windows) - 1, MAX_TIMELINE_POINTS, dtype=np.int64
        )
        selected = [windows[int(index)] for index in np.unique(indices)]
    return [
        {
            "timestamp_seconds": round(window.center, 2),
            "ai_probability": round(window.ai_probability, 3),
        }
        for window in selected
    ]


def _suspicious_segments(windows: list[WindowPrediction]) -> list[dict[str, float]]:
    segments: list[dict[str, float]] = []
    current: list[WindowPrediction] = []
    previous_suspicious: WindowPrediction | None = None
    for window in windows:
        if window.ai_probability >= SUSPICIOUS_THRESHOLD:
            if (
                current
                and previous_suspicious is not None
                and window.start > previous_suspicious.end
            ):
                segments.append(_segment_json(current))
                current = []
            current.append(window)
            previous_suspicious = window
        elif current:
            segments.append(_segment_json(current))
            current = []
            previous_suspicious = None
    if current:
        segments.append(_segment_json(current))
    return segments


def _segment_json(windows: list[WindowPrediction]) -> dict[str, float]:
    return {
        "start_seconds": round(windows[0].start, 2),
        "end_seconds": round(windows[-1].end, 2),
        "ai_probability": round(
            max(window.ai_probability for window in windows), 3
        ),
    }


def predict_audio(
    audio_path: str | Path,
    checkpoint_path: str | Path | None = None,
    threshold_path: str | Path | None = None,
    model: AudioCNN | None = None,
    threshold: float | None = None,
) -> dict:
    """Run actual windowed inference and return only dashboard fields."""
    audio, duration = load_wav(audio_path)
    if model is None:
        if checkpoint_path is None:
            raise ValueError("Either 'model' or 'checkpoint_path' must be provided")
        model, _ = load_checkpoint(str(checkpoint_path))
    if threshold is None:
        threshold = read_threshold(threshold_path) if threshold_path else 0.50
    windows = _window_predictions(audio, model)
    ai_probability = sum(window.ai_probability for window in windows) / len(windows)
    prediction = "AI_GENERATED" if ai_probability >= threshold else "REAL"
    confidence_probability = max(ai_probability, 1.0 - ai_probability)
    confidence = (
        "HIGH"
        if confidence_probability >= 0.90
        else "MEDIUM"
        if confidence_probability >= 0.70
        else "LOW"
    )
    result = {
        "audio_duration_seconds": round(duration, 2),
        "prediction": prediction,
        "ai_probability": round(ai_probability, 3),
        "confidence": confidence,
        "timeline": _timeline(windows),
        "suspicious_segments": _suspicious_segments(windows),
    }
    _validate_result(result)
    return result


def _validate_result(result: dict) -> None:
    duration = result["audio_duration_seconds"]
    probability = result["ai_probability"]
    if not 0.0 <= probability <= 1.0:
        raise RuntimeError("Aggregated AI probability is outside [0, 1]")
    timestamps = [point["timestamp_seconds"] for point in result["timeline"]]
    if timestamps != sorted(timestamps):
        raise RuntimeError("Timeline is not sorted")
    for point in result["timeline"]:
        if not 0.0 <= point["ai_probability"] <= 1.0:
            raise RuntimeError("Timeline probability is outside [0, 1]")
        if not 0.0 <= point["timestamp_seconds"] <= duration:
            raise RuntimeError("Timeline timestamp is outside audio duration")
    for segment in result["suspicious_segments"]:
        if not 0.0 <= segment["start_seconds"] < segment["end_seconds"] <= duration:
            raise RuntimeError("Suspicious segment bounds are invalid")
        if not 0.0 <= segment["ai_probability"] <= 1.0:
            raise RuntimeError("Segment probability is outside [0, 1]")
