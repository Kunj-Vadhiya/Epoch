"""Test Audio Analysis Schema and Router Contract."""

import os
import sys
import json

project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from src.voice_detector import SyntheticVoiceDetector


def test_audio_analysis_json_file():
    json_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "data",
        "audio_analysis_result.json"
    )
    assert os.path.exists(json_path), f"File {json_path} does not exist"

    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    # Validate exact keys and values from user specification
    assert data["audio_duration_seconds"] == 8.42
    assert data["prediction"] == "AI_GENERATED"
    assert data["ai_probability"] == 0.974
    assert data["confidence"] == "HIGH"

    assert isinstance(data["timeline"], list)
    assert len(data["timeline"]) == 4
    assert data["timeline"][0] == {"timestamp_seconds": 0.0, "ai_probability": 0.82}
    assert data["timeline"][1] == {"timestamp_seconds": 2.0, "ai_probability": 0.91}
    assert data["timeline"][2] == {"timestamp_seconds": 4.0, "ai_probability": 0.97}
    assert data["timeline"][3] == {"timestamp_seconds": 6.0, "ai_probability": 0.95}

    assert isinstance(data["suspicious_segments"], list)
    assert len(data["suspicious_segments"]) == 1
    assert data["suspicious_segments"][0] == {
        "start_seconds": 3.2,
        "end_seconds": 5.1,
        "ai_probability": 0.942
    }


def test_synthetic_voice_detector_schema():
    detector = SyntheticVoiceDetector()
    res = detector.analyze(None)

    required_keys = [
        "audio_duration_seconds",
        "prediction",
        "ai_probability",
        "confidence",
        "timeline",
        "suspicious_segments"
    ]
    for key in required_keys:
        assert key in res, f"Expected key '{key}' in SyntheticVoiceDetector.analyze output"


if __name__ == "__main__":
    print("Testing audio analysis JSON file...")
    test_audio_analysis_json_file()
    print("Passed: test_audio_analysis_json_file")

    print("Testing synthetic voice detector schema...")
    test_synthetic_voice_detector_schema()
    print("Passed: test_synthetic_voice_detector_schema")

    print("\nALL AUDIO SCHEMA TESTS PASSED SUCCESSFULLY!")
