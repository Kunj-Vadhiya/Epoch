"""Comprehensive Test Suite for Deepfake Scam Ad Detector.

Verifies face detection, uniform frame decoding, EfficientNet-B0 modeling,
video-level aggregation, Grad-CAM attention heatmaps, and the complete training loop.
"""

import os
import shutil
import tempfile
import numpy as np
import pytest
import torch

from src.utils import setup_logger, set_seed, detect_environment, load_config
from src.face_detector import LightweightFaceDetector
from src.video_processor import VideoProcessor, create_synthetic_video
from src.dataset import DeepfakeVideoDataset, parse_label, get_transforms, inspect_dataset_schema
from src.model import DeepfakeDetectorModel, build_model, load_model
from src.sampler import StreamingDatasetSampler
from src.explainability import GradCAMExplainer, format_timestamp, build_suspicious_temporal_timeline
from src.evaluate import (
    aggregate_video_probabilities,
    evaluate_aggregation_strategies,
    compute_metrics,
    plot_and_save_curves,
    run_error_analysis,
)
from src.train import Trainer


@pytest.fixture(scope="session")
def test_temp_dir():
    temp_dir = tempfile.mkdtemp(prefix="deepfake_test_")
    yield temp_dir
    shutil.rmtree(temp_dir, ignore_errors=True)


def test_utils_and_config():
    set_seed(42)
    env = detect_environment()
    assert "device" in env
    assert env["device"] in ["cuda", "cpu"]

    cfg = load_config()
    assert "project" in cfg
    assert "dataset" in cfg
    assert "model" in cfg
    assert "training" in cfg


def test_face_detector():
    detector = LightweightFaceDetector(target_size=(224, 224))
    # Test random RGB image (fallback to center crop)
    dummy_frame = np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8)
    crop, meta = detector.detect_and_crop(dummy_frame, frame_index=0, timestamp=0.5)

    assert crop.shape == (224, 224, 3)
    assert crop.dtype == np.uint8
    assert "face_detected" in meta
    assert meta["frame_index"] == 0
    assert meta["timestamp"] == 0.5


def test_video_processor_and_synthetic_video(test_temp_dir):
    real_video_path = os.path.join(test_temp_dir, "test_real.mp4")
    fake_video_path = os.path.join(test_temp_dir, "test_fake.mp4")

    create_synthetic_video(real_video_path, num_frames=20, fps=25, is_fake=False)
    create_synthetic_video(fake_video_path, num_frames=20, fps=25, is_fake=True)

    assert os.path.exists(real_video_path)
    assert os.path.exists(fake_video_path)

    processor = VideoProcessor(num_frames=8, target_size=(224, 224))
    frames, meta, info = processor.process_video(real_video_path)

    assert frames.shape == (8, 224, 224, 3)
    assert len(meta) == 8
    assert info["total_frames"] > 0
    assert info["fps"] > 0


def test_dataset_and_transforms(test_temp_dir):
    vid_path = os.path.join(test_temp_dir, "test_real.mp4")
    records = [
        {"video_id": "v1", "label": 0, "split": "train", "local_path": vid_path},
        {"video_id": "v2", "label": 1, "split": "val", "local_path": vid_path},
    ]

    assert parse_label("real") == 0
    assert parse_label("FAKE") == 1
    assert parse_label(0) == 0
    assert parse_label(1) == 1

    train_ds = DeepfakeVideoDataset(records, split="train")
    assert len(train_ds) == 1
    sample = train_ds[0]
    assert sample["frames"].shape == (8, 3, 224, 224)
    assert sample["label"].item() == 0
    assert sample["video_id"] == "v1"


def test_model_architecture_and_forward(test_temp_dir):
    model = build_model(pretrained=False, dropout=0.2)
    model.eval()

    dummy_input = torch.randn(2, 3, 224, 224)
    logits = model(dummy_input)
    assert logits.shape == (2, 2)

    fake_probs, preds = model.predict_frames(dummy_input)
    assert fake_probs.shape == (2,)
    assert preds.shape == (2,)
    assert torch.all((fake_probs >= 0.0) & (fake_probs <= 1.0))

    # Test freezing and unfreezing
    model.freeze_backbone()
    for param in model.backbone.features.parameters():
        assert not param.requires_grad
    for param in model.backbone.classifier.parameters():
        assert param.requires_grad

    model.unfreeze_top_blocks(num_blocks=2)
    # Checkpoint save & load
    ckpt_path = os.path.join(test_temp_dir, "model_test.pth")
    torch.save(model.state_dict(), ckpt_path)
    loaded_model = load_model(ckpt_path)
    assert isinstance(loaded_model, DeepfakeDetectorModel)


