# API Reference: Endpoints, Methods & Usage Guide

This document explains **every API endpoint**, **its exact purpose**, **what the user uploads or sends**, and **what the backend returns**.

---

## 1. Quick Master Table

| Endpoint URL | HTTP Method | What the User Sends | Purpose / What it Does | Current Status |
| :--- | :---: | :--- | :--- | :---: |
| **`/api/v1/audio/analyze`** | `POST` | Audio file (`file`) | Analyzes speech/voice for AI clones and synthetic generation using AudioCNN | **ACTIVE** |
| **`/api/v1/video/analyze`** | `POST` | Video file (`file`) | Analyzes video for face swaps, lip-sync anomalies, synthetic voice, and scam ads | **ACTIVE** |
| **`/api/v1/image/analyze`** | `POST` | Image file (`file`) | Validates image and provides forensic schema for photo deepfakes | **STAGED** |
| **`/api/v1/health`** | `GET` | *None* | Checks server health and operational status of all modalities | **ACTIVE** |
| **`/api/v1/audio/sample`** | `GET` | *None* | Returns reference sample JSON contract for audio detection | **ACTIVE** |
| **`/api/v1/video/sample`** | `GET` | *None* | Returns reference sample JSON contract for video detection | **ACTIVE** |
| **`/analyze-audio`** | `POST` | Audio file (`file`) | Backward-compatible alias for `/api/v1/audio/analyze` | **ACTIVE** |
| **`/analyze-video`** | `POST` | Video file (`file`) | Backward-compatible alias for `/api/v1/video/analyze` | **ACTIVE** |

---

## 2. Endpoint Details & Usage

### 🎙️ Endpoint 1: Audio Synthetic Voice Detection

#### `POST /api/v1/audio/analyze`
*Alias: `POST /analyze-audio`*

- **Purpose**: Detects whether an uploaded voice recording or speech clip is **REAL (Human)** or **AI_GENERATED (Deepfake / TTS / Voice Clone)**.
- **What User Uploads**:
  - **HTTP Method**: `POST`
  - **Content-Type**: `multipart/form-data`
  - **Form Field**: `file` (Binary audio file)
  - **Supported Formats**: `.wav`, `.mp3`, `.m4a`, `.aac`, `.flac`, `.ogg`
- **What the Backend Does**:
  1. Receives the uploaded audio stream.
  2. If the file is not already WAV, automatically converts it to 16 kHz mono WAV via FFmpeg.
  3. Computes log-Mel spectrogram windows (64 bins × 313 frames).
  4. Runs forward inference through the trained **AudioCNN** PyTorch model.
  5. Computes continuous timeline probabilities (every ~2 seconds) and detects continuous suspicious segments.
  6. Automatically deletes temporary conversion files to protect privacy and disk space.

#### Request Example (cURL):
```bash
curl -X POST "http://localhost:8000/api/v1/audio/analyze" \
  -F "file=@voice_message.mp3"
```

#### Request Example (JavaScript / React):
```javascript
const formData = new FormData();
formData.append("file", audioFileInput.files[0]);

const response = await fetch("http://localhost:8000/api/v1/audio/analyze", {
  method: "POST",
  body: formData,
});

const result = await response.json();
console.log(result.prediction, result.ai_probability);
```

#### Response Output (JSON):
```json
{
  "audio_duration_seconds": 60.0,
  "prediction": "REAL",
  "ai_probability": 0.161,
  "confidence": "MEDIUM",
  "timeline": [
    {
      "timestamp_seconds": 5.0,
      "ai_probability": 0.0
    },
    {
      "timestamp_seconds": 7.0,
      "ai_probability": 0.0
    },
    {
      "timestamp_seconds": 56.0,
      "ai_probability": 1.0
    },
    {
      "timestamp_seconds": 60.0,
      "ai_probability": 1.0
    }
  ],
  "suspicious_segments": [
    {
      "start_seconds": 52.0,
      "end_seconds": 60.0,
      "ai_probability": 1.0
    }
  ]
}
```

#### Field Explanations:
- `audio_duration_seconds`: Total length of the audio track in seconds.
- `prediction`: Either `"REAL"` or `"AI_GENERATED"`.
- `ai_probability`: Overall synthetic voice risk score from `0.0` (pure human) to `1.0` (pure AI clone).
- `confidence`: Reliability classification: `"HIGH"`, `"MEDIUM"`, or `"LOW"`.
- `timeline`: Array of `(timestamp_seconds, ai_probability)` pairs showing risk across the entire audio length.
- `suspicious_segments`: Start and end times of high-confidence AI-generated speech chunks.

---

### 🎬 Endpoint 2: Video Deepfake & Scam Ad Detection

#### `POST /api/v1/video/analyze`
*Alias: `POST /analyze-video`*

