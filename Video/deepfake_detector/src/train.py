"""Training Pipeline for EfficientNet-B0 Deepfake Detection.

Features mixed-precision training, phased transfer learning, early stopping
on validation ROC-AUC, class weighting, comprehensive per-epoch metrics,
and end-to-end CLI execution.
"""

import os
import sys
import time
import argparse
from typing import Dict, Any, Optional, Tuple, List
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score
from tqdm import tqdm

# Ensure project root is in sys.path when running script directly
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

try:
    from src.model import DeepfakeDetectorModel, build_model
    from src.dataset import DeepfakeVideoDataset
    from src.utils import setup_logger, detect_environment, set_seed, load_config
    from src.sampler import StreamingDatasetSampler
    from src.evaluate import (
        evaluate_aggregation_strategies,
        compute_metrics,
        plot_and_save_curves,
        run_error_analysis,
        aggregate_video_probabilities,
    )
    from src.explainability import GradCAMExplainer, build_suspicious_temporal_timeline
except (ImportError, ModuleNotFoundError):
    from .model import DeepfakeDetectorModel, build_model
    from .dataset import DeepfakeVideoDataset
    from .utils import setup_logger, detect_environment, set_seed, load_config
    from .sampler import StreamingDatasetSampler
    from .evaluate import (
        evaluate_aggregation_strategies,
        compute_metrics,
        plot_and_save_curves,
        run_error_analysis,
        aggregate_video_probabilities,
    )
    from .explainability import GradCAMExplainer, build_suspicious_temporal_timeline

logger = setup_logger(__name__)


def collate_video_frames_batch(batch: List[Dict[str, Any]]) -> Tuple[torch.Tensor, torch.Tensor]:
    """Collates video frame batches by concatenating (B, num_frames, C, H, W) to (B*num_frames, C, H, W)."""
    all_frames = []
    all_labels = []
    for item in batch:
        frames = item["frames"] # (num_frames, 3, 224, 224)
        lbl = item["label"].item() if isinstance(item["label"], torch.Tensor) else int(item["label"])
        all_frames.append(frames)
        all_labels.extend([lbl] * frames.shape[0])

    flat_frames = torch.cat(all_frames, dim=0) # (B * num_frames, 3, 224, 224)
    flat_labels = torch.tensor(all_labels, dtype=torch.long)
    return flat_frames, flat_labels


