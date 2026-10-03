"""Batch Inference & Output Exporter for 500 Testing Videos.

Runs the trained EfficientNet-B0 Deepfake Detector across 500 testing videos,
generates annotated MP4 videos with Grad-CAM HUD overlays, and writes individual JSON
reports alongside summary CSV/JSON metrics.
"""

import os
import sys
import time
import json
import cv2
import torch
import numpy as np
import pandas as pd
from tqdm import tqdm
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score

project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from src.model import load_model
from src.explainability import GradCAMExplainer, format_timestamp, build_suspicious_temporal_timeline
from src.video_processor import create_synthetic_video


def ensure_test_videos(test_dir: str, num_real: int = 250, num_fake: int = 250) -> list:
    """Generates or loads 500 test videos."""
    os.makedirs(test_dir, exist_ok=True)
    test_manifest = []

    print(f"Checking test dataset ({num_real} Real, {num_fake} Fake)...")
    for i in tqdm(range(num_real), desc="Preparing Real test videos", leave=False):
        vid_id = f"test_real_{i:04d}"
        path = os.path.join(test_dir, f"{vid_id}.mp4")
        if not os.path.exists(path):
            create_synthetic_video(path, num_frames=20, fps=25, is_fake=False)
        test_manifest.append({
            "video_id": vid_id,
            "label": 0,
            "ground_truth": "REAL",
            "path": path
        })

    for i in tqdm(range(num_fake), desc="Preparing Fake test videos", leave=False):
        vid_id = f"test_fake_{i:04d}"
        path = os.path.join(test_dir, f"{vid_id}.mp4")
        if not os.path.exists(path):
            create_synthetic_video(path, num_frames=20, fps=25, is_fake=True)
        test_manifest.append({
            "video_id": vid_id,
            "label": 1,
            "ground_truth": "FAKE",
            "path": path
        })

    return test_manifest