- **Purpose**: Comprehensive spatiotemporal deepfake video detection. Detects face replacements, lip-sync anomalies, AI voices, VIP celebrity likenesses (e.g. Elon Musk), brand logos, and financial scam text.
- **What User Uploads**:
  - **HTTP Method**: `POST`
  - **Content-Type**: `multipart/form-data`
  - **Form Field**: `file` (Binary video file)
  - **Supported Formats**: `.mp4`, `.mov`, `.avi`, `.webm`, `.mkv`
- **What the Backend Does**:
  1. Extracts video frames and audio track.
  2. Detects facial landmarks via MediaPipe and extracts face crops.
  3. Evaluates frames through **EfficientNet-B0 + BiGRU** temporal neural network.
  4. Analyzes audio speech via Whisper and AudioCNN.
  5. Scans on-screen text with EasyOCR for scam patterns ("guaranteed profit", "WhatsApp now").
  6. Compares faces against VIP identity database (FaceNet embeddings).
  7. Generates visual explainability heatmaps using **Grad-CAM**, **SHAP**, and **LIME**.

#### Request Example (cURL):
```bash
curl -X POST "http://localhost:8000/api/v1/video/analyze" \
  -F "file=@celebrity_ad.mp4"
```

#### Response Output (JSON Summary):
```json
{
  "media_type": "video",
  "status": "success",
  "uploaded_filename": "celebrity_ad.mp4",
  "video_duration_seconds": 27.44,
  "prediction": "HIGH_RISK",
  "overall_risk_score": 0.842,
  "confidence": 0.885,
  "suspicious_time_frame": "00:22.72 - 00:24.72",
  "deepfake": {
    "label": "FAKE",
    "probability": 0.895
  },
  "identity_verification": {
    "matched_identity": "Elon Musk",
    "is_impersonation_risk": true
  },
  "explainability": {
    "summary": "Primary decision driver is facial landmark distortion.",
    "gradcam_heatmap_base64": "data:image/png;base64,iVBORw..."
  },
  "suspicious_intervals": [
    {
      "time_frame": "00:22.72 - 00:24.72",
      "type": "visual_anomaly",
      "score": 0.89
    }
  ]
}
```

---

### 🖼️ Endpoint 3: Image Deepfake Detection

#### `POST /api/v1/image/analyze`

- **Purpose**: Dedicated single-photo and portrait deepfake analysis (e.g. AI-generated avatars, face swaps).
- **What User Uploads**:
  - **HTTP Method**: `POST`
  - **Content-Type**: `multipart/form-data`
  - **Form Field**: `file` (Binary image file)
  - **Supported Formats**: `.jpg`, `.jpeg`, `.png`, `.webp`, `.bmp`
- **What the Backend Does**:
  - Validates image dimensions, file headers, and integrity.
  - Returns structured staging contract matching the unified forensic schema so frontend developers can complete the image upload UI.

#### Request Example (cURL):
```bash
curl -X POST "http://localhost:8000/api/v1/image/analyze" \
  -F "file=@profile_pic.png"
```

---

### 🩺 Endpoint 4: System Health & Subsystem Status

#### `GET /api/v1/health`
*Alias: `GET /health`*

- **Purpose**: Checks whether the backend server is running and reveals which detection pipelines are currently active or staged.
- **What User Sends**:
  - **HTTP Method**: `GET`
  - **Payload / Body**: *None*
- **What the Backend Returns**:
  - Status of Video, Image, and Audio pipelines.

#### Request Example:
```bash
curl "http://localhost:8000/api/v1/health"
```

#### Response Output (JSON):
```json
{
  "status": "healthy",
  "service": "Multimodal Deepfake & Scam Detection Suite",
  "version": "2.0.0",
  "modules": {
    "video_detection": {
      "status": "active",
      "endpoint": "/api/v1/video/analyze",
      "supported_formats": [".mp4", ".mov", ".avi", ".webm", ".mkv"]
    },
    "image_detection": {
      "status": "staged",
      "endpoint": "/api/v1/image/analyze",
      "supported_formats": [".jpg", ".jpeg", ".png", ".webp", ".bmp"]
    },
    "audio_detection": {
      "status": "active",
      "endpoint": "/api/v1/audio/analyze",
      "model": "AudioCNN (log-Mel Spectrogram)",
      "supported_formats": [".wav", ".mp3", ".m4a", ".aac", ".flac", ".ogg"]
    }
  }
}
```

---

### 📄 Endpoint 5 & 6: Sample Mock Contracts

#### `GET /api/v1/audio/sample` & `GET /api/v1/video/sample`
- **Purpose**: Returns the reference JSON response without requiring the user to upload a large media file. Useful for frontend UI prototyping and unit tests.
- **What User Sends**:
  - **HTTP Method**: `GET`
  - **Payload / Body**: *None*
- **What the Backend Returns**: Complete, valid JSON response objects.

---

## 3. Interactive API Documentation (Swagger UI)

When the server is running, you can test all endpoints directly in your web browser with a graphical interface:

- **Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc UI**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

You can click **"Try it out"**, choose an audio or video file from your computer, click **"Execute"**, and immediately see the live response!
