"""FaceForensics++ C23 Balanced Streamer and Downloader.

Streams and extracts videos directly from Hugging Face repository
'bitmind/FaceForensicsC23' via HTTP range requests without downloading the entire 17.9GB zip archive.
Supports balanced sampling of Real and Fake videos across manipulation categories:
- DeepFakes
- Face2Face
- FaceShifter
- FaceSwap
- NeuralTextures
- DeepFakeDetection
"""

import os
import sys
import zlib
import struct
import random
import requests
import pandas as pd
from typing import List, Dict, Any, Optional
from concurrent.futures import ThreadPoolExecutor, as_completed
from tqdm import tqdm

project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from src.utils import setup_logger, set_seed

logger = setup_logger(__name__)

HF_ZIP_URL = "https://huggingface.co/datasets/bitmind/FaceForensicsC23/resolve/main/FaceForensics%2B%2B_C23.zip"
CD_OFFSET = 17882948910
CD_SIZE = 899067


class FaceForensicsStreamer:
    """Manages selective remote streaming and extraction of FaceForensics++ C23 videos."""

    def __init__(
        self,
        cache_dir: str = "data/faceforensics_c23",
        manifest_path: str = "data/faceforensics_manifest.csv",
        hf_token: Optional[str] = None
    ):
        self.cache_dir = os.path.abspath(cache_dir)
        self.manifest_path = os.path.abspath(manifest_path)
        self.hf_token = hf_token or os.environ.get("HF_TOKEN")
        self.headers = {"User-Agent": "Antigravity-DeepfakeDetector"}
        if self.hf_token:
            self.headers["Authorization"] = f"Bearer {self.hf_token}"

        os.makedirs(self.cache_dir, exist_ok=True)
        os.makedirs(os.path.dirname(self.manifest_path), exist_ok=True)

    def fetch_catalog(self) -> List[Dict[str, Any]]:
        """Fetches and parses the central directory catalog of all 7,009 entries."""
        logger.info("Fetching remote ZIP central directory (899 KB)...")
        headers = self.headers.copy()
        headers["Range"] = f"bytes={CD_OFFSET}-{CD_OFFSET + CD_SIZE - 1}"

        resp = requests.get(HF_ZIP_URL, headers=headers, timeout=30)
        resp.raise_for_status()
        cd_data = resp.content

        entries = []
        pos = 0
        while pos < len(cd_data) and cd_data[pos : pos + 4] == b"\x50\x4b\x01\x02":
            header = cd_data[pos : pos + 46]
            sig, vm, vn, flags, comp, mtime, mdate, crc, comp_size, uncomp_size, fn_len, extra_len, comm_len, disk, int_attr, ext_attr, local_hdr_off = struct.unpack(
                "<IHHHHHHIIIHHHHHII", header
            )
            fn = cd_data[pos + 46 : pos + 46 + fn_len].decode("utf-8", errors="ignore")
            extra = cd_data[pos + 46 + fn_len : pos + 46 + fn_len + extra_len]

            if local_hdr_off == 0xFFFFFFFF:
                e_pos = 0
                while e_pos < len(extra):
                    tag, block_sz = struct.unpack("<HH", extra[e_pos : e_pos + 4])
                    if tag == 1:
                        val_pos = e_pos + 4
                        if uncomp_size == 0xFFFFFFFF:
                            uncomp_size = struct.unpack("<Q", extra[val_pos : val_pos + 8])[0]
                            val_pos += 8
                        if comp_size == 0xFFFFFFFF:
                            comp_size = struct.unpack("<Q", extra[val_pos : val_pos + 8])[0]
                            val_pos += 8
                        if local_hdr_off == 0xFFFFFFFF:
                            local_hdr_off = struct.unpack("<Q", extra[val_pos : val_pos + 8])[0]
                            val_pos += 8
                        break
                    e_pos += 4 + block_sz

            if fn.endswith(".mp4"):
                is_fake = "/fake/" in fn.lower()
                manipulation_type = "real"
                if is_fake:
                    parts = fn.split("/")
                    manipulation_type = parts[2] if len(parts) >= 3 else "unknown_fake"

                entries.append({
                    "filename": fn,
                    "comp_size": comp_size,
                    "uncomp_size": uncomp_size,
                    "offset": local_hdr_off,
                    "comp_method": comp,
                    "is_fake": is_fake,
                    "manipulation_type": manipulation_type
                })

            pos += 46 + fn_len + extra_len + comm_len

        logger.info("Catalog parsed: %d total video entries found.", len(entries))
        return entries

    def select_balanced_subset(
        self,
        catalog: List[Dict[str, Any]],
        num_real: int = 500,
        num_fake: int = 500,
        seed: int = 42
    ) -> List[Dict[str, Any]]:
        """Selects balanced real and fake entries, distributing fake samples evenly across manipulation types."""
        random.seed(seed)
        real_all = [e for e in catalog if not e["is_fake"]]
        fake_all = [e for e in catalog if e["is_fake"]]

        random.shuffle(real_all)
        selected_real = real_all[:num_real]

        # Group fakes by manipulation type
        fake_by_cat: Dict[str, List[Dict[str, Any]]] = {}
        for f in fake_all:
            fake_by_cat.setdefault(f["manipulation_type"], []).append(f)

        for cat in fake_by_cat:
            random.shuffle(fake_by_cat[cat])

        # Distribute fake target evenly across categories
        cats = list(fake_by_cat.keys())
        per_cat = num_fake // len(cats)
        remainder = num_fake % len(cats)

        selected_fake = []
        for i, cat in enumerate(cats):
            count = per_cat + (1 if i < remainder else 0)
            selected_fake.extend(fake_by_cat[cat][:count])

        logger.info(
            "Selected %d Real videos and %d Fake videos across %d categories (%s).",
            len(selected_real), len(selected_fake), len(cats), ", ".join(cats)
        )
        return selected_real + selected_fake

    def download_video_entry(self, entry: Dict[str, Any]) -> str:
        """Downloads and extracts a single video file via HTTP Range request."""
        fn = entry["filename"]
        clean_name = os.path.basename(fn)
        subfolder = "fake" if entry["is_fake"] else "real"
        cat_dir = os.path.join(self.cache_dir, subfolder, entry["manipulation_type"])
        os.makedirs(cat_dir, exist_ok=True)
        dest_path = os.path.join(cat_dir, clean_name)

        if os.path.exists(dest_path) and os.path.getsize(dest_path) > 0:
            return dest_path

        req_start = entry["offset"]
        req_len = 30 + 1024 + entry["comp_size"]

        headers = self.headers.copy()
        headers["Range"] = f"bytes={req_start}-{req_start + req_len - 1}"

        for attempt in range(5):
            try:
                resp = requests.get(HF_ZIP_URL, headers=headers, timeout=45)
                resp.raise_for_status()
                blob = resp.content

                sig, vm, flags, comp, mtime, mdate, crc, c_sz, u_sz, f_len, ex_len = struct.unpack("<IHHHHHIIIHH", blob[:30])
                data_start = 30 + f_len + ex_len
                raw = blob[data_start : data_start + entry["comp_size"]]

                if entry["comp_method"] == 8:
                    data = zlib.decompress(raw, -15)
                else:
                    data = raw

                with open(dest_path, "wb") as f:
                    f.write(data)

                return dest_path
            except Exception as e:
                if attempt == 4:
                    raise e
                time.sleep(1.5 * (attempt + 1))

        return dest_path

    def download_dataset(
        self,
        selected_entries: List[Dict[str, Any]],
        max_workers: int = 8
    ) -> List[Dict[str, Any]]:
        """Downloads all selected videos in parallel and creates a manifest."""
        logger.info("Downloading %d videos using %d parallel worker threads...", len(selected_entries), max_workers)

        downloaded_records = []
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            future_to_entry = {executor.submit(self.download_video_entry, e): e for e in selected_entries}

            pbar = tqdm(as_completed(future_to_entry), total=len(selected_entries), desc="Downloading FaceForensics Videos", unit="video")
            for future in pbar:
                entry = future_to_entry[future]
                try:
                    local_path = future.result()
                    downloaded_records.append({
                        "video_id": os.path.splitext(os.path.basename(local_path))[0],
                        "label": 1 if entry["is_fake"] else 0,
                        "ground_truth": "FAKE" if entry["is_fake"] else "REAL",
                        "manipulation_type": entry["manipulation_type"],
                        "dataset_source": "FaceForensicsC23",
                        "local_path": os.path.relpath(local_path, project_root).replace("\\", "/")
                    })
                except Exception as ex:
                    logger.warning("Failed to download %s: %s", entry["filename"], str(ex))

        # Assign exactly 500 Train and 500 Test splits (when 1000 total videos)
        random.seed(42)
        real_recs = [r for r in downloaded_records if r["label"] == 0]
        fake_recs = [r for r in downloaded_records if r["label"] == 1]
        random.shuffle(real_recs)
        random.shuffle(fake_recs)

        for group in (real_recs, fake_recs):
            n = len(group)
            if n >= 500:
                # 250 Test, 225 Train, 25 Val per class -> 500 Test, 450 Train, 50 Val (500 Training phase)
                n_test = 250
                n_val = 25
                for i, r in enumerate(group):
                    if i < n_test:
                        r["split"] = "test"
                    elif i < n_test + n_val:
                        r["split"] = "val"
                    else:
                        r["split"] = "train"
            else:
                n_tr = int(n * 0.50)
                n_va = int(n * 0.10)
                for i, r in enumerate(group):
                    if i < n_tr:
                        r["split"] = "train"
                    elif i < n_tr + n_va:
                        r["split"] = "val"
                    else:
                        r["split"] = "test"

        all_manifest = real_recs + fake_recs
        df = pd.DataFrame(all_manifest)
        df.to_csv(self.manifest_path, index=False)
        logger.info(
            "Saved FaceForensics manifest with %d videos to %s (Train=%d, Val=%d, Test=%d)",
            len(df), self.manifest_path,
            sum(1 for r in all_manifest if r["split"] == "train"),
            sum(1 for r in all_manifest if r["split"] == "val"),
            sum(1 for r in all_manifest if r["split"] == "test")
        )
        return all_manifest


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Sample and stream FaceForensics++ C23 from Hugging Face.")
    parser.add_argument("--num_real", type=int, default=500, help="Number of Real videos (default: 500).")
    parser.add_argument("--num_fake", type=int, default=500, help="Number of Fake videos (default: 500).")
    parser.add_argument("--workers", type=int, default=8, help="Number of parallel download threads.")
    parser.add_argument("--train", action="store_true", help="Launch training immediately after download.")
    parser.add_argument("--epochs", type=int, default=3, help="Epochs for training.")
    args = parser.parse_args()

    streamer = FaceForensicsStreamer()
    catalog = streamer.fetch_catalog()
    selected = streamer.select_balanced_subset(catalog, num_real=args.num_real, num_fake=args.num_fake)
    manifest = streamer.download_dataset(selected, max_workers=args.workers)

    print("\n" + "=" * 60)
    print("FACEFORENSICS++ C23 DATASET PREPARATION COMPLETE")
    print(f"Total Videos:      {len(manifest)}")
    print(f"Train Split (80%): {sum(1 for m in manifest if m['split'] == 'train')}")
    print(f"Val Split (10%):   {sum(1 for m in manifest if m['split'] == 'val')}")
    print(f"Test Split (10%):  {sum(1 for m in manifest if m['split'] == 'test')}")
    print(f"Manifest File:     {streamer.manifest_path}")
    print("=" * 60)

    if args.train:
        from src.train import main as train_main
        sys.argv = [
            "train.py",
            "--epochs", str(args.epochs),
            "--batch_size", "32"
        ]
        train_main()


if __name__ == "__main__":
    main()
