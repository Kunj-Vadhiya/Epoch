# “Is That Really Them?” — Deepfake Scam Ad Detector

An end-to-end multimodal deepfake video and scam ad forensic detection system optimized for **unseen video generalization**, **unseen identity generalization**, and **robustness against compression and visual degradation**.

---

## 🌟 Key Architecture & Highlights

```
Arbitrary Unseen Video (.mp4 / .mov / .avi)
  │
  ├──► Uniform Temporal Frame Sampling (16 frames via np.linspace)
  │       │
  │       ├──► Face Tracking (IoU matching & temporal trajectory smoothing)
  │       │       │
  │       │       ├──► EfficientNet-B0 Feature Extractor (ImageNet Pretrained)
  │       │       │       │
  │       │       │       └──► Bidirectional GRU (hidden_size=256, 2 layers)
  │       │       │               │
  │       │       │               ├──► Video Probability (REAL / FAKE)
  │       │       │               └──► Frame Anomaly Scores (Timestamp Intervals)
  │       │       │
  │       │       └──► Grad-CAM Attention Heatmaps (outputs/explanations/)
  │       │
  │       ├──► Lip-Sync Synchronization (Audio energy vs mouth optical variance)
  │       │
  │       └──► OCR On-Screen Text Extraction (PaddleOCR / EasyOCR)
  │
  └──► Audio Stream Extraction (FFmpeg / PCM 16kHz)
          │
          ├──► Whisper Speech-to-Text (English / Hindi / Hinglish)
          │       │
          │       └──► Multilingual Scam NLP (Urgency, Guaranteed Profit, Telegram/WhatsApp)
          │
          └──► Synthetic Voice Forensic Detector (Acoustic spectral & vocoder artifacts)
                  │
                  ▼
       Multimodal Risk Fusion (XGBoost / Calibrated Fusion)
                  │
                  ▼
       Final Risk Report (LOW_RISK, MEDIUM_RISK, HIGH_RISK, UNCERTAIN)
```

---

## 🛡️ Preventing Data Leakage (Subject-Disjoint Guarantee)

To guarantee true generalization and prevent the model from merely memorizing actor faces:
- **Zero Identity Overlap**: Partitioned via `src/partition_subject_disjoint.py` ensuring:
  $$\text{train\_identities} \cap \text{test\_identities} = \emptyset$$
  $$\text{train\_video\_ids} \cap \text{test\_video\_ids} = \emptyset$$
- **Programmatically Verified**: Verified by [`tests/test_disjoint_and_leakage.py`](file:///d:/Epoch1.0/Video/deepfake_detector/tests/test_disjoint_and_leakage.py).

---

## 📁 Project Directory Structure

```
deepfake_detector/
├── api/
│   └── main.py                     # FastAPI REST service (/health, /analyze-video)
├── configs/
│   └── config.yaml                 # System, training, and threshold parameters
├── data/
│   ├── faceforensics_manifest.csv  # Disjoint dataset manifest (800 / 1000 modes)
│   └── external_test/              # Unseen real-world test videos
├── models/
│   ├── deepfake_efficientnet_b0_best.pth  # Trained visual weights
│   ├── fusion_model.pkl            # Multimodal fusion model
│   └── config.json                 # Model metadata & schema specs
├── notebooks/
│   ├── 01_dataset_sampling.ipynb   # Streaming sampling & disjoint partitioning
│   ├── 02_visual_training.ipynb    # EfficientNet-B0 + GRU training in Colab
│   └── 03_evaluation.ipynb         # Evaluation, Grad-CAM & unseen test suite
├── outputs/
│   ├── explanations/               # Grad-CAM attention triptychs
│   ├── faceforensics_c23_test_predictions/ # 500 annotated test videos + JSONs
│   └── external_test_report.json   # Evaluation on unseen external videos
├── src/
│   ├── audio.py                    # Audio stream extraction
│   ├── dataset.py                  # PyTorch Dataset pipeline
│   ├── evaluate.py                 # ROC-AUC, PR, confusion matrix, error analysis
│   ├── explainability.py           # Grad-CAM heatmap visualization
│   ├── face_detector.py            # Face detection with bounding box margin
│   ├── face_tracker.py             # IoU face tracking across 16 frames
│   ├── faceforensics_sampler.py    # Zero-download ZIP64 range stream sampler
│   ├── fusion.py                   # Multimodal risk fusion model
│   ├── inference.py                # predict_video() for arbitrary unseen videos
│   ├── lipsync.py                  # Lip-sync synchronization anomaly scoring
│   ├── ocr.py                      # Video text extractor for scam overlays
│   ├── partition_subject_disjoint.py # Subject-disjoint partitioner
│   ├── scam_detector.py            # Multilingual scam language detector
│   ├── temporal_model.py           # EfficientNet-B0 + GRU temporal network
│   ├── visual_model.py             # Visual feature extractor
│   ├── voice_detector.py           # Synthetic voice & TTS detector
│   └── whisper_module.py           # Whisper multilingual speech transcription
├── tests/
│   └── test_disjoint_and_leakage.py # Leakage & disjointness test suite
├── requirements.txt
└── README.md
```

---

## 🚀 Quickstart & Usage

### 1. Run Inference on Any Unseen Local Video
Analyze a completely new video that was never part of the training dataset:
```bash
python src/inference.py data/external_test/unseen_real_interview_01.mp4
```

### 2. Output Schema
```json
{
  "video_path": ".../unseen_video.mp4",
  "video_duration_seconds": 27.44,
  "prediction": "HIGH_RISK",
  "deepfake": {
    "label": "FAKE",
    "probability": 0.8950,
    "real_probability": 0.1050
  },
  "visual": { "score": 0.8820 },
  "temporal": { "score": 0.8950 },
  "lip_sync": { "anomaly_score": 0.7850 },
  "voice": { "synthetic_score": 0.7200 },
  "scam": {
    "text_score": 0.9100,
    "ocr_score": 0.8500,
    "matched_signals": ["guaranteed_returns", "artificial_urgency"]
  },
  "confidence": 0.8850,
  "suspicious_intervals": [
    { "start": 7.0, "end": 11.5, "type": "visual", "score": 0.89 }
  ],
  "ocr_text": ["GUARANTEED RETURNS", "WHATSAPP NOW"],
  "transcript": "Join our WhatsApp VIP group now for daily guaranteed returns...",
  "uncertainty": 0.12
}
```

### 3. Start FastAPI Service
```bash
python -m uvicorn api.main:app --host 0.0.0.0 --port 8000
```
- Health Check: `GET http://localhost:8000/health`
- Video Analysis: `POST http://localhost:8000/analyze-video` (multipart/form-data with `file`)
- Interactive Docs: `http://localhost:8000/docs`

### 4. Run Disjointness Verification Tests
```bash
pytest tests/test_disjoint_and_leakage.py -v
```

---

## ⚡ Google Colab T4 Budget (≤ 2 Hours)
Open any of the modular notebooks in Google Colab:
- [`notebooks/01_dataset_sampling.ipynb`](file:///d:/Epoch1.0/Video/deepfake_detector/notebooks/01_dataset_sampling.ipynb) (0–15 min)
- [`notebooks/02_visual_training.ipynb`](file:///d:/Epoch1.0/Video/deepfake_detector/notebooks/02_visual_training.ipynb) (15–80 min)
- [`notebooks/03_evaluation.ipynb`](file:///d:/Epoch1.0/Video/deepfake_detector/notebooks/03_evaluation.ipynb) (80–110 min)
