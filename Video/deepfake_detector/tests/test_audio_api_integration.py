"""End-to-End API Integration Test for Audio Deepfake Model.

Validates that:
1. FastAPI app starts cleanly with audio module active.
2. POST /api/v1/audio/analyze accepts WAV audio and runs live AudioCNN model inference.
3. POST /api/v1/audio/analyze accepts MP3 audio, converts it automatically, and runs inference.
4. POST /analyze-audio (alias) routes properly.
5. All response JSON objects strictly follow the target schema.
"""

import os
import sys
import pytest
from fastapi.testclient import TestClient

project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from api.main import app


def test_health_check_audio_status():
    client = TestClient(app)
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    audio_module = data["modules"]["audio_detection"]
    assert audio_module["status"] == "active"
    assert audio_module["endpoint"] == "/api/v1/audio/analyze"
    assert "AudioCNN" in audio_module["model"]
    print("\n[PASS] Health check confirms AudioCNN module is ACTIVE.")


def test_audio_analyze_wav_live_inference():
    client = TestClient(app)
    wav_path = os.path.join(project_root, "data", "samples", "audio", "sample-speech-1m.wav")
    assert os.path.exists(wav_path), f"Sample audio missing at {wav_path}"

    with open(wav_path, "rb") as f:
        response = client.post(
            "/api/v1/audio/analyze",
            files={"file": ("sample-speech-1m.wav", f, "audio/wav")}
        )

    assert response.status_code == 200
    data = response.json()

    print("\n[WAV Inference Result]:")
    print(f"  Duration: {data.get('audio_duration_seconds')}s")
    print(f"  Prediction: {data.get('prediction')}")
    print(f"  AI Probability: {data.get('ai_probability')}")
    print(f"  Confidence: {data.get('confidence')}")
    print(f"  Timeline points: {len(data.get('timeline', []))}")
    print(f"  Suspicious segments: {len(data.get('suspicious_segments', []))}")

    # Schema assertions
    assert "audio_duration_seconds" in data
    assert "prediction" in data
    assert data["prediction"] in ["REAL", "AI_GENERATED"]
    assert "ai_probability" in data
    assert 0.0 <= data["ai_probability"] <= 1.0
    assert "confidence" in data
    assert data["confidence"] in ["HIGH", "MEDIUM", "LOW"]
    assert "timeline" in data
    assert isinstance(data["timeline"], list)
    assert len(data["timeline"]) > 0
    assert "suspicious_segments" in data
    assert isinstance(data["suspicious_segments"], list)
    print("[PASS] POST /api/v1/audio/analyze with WAV succeeded.")


def test_audio_analyze_mp3_conversion_and_inference():
    client = TestClient(app)
    mp3_path = os.path.join(project_root, "data", "samples", "audio", "469039_2639035-lq.mp3")
    assert os.path.exists(mp3_path), f"Sample MP3 missing at {mp3_path}"

    with open(mp3_path, "rb") as f:
        response = client.post(
            "/api/v1/audio/analyze",
            files={"file": ("469039_2639035-lq.mp3", f, "audio/mpeg")}
        )

    assert response.status_code == 200
    data = response.json()

    print("\n[MP3 Inference Result]:")
    print(f"  Duration: {data.get('audio_duration_seconds')}s")
    print(f"  Prediction: {data.get('prediction')}")
    print(f"  AI Probability: {data.get('ai_probability')}")
    print(f"  Confidence: {data.get('confidence')}")
    print(f"  Timeline points: {len(data.get('timeline', []))}")

    assert data["prediction"] in ["REAL", "AI_GENERATED"]
    assert 0.0 <= data["ai_probability"] <= 1.0
    print("[PASS] POST /api/v1/audio/analyze with MP3 succeeded (automatic conversion + inference).")


def test_audio_alias_route():
    client = TestClient(app)
    wav_path = os.path.join(project_root, "data", "samples", "audio", "sample-speech-1m.wav")
    with open(wav_path, "rb") as f:
        response = client.post(
            "/analyze-audio",
            files={"file": ("sample.wav", f, "audio/wav")}
        )
    assert response.status_code == 200
    data = response.json()
    assert "ai_probability" in data
    print("[PASS] Alias route /analyze-audio succeeded.")


if __name__ == "__main__":
    test_health_check_audio_status()
    test_audio_analyze_wav_live_inference()
    test_audio_analyze_mp3_conversion_and_inference()
    test_audio_alias_route()
    print("\n==========================================")
    print("ALL API INTEGRATION TESTS PASSED WITH SUCCESS!")
    print("==========================================")