class Trainer:
    """Orchestrates end-to-end training of the deepfake detection model."""

    def __init__(
        self,
        model: DeepfakeDetectorModel,
        train_dataset: DeepfakeVideoDataset,
        val_dataset: DeepfakeVideoDataset,
        batch_size: int = 32,
        num_epochs: int = 5,
        lr_head: float = 1e-3,
        lr_backbone: float = 1e-4,
        weight_decay: float = 1e-4,
        patience: int = 2,
        save_path: str = "models/deepfake_efficientnet_b0_best.pth",
        device: Optional[torch.device] = None,
        use_amp: bool = True
    ):
        self.device = device or (torch.device("cuda") if torch.cuda.is_available() else torch.device("cpu"))
        self.model = model.to(self.device)
        self.train_dataset = train_dataset
        self.val_dataset = val_dataset
        self.batch_size = batch_size
        self.num_epochs = num_epochs
        self.lr_head = lr_head
        self.lr_backbone = lr_backbone
        self.weight_decay = weight_decay
        self.patience = patience
        self.save_path = save_path
        self.use_amp = use_amp and (self.device.type == "cuda")

        os.makedirs(os.path.dirname(os.path.abspath(self.save_path)), exist_ok=True)

        # Compute class weights to handle any minor sampling imbalance
        self.criterion = self._build_criterion()

        # Mixed precision scaler
        self.scaler = torch.amp.GradScaler("cuda", enabled=True) if self.use_amp else None

    def _build_criterion(self) -> nn.CrossEntropyLoss:
        """Calculates inverse frequency class weights from train dataset."""
        labels = [int(r.get("label", 0)) for r in self.train_dataset.records]
        num_real = max(1, labels.count(0))
        num_fake = max(1, labels.count(1))
        total = num_real + num_fake

        weight_real = total / (2.0 * num_real)
        weight_fake = total / (2.0 * num_fake)
        weights_tensor = torch.tensor([weight_real, weight_fake], dtype=torch.float32).to(self.device)

        logger.info("Class distribution: Real=%d, Fake=%d. Class weights: [%.3f, %.3f]",
                    num_real, num_fake, weight_real, weight_fake)
        return nn.CrossEntropyLoss(weight=weights_tensor)

    def train(self) -> Dict[str, Any]:
        """
        Executes phased training:
        Phase 1 (Epochs 1-2): Classifier head trained with frozen backbone.
        Phase 2 (Epochs 3-5): Top 2 feature blocks unfrozen for fine-tuning.
        """
        start_time = time.time()
        logger.info("Starting training on device: %s (AMP: %s, Epochs: %d, Batch Size: %d)",
                    self.device, self.use_amp, self.num_epochs, self.batch_size)

        best_val_auc = -1.0
        epochs_without_improvement = 0
        training_history: List[Dict[str, float]] = []

        num_workers = 2 if (os.name != "nt" and sys.version_info < (3, 14)) else 0
        train_loader = DataLoader(
            self.train_dataset,
            batch_size=self.batch_size,
            shuffle=True,
            num_workers=num_workers,
            collate_fn=collate_video_frames_batch,
            pin_memory=(self.device.type == "cuda")
        )

        val_loader = DataLoader(
            self.val_dataset,
            batch_size=self.batch_size,
            shuffle=False,
            num_workers=num_workers,
            collate_fn=collate_video_frames_batch,
            pin_memory=(self.device.type == "cuda")
        )

        optimizer = torch.optim.AdamW(
            filter(lambda p: p.requires_grad, self.model.parameters()),
            lr=self.lr_head,
            weight_decay=self.weight_decay
        )

        for epoch in range(1, self.num_epochs + 1):
            epoch_start = time.time()

            # Phased unfreezing logic
            if epoch == 1:
                self.model.freeze_backbone()
                optimizer = torch.optim.AdamW(
                    filter(lambda p: p.requires_grad, self.model.parameters()),
                    lr=self.lr_head,
                    weight_decay=self.weight_decay
                )
            elif epoch == 3:
                self.model.unfreeze_top_blocks(num_blocks=2)
                optimizer = torch.optim.AdamW(
                    filter(lambda p: p.requires_grad, self.model.parameters()),
                    lr=self.lr_backbone,
                    weight_decay=self.weight_decay
                )

            # Training step
            self.model.train()
            train_loss = 0.0
            train_correct = 0
            train_total = 0

            train_pbar = tqdm(train_loader, desc=f"Epoch {epoch}/{self.num_epochs} [Train]", unit="batch", leave=False)
            for frames, labels in train_pbar:
                frames = frames.to(self.device, non_blocking=True)
                labels = labels.to(self.device, non_blocking=True)

                optimizer.zero_grad()

                if self.use_amp and self.scaler is not None:
                    with torch.amp.autocast("cuda"):
                        logits = self.model(frames)
                        loss = self.criterion(logits, labels)
                    self.scaler.scale(loss).backward()
                    self.scaler.step(optimizer)
                    self.scaler.update()
                else:
                    logits = self.model(frames)
                    loss = self.criterion(logits, labels)
                    loss.backward()
                    optimizer.step()

                train_loss += loss.item() * len(labels)
                preds = torch.argmax(logits, dim=1)
                train_correct += (preds == labels).sum().item()
                train_total += len(labels)
                train_pbar.set_postfix({
                    "loss": f"{loss.item():.4f}",
                    "acc": f"{train_correct / max(1, train_total):.3f}"
                })

            train_loss_epoch = train_loss / max(1, train_total)
            train_acc_epoch = train_correct / max(1, train_total)

            # Validation step
            val_metrics = self._evaluate_validation(val_loader)
            epoch_time = time.time() - epoch_start

            epoch_log = {
                "epoch": epoch,
                "train_loss": round(train_loss_epoch, 4),
                "train_acc": round(train_acc_epoch, 4),
                "val_loss": round(val_metrics["val_loss"], 4),
                "val_acc": round(val_metrics["val_acc"], 4),
                "val_precision": round(val_metrics["val_precision"], 4),
                "val_recall": round(val_metrics["val_recall"], 4),
                "val_f1": round(val_metrics["val_f1"], 4),
                "val_roc_auc": round(val_metrics["val_roc_auc"], 4),
                "duration_sec": round(epoch_time, 1)
            }
            training_history.append(epoch_log)

            # Exact format requested in Phase 10
            print(f"\nEpoch {epoch}/{self.num_epochs}")
            print(f"Train Loss: {epoch_log['train_loss']:.4f}")
            print(f"Train Accuracy: {epoch_log['train_acc']:.4f}")
            print(f"Val Loss: {epoch_log['val_loss']:.4f}")
            print(f"Val Accuracy: {epoch_log['val_acc']:.4f}")
            print(f"Val Precision: {epoch_log['val_precision']:.4f}")
            print(f"Val Recall: {epoch_log['val_recall']:.4f}")
            print(f"Val F1: {epoch_log['val_f1']:.4f}")
            print(f"Val AUC: {epoch_log['val_roc_auc']:.4f}")

            # Checkpoint saving on Validation ROC-AUC
            current_auc = val_metrics["val_roc_auc"]
            if current_auc > best_val_auc:
                best_val_auc = current_auc
                epochs_without_improvement = 0
                torch.save(self.model.state_dict(), self.save_path)
                logger.info("Saved new best model checkpoint to %s (Val AUC: %.4f)", self.save_path, best_val_auc)
            else:
                epochs_without_improvement += 1
                logger.info("Validation AUC did not improve (%d/%d patience)", epochs_without_improvement, self.patience)

            # Early Stopping
            if epochs_without_improvement >= self.patience:
                logger.info("Early stopping triggered after %d epochs without improvement.", self.patience)
                break

        total_train_time = round(time.time() - start_time, 2)
        logger.info("Training complete in %.2f seconds. Best Val AUC: %.4f", total_train_time, best_val_auc)

        return {
            "total_time_seconds": total_train_time,
            "best_val_auc": best_val_auc,
            "history": training_history,
            "saved_model_path": self.save_path
        }

    def _evaluate_validation(self, val_loader: DataLoader) -> Dict[str, float]:
        """Runs full validation evaluation across all frames."""
        self.model.eval()
        val_loss = 0.0
        val_total = 0
        all_labels: List[int] = []
        all_probs: List[float] = []

        if len(val_loader.dataset) == 0:
            return {
                "val_loss": 0.0,
                "val_acc": 0.0,
                "val_precision": 0.0,
                "val_recall": 0.0,
                "val_f1": 0.0,
                "val_roc_auc": 0.5
            }

        val_pbar = tqdm(val_loader, desc="Validating", unit="batch", leave=False)
        with torch.no_grad():
            for frames, labels in val_pbar:
                frames = frames.to(self.device, non_blocking=True)
                labels = labels.to(self.device, non_blocking=True)

                if self.use_amp:
                    with torch.amp.autocast("cuda"):
                        logits = self.model(frames)
                        loss = self.criterion(logits, labels)
                else:
                    logits = self.model(frames)
                    loss = self.criterion(logits, labels)

                probs = torch.softmax(logits, dim=1)[:, 1]

                val_loss += loss.item() * len(labels)
                val_total += len(labels)
                all_labels.extend(labels.cpu().numpy().tolist())
                all_probs.extend(probs.cpu().numpy().tolist())

        y_true = np.array(all_labels)
        y_probs = np.array(all_probs)
        y_preds = (y_probs >= 0.5).astype(int)

        avg_loss = val_loss / max(1, val_total)
        acc = accuracy_score(y_true, y_preds)
        prec = precision_score(y_true, y_preds, zero_division=0)
        rec = recall_score(y_true, y_preds, zero_division=0)
        f1 = f1_score(y_true, y_preds, zero_division=0)

        try:
            auc = roc_auc_score(y_true, y_probs)
        except Exception:
            auc = 0.5

        return {
            "val_loss": avg_loss,
            "val_acc": acc,
            "val_precision": prec,
            "val_recall": rec,
            "val_f1": f1,
            "val_roc_auc": auc
        }


