"""Deepfake Scam Ad Detector Module.

Comprehensive video-level and frame-level deepfake detection using EfficientNet-B0,
temporal probability aggregation, and explainable Grad-CAM heatmaps.
"""

from src.utils import setup_logger, set_seed, detect_environment, load_config
from src.face_detector import LightweightFaceDetector
from src.video_processor import VideoProcessor, create_synthetic_video
from src.dataset import (
    inspect_dataset_schema,
    parse_label,
    get_transforms,
    DeepfakeVideoDataset,
)
from src.model import DeepfakeDetectorModel, build_model, load_model
from src.explainability import (
    GradCAMExplainer,
    format_timestamp,
    build_suspicious_temporal_timeline,
)
from src.evaluate import (
    aggregate_video_probabilities,
    evaluate_aggregation_strategies,
    compute_metrics,
    plot_and_save_curves,
    run_error_analysis,
)
from src.sampler import StreamingDatasetSampler

__all__ = [
    "setup_logger",
    "set_seed",
    "detect_environment",
    "load_config",
    "LightweightFaceDetector",
    "VideoProcessor",
    "create_synthetic_video",
    "inspect_dataset_schema",
    "parse_label",
    "get_transforms",
    "DeepfakeVideoDataset",
    "DeepfakeDetectorModel",
    "build_model",
    "load_model",
    "GradCAMExplainer",
    "format_timestamp",
    "build_suspicious_temporal_timeline",
    "aggregate_video_probabilities",
    "evaluate_aggregation_strategies",
    "compute_metrics",
    "plot_and_save_curves",
    "run_error_analysis",
    "StreamingDatasetSampler",
]
