"""Visual Feature Extractor using EfficientNet-B0.

Extracts high-level spatial visual representations from 224x224 face crops
using ImageNet-pretrained EfficientNet-B0 with phased layer unfreezing.
"""

from typing import Optional
import torch
import torch.nn as nn
from torchvision.models import efficientnet_b0, EfficientNet_B0_Weights

try:
    from src.utils import setup_logger
except (ImportError, ModuleNotFoundError):
    from .utils import setup_logger

logger = setup_logger(__name__)


class VisualFeatureExtractor(nn.Module):
    """EfficientNet-B0 feature extractor outputting 1280-dim spatial representations."""

    def __init__(self, pretrained: bool = True):
        super().__init__()
        try:
            weights = EfficientNet_B0_Weights.DEFAULT if pretrained else None
            backbone = efficientnet_b0(weights=weights)
        except Exception as e:
            logger.warning("Could not load ImageNet weights (%s). Initializing without pretraining.", str(e))
            backbone = efficientnet_b0(weights=None)

        self.features = backbone.features
        self.avgpool = backbone.avgpool
        self.feature_dim = 1280

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Extracts 1280-dim feature vector.
        Args:
            x: Tensor of shape (B, 3, 224, 224).
        Returns:
            features: Tensor of shape (B, 1280).
        """
        feats = self.features(x)
        pooled = self.avgpool(feats)
        return torch.flatten(pooled, 1)

    def freeze_backbone(self) -> None:
        """Freezes all feature extractor weights."""
        for param in self.features.parameters():
            param.requires_grad = False

    def unfreeze_top_blocks(self, num_blocks: int = 2) -> None:
        """Unfreezes top `num_blocks` feature layers for fine-tuning."""
        total_blocks = len(self.features)
        start_idx = max(0, total_blocks - num_blocks)
        for i in range(start_idx):
            for param in self.features[i].parameters():
                param.requires_grad = False
        for i in range(start_idx, total_blocks):
            for param in self.features[i].parameters():
                param.requires_grad = True
        logger.info("Unfrozen top %d backbone feature blocks.", num_blocks)
