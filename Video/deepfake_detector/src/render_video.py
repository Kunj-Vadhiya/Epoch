"""Renders annotated prediction videos with Grad-CAM heatmaps and probability HUD."""

import os
import sys
import cv2
import torch
import numpy as np
from PIL import Image

project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from src.model import load_model
from src.explainability import GradCAMExplainer


def render_annotated_video(input_path: str, output_mp4: str, output_gif: str, is_fake_groundtruth: bool = True):
    """Processes a video file, generates Grad-CAM overlays, and renders an annotated video with a HUD."""
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model_path = os.path.join(project_root, "models", "deepfake_efficientnet_b0_best.pth")
    model = load_model(model_path, device=device)
    model.eval()

    explainer = GradCAMExplainer(model=model)

    cap = cv2.VideoCapture(input_path)
    raw_frames = []
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        raw_frames.append(frame)
    cap.release()

    if not raw_frames:
        print(f"Error: No frames found in {input_path}")
        return

    os.makedirs(os.path.dirname(os.path.abspath(output_mp4)), exist_ok=True)

    total_f = len(raw_frames)
    indices = np.linspace(0, total_f - 1, min(20, total_f), dtype=int)
    pil_frames = []

    canvas_w, canvas_h = 640, 340
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    out = cv2.VideoWriter(output_mp4, fourcc, 5.0, (canvas_w, canvas_h))

    for idx in indices:
        bgr = raw_frames[idx]
        rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)

        h, w = rgb.shape[:2]
        min_dim = min(h, w)
        crop = rgb[(h - min_dim) // 2 : (h + min_dim) // 2, (w - min_dim) // 2 : (w + min_dim) // 2]
        crop_resized = cv2.resize(crop, (224, 224))

        tensor = torch.from_numpy(crop_resized).permute(2, 0, 1).float() / 255.0
        mean = torch.tensor([0.485, 0.456, 0.406]).view(3, 1, 1)
        std = torch.tensor([0.229, 0.224, 0.225]).view(3, 1, 1)
        norm_tensor = (tensor - mean) / std

        with torch.no_grad():
            logits = model(norm_tensor.unsqueeze(0).to(device))
            prob_fake = float(torch.softmax(logits, dim=1)[0, 1].cpu())

        heatmap = explainer.generate_heatmap(norm_tensor)
        heatmap_rgb, overlay_rgb = explainer.create_visualization(crop_resized, heatmap)

        canvas = np.zeros((canvas_h, canvas_w, 3), dtype=np.uint8)
        canvas[:] = (24, 24, 28)

        # Place input crop on left
        bgr_crop = cv2.cvtColor(crop_resized, cv2.COLOR_RGB2BGR)
        canvas[70:294, 20:244] = bgr_crop
        cv2.rectangle(canvas, (20, 70), (244, 294), (100, 100, 100), 1)
        cv2.putText(canvas, "Input Video Frame", (20, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 200), 1)

        # Place Grad-CAM overlay on right
        bgr_overlay = cv2.cvtColor(overlay_rgb, cv2.COLOR_RGB2BGR)
        canvas[70:294, 270:494] = bgr_overlay
        cv2.rectangle(canvas, (270, 70), (494, 294), (100, 100, 100), 1)
        cv2.putText(canvas, "Grad-CAM Attention Map", (270, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 200), 1)

        # Header Title
        cv2.putText(canvas, "DEEPFAKE SCAM AD DETECTOR", (20, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (255, 255, 255), 2)

        # Badge
        is_pred_fake = prob_fake >= 0.5
        badge_color = (40, 40, 220) if is_pred_fake else (40, 180, 50)
        badge_text = "PREDICTION: FAKE" if is_pred_fake else "PREDICTION: REAL"
        cv2.rectangle(canvas, (510, 70), (625, 115), badge_color, -1)
        cv2.putText(canvas, badge_text.split()[-1], (520, 102), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)

        # Score text & progress bar
        cv2.putText(canvas, f"{prob_fake * 100:.1f}%", (525, 150), cv2.FONT_HERSHEY_SIMPLEX, 0.75, (255, 255, 255), 2)
        cv2.putText(canvas, "Fake Score", (525, 170), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (180, 180, 180), 1)

        cv2.rectangle(canvas, (515, 190), (625, 205), (50, 50, 50), -1)
        bar_fill = int(110 * prob_fake)
        cv2.rectangle(canvas, (515, 190), (515 + bar_fill, 205), badge_color, -1)
        cv2.rectangle(canvas, (515, 190), (625, 205), (120, 120, 120), 1)

        cv2.putText(canvas, f"Frame: {idx + 1}/{total_f}", (20, 320), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (150, 150, 150), 1)
        truth_str = "Ground Truth: FAKE" if is_fake_groundtruth else "Ground Truth: REAL"
        cv2.putText(canvas, truth_str, (270, 320), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 255, 255), 1)

        out.write(canvas)
        pil_frames.append(Image.fromarray(cv2.cvtColor(canvas, cv2.COLOR_BGR2RGB)))

    out.release()
    if pil_frames:
        pil_frames[0].save(output_gif, save_all=True, append_images=pil_frames[1:], duration=200, loop=0)
    print(f"Generated: {output_mp4} and {output_gif}")


if __name__ == "__main__":
    fake_sample = os.path.join(project_root, "data", "raw_samples", "syn_fake_0312.mp4")
    real_sample = os.path.join(project_root, "data", "raw_samples", "syn_real_0281.mp4")

    render_annotated_video(
        fake_sample,
        os.path.join(project_root, "outputs", "predicted_fake_annotated.mp4"),
        os.path.join(project_root, "outputs", "predicted_fake_annotated.gif"),
        is_fake_groundtruth=True
    )

    render_annotated_video(
        real_sample,
        os.path.join(project_root, "outputs", "predicted_real_annotated.mp4"),
        os.path.join(project_root, "outputs", "predicted_real_annotated.gif"),
        is_fake_groundtruth=False
    )
