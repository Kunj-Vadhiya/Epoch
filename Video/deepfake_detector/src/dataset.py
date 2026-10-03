"""Dataset and Data Loading Pipelines for Deepfake Video Detection.

Implements PyTorch Dataset for sampled video frames with lightweight augmentations,
schema inspection, and on-demand video downloading.
"""

import os
import json
from typing import Dict, Any, List, Optional, Tuple, Union
import numpy as np
import pandas as pd
import torch
from torch.utils.data import Dataset
from torchvision import transforms
from PIL import Image

try:
    from src.video_processor import VideoProcessor
    from src.utils import setup_logger
except (ImportError, ModuleNotFoundError):
    from .video_processor import VideoProcessor
    from .utils import setup_logger

logger = setup_logger(__name__)


def inspect_dataset_schema(sample: Dict[str, Any]) -> Dict[str, Any]:
    """
    Inspects and automatically detects fields in a Hugging Face dataset sample.

    Args:
        sample: A dictionary representing a single record from the dataset.

    Returns:
        schema_info: Detected field names and metadata types.
    """
    keys = list(sample.keys())
    schema_info = {
        "all_keys": keys,
        "video_field": None,
        "hf_path_field": None,
        "label_field": None,
        "subject_field": None,
        "dataset_source_field": None,
        "duration_field": None,
        "original_metadata": None
    }

    # Detect video representation
    if "video" in sample:
        schema_info["video_field"] = "video"
    if "hf_path" in sample:
        schema_info["hf_path_field"] = "hf_path"
    elif "filepath" in sample:
        schema_info["hf_path_field"] = "filepath"

    # Detect label field
    for l_cand in ["label", "target", "class", "is_fake"]:
        if l_cand in sample:
            schema_info["label_field"] = l_cand
            break

    # Detect dataset source
    if "dataset_source" in sample:
        schema_info["dataset_source_field"] = "dataset_source"

    # Inspect original_metadata or top-level keys for subject/identity
    if "original_metadata" in sample:
        orig = sample["original_metadata"]
        if isinstance(orig, str):
            try:
                orig = json.loads(orig)
            except Exception:
                orig = {}
        schema_info["original_metadata"] = orig
        for s_cand in ["subject_id", "subject", "actor", "person_id", "identity"]:
            if isinstance(orig, dict) and s_cand in orig:
                schema_info["subject_field"] = f"original_metadata.{s_cand}"
                break

    for s_cand in ["subject_id", "subject", "identity"]:
        if s_cand in sample:
            schema_info["subject_field"] = s_cand
            break

    logger.info("=== Dataset Schema Inspection ===")
    logger.info("Available Keys: %s", keys)
    logger.info("Video field: %s", schema_info["video_field"])
    logger.info("HF Path field: %s", schema_info["hf_path_field"])
    logger.info("Label field: %s", schema_info["label_field"])
    logger.info("Subject field: %s", schema_info["subject_field"])
    logger.info("Dataset Source field: %s", schema_info["dataset_source_field"])

    return schema_info


def parse_label(label_val: Any) -> int:
    """Parses label value into binary integer (0=REAL, 1=FAKE)."""
    if isinstance(label_val, str):
        label_str = label_val.strip().lower()
        if label_str in ["fake", "synthetic", "manipulated", "1"]:
            return 1
        return 0
    elif isinstance(label_val, (int, float, bool)):
        return 1 if int(label_val) == 1 else 0
    return 0


def get_transforms(split: str = "train", target_size: Tuple[int, int] = (224, 224)) -> transforms.Compose:
    """
    Returns torchvision transforms for training vs validation/testing.
    Training uses lightweight augmentations (flip, mild jitter, slight rotation)
    to preserve subtle digital manipulation artifacts.
    """
    mean = [0.485, 0.456, 0.406]
    std = [0.229, 0.224, 0.225]

    if split == "train":
        return transforms.Compose([
            transforms.ToPILImage(),
            transforms.RandomHorizontalFlip(p=0.5),
            transforms.RandomRotation(degrees=10),
            transforms.ColorJitter(brightness=0.1, contrast=0.1, saturation=0.1, hue=0.05),
            transforms.Resize(target_size),
            transforms.ToTensor(),
            transforms.Normalize(mean=mean, std=std)
        ])
    else:
        return transforms.Compose([
            transforms.ToPILImage(),
            transforms.Resize(target_size),
            transforms.ToTensor(),
            transforms.Normalize(mean=mean, std=std)
        ])


class DeepfakeVideoDataset(Dataset):
    """
    PyTorch Dataset that loads pre-extracted video frames or processes local video files on the fly.
    Returns:
        frames_tensor: Tensor of shape (num_frames, 3, 224, 224)
        label: Int (0 = REAL, 1 = FAKE)
        video_id: str
    """

    def __init__(
        self,
        manifest_records: Union[List[Dict[str, Any]], pd.DataFrame, str],
        split: str = "train",
        video_processor: Optional[VideoProcessor] = None,
        target_size: Tuple[int, int] = (224, 224)
    ):
        if isinstance(manifest_records, str):
            if not os.path.exists(manifest_records):
                raise FileNotFoundError(f"Manifest CSV not found at: {manifest_records}")
            df = pd.read_csv(manifest_records)
            records = df.to_dict(orient="records")
        elif isinstance(manifest_records, pd.DataFrame):
            records = manifest_records.to_dict(orient="records")
        else:
            records = list(manifest_records)

        self.records = [r for r in records if r.get("split") == split]
        self.split = split
        self.video_processor = video_processor or VideoProcessor(num_frames=8, target_size=target_size)
        self.transform = get_transforms(split=split, target_size=target_size)

    def __len__(self) -> int:
        return len(self.records)

    def __getitem__(self, idx: int) -> Dict[str, Any]:
        record = self.records[idx]
        video_path = record.get("local_path", "")
        label = int(record.get("label", 0))
        video_id = str(record.get("video_id", f"vid_{idx}"))

        # Process video to extract 8 uniform frames
        frames_np, meta, info = self.video_processor.process_video(video_path)

        # Apply transforms to each frame
        transformed_frames = []
        for frame in frames_np:
            transformed = self.transform(frame)
            transformed_frames.append(transformed)

        # Stack into (num_frames, C, H, W)
        frames_tensor = torch.stack(transformed_frames)

        return {
            "frames": frames_tensor,
            "label": torch.tensor(label, dtype=torch.long),
            "video_id": video_id,
            "metadata": meta,
            "video_info": info
        }
