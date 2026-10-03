"""Temporal Deepfake Video Detection Architecture.

Combines 16 temporal face crops via EfficientNet-B0 visual feature extraction
with a 2-layer GRU (hidden_size=256) to learn temporal boundary inconsistencies,
facial jitter, and inter-frame artifacts for robust video-level prediction.
"""

from typing import Tuple, Dict, Any, Optional
import os
import torch
import torch.nn as nn
import torch.nn.functional as F

try:
    from src.visual_model import VisualFeatureExtractor
    from src.utils import setup_logger
except (ImportError, ModuleNotFoundError):
    from .visual_model import VisualFeatureExtractor
    from .utils import setup_logger

logger = setup_logger(__name__)


class DeepfakeVideoModel(nn.Module):
    """
    End-to-end Video-level Deepfake Detector:
    16 Frames -> EfficientNet-B0 -> GRU(256) -> Video Real/Fake Probabilities.
    Also produces frame-level anomaly scores for sparse temporal interval localization.
    """

    def __init__(
        self,
        pretrained: bool = True,
        hidden_size: int = 256,
        num_gru_layers: int = 2,
        dropout: float = 0.3,
        num_classes: int = 2
    ):
        super().__init__()
        self.visual_extractor = VisualFeatureExtractor(pretrained=pretrained)
        self.feature_dim = self.visual_extractor.feature_dim  # 1280

        # GRU for sequence modeling across 16 frames
        self.gru = nn.GRU(
            input_size=self.feature_dim,
            hidden_size=hidden_size,
            num_layers=num_gru_layers,
            batch_first=True,
            dropout=dropout if num_gru_layers > 1 else 0.0,
            bidirectional=True
        )

        gru_out_dim = hidden_size * 2  # Bidirectional

        # Video-level classifier
        self.video_classifier = nn.Sequential(
            nn.Dropout(p=dropout),
            nn.Linear(gru_out_dim, 128),
            nn.ReLU(inplace=True),
            nn.Dropout(p=dropout),
            nn.Linear(128, num_classes)
        )

        # Auxiliary frame anomaly head for timestamp localization
        self.frame_classifier = nn.Sequential(
            nn.Dropout(p=dropout),
            nn.Linear(self.feature_dim, num_classes)
        )

    def freeze_backbone(self) -> None:
        """Freezes visual feature extractor."""
        self.visual_extractor.freeze_backbone()

    def unfreeze_top_blocks(self, num_blocks: int = 2) -> None:
        """Unfreezes top blocks for end-to-end fine-tuning."""
        self.visual_extractor.unfreeze_top_blocks(num_blocks=num_blocks)

    def forward(self, x: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        """
        Forward pass.
        Args:
            x: Tensor of shape (B, T, 3, 224, 224) where T=16.
        Returns:
            video_logits: (B, 2)
            frame_logits: (B, T, 2)
        """
        if x.dim() == 4:
            # Single frame fallback: (B, 3, 224, 224) -> (B, 1, 3, 224, 224)
            x = x.unsqueeze(1)

        b, t, c, h, w = x.shape
        # Flatten temporal dimension for visual feature extraction
        flat_x = x.view(b * t, c, h, w)
        features = self.visual_extractor(flat_x)  # (B*T, 1280)

        # Frame-level logits for temporal localization
        frame_logits = self.frame_classifier(features).view(b, t, 2)

        # Sequence modeling through GRU
        seq_features = features.view(b, t, self.feature_dim)  # (B, T, 1280)
        gru_out, _ = self.gru(seq_features)  # (B, T, 512)

        # Temporal pooling (average over sequence)
        video_context = torch.mean(gru_out, dim=1)  # (B, 512)
        video_logits = self.video_classifier(video_context)  # (B, 2)

        return video_logits, frame_logits

    def predict_video(
        self,
        x: torch.Tensor,
        uncertainty_threshold: float = 0.60
    ) -> Dict[str, Any]:
        """
        Calculates video-level predictions with uncertainty / OOD detection.
        Args:
            x: (1, T, 3, 224, 224) or (B, T, 3, 224, 224) tensor.
            uncertainty_threshold: Minimum confidence required before flagging UNCERTAIN.
        """
        self.eval()
        with torch.no_grad():
            v_logits, f_logits = self.forward(x)
            v_probs = F.softmax(v_logits, dim=-1)  # (B, 2)
            f_probs = F.softmax(f_logits, dim=-1)  # (B, T, 2)

            real_prob = float(v_probs[0, 0].item())
            fake_prob = float(v_probs[0, 1].item())
            max_conf = max(real_prob, fake_prob)

            # Shannon Entropy for OOD / Uncertainty quantification
            entropy = float(-torch.sum(v_probs[0] * torch.log(v_probs[0] + 1e-12)).item())

            if max_conf < uncertainty_threshold:
                prediction = "UNCERTAIN"
            else:
                prediction = "FAKE" if fake_prob >= 0.50 else "REAL"

            frame_fake_scores = f_probs[0, :, 1].cpu().numpy().tolist()

            return {
                "prediction": prediction,
                "real_probability": round(real_prob, 4),
                "fake_probability": round(fake_prob, 4),
                "confidence": round(max_conf, 4),
                "entropy": round(entropy, 4),
                "is_uncertain": bool(prediction == "UNCERTAIN"),
                "frame_fake_scores": [round(float(s), 4) for s in frame_fake_scores]
            }


def build_video_model(
    pretrained: bool = True,
    hidden_size: int = 256,
    num_gru_layers: int = 2,
    device: Optional[torch.device] = None
) -> DeepfakeVideoModel:
    """Builds and returns the DeepfakeVideoModel."""
    model = DeepfakeVideoModel(
        pretrained=pretrained,
        hidden_size=hidden_size,
        num_gru_layers=num_gru_layers
    )
    if device is not None:
        model = model.to(device)
    return model
