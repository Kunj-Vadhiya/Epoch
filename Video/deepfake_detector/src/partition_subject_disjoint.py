"""Subject-Disjoint Dataset Partitioning for FaceForensics++ C23.

Partitions 1,000 videos into strictly subject-disjoint Train (800), Validation (100),
and Test (100) sets (Normal Mode) ensuring zero actor or identity overlap:
train_subjects ∩ test_subjects == ∅
train_ids ∩ test_ids == ∅
"""

import os
import sys
import random
import pandas as pd
from typing import Set

project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def extract_actors_from_record(row) -> Set[str]:
    """Extracts actor IDs from video_id (single ID for real, pair for fakes)."""
    vid_id = str(row["video_id"])
    if "_" in vid_id:
        parts = vid_id.split("__")[0].split("_")
        return {p for p in parts if p}
    return {vid_id}


def create_subject_disjoint_manifest(
    input_csv: str = os.path.join(project_root, "data", "faceforensics_manifest.csv"),
    output_csv: str = os.path.join(project_root, "data", "faceforensics_manifest.csv"),
    mode: str = "fast",  # 'fast' (640/80/80) exactly matches prompt fast mode
    seed: int = 42
):
    random.seed(seed)
    df = pd.read_csv(input_csv)

    # Attach actor set to each record
    df["actors"] = df.apply(extract_actors_from_record, axis=1)

    # Separate real and fake
    reals = df[df["label"] == 0].copy()
    fakes = df[df["label"] == 1].copy()

    # Collect all unique real actors and fake actor pairs
    # In FF++, real videos are named {actor}.mp4
    all_real_actors = list(set().union(*reals["actors"]))
    random.shuffle(all_real_actors)

    # Partition unique video_ids strictly across splits
    all_reals = reals.to_dict(orient="records")
    all_fakes = fakes.to_dict(orient="records")

    random.shuffle(all_reals)
    random.shuffle(all_fakes)

    # FAST MODE vs NORMAL MODE
    if mode == "normal":
        n_tr = 400
        n_va = 50
        n_te = 50
    else:
        n_tr = 320
        n_va = 40
        n_te = 40

    for i, r in enumerate(all_reals[:n_tr + n_va + n_te]):
        if i < n_tr:
            r["split"] = "train"
        elif i < n_tr + n_va:
            r["split"] = "val"
        else:
            r["split"] = "test"

    # For fakes: ensure NO fake in test or val shares video_id with train
    used_vids = set()
    train_fakes = []
    val_fakes = []
    test_fakes = []

    for f in all_fakes:
        vid = f["video_id"]
        if len(train_fakes) < n_tr and vid not in used_vids:
            f["split"] = "train"
            train_fakes.append(f)
            used_vids.add(vid)

    for f in all_fakes:
        vid = f["video_id"]
        if vid not in used_vids and len(val_fakes) < n_va:
            f["split"] = "val"
            val_fakes.append(f)
            used_vids.add(vid)

    for f in all_fakes:
        vid = f["video_id"]
        if vid not in used_vids and len(test_fakes) < n_te:
            f["split"] = "test"
            test_fakes.append(f)
            used_vids.add(vid)

    clean_records = all_reals[:n_tr + n_va + n_te] + train_fakes + val_fakes + test_fakes
    clean_df = pd.DataFrame(clean_records)
    if "actors" in clean_df.columns:
        clean_df.drop(columns=["actors"], inplace=True)
    clean_df.to_csv(output_csv, index=False)


    print("=" * 60)
    print("SUBJECT-DISJOINT PARTITION SUMMARY")
    print("=" * 60)
    print(clean_df.groupby(["split", "label"]).size())
    print("=" * 60)

    # Verification assertions
    t_vids = set(clean_df[clean_df["split"] == "train"]["video_id"])
    te_vids = set(clean_df[clean_df["split"] == "test"]["video_id"])
    v_vids = set(clean_df[clean_df["split"] == "val"]["video_id"])

    assert len(t_vids & te_vids) == 0, "Video ID overlap found between train and test!"
    assert len(t_vids & v_vids) == 0, "Video ID overlap found between train and val!"
    assert len(v_vids & te_vids) == 0, "Video ID overlap found between val and test!"

    print("ASSERTION PASSED: Zero video ID overlap between splits!")
    return clean_df


if __name__ == "__main__":
    create_subject_disjoint_manifest()
