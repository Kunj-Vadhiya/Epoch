"""EfficientNet-B0 Model for Deepfake Detection.

Features ImageNet pretrained weights, custom 2-class head (0=REAL, 1=FAKE),
and phased unfreezing for high-efficiency transfer learning.
"""

from typing import Tuple, Optional
import os
import torch
import torch.nn as nn
from torchvision.models import efficientnet_b0, EfficientNet_B0_Weights
try:
    from src.utils import setup_logger
except (ImportError, ModuleNotFoundError):
    from .utils import setup_logger

logger = setup_logger(__name__)


class DeepfakeDetectorModel(nn.Module):
    """EfficientNet-B0 based deepfake frame classifier with phased fine-tuning capability."""

    def __init__(
        self,
        pretrained: bool = True,
        dropout: float = 0.3,
        num_classes: int = 2
    ):
        super().__init__()
        try:
            weights = EfficientNet_B0_Weights.DEFAULT if pretrained else None
            self.backbone = efficientnet_b0(weights=weights)
        except Exception as e:
            logger.warning("Failed to load pretrained EfficientNet weights (%s). Initializing without pretraining.", str(e))
            self.backbone = efficientnet_b0(weights=None)

        # Replace classification head
        in_features = self.backbone.classifier[1].in_features
        self.backbone.classifier = nn.Sequential(
            nn.Dropout(p=dropout, inplace=True),
            nn.Linear(in_features, num_classes)
        )
        self.num_classes = num_classes

    def freeze_backbone(self) -> None:
        """Freezes all backbone feature extractor layers, leaving only classifier head trainable."""
        for param in self.backbone.features.parameters():
            param.requires_grad = False
        for param in self.backbone.classifier.parameters():
            param.requires_grad = True
        logger.info("Backbone frozen. Only classification head is trainable.")

    def unfreeze_top_blocks(self, num_blocks: int = 2) -> None:
        """Unfreezes the last `num_blocks` feature blocks of the backbone for fine-tuning."""
        total_blocks = len(self.backbone.features)
        start_idx = max(0, total_blocks - num_blocks)

        # Keep earlier layers frozen
        for i in range(start_idx):
            for param in self.backbone.features[i].parameters():
                param.requires_grad = False

        # Unfreeze top feature blocks
        for i in range(start_idx, total_blocks):
            for param in self.backbone.features[i].parameters():
                param.requires_grad = True

        for param in self.backbone.classifier.parameters():
            param.requires_grad = True

        logger.info("Unfrozen top %d backbone feature blocks (indices %d to %d).", num_blocks, start_idx, total_blocks - 1)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Forward pass for a batch of frames.
        Args:
            x: Tensor of shape (B, 3, 224, 224).
        Returns:
            logits: Tensor of shape (B, 2).
        """
        return self.backbone(x)

    def predict_frames(self, x: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        """
        Predicts class probabilities for frames.
        Returns (fake_probabilities, class_predictions).
        """
        logits = self.forward(x)
        probs = torch.softmax(logits, dim=1)
        fake_probs = probs[:, 1]
        preds = torch.argmax(probs, dim=1)
        return fake_probs, preds


def build_model(
    pretrained: bool = True,
    dropout: float = 0.3,
    device: Optional[torch.device] = None
) -> DeepfakeDetectorModel:
    """Builds and returns the DeepfakeDetectorModel on specified device."""
    model = DeepfakeDetectorModel(pretrained=pretrained, dropout=dropout)
    if device is not None:
        model.to(device)
    return model


def load_model(
    checkpoint_path: str,
    device: Optional[torch.device] = None
) -> DeepfakeDetectorModel:
    """Loads model from a saved state dictionary checkpoint."""
    if not os.path.exists(checkpoint_path):
        raise FileNotFoundError(f"Model checkpoint not found at: {checkpoint_path}")

    model = DeepfakeDetectorModel(pretrained=False)
    try:
        state_dict = torch.load(checkpoint_path, map_location=device or torch.device("cpu"), weights_only=True)
    except TypeError:
        state_dict = torch.load(checkpoint_path, map_location=device or torch.device("cpu"))
    model.load_state_dict(state_dict)
    if device is not None:
        model.to(device)
    model.eval()
    logger.info("Successfully loaded model checkpoint from %s", checkpoint_path)
    return model