def test_gradcam_and_explainability(test_temp_dir):
    model = build_model(pretrained=False)
    explainer = GradCAMExplainer(model=model)

    dummy_tensor = torch.randn(3, 224, 224)
    heatmap = explainer.generate_heatmap(dummy_tensor, target_class=1)

    assert heatmap.shape == (224, 224)
    assert heatmap.min() >= 0.0
    assert heatmap.max() <= 1.0

    dummy_rgb = np.random.randint(0, 255, (224, 224, 3), dtype=np.uint8)
    triptych_path = os.path.join(test_temp_dir, "gradcam_triptych.png")
    saved_path = explainer.save_explanation_triptych(dummy_rgb, heatmap, triptych_path)
    assert os.path.exists(saved_path)

    # Test timeline calculation
    probs = [0.1, 0.2, 0.85, 0.90, 0.3]
    ts = [0.0, 0.5, 1.0, 1.5, 2.0]
    timeline_res = build_suspicious_temporal_timeline(probs, ts, threshold=0.70)
    assert len(timeline_res["suspicious_windows"]) > 0
    assert timeline_res["strongest_frame"]["fake_probability"] == 0.90


def test_evaluation_metrics_and_aggregation(test_temp_dir):
    probs = np.array([0.2, 0.8, 0.9, 0.1])
    score_mean = aggregate_video_probabilities(probs, strategy="mean")
    score_max = aggregate_video_probabilities(probs, strategy="max")
    score_top_k = aggregate_video_probabilities(probs, strategy="top_k_mean", top_k=2)

    assert round(score_mean, 2) == 0.50
    assert round(score_max, 2) == 0.90
    assert round(score_top_k, 2) == 0.85

    y_true = np.array([0, 0, 1, 1])
    y_scores = np.array([0.1, 0.3, 0.7, 0.9])
    metrics = compute_metrics(y_true, y_scores)
    assert metrics["accuracy"] == 1.0
    assert metrics["f1"] == 1.0
    assert metrics["roc_auc"] == 1.0

    cm_p, roc_p, pr_p = plot_and_save_curves(y_true, y_scores, output_dir=test_temp_dir)
    assert os.path.exists(cm_p)
    assert os.path.exists(roc_p)
    assert os.path.exists(pr_p)

    records = [{"video_id": f"v{i}"} for i in range(4)]
    err_res = run_error_analysis(records, y_true, y_scores)
    assert err_res["num_false_positives"] == 0
    assert err_res["num_false_negatives"] == 0


def test_end_to_end_synthetic_training_smoke(test_temp_dir):
    cache_dir = os.path.join(test_temp_dir, "cache")
    manifest_path = os.path.join(test_temp_dir, "manifest.csv")

    sampler = StreamingDatasetSampler(
        seed=42,
        fast_mode=True,
        cache_dir=cache_dir,
        manifest_path=manifest_path
    )
    samples = sampler.generate_synthetic_dataset_for_testing(count_per_class=4)
    assert os.path.exists(manifest_path)
    assert len(samples) == 8

    train_ds = DeepfakeVideoDataset(samples, split="train")
    val_ds = DeepfakeVideoDataset(samples, split="val")

    model = build_model(pretrained=False)
    save_path = os.path.join(test_temp_dir, "best_smoke_model.pth")

    trainer = Trainer(
        model=model,
        train_dataset=train_ds,
        val_dataset=val_ds,
        batch_size=2,
        num_epochs=2,
        save_path=save_path,
        use_amp=False
    )

    results = trainer.train()
    assert "best_val_auc" in results
    assert len(results["history"]) == 2
    assert os.path.exists(save_path)
