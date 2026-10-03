# DeepTrust AI & Epoch Forensics — Complete API Documentation

Production API reference for **DeepTrust AI / Epoch Forensics**, an AI-powered Deepfake and Fraudulent Advertisement Forensic Detection System.

- **Base URL (Local)**: `http://127.0.0.1:8000`
- **Frontend App**: `http://localhost:3000` (or `3001`)
- **Interactive Swagger Docs**: `http://127.0.0.1:8000/docs`
- **OpenAPI Schema**: `http://127.0.0.1:8000/openapi.json`
- **Telegram Bot**: `@ewepochbot` (ID: `8368678786`)

---

## 1. Quick Master Endpoints Table

| Category | Method | Endpoint URL | User Payload / Params | Purpose / Output |
| :--- | :---: | :--- | :--- | :--- |
| **System** | `GET` | `/health` | *None* | System & detector health readiness |
| **System** | `GET` | `/api/v1/health` | *None* | Subsystem readiness for Frontend Workbench |
| **Video** | `POST` | `/api/v1/video/analyze` | Multipart Form: `file` | Full multimodal forensic pipeline (Visual + Audio + LipSync + OCR + Scam NLP) |
| **Video** | `POST` | `/analyze-video` | Multipart Form: `file` | Backward-compatible alias for Video Analysis |
| **Video** | `GET` | `/api/v1/video/sample` | *None* | Reference forensic sample JSON for testing UI |
| **Audio** | `POST` | `/api/v1/audio/analyze` | Multipart Form: `file` | Standalone voice cloning & synthetic speech detection (AudioCNN) |
| **Audio** | `POST` | `/analyze-audio` | Multipart Form: `file` | Backward-compatible alias for Audio Analysis |
| **Audio** | `GET` | `/api/v1/audio/sample` | *None* | Reference audio timeline probabilities sample JSON |
| **Image** | `POST` | `/api/v1/image/analyze` | Multipart Form: `file` | Single-image deepfake & facial inpainting detection (Demo Engine) |
| **Direct API** | `POST` | `/api/analyze/video` | Multipart Form: `file` | Direct upload returning unified `DeepTrustReport` schema |
| **Async URL** | `POST` | `/api/analyze/url` | JSON: `{"url": "..."}` | SSRF-safe background URL analysis for extensions |
| **Job Poll** | `GET` | `/api/analyze/{job_id}` | Path: `job_id` | Status polling for async jobs (`queued`, `processing`, `completed`) |
| **Telegram** | `POST` | `/api/telegram/webhook` | Telegram `Update` JSON | Webhook receiver for live Telegram Bot production |
| **Telegram** | `POST` | `/api/telegram/test` | JSON: `chat_id`, `text`, etc. | Local simulation endpoint for testing bot replies |

---

## 2. CORS & Proxy Architecture

To prevent browser CORS issues during development and production:
- **FastAPI CORS**: White-lists `http://localhost:3000`, `http://127.0.0.1:3000`, `http://localhost:8000`, `http://127.0.0.1:8000`, and regex `^https?://(localhost|127\.0\.0\.1)(:\d+)?$`.
- **Preflight**: Handles `OPTIONS` requests with `access-control-allow-origin`, `access-control-allow-credentials: true`, and all verbs.
- **Next.js Proxy**: Next.js automatically rewrites `/api/v1/:path*` to `http://127.0.0.1:8000/api/v1/:path*` server-side, eliminating browser cross-origin blocks entirely.

---

## 3. Detailed Endpoint Reference

### 🎥 1. Multimodal Video Forensic Analysis
#### `POST /api/v1/video/analyze` *(Alias: `POST /analyze-video`)*

Analyzes a suspicious video file across **5 synchronized forensic layers**:
1. **Visual Deepfake**: EfficientNet-B0 + BiGRU temporal modeling over 16 sampled frames.
2. **Lip-Sync**: SyncNet optical flow audio/video alignment.
3. **Synthetic Voice**: AudioCNN log-mel spectrogram frequency detection.
4. **Speech & On-screen Text**: Whisper transcription + EasyOCR scanning.
5. **Scam NLP**: Multilingual heuristic fraud classification (guaranteed returns, urgency, moving to WhatsApp/Telegram).

#### Request Headers & Body:
- **Content-Type**: `multipart/form-data`
- **Form Field**: `file` (Binary video file)
- **Supported Formats**: `.mp4`, `.mov`, `.avi`, `.webm`, `.mkv`
- **Max File Size**: 20 MB (Telegram/Web standard)
- **Max Duration**: 90 seconds

#### Example Request (cURL):
```bash
curl -X POST "http://127.0.0.1:8000/api/v1/video/analyze" \
  -F "file=@suspicious_ad.mp4"
```

