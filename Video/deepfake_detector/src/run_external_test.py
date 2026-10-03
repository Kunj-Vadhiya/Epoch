"""External and Unseen Real-World Video Evaluation Suite.

Evaluates completely new, unseen real-world videos in data/external_test/
that were NEVER part of the training dataset, demonstrating true generalization
across unseen identities, compression artifacts, and novel video domains.
"""

from typing import List, Dict, Any
import os
import sys
import json
import pandas as pd
from tqdm import tqdm

project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from src.inference import predict_video
from src.utils import setup_logger

logger = setup_logger(__name__)


def evaluate_external_folder(
    external_dir: str = os.path.join(project_root, "data", "external_test"),
    output_report_path: str = os.path.join(project_root, "outputs", "external_test_report.json")
) -> Dict[str, Any]:
    """
    Runs predict_video on all video files in external_dir and compiles results.
    """
    os.makedirs(external_dir, exist_ok=True)
    os.makedirs(os.path.dirname(os.path.abspath(output_report_path)), exist_ok=True)

    supported_exts = (".mp4", ".mov", ".avi", ".webm", ".mkv")
    video_files = [f for f in os.listdir(external_dir) if f.lower().endswith(supported_exts)]

    if not video_files:
        logger.warning("No video files found in %s to evaluate.", external_dir)
        return {"status": "no_videos", "total_evaluated": 0, "results": []}

    print(f"\nEvaluating {len(video_files)} unseen videos from: {external_dir}")
    results = []

    for vf in tqdm(video_files, desc="Evaluating Unseen Videos"):
        full_path = os.path.join(external_dir, vf)
        gt = "UNKNOWN"
        if "real" in vf.lower():
            gt = "REAL"
        elif "fake" in vf.lower() or "deepfake" in vf.lower():
            gt = "FAKE"

        try:
            pred_dict = predict_video(full_path)
            res_entry = {
                "video_name": vf,
                "ground_truth": gt,
                "prediction": pred_dict["prediction"],
                "deepfake_label": pred_dict["deepfake"]["label"],
                "real_probability": pred_dict["deepfake"]["real_probability"],
                "fake_probability": pred_dict["deepfake"]["probability"],
                "confidence": pred_dict["confidence"],
                "uncertainty": pred_dict["uncertainty"],
                "scam_signals": pred_dict["scam"]["matched_signals"]
            }
            results.append(res_entry)
        except Exception as e:
            logger.error("Error evaluating unseen video %s: %s", vf, str(e))
            results.append({
                "video_name": vf,
                "ground_truth": gt,
                "prediction": "ERROR",
                "error": str(e)
            })

    # Summary table
    df = pd.DataFrame(results)
    csv_path = output_report_path.replace(".json", ".csv")
    df.to_csv(csv_path, index=False)

    report = {
        "external_directory": external_dir,
        "total_evaluated": len(results),
        "results": results,
        "summary_csv": csv_path
    }

    with open(output_report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    print("\n" + "=" * 60)
    print("UNSEEN EXTERNAL VIDEO EVALUATION SUMMARY")
    print("=" * 60)
    print(df[["video_name", "ground_truth", "prediction", "fake_probability", "confidence"]].to_string())
    print("=" * 60)
    print(f"Report saved to: {output_report_path}")

    return report


if __name__ == "__main__":
    evaluate_external_folder()
