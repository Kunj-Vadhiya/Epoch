"""Evaluation, Video-Level Aggregation, Metrics, and Error Analysis.

Compares video-level aggregation strategies (Mean, Max, Top-k Mean),
evaluates held-out test set, exports visualization curves, and runs error analysis.
"""

import os
from typing import List, Dict, Any, Tuple, Optional
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, confusion_matrix, roc_curve, precision_recall_curve
)
import torch

try:
    from src.model import DeepfakeDetectorModel
    from src.dataset import DeepfakeVideoDataset
    from src.utils import setup_logger
except (ImportError, ModuleNotFoundError):
    from .model import DeepfakeDetectorModel
    from .dataset import DeepfakeVideoDataset
    from .utils import setup_logger

logger = setup_logger(__name__)


def aggregate_video_probabilities(
    frame_fake_probs: np.ndarray,
    strategy: str = "top_k_mean",
    top_k: int = 3
) -> float:
    """
    Aggregates frame-level fake probabilities into a single video-level score.

    Args:
        frame_fake_probs: Array of fake probabilities for frames, shape (num_frames,).
        strategy: 'mean', 'max', or 'top_k_mean'.
        top_k: Number of highest probability frames to average for 'top_k_mean'.

    Returns:
        video_score: Float in [0.0, 1.0].
    """
    if len(frame_fake_probs) == 0:
        return 0.0

    if strategy == "mean":
        return float(np.mean(frame_fake_probs))
    elif strategy == "max":
        return float(np.max(frame_fake_probs))
    elif strategy == "top_k_mean":
        k = min(top_k, len(frame_fake_probs))
        top_probs = np.sort(frame_fake_probs)[-k:]
        return float(np.mean(top_probs))
    else:
        raise ValueError(f"Unknown aggregation strategy: {strategy}")


def evaluate_aggregation_strategies(
    model: DeepfakeDetectorModel,
    val_dataset: DeepfakeVideoDataset,
    device: torch.device
) -> Dict[str, Dict[str, float]]:
    """
    Evaluates and compares Mean, Max, and Top-3 Mean strategies on validation data.
    """
    model.eval()
    strategies = ["mean", "max", "top_k_mean"]
    results: Dict[str, List[float]] = {s: [] for s in strategies}
    true_labels: List[int] = []

    if len(val_dataset) == 0:
        logger.warning("Empty validation dataset passed to evaluate_aggregation_strategies.")
        return {s: {"accuracy": 0.0, "f1": 0.0, "roc_auc": 0.5} for s in strategies}

    with torch.no_grad():
        for i in range(len(val_dataset)):
            sample = val_dataset[i]
            frames = sample["frames"].to(device) # (8, 3, 224, 224)
            label = int(sample["label"].item())
            true_labels.append(label)

            fake_probs, _ = model.predict_frames(frames)
            probs_np = fake_probs.cpu().numpy()

            for s in strategies:
                score = aggregate_video_probabilities(probs_np, strategy=s, top_k=3)
                results[s].append(score)

    y_true = np.array(true_labels)
    comparison: Dict[str, Dict[str, float]] = {}

    logger.info("=== Video-Level Aggregation Comparison on Validation Set ===")
    for s in strategies:
        y_scores = np.array(results[s])
        y_pred = (y_scores >= 0.5).astype(int)

        acc = accuracy_score(y_true, y_pred)
        f1 = f1_score(y_true, y_pred, zero_division=0)
        try:
            auc = roc_auc_score(y_true, y_scores)
        except Exception:
            auc = 0.5

        comparison[s] = {
            "accuracy": round(float(acc), 4),
            "f1": round(float(f1), 4),
            "roc_auc": round(float(auc), 4)
        }
        logger.info(
            "Strategy: %-10s | Accuracy: %.4f | F1: %.4f | ROC-AUC: %.4f",
            s, acc, f1, auc
        )

    return comparison


def compute_metrics(
    y_true: np.ndarray,
    y_scores: np.ndarray,
    threshold: float = 0.5
) -> Dict[str, Any]:
    """Computes full set of binary classification metrics."""
    if len(y_true) == 0:
        return {
            "accuracy": 0.0,
            "precision": 0.0,
            "recall": 0.0,
            "f1": 0.0,
            "roc_auc": 0.5,
            "confusion_matrix": [[0, 0], [0, 0]],
            "tp": 0,
            "tn": 0,
            "fp": 0,
            "fn": 0
        }

    y_pred = (y_scores >= threshold).astype(int)

    acc = accuracy_score(y_true, y_pred)
    prec = precision_score(y_true, y_pred, zero_division=0)
    rec = recall_score(y_true, y_pred, zero_division=0)
    f1 = f1_score(y_true, y_pred, zero_division=0)

    try:
        auc = roc_auc_score(y_true, y_scores)
    except Exception:
        auc = 0.5

    cm = confusion_matrix(y_true, y_pred, labels=[0, 1])
    tn, fp, fn, tp = cm.ravel() if cm.shape == (2, 2) else (0, 0, 0, 0)

    return {
        "accuracy": float(acc),
        "precision": float(prec),
        "recall": float(rec),
        "f1": float(f1),
        "roc_auc": float(auc),
        "confusion_matrix": cm.tolist(),
        "tp": int(tp),
        "tn": int(tn),
        "fp": int(fp),
        "fn": int(fn)
    }