#### Example Response (`200 OK`):
```json
{
  "status": "success",
  "media_type": "video",
  "uploaded_filename": "suspicious_ad.mp4",
  "prediction": "FAKE",
  "risk_level": "HIGH",
  "video_duration_seconds": 24.5,
  "deepfake": {
    "probability": 0.942,
    "confidence": "HIGH"
  },
  "suspicious_intervals": [
    {
      "time_frame": "00:07.00 - 00:12.00",
      "start_seconds": 7.0,
      "end_seconds": 12.0,
      "type": "lip_sync_inconsistency",
      "score": 0.83
    },
    {
      "time_frame": "00:13.00 - 00:17.00",
      "start_seconds": 13.0,
      "end_seconds": 17.0,
      "type": "synthetic_voice_signal",
      "score": 0.76
    },
    {
      "time_frame": "00:18.00 - 00:22.00",
      "start_seconds": 18.0,
      "end_seconds": 22.0,
      "type": "scam_fraud_pattern",
      "score": 0.94
    }
  ],
  "frame_level_timeline": [
    {"frame_index": 0, "timestamp": "00:00.00", "fake_probability": 0.12, "is_suspicious": false},
    {"frame_index": 4, "timestamp": "00:07.50", "fake_probability": 0.83, "is_suspicious": true},
    {"frame_index": 8, "timestamp": "00:14.20", "fake_probability": 0.91, "is_suspicious": true}
  ],
  "transcript": "Invest 5000 rupees today and get guaranteed 50,000 back daily. Message me on WhatsApp right now.",
  "ocr_text": "GUARANTEED 10X RETURNS - WHATSAPP NOW: +91 9876543210"
}
```

---

### 🎙️ 2. Audio Synthetic Voice Detection
#### `POST /api/v1/audio/analyze` *(Alias: `POST /analyze-audio`)*

Detects cloned voices, AI speech synthesis (TTS), and vocoder artifacts using the trained AudioCNN spectrogram model.

#### Request Headers & Body:
- **Content-Type**: `multipart/form-data`
- **Form Field**: `file` (Audio recording)
- **Supported Formats**: `.wav`, `.mp3`, `.m4a`, `.aac`, `.flac`, `.ogg`

#### Example Request (Python):
```python
import requests

with open("voice_sample.wav", "rb") as f:
    response = requests.post(
        "http://127.0.0.1:8000/api/v1/audio/analyze",
        files={"file": ("voice_sample.wav", f, "audio/wav")}
    )
print(response.json())
```

#### Example Response (`200 OK`):
```json
{
  "audio_duration_seconds": 8.42,
  "prediction": "AI_GENERATED",
  "ai_probability": 0.974,
  "confidence": "HIGH",
  "timeline": [
    {"timestamp_seconds": 0.0, "ai_probability": 0.82},
    {"timestamp_seconds": 2.0, "ai_probability": 0.91},
    {"timestamp_seconds": 4.0, "ai_probability": 0.97},
    {"timestamp_seconds": 6.0, "ai_probability": 0.95}
  ],
  "suspicious_segments": [
    {
      "start_seconds": 3.2,
      "end_seconds": 5.1,
      "ai_probability": 0.942
    }
  ]
}
```

---

### 🖼️ 3. Image Deepfake & Inpainting Detection (Demo Engine)
#### `POST /api/v1/image/analyze`

Analyzes static images for facial synthesis boundary anomalies, diffusion inpainting, and VIP likeness matching. Currently operates with a realistic demo forensic payload for testing the UI inspection cards.

#### Request Headers & Body:
- **Content-Type**: `multipart/form-data`
- **Form Field**: `file` (Image file)
- **Supported Formats**: `.jpg`, `.jpeg`, `.png`, `.webp`, `.bmp`

#### Example Request (cURL):
```bash
curl -X POST "http://127.0.0.1:8000/api/v1/image/analyze" \
  -F "file=@test_portrait.png"
```

