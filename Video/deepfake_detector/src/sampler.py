"""Balanced Streaming Sampler for Hugging Face Deepfake Videos.

Deterministically samples balanced real and fake videos from streaming shuffle buffer,
implements subject-level or video-level train/val/test splitting,
and saves the reproducible sample manifest.
"""

import os
import csv
import random
from typing import Dict, Any, List, Optional, Tuple
import pandas as pd

try:
    from src.dataset import inspect_dataset_schema, parse_label
    from src.video_processor import create_synthetic_video
    from src.utils import setup_logger, set_seed
except (ImportError, ModuleNotFoundError):
    from .dataset import inspect_dataset_schema, parse_label
    from .video_processor import create_synthetic_video
    from .utils import setup_logger, set_seed

logger = setup_logger(__name__)


class StreamingDatasetSampler:
    """Samples a balanced subset of real/fake videos from streaming dataset and generates split manifest."""

    def __init__(
        self,
        dataset_name: str = "belkhir-nacim/deepfake-videos",
        seed: int = 42,
        fast_mode: bool = True,
        num_real: Optional[int] = None,
        num_fake: Optional[int] = None,
        shuffle_buffer_size: int = 10000,
        cache_dir: str = "data/raw_samples",
        manifest_path: str = "data/sample_manifest.csv"
    ):
        self.dataset_name = dataset_name
        self.seed = seed
        self.fast_mode = fast_mode
        self.shuffle_buffer_size = shuffle_buffer_size
        self.cache_dir = cache_dir
        self.manifest_path = manifest_path

        # Determine target counts
        if fast_mode:
            self.target_real = num_real if num_real is not None else 400
            self.target_fake = num_fake if num_fake is not None else 400
        else:
            self.target_real = num_real if num_real is not None else 500
            self.target_fake = num_fake if num_fake is not None else 500

        self.total_target = self.target_real + self.target_fake
        os.makedirs(self.cache_dir, exist_ok=True)
        os.makedirs(os.path.dirname(self.manifest_path), exist_ok=True)

    def sample_from_hf_stream(self, hf_token: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Connects to Hugging Face streaming dataset, shuffles with seed,
        and streams samples until target counts are reached.
        """
        from datasets import load_dataset

        set_seed(self.seed)
        logger.info(
            "Initializing streaming connection to %s (Target Real: %d, Fake: %d, Buffer: %d)",
            self.dataset_name, self.target_real, self.target_fake, self.shuffle_buffer_size
        )

        try:
            stream = load_dataset(
                self.dataset_name,
                split="train",
                streaming=True,
                token=hf_token
            )
            shuffled_stream = stream.shuffle(seed=self.seed, buffer_size=self.shuffle_buffer_size)
        except Exception as e:
            logger.error("Failed to connect to Hugging Face dataset stream: %s", str(e))
            raise e

        real_samples: List[Dict[str, Any]] = []
        fake_samples: List[Dict[str, Any]] = []
        schema_checked = False

        for idx, sample in enumerate(shuffled_stream):
            if not schema_checked:
                inspect_dataset_schema(sample)
                schema_checked = True

            # Extract label
            raw_label = sample.get("label", sample.get("target", "real"))
            label = parse_label(raw_label)

            video_id = str(sample.get("id", sample.get("hf_path", f"vid_{idx}")))
            hf_path = sample.get("hf_path", sample.get("filepath", None))
            dataset_source = sample.get("dataset_source", "unknown")

            # Extract subject ID if available
            subject_id = None
            if "original_metadata" in sample:
                meta = sample["original_metadata"]
                if isinstance(meta, dict):
                    subject_id = meta.get("subject_id") or meta.get("identity")
            if not subject_id and "subject_id" in sample:
                subject_id = sample["subject_id"]

            record = {
                "video_id": video_id,
                "label": label,
                "raw_label": raw_label,
                "hf_path": hf_path,
                "dataset_source": dataset_source,
                "subject_id": subject_id or "unknown",
                "duration": sample.get("duration", None)
            }

            if label == 0 and len(real_samples) < self.target_real:
                # Download single video on-demand if hf_path exists
                local_path = self._download_sample_video(hf_path, video_id, hf_token)
                record["local_path"] = local_path
                real_samples.append(record)
                if len(real_samples) % 50 == 0:
                    logger.info("Sampled Real Videos: %d / %d", len(real_samples), self.target_real)

            elif label == 1 and len(fake_samples) < self.target_fake:
                local_path = self._download_sample_video(hf_path, video_id, hf_token)
                record["local_path"] = local_path
                fake_samples.append(record)
                if len(fake_samples) % 50 == 0:
                    logger.info("Sampled Fake Videos: %d / %d", len(fake_samples), self.target_fake)

            if len(real_samples) >= self.target_real and len(fake_samples) >= self.target_fake:
                break

        all_samples = real_samples + fake_samples
        return self._assign_splits(all_samples)

    def _download_sample_video(self, hf_path: Optional[str], video_id: str, hf_token: Optional[str]) -> str:
        """Downloads single video via hf_hub_download or caches locally."""
        if not hf_path:
            # Fallback path if streaming already provides path
            return ""

        clean_name = os.path.basename(hf_path)
        dest_path = os.path.join(self.cache_dir, f"{video_id}_{clean_name}")

        if os.path.exists(dest_path):
            return dest_path

        try:
            from huggingface_hub import hf_hub_download
            downloaded_path = hf_hub_download(
                repo_id=self.dataset_name,
                filename=hf_path,
                repo_type="dataset",
                token=hf_token,
                local_dir=self.cache_dir
            )
            return downloaded_path
        except Exception as e:
            logger.warning("Could not download %s: %s", hf_path, str(e))
            return dest_path

    def _assign_splits(self, samples: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Assigns train (80%), validation (10%), test (10%) splits.
        Uses subject-level grouping if subjects are identified; otherwise performs balanced video-level split.
        """
        random.seed(self.seed)

        # Check if subject IDs are distinct and available
        subjects = [s.get("subject_id") for s in samples if s.get("subject_id") != "unknown"]
        has_subject_info = len(subjects) > (0.5 * len(samples))

        if has_subject_info:
            logger.info("Subject IDs identified. Performing subject-level split to prevent identity leakage.")
            # Group by subject
            subject_to_samples: Dict[str, List[Dict[str, Any]]] = {}
            for s in samples:
                sid = s.get("subject_id", "unknown")
                subject_to_samples.setdefault(sid, []).append(s)

            unique_subjects = list(subject_to_samples.keys())
            random.shuffle(unique_subjects)

            n_train_sub = int(len(unique_subjects) * 0.80)
            n_val_sub = int(len(unique_subjects) * 0.10)

            train_subs = set(unique_subjects[:n_train_sub])
            val_subs = set(unique_subjects[n_train_sub:n_train_sub + n_val_sub])

            for s in samples:
                sid = s.get("subject_id")
                if sid in train_subs:
                    s["split"] = "train"
                elif sid in val_subs:
                    s["split"] = "val"
                else:
                    s["split"] = "test"
        else:
            logger.info("Subject IDs not available across dataset. Performing balanced video-level split.")
            real_samples = [s for s in samples if s["label"] == 0]
            fake_samples = [s for s in samples if s["label"] == 1]

            random.shuffle(real_samples)
            random.shuffle(fake_samples)

            def split_list(lst: List[Dict[str, Any]]) -> None:
                n = len(lst)
                n_train = int(n * 0.80)
                n_val = int(n * 0.10)
                for i, item in enumerate(lst):
                    if i < n_train:
                        item["split"] = "train"
                    elif i < n_train + n_val:
                        item["split"] = "val"
                    else:
                        item["split"] = "test"

            split_list(real_samples)
            split_list(fake_samples)

        return samples

    def save_manifest(self, samples: List[Dict[str, Any]]) -> str:
        """Saves sample manifest to CSV."""
        df = pd.DataFrame(samples)
        cols_to_save = ["video_id", "label", "split", "subject_id", "duration", "dataset_source", "local_path"]
        available_cols = [c for c in cols_to_save if c in df.columns]
        df[available_cols].to_csv(self.manifest_path, index=False)
        logger.info("Saved dataset manifest with %d records to %s", len(df), self.manifest_path)
        return self.manifest_path

    def generate_synthetic_dataset_for_testing(self, count_per_class: int = 10) -> List[Dict[str, Any]]:
        """
        Generates synthetic video dataset locally for unit testing, offline smoke tests,
        and validating the complete ML training pipeline without network calls.
        """
        logger.info("Generating synthetic verification dataset (%d real, %d fake)...", count_per_class, count_per_class)
        samples: List[Dict[str, Any]] = []

        def get_split_name(idx: int, total: int) -> str:
            if total <= 3:
                return "train"
            if total <= 5:
                return "train" if idx < (total - 2) else ("val" if idx == (total - 2) else "test")
            n_tr = int(total * 0.80)
            n_va = max(1, int(total * 0.10))
            if idx < n_tr:
                return "train"
            elif idx < n_tr + n_va:
                return "val"
            else:
                return "test"

        for i in range(count_per_class):
            split_name = get_split_name(i, count_per_class)

            # Real sample
            real_id = f"syn_real_{i:04d}"
            real_path = os.path.join(self.cache_dir, f"{real_id}.mp4")
            create_synthetic_video(real_path, num_frames=20, is_fake=False)
            samples.append({
                "video_id": real_id,
                "label": 0,
                "split": split_name,
                "subject_id": f"actor_{i % 5}",
                "duration": 0.8,
                "dataset_source": "synthetic_test",
                "local_path": real_path
            })

            # Fake sample
            fake_id = f"syn_fake_{i:04d}"
            fake_path = os.path.join(self.cache_dir, f"{fake_id}.mp4")
            create_synthetic_video(fake_path, num_frames=20, is_fake=True)
            samples.append({
                "video_id": fake_id,
                "label": 1,
                "split": split_name,
                "subject_id": f"actor_{i % 5}",
                "duration": 0.8,
                "dataset_source": "synthetic_test",
                "local_path": fake_path
            })

        self.save_manifest(samples)
        return samples
