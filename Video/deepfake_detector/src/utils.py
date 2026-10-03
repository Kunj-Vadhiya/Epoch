"""Utility functions for Deepfake Scam Ad Detector.

Hardware detection, seed management, configuration loading, and logging.
"""

import os
import random
import logging
from typing import Dict, Any, Optional
import yaml
import numpy as np
import torch


def setup_logger(name: str = "deepfake_detector", log_level: int = logging.INFO) -> logging.Logger:
    """Configures and returns a standardized logger."""
    logger = logging.getLogger(name)
    if not logger.handlers:
        logger.setLevel(log_level)
        ch = logging.StreamHandler()
        ch.setLevel(log_level)
        formatter = logging.Formatter(
            "[%(asctime)s] [%(levelname)s] [%(filename)s:%(lineno)d] %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S"
        )
        ch.setFormatter(formatter)
        logger.addHandler(ch)
    return logger


logger = setup_logger()


def set_seed(seed: int = 42) -> None:
    """Sets deterministic seeds across Python, NumPy, and PyTorch for reproducibility."""
    random.seed(seed)
    os.environ["PYTHONHASHSEED"] = str(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed(seed)
        torch.cuda.manual_seed_all(seed)
        torch.backends.cudnn.deterministic = True
        torch.backends.cudnn.benchmark = False
    logger.info("Deterministic seed set to %d", seed)


def detect_environment() -> Dict[str, Any]:
    """Inspects compute hardware: GPU availability, device name, and memory."""
    info = {
        "cuda_available": torch.cuda.is_available(),
        "device": "cuda" if torch.cuda.is_available() else "cpu",
        "gpu_name": None,
        "gpu_memory_gb": None,
        "amp_supported": False
    }

    if torch.cuda.is_available():
        device_id = 0
        info["gpu_name"] = torch.cuda.get_device_name(device_id)
        props = torch.cuda.get_device_properties(device_id)
        info["gpu_memory_gb"] = round(props.total_memory / (1024 ** 3), 2)
        info["amp_supported"] = True
        logger.info(
            "CUDA Available: True | Device: %s | VRAM: %.2f GB | Mixed Precision: Enabled",
            info["gpu_name"],
            info["gpu_memory_gb"]
        )
    else:
        logger.warning("CUDA Not Available. Running on CPU mode.")

    return info


def load_config(config_path: Optional[str] = None) -> Dict[str, Any]:
    """Loads YAML configuration file."""
    if config_path is None:
        # Default relative to this file
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        config_path = os.path.join(base_dir, "configs", "config.yaml")

    if not os.path.exists(config_path):
        raise FileNotFoundError(f"Configuration file not found at: {config_path}")

    with open(config_path, "r", encoding="utf-8") as f:
        config = yaml.safe_load(f)

    return config
