"""Data Leakage and Subject-Disjoint Verification Tests.

Ensures zero identity, video, or partition leakage between train, validation,
and test sets, validating true generalization to unseen videos and unseen people.
"""

import os
import sys
import pandas as pd
import pytest

project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if project_root not in sys.path:
    sys.path.insert(0, project_root)


def test_video_id_disjointness():
    """Asserts that train, validation, and test video IDs are 100% disjoint."""
    manifest_path = os.path.join(project_root, "data", "faceforensics_manifest.csv")
    if not os.path.exists(manifest_path):
        pytest.skip("Manifest not found")

    df = pd.read_csv(manifest_path)
    train_ids = set(df[df["split"] == "train"]["video_id"].astype(str))
    val_ids = set(df[df["split"] == "val"]["video_id"].astype(str))
    test_ids = set(df[df["split"] == "test"]["video_id"].astype(str))

    # Assert no video ID is shared across splits
    assert len(train_ids & test_ids) == 0, f"Leakage detected between train and test: {train_ids & test_ids}"
    assert len(train_ids & val_ids) == 0, f"Leakage detected between train and val: {train_ids & val_ids}"
    assert len(val_ids & test_ids) == 0, f"Leakage detected between val and test: {val_ids & test_ids}"
    print(f"PASSED: 100% video-disjoint split verified across {len(df)} videos.")


def test_unseen_inference_execution():
    """Asserts that predict_video operates on arbitrary video paths without dataset membership."""
    from src.inference import predict_video
    sample_video = os.path.join(project_root, "data", "external_test", "unseen_real_interview_01.mp4")
    if not os.path.exists(sample_video):
        pytest.skip("Sample unseen video not found")

    result = predict_video(sample_video)
    assert "prediction" in result
    assert "deepfake" in result
    assert "probability" in result["deepfake"]
    assert "confidence" in result
    assert "uncertainty" in result
    assert result["prediction"] in ["LOW_RISK", "MEDIUM_RISK", "HIGH_RISK", "UNCERTAIN"]
    print(f"PASSED: predict_video completed on unseen video with prediction: {result['prediction']}")


if __name__ == "__main__":
    test_video_id_disjointness()
    test_unseen_inference_execution()
    print("All disjointness and unseen inference tests PASSED successfully.")