def load_local_directory_dataset(data_dir: str, manifest_path: str) -> List[Dict[str, Any]]:
    """Discovers real and fake videos from a local folder structure and assigns train/val/test splits."""
    samples = []
    video_exts = {".mp4", ".avi", ".mov", ".mkv", ".webm"}
    for root, _, files in os.walk(data_dir):
        for f in files:
            ext = os.path.splitext(f)[1].lower()
            if ext in video_exts:
                full_p = os.path.abspath(os.path.join(root, f))
                rel_p = os.path.relpath(full_p, data_dir).lower()
                if "fake" in rel_p or "manipulated" in rel_p or "deepfake" in rel_p:
                    lbl = 1
                elif "real" in rel_p or "original" in rel_p:
                    lbl = 0
                else:
                    lbl = 1 if "fake" in f.lower() else 0
                samples.append({
                    "video_id": os.path.splitext(f)[0],
                    "label": lbl,
                    "split": "train",
                    "subject_id": "local_actor",
                    "duration": None,
                    "dataset_source": "local_directory",
                    "local_path": full_p
                })
    if not samples:
        raise ValueError(f"No video files found in {data_dir} (searched for {video_exts})")

    import random
    import pandas as pd
    random.seed(42)
    real_s = [s for s in samples if s["label"] == 0]
    fake_s = [s for s in samples if s["label"] == 1]
    random.shuffle(real_s)
    random.shuffle(fake_s)
    for group in (real_s, fake_s):
        n = len(group)
        n_tr = int(n * 0.8)
        n_va = max(1 if n > 3 else 0, int(n * 0.1))
        for i, s in enumerate(group):
            if i < n_tr:
                s["split"] = "train"
            elif i < n_tr + n_va:
                s["split"] = "val"
            else:
                s["split"] = "test"
    all_s = real_s + fake_s
    pd.DataFrame(all_s).to_csv(manifest_path, index=False)
    logger.info("Indexed %d local videos (%d Real, %d Fake) into %s", len(all_s), len(real_s), len(fake_s), manifest_path)
    return all_s