def plot_and_save_curves(
    y_true: np.ndarray,
    y_scores: np.ndarray,
    output_dir: str = "outputs"
) -> Tuple[str, str, str]:
    """
    Plots and saves Confusion Matrix, ROC curve, and Precision-Recall curve.
    """
    os.makedirs(output_dir, exist_ok=True)
    y_pred = (y_scores >= 0.5).astype(int)

    # 1. Confusion Matrix
    cm = confusion_matrix(y_true, y_pred, labels=[0, 1])
    plt.figure(figsize=(6, 5))
    sns.heatmap(
        cm, annot=True, fmt="d", cmap="Blues",
        xticklabels=["REAL", "FAKE"], yticklabels=["REAL", "FAKE"]
    )
    plt.title("Confusion Matrix (Held-out Test Set)")
    plt.xlabel("Predicted Label")
    plt.ylabel("Ground Truth")
    cm_path = os.path.join(output_dir, "confusion_matrix.png")
    plt.tight_layout()
    plt.savefig(cm_path, dpi=200)
    plt.close()

    # 2. ROC Curve
    plt.figure(figsize=(6, 5))
    try:
        fpr, tpr, _ = roc_curve(y_true, y_scores)
        auc = roc_auc_score(y_true, y_scores)
        plt.plot(fpr, tpr, color="crimson", lw=2, label=f"ROC (AUC = {auc:.3f})")
    except Exception:
        plt.plot([0, 1], [0, 1], color="crimson", lw=2, label="ROC (AUC = 0.500)")
    plt.plot([0, 1], [0, 1], color="gray", lw=1, linestyle="--")
    plt.xlabel("False Positive Rate")
    plt.ylabel("True Positive Rate")
    plt.title("Receiver Operating Characteristic (ROC) Curve")
    plt.legend(loc="lower right")
    plt.grid(True, alpha=0.3)
    roc_path = os.path.join(output_dir, "roc_curve.png")
    plt.tight_layout()
    plt.savefig(roc_path, dpi=200)
    plt.close()

    # 3. Precision-Recall Curve
    plt.figure(figsize=(6, 5))
    try:
        prec, rec, _ = precision_recall_curve(y_true, y_scores)
        plt.plot(rec, prec, color="darkblue", lw=2, label="Precision-Recall Curve")
    except Exception:
        plt.plot([0, 1], [1, 0], color="darkblue", lw=2, label="Precision-Recall Curve")
    plt.xlabel("Recall")
    plt.ylabel("Precision")
    plt.title("Precision-Recall (PR) Curve")
    plt.legend(loc="lower left")
    plt.grid(True, alpha=0.3)
    pr_path = os.path.join(output_dir, "pr_curve.png")
    plt.tight_layout()
    plt.savefig(pr_path, dpi=200)
    plt.close()

    logger.info("Saved evaluation plots to %s", output_dir)
    return cm_path, roc_path, pr_path


def run_error_analysis(
    records: List[Dict[str, Any]],
    y_true: np.ndarray,
    y_scores: np.ndarray,
    frame_details: Optional[List[List[Dict[str, Any]]]] = None
) -> Dict[str, Any]:
    """
    Identifies False Positives, False Negatives,
    highest-confidence Fakes, and highest-confidence Reals.
    """
    analysis_df = pd.DataFrame({
        "video_id": [r.get("video_id", f"vid_{i}") for i, r in enumerate(records)],
        "ground_truth": ["FAKE" if y == 1 else "REAL" for y in y_true],
        "true_label": y_true,
        "score": y_scores,
        "predicted": ["FAKE" if s >= 0.5 else "REAL" for s in y_scores]
    })

    # Strongest suspicious timestamp per video
    strongest_timestamps = []
    if frame_details:
        for detail in frame_details:
            if detail:
                best_f = max(detail, key=lambda x: x.get("fake_prob", 0.0))
                ts = best_f.get("timestamp", 0.0)
                strongest_timestamps.append(f"{ts:.2f}s" if isinstance(ts, (int, float)) else str(ts))
            else:
                strongest_timestamps.append("N/A")

    while len(strongest_timestamps) < len(analysis_df):
        strongest_timestamps.append("N/A")

    analysis_df["strongest_timestamp"] = strongest_timestamps[:len(analysis_df)]

    false_positives = analysis_df[(analysis_df["true_label"] == 0) & (analysis_df["score"] >= 0.5)]
    false_negatives = analysis_df[(analysis_df["true_label"] == 1) & (analysis_df["score"] < 0.5)]
    top_fakes = analysis_df[analysis_df["true_label"] == 1].sort_values("score", ascending=False).head(5)
    top_reals = analysis_df[analysis_df["true_label"] == 0].sort_values("score", ascending=True).head(5)

    logger.info("=== Error Analysis Summary ===")
    logger.info("False Positives: %d | False Negatives: %d", len(false_positives), len(false_negatives))
    logger.info("Top Confident Fakes:\n%s", top_fakes[["video_id", "score", "strongest_timestamp"]].to_string())
    logger.info("Top Confident Reals:\n%s", top_reals[["video_id", "score", "strongest_timestamp"]].to_string())

    return {
        "num_false_positives": len(false_positives),
        "num_false_negatives": len(false_negatives),
        "top_fakes": top_fakes.to_dict(orient="records"),
        "top_reals": top_reals.to_dict(orient="records")
    }