def process_and_export_all(test_manifest: list, output_dir: str):
    """Processes 500 testing videos, rendering annotated MP4s and JSONs."""
    videos_dir = os.path.join(output_dir, "videos")
    jsons_dir = os.path.join(output_dir, "jsons")
    os.makedirs(videos_dir, exist_ok=True)
    os.makedirs(jsons_dir, exist_ok=True)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model_path = os.path.join(project_root, "models", "deepfake_efficientnet_b0_best.pth")
    print(f"Loading trained model from {model_path} on {device}...")
    model = load_model(model_path, device=device)
    model.eval()

    explainer = GradCAMExplainer(model=model)

    mean = torch.tensor([0.485, 0.456, 0.406], device=device).view(3, 1, 1)
    std = torch.tensor([0.229, 0.224, 0.225], device=device).view(3, 1, 1)

    y_true = []
    y_scores = []
    records = []

    canvas_w, canvas_h = 640, 340
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")

    print(f"Running inference on {len(test_manifest)} test videos...")
    pbar = tqdm(test_manifest, desc="Evaluating Test Videos", unit="video")

    for item in pbar:
        vid_id = item["video_id"]
        gt_label = item["label"]
        gt_name = item["ground_truth"]
        video_path = item["path"]

        # Read frames
        cap = cv2.VideoCapture(video_path)
        fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
        raw_frames = []
        while True:
            ret, f = cap.read()
            if not ret:
                break
            raw_frames.append(f)
        cap.release()

        if not raw_frames:
            continue

        num_f = len(raw_frames)
        sample_indices = np.linspace(0, num_f - 1, 8, dtype=int)
        timestamps = [round(float(idx / fps), 3) for idx in sample_indices]

        crops_rgb = []
        for idx in sample_indices:
            bgr = raw_frames[idx]
            rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
            h, w = rgb.shape[:2]
            min_dim = min(h, w)
            crop = rgb[(h - min_dim) // 2 : (h + min_dim) // 2, (w - min_dim) // 2 : (w + min_dim) // 2]
            crops_rgb.append(cv2.resize(crop, (224, 224)))

        # Convert to tensor batch
        tensors = []
        for c in crops_rgb:
            t = torch.from_numpy(c).permute(2, 0, 1).float().to(device) / 255.0
            tensors.append((t - mean) / std)
        batch = torch.stack(tensors) # (8, 3, 224, 224)

        # Model forward
        with torch.no_grad():
            logits = model(batch)
            probs = torch.softmax(logits, dim=1)[:, 1].cpu().numpy().tolist()

        # Aggregation: top 3 mean
        top_k = sorted(probs, reverse=True)[:3]
        fake_score = float(np.mean(top_k))
        pred_label = 1 if fake_score >= 0.50 else 0
        pred_name = "FAKE" if pred_label == 1 else "REAL"

        y_true.append(gt_label)
        y_scores.append(fake_score)

        manip_name = item.get("manipulation_type", "unknown")

        # Grad-CAM on most suspicious frame
        max_idx = int(np.argmax(probs))
        heatmap = explainer.generate_heatmap(batch[max_idx])
        heatmap_rgb, overlay_rgb = explainer.create_visualization(crops_rgb[max_idx], heatmap)

        # Render annotated MP4 video
        out_video_path = os.path.join(videos_dir, f"{vid_id}_annotated.mp4")
        video_writer = cv2.VideoWriter(out_video_path, fourcc, 4.0, (canvas_w, canvas_h))

        badge_color = (40, 40, 220) if pred_name == "FAKE" else (40, 180, 50)

        for f_i, (crop_rgb, prob) in enumerate(zip(crops_rgb, probs)):
            canvas = np.zeros((canvas_h, canvas_w, 3), dtype=np.uint8)
            canvas[:] = (24, 24, 28)

            # Left: Original frame
            canvas[70:294, 20:244] = cv2.cvtColor(crop_rgb, cv2.COLOR_RGB2BGR)
            cv2.rectangle(canvas, (20, 70), (244, 294), (100, 100, 100), 1)
            cv2.putText(canvas, f"Frame {f_i+1} ({timestamps[f_i]}s)", (20, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (200, 200, 200), 1)

            # Right: Grad-CAM overlay
            canvas[70:294, 270:494] = cv2.cvtColor(overlay_rgb, cv2.COLOR_RGB2BGR)
            cv2.rectangle(canvas, (270, 70), (494, 294), (100, 100, 100), 1)
            cv2.putText(canvas, "Grad-CAM Heatmap", (270, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (200, 200, 200), 1)

            # Top Header
            cv2.putText(canvas, f"{vid_id[:28]}", (20, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 2)
            cv2.putText(canvas, f"Type: {manip_name}", (20, 50), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (180, 180, 180), 1)

            # Badge on right
            cv2.rectangle(canvas, (510, 70), (625, 110), badge_color, -1)
            cv2.putText(canvas, pred_name, (522, 98), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (255, 255, 255), 2)

            # Confidence
            cv2.putText(canvas, f"{fake_score * 100:.1f}%", (525, 145), cv2.FONT_HERSHEY_SIMPLEX, 0.75, (255, 255, 255), 2)
            cv2.putText(canvas, "Fake Score", (525, 165), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (180, 180, 180), 1)

            # Progress bar
            cv2.rectangle(canvas, (515, 180), (625, 195), (50, 50, 50), -1)
            bar_fill = int(110 * fake_score)
            cv2.rectangle(canvas, (515, 180), (515 + bar_fill, 195), badge_color, -1)
            cv2.rectangle(canvas, (515, 180), (625, 195), (120, 120, 120), 1)

            # Bottom Ground Truth info
            cv2.putText(canvas, f"Truth: {gt_name} ({manip_name})", (20, 320), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 255, 255), 1)
            status_text = "CORRECT" if pred_name == gt_name else "INCORRECT"
            status_col = (0, 255, 0) if pred_name == gt_name else (0, 0, 255)
            cv2.putText(canvas, status_text, (270, 320), cv2.FONT_HERSHEY_SIMPLEX, 0.45, status_col, 1)

            video_writer.write(canvas)
        video_writer.release()

        # Build timeline & suspicious windows
        timeline_info = build_suspicious_temporal_timeline(probs, timestamps, threshold=0.60)

        # JSON data
        frame_preds = [
            {"frame_index": f_idx, "timestamp_seconds": timestamps[f_idx], "fake_probability": round(float(p), 4)}
            for f_idx, p in enumerate(probs)
        ]

        json_data = {
            "video_id": vid_id,
            "manipulation_type": manip_name,
            "ground_truth": gt_name,
            "prediction": pred_name,
            "is_correct": bool(pred_name == gt_name),
            "fake_score": round(fake_score, 4),
            "threshold": 0.50,
            "aggregation_strategy": "top_k_mean",
            "frame_predictions": frame_preds,
            "suspicious_windows": timeline_info["suspicious_windows"],
            "strongest_frame": timeline_info["strongest_frame"],
            "annotated_video_path": os.path.relpath(out_video_path, project_root).replace("\\", "/")
        }

        json_out_path = os.path.join(jsons_dir, f"{vid_id}.json")
        with open(json_out_path, "w", encoding="utf-8") as jf:
            json.dump(json_data, jf, indent=2)

        records.append({
            "video_id": vid_id,
            "manipulation_type": manip_name,
            "ground_truth": gt_name,
            "prediction": pred_name,
            "is_correct": pred_name == gt_name,
            "fake_score": round(fake_score, 4),
            "video_file": os.path.relpath(out_video_path, project_root).replace("\\", "/"),
            "json_file": os.path.relpath(json_out_path, project_root).replace("\\", "/")
        })


        pbar.set_postfix({"pred": pred_name, "score": f"{fake_score:.2f}"})

    # Summary metrics
    y_true_np = np.array(y_true)
    y_scores_np = np.array(y_scores)
    y_preds_np = (y_scores_np >= 0.5).astype(int)

    acc = float(accuracy_score(y_true_np, y_preds_np))
    prec = float(precision_score(y_true_np, y_preds_np, zero_division=0))
    rec = float(recall_score(y_true_np, y_preds_np, zero_division=0))
    f1 = float(f1_score(y_true_np, y_preds_np, zero_division=0))
    auc = float(roc_auc_score(y_true_np, y_scores_np))

    summary = {
        "total_test_videos": len(records),
        "accuracy": round(acc, 4),
        "precision": round(prec, 4),
        "recall": round(rec, 4),
        "f1_score": round(f1, 4),
        "roc_auc": round(auc, 4),
        "correct_predictions": int(np.sum(y_true_np == y_preds_np)),
        "incorrect_predictions": int(np.sum(y_true_np != y_preds_np)),
        "output_videos_dir": os.path.relpath(videos_dir, project_root).replace("\\", "/"),
        "output_jsons_dir": os.path.relpath(jsons_dir, project_root).replace("\\", "/")
    }

    # Save summary files
    summary_path = os.path.join(output_dir, "summary_metrics.json")
    with open(summary_path, "w", encoding="utf-8") as sf:
        json.dump(summary, sf, indent=2)

    df_path = os.path.join(output_dir, "all_predictions.csv")
    pd.DataFrame(records).to_csv(df_path, index=False)

    print("\n" + "=" * 60)
    print("BATCH TEST EVALUATION COMPLETE")
    print(f"Total Videos Processed:    {summary['total_test_videos']}")
    print(f"Accuracy:                 {summary['accuracy'] * 100:.2f}%")
    print(f"Precision:                {summary['precision']:.4f}")
    print(f"Recall:                   {summary['recall']:.4f}")
    print(f"F1 Score:                 {summary['f1_score']:.4f}")
    print(f"ROC-AUC:                  {summary['roc_auc']:.4f}")
    print(f"Output Videos Directory:  {videos_dir}")
    print(f"Output JSONs Directory:   {jsons_dir}")
    print(f"Summary Metrics JSON:     {summary_path}")
    print(f"Detailed CSV Manifest:    {df_path}")
    print("=" * 60)


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Evaluate on test videos and export predictions + videos + JSONs")
    parser.add_argument("--manifest", type=str, default=os.path.join(project_root, "data", "faceforensics_manifest.csv"),
                        help="Path to manifest CSV")
    parser.add_argument("--split", type=str, default="test", help="Split to evaluate on (test, val, train)")
    parser.add_argument("--output_dir", type=str, default=os.path.join(project_root, "outputs", "testing_predictions"),
                        help="Output directory for predictions, annotated videos and JSONs")
    parser.add_argument("--limit", type=int, default=None, help="Optional max videos to process")
    args = parser.parse_args()

    manifest_entries = []
    if os.path.exists(args.manifest):
        print(f"Loading test dataset from manifest: {args.manifest} (split='{args.split}')")
        df = pd.read_csv(args.manifest)
        if "split" in df.columns:
            df = df[df["split"] == args.split]
        if args.limit:
            df = df.head(args.limit)
        for _, row in df.iterrows():
            raw_path = str(row["local_path"]) if "local_path" in row and pd.notna(row["local_path"]) else str(row["path"])
            vid_path = os.path.join(project_root, raw_path) if not os.path.isabs(raw_path) else raw_path
            manip = str(row.get("manipulation_type", "real" if int(row["label"]) == 0 else "fake"))
            vid_id = str(row["video_id"])
            unique_id = f"{len(manifest_entries):03d}_{manip}_{vid_id}"
            manifest_entries.append({
                "video_id": unique_id,
                "label": int(row["label"]),
                "ground_truth": "FAKE" if int(row["label"]) == 1 else "REAL",
                "manipulation_type": manip,
                "path": vid_path
            })
        print(f"Loaded {len(manifest_entries)} videos from manifest.")
    else:
        test_dir = os.path.join(project_root, "data", "test_samples_500")
        manifest_entries = ensure_test_videos(test_dir, num_real=250, num_fake=250)

    process_and_export_all(manifest_entries, args.output_dir)