#### Example Response (`200 OK`):
```json
{
  "status": "success",
  "media_type": "image",
  "uploaded_filename": "test_portrait.png",
  "file_size_bytes": 763,
  "analysis_timestamp": "2026-10-03T06:32:36.232477",
  "prediction": "FAKE",
  "risk_level": "HIGH",
  "confidence": 0.948,
  "deepfake": {
    "label": "AI_GENERATED",
    "probability": 0.954,
    "real_probability": 0.046,
    "manipulation_type": "facial_diffusion_inpainting",
    "details": "Latent diffusion artifacting and boundary blur detected around jawline and ocular perimeter."
  },
  "identity_verification": {
    "matched_identity": "Public Figure Endorsement",
    "similarity_score": 0.92,
    "is_vip_detected": true,
    "analysis": "Known public figure facial structure matched with non-authentic skin pore variance."
  },
  "branding_detection": {
    "has_unauthorized_branding": true,
    "detected_brands": ["Banking Authority Badge", "Regulatory Seal"],
    "summary": "Unauthorized institutional watermark inserted in upper corner."
  },
  "explainability": {
    "summary": "Grad-CAM spatial heatmap focused 92% of model attention on synthetic facial synthesis boundaries.",
    "focus_regions": [
      {"region": "periorbital", "anomaly_score": 0.94},
      {"region": "mouth_blend", "anomaly_score": 0.91},
      {"region": "jawline_contour", "anomaly_score": 0.88}
    ]
  }
}
```

---

### 🌐 4. Asynchronous Video URL Ingestion (Browser Extension)
#### `POST /api/analyze/url`

Submits an external video URL (e.g. forwarded from a social media post) for asynchronous analysis. Validates against SSRF attacks (blocking loopback `127.0.0.1`, private IP subnets `10.0.0.0/8`, `192.168.0.0/16`, and cloud metadata `169.254.169.254`).

#### Request Headers & Body:
- **Content-Type**: `application/json`
- **Payload**:
```json
{
  "url": "https://assets.example.com/videos/suspicious_ad.mp4"
}
```

#### Example Response (`200 OK`):
```json
{
  "job_id": "c1f78da4-f58c-4860-93a8-a6e5bceee191",
  "status": "queued",
  "message": "Video analysis job enqueued successfully."
}
```

---

### ⏳ 5. Polling Job Status
#### `GET /api/analyze/{job_id}`

Retrieves the current execution stage or completed report for an asynchronous job.

#### Example Response (`200 OK`):
```json
{
  "job_id": "c1f78da4-f58c-4860-93a8-a6e5bceee191",
  "status": "completed",
  "stage": "done",
  "created_at": "2026-10-03T05:30:00Z",
  "completed_at": "2026-10-03T05:30:18Z",
  "error": null,
  "result": {
    "video_id": "c1f78da4",
    "duration": 24.5,
    "deepfake_score": 0.942,
    "deepfake_label": "HIGH_CONFIDENCE_MANIPULATION",
    "overall_risk": "HIGH RISK"
  }
}
```

---

### 🤖 6. Telegram Bot Integration
#### Webhook: `POST /api/telegram/webhook`
#### Polling: Embedded background long-polling

The Telegram Bot operates as an interactive user-facing client without duplicating ML models.
- **Commands**:
  - `/start`: Welcomes user and explains system capabilities.
  - `/help`: Usage instructions, supported formats, file limits (20 MB).
  - `/about`: Details multimodal forensic architecture.
  - `/status`: Real-time health of model detectors and Telegram API.
  - `/example`: Demonstration report with risk scores and evidence timestamps.
- **Interactive Inline Buttons**:
  - `[🎬 Evidence]`: Sends approximate timestamp breakdowns and anomaly intervals.
  - `[📝 Transcript]`: Sends speech-to-text transcript.
  - `[🔎 OCR]`: Sends on-screen text scanned from frames.
  - `[📊 Full Report]`: Re-sends executive forensic breakdown.
  - `[🔄 Analyze Again]`: Prompts user to send another clip.

---

## 4. Error Handling & HTTP Status Codes

| Status Code | Meaning | Common Cause |
| :---: | :--- | :--- |
| `200 OK` | Success | Inference completed or sample returned. |
| `400 Bad Request` | Invalid Input | Empty file, unsupported media extension, or disallowed URL. |
| `404 Not Found` | Not Found | Unknown `job_id` or unregistered route. |
| `405 Method Not Allowed` | Method Mismatch | Sending GET instead of POST or vice-versa. |
| `422 Unprocessable` | Decoding Failure | Corrupted video file or FFmpeg stream extraction failure. |
| `500 Server Error` | Inference Error | Model failure; masked to prevent exposing server stack traces. |

---

## 5. Security & Privacy Guardrails

1. **Ephemeral File Storage**: Uploaded media is saved to an isolated temporary directory (`tmp/videos/<uuid>.ext`) and immediately deleted in a `try...finally` block.
2. **SSRF Blocking**: Direct URL ingestion verifies IP resolution against private networks and cloud metadata services.
3. **Concurrency Semaphore**: Inference is gated by `MAX_CONCURRENT_ANALYSES=1` to prevent GPU/CPU out-of-memory crashes.
4. **Idempotency Protection**: Dual submissions with identical `chat_id + message_id` are automatically deduplicated.
5. **Masked Diagnostics**: Stack traces, model paths, and API keys are never exposed in user-facing responses.