def main():
    """Main CLI entrypoint for training and evaluating Deepfake Scam Ad Detector."""
    parser = argparse.ArgumentParser(description="Train and evaluate EfficientNet-B0 Deepfake Detector.")
    parser.add_argument("--config", type=str, default=None, help="Path to YAML configuration file.")
    parser.add_argument("--synthetic", action="store_true", help="Generate and use local synthetic test videos.")
    parser.add_argument("--epochs", type=int, default=None, help="Override number of training epochs.")
    parser.add_argument("--batch_size", type=int, default=None, help="Override batch size.")
    parser.add_argument("--samples", type=int, default=None, help="Number of samples per class to generate or use.")
    parser.add_argument("--train_samples", type=int, default=None, help="Exact number of training videos (e.g. 500).")
    parser.add_argument("--manifest", type=str, default=None, help="Path to existing dataset manifest CSV.")
    parser.add_argument("--stream_hf", action="store_true", help="Stream and sample from Hugging Face gated dataset.")
    parser.add_argument("--hf_token", type=str, default=None, help="Hugging Face API token.")
    parser.add_argument("--data_dir", type=str, default=None, help="Path to directory containing custom training videos.")
    args = parser.parse_args()

    cfg = load_config(args.config)
    set_seed(cfg["dataset"].get("seed", 42))
    env_info = detect_environment()
    device = torch.device(env_info["device"])

    manifest_path = args.manifest or cfg["dataset"].get("manifest_path", "data/sample_manifest.csv")
    cache_dir = cfg["dataset"].get("local_cache_dir", "data/raw_samples")

    sampler = StreamingDatasetSampler(
        dataset_name=cfg["dataset"].get("name", "belkhir-nacim/deepfake-videos"),
        seed=cfg["dataset"].get("seed", 42),
        fast_mode=cfg["dataset"].get("fast_mode", True),
        cache_dir=cache_dir,
        manifest_path=manifest_path
    )

    if args.manifest and os.path.exists(args.manifest):
        import pandas as pd
        logger.info("Loading dataset from specified manifest: %s", args.manifest)
        df = pd.read_csv(args.manifest)
        samples = df.to_dict(orient="records")
    elif args.data_dir:
        logger.info("Scanning custom video dataset from directory: %s", args.data_dir)
        samples = load_local_directory_dataset(args.data_dir, manifest_path)
    elif args.stream_hf:
        token = args.hf_token or os.environ.get("HF_TOKEN")
        logger.info("Connecting to Hugging Face streaming dataset: %s", cfg["dataset"].get("name"))
        samples = sampler.sample_from_hf_stream(hf_token=token)
        sampler.save_manifest(samples)
    elif args.train_samples is not None:
        # Train is 80% of total. So per-class count = (train_samples / 2) / 0.8
        count = int(np.ceil((args.train_samples / 2.0) / 0.80))
        logger.info("Generating dataset targeted for %d training videos (%d per class, %d total)...",
                    args.train_samples, count, count * 2)
        samples = sampler.generate_synthetic_dataset_for_testing(count_per_class=count)
    elif args.synthetic or (args.samples is not None) or (not os.path.exists(manifest_path)):
        count = args.samples if args.samples is not None else 20
        logger.info("Generating balanced video dataset with %d samples per class (%d total videos)...", count, count * 2)
        samples = sampler.generate_synthetic_dataset_for_testing(count_per_class=count)
    else:
        import pandas as pd
        df = pd.read_csv(manifest_path)
        samples = df.to_dict(orient="records")

    train_ds = DeepfakeVideoDataset(samples, split="train")
    val_ds = DeepfakeVideoDataset(samples, split="val")
    test_ds = DeepfakeVideoDataset(samples, split="test")

    logger.info("Dataset splits: Train=%d, Val=%d, Test=%d", len(train_ds), len(val_ds), len(test_ds))

    model = build_model(
        pretrained=cfg["model"].get("pretrained", True),
        dropout=cfg["model"].get("dropout", 0.3),
        device=device
    )

    num_epochs = args.epochs if args.epochs is not None else cfg["training"].get("num_epochs", 5)
    batch_size = args.batch_size if args.batch_size is not None else cfg["training"].get("batch_size", 32)
    save_path = cfg["model"].get("saved_model_path", "models/deepfake_efficientnet_b0_best.pth")

    trainer = Trainer(
        model=model,
        train_dataset=train_ds,
        val_dataset=val_ds,
        batch_size=batch_size,
        num_epochs=num_epochs,
        lr_head=cfg["training"].get("learning_rate_head", 1e-3),
        lr_backbone=cfg["training"].get("learning_rate_backbone", 1e-4),
        weight_decay=cfg["training"].get("weight_decay", 1e-4),
        patience=cfg["training"]["early_stopping"].get("patience", 2),
        save_path=save_path,
        device=device,
        use_amp=cfg["training"].get("use_amp", True)
    )

    train_results = trainer.train()

    # Aggregation Comparison on Validation
    comp = evaluate_aggregation_strategies(model, val_ds, device=device)

    # Evaluate on Held-out Test Set
    if len(test_ds) > 0:
        logger.info("Evaluating on held-out test set (%d videos)...", len(test_ds))
        test_scores = []
        test_labels = []
        test_frame_details = []

        model.eval()
        with torch.no_grad():
            test_pbar = tqdm(range(len(test_ds)), desc="Testing", unit="video", leave=False)
            for i in test_pbar:
                item = test_ds[i]
                frames = item["frames"].to(device)
                lbl = int(item["label"].item())
                test_labels.append(lbl)

                fake_probs, _ = model.predict_frames(frames)
                probs_np = fake_probs.cpu().numpy()
                score = aggregate_video_probabilities(probs_np, strategy="top_k_mean", top_k=3)
                test_scores.append(score)

                meta = item.get("metadata", [])
                details = []
                for f_idx, p in enumerate(probs_np):
                    ts = meta[f_idx].get("timestamp", f_idx * 0.1) if f_idx < len(meta) else f_idx * 0.1
                    details.append({"timestamp": ts, "fake_prob": float(p)})
                test_frame_details.append(details)

        y_true = np.array(test_labels)
        y_scores = np.array(test_scores)
        metrics = compute_metrics(y_true, y_scores, threshold=0.5)
        logger.info("Test Metrics: Accuracy=%.4f | Precision=%.4f | Recall=%.4f | F1=%.4f | ROC-AUC=%.4f",
                    metrics["accuracy"], metrics["precision"], metrics["recall"], metrics["f1"], metrics["roc_auc"])

        plot_and_save_curves(y_true, y_scores, output_dir="outputs")
        run_error_analysis(test_ds.records, y_true, y_scores, test_frame_details)

        # Grad-CAM explanation demo on first test sample
        if len(test_ds) > 0:
            first_sample = test_ds[0]
            first_frames = first_sample["frames"] # (8, 3, 224, 224)
            explainer = GradCAMExplainer(model=model)
            heatmap = explainer.generate_heatmap(first_frames[0])
            orig_frame = (first_frames[0].permute(1, 2, 0).numpy() * 255).astype(np.uint8)
            explainer.save_explanation_triptych(orig_frame, heatmap, "outputs/explanations/test_sample_0_gradcam.png")

    logger.info("End-to-end execution completed successfully.")


if __name__ == "__main__":
    main()
