# Frontend Integration Guide: Multimodal Deepfake Detection Suite

This document contains everything your frontend developer needs to run the backend and integrate **Video**, **Image**, and **Audio** deepfake detection into the UI.

---

## 1. Quick Backend Startup (For Frontend Developers)

### Step 1: Install Dependencies
```bash
pip install -r requirements.txt
```

### Step 2: Start the Local API Server
From the project folder, run:
```bash
uvicorn api.main:app --app-dir deepfake_detector --reload --host 0.0.0.0 --port 8000
```
- **Base URL**: `http://localhost:8000`
- **Interactive Swagger Docs (Test Endpoints Directly)**: `http://localhost:8000/docs`
- **CORS**: Already enabled for all origins (`*`) — zero CORS issues when calling from `localhost:3000` or `localhost:5173` (React, Next.js, Vite).

---

## 2. Decoupled Modular Endpoints Overview

The backend uses a decoupled router architecture where **Video**, **Image**, and **Audio** operate independently without interfering with each other:

| Feature | HTTP Method | Endpoint URL | Status | Supported Formats |
|---|---|---|:---:|---|
| **Video Deepfake & Scam** | `POST` | `/api/v1/video/analyze` *(or `/analyze-video`)* | **ACTIVE** | `.mp4`, `.mov`, `.avi`, `.webm`, `.mkv` |
| **Image Deepfake** | `POST` | `/api/v1/image/analyze` | **STAGED** | `.jpg`, `.jpeg`, `.png`, `.webp`, `.bmp` |
| **Audio Deepfake** | `POST` | `/api/v1/audio/analyze` *(or `/analyze-audio`)* | **ACTIVE** | `.wav`, `.mp3`, `.m4a`, `.aac`, `.flac`, `.ogg` |
| **System Health** | `GET` | `/api/v1/health` *(or `/health`)* | **ACTIVE** | `application/json` |

---

## 3. Endpoint 1: Video Detection (`POST /api/v1/video/analyze`)

### Request
- **URL**: `http://localhost:8000/api/v1/video/analyze` *(or alias `http://localhost:8000/analyze-video`)*
- **Method**: `POST`
- **Content-Type**: `multipart/form-data`
- **Body**: `file` (Video Blob / File)

### Response Schema (JSON)
```json
{
  "media_type": "video",
  "status": "success",
  "uploaded_filename": "celebrity_ad.mp4",
  "video_duration_seconds": 27.44,
  "video_time_frame": "00:00.00 - 00:27.44",

  "prediction": "HIGH_RISK",
  "overall_risk_score": 0.8420,
  "risk_level": "HIGH_RISK",
  "confidence": 0.8850,
  "uncertainty": 0.12,

  "time_frame": "00:22.72 - 00:24.72",
  "suspicious_time_frame": "00:22.72 - 00:24.72",
  "timestamp": "00:23.72",
  "timestamp_seconds": 23.72,
  "peak_anomaly_timestamp": "00:23.72",

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

  "identity_verification": {
    "matched_identity": "Elon Musk",
    "category": "Tech / Crypto CEO",
    "similarity_score": 0.825,
    "is_vip_detected": true,
    "is_impersonation_risk": true,
    "analysis": "Identified Likeness: Elon Musk with match confidence 82.5%."
  },

  "branding_detection": {
    "has_unauthorized_branding": true,
    "branding_risk_score": 0.85,
    "detected_brands": [
      { "brand": "Tesla Corporation", "type": "Corporate Entity", "confidence": 0.90 }
    ],
    "summary": "Detected 1 brand indicator: Tesla Corporation."
  },

  "explainability": {
    "summary": "Primary decision driver is 'visual_face_anomaly' (SHAP=+0.094), followed by 'temporal_gru_inconsistency'.",
    "top_risk_drivers": [
      {
        "modality": "visual_face_anomaly",
        "importance": 0.0643,
        "shap_value": 0.0940,
        "lime_weight": 0.0346,
        "impact": "INCREASES_RISK"
      }
    ],
    "shap": {
      "base_value": 0.2000,
      "method": "KernelSHAP",
      "attributions": {
        "visual_face_anomaly": 0.0940,
        "temporal_gru_inconsistency": 0.0834,
        "lip_sync_mismatch": 0.0150,
        "synthetic_voice_artifacts": -0.0200,
        "speech_scam_intent": -0.0254,
        "ocr_on_screen_scam": -0.0100,
        "vip_impersonation_risk": 0.0120,
        "unauthorized_branding_risk": 0.0050
      }
    },
    "lime": {
      "intercept": 0.5000,
      "method": "LIME_Tabular",
      "local_weights": { "visual_face_anomaly": 0.0346 }
    },
    "focus_regions": ["perioral_mouth_lip_boundary", "facial_swap_perimeter_halo"],
    "peak_activation": 0.8950,
    "explanation": "Grad-CAM highlights key artifact regions.",
    "gradcam_heatmap_base64": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAN..."
  },

  "suspicious_intervals": [
    {
      "time_frame": "00:22.72 - 00:24.72",
      "start_timestamp": "00:22.72",
      "end_timestamp": "00:24.72",
      "start_seconds": 22.72,
      "end_seconds": 24.72,
      "type": "visual_anomaly",
      "score": 0.89
    }
  ],

  "frame_level_timeline": [
    {
      "frame_index": 0,
      "timestamp": "00:00.00",
      "timestamp_seconds": 0.0,
      "time_frame": "00:00.00",
      "fake_probability": 0.5006,
      "is_suspicious": true
    }
  ],

  "ocr_text": ["100% GUARANTEED RETURN", "WHATSAPP NOW"],
  "transcript": "Hello, invest in our platform now for 100% guaranteed profit..."
}
```

---

## 4. Endpoint 2: Image Detection (`POST /api/v1/image/analyze`)

Allows frontend developers to wire the image upload component ahead of time.

### Request
- **URL**: `http://localhost:8000/api/v1/image/analyze`
- **Method**: `POST`
- **Content-Type**: `multipart/form-data`
- **Body**: `file` (Image Blob / File: `.jpg`, `.jpeg`, `.png`, `.webp`, `.bmp`)

### Response Schema (JSON)
```json
{
  "status": "feature_coming_soon",
  "message": "Image deepfake detection module is staged and ready for model integration.",
  "media_type": "image",
  "uploaded_filename": "portrait.png",
  "file_size_bytes": 1048576,
  "analysis_timestamp": "2026-10-03T04:15:00.000000",
  "prediction": "PENDING_MODEL",
  "confidence": 0.0,
  "deepfake": {
    "label": "PENDING",
    "probability": 0.0,
    "real_probability": 0.0,
    "manipulation_type": "face_swap_or_diffusion"
  },
  "identity_verification": {
    "matched_identity": "None",
    "similarity_score": 0.0,
    "is_vip_detected": false,
    "analysis": "VIP likeness verification contract ready."
  },
  "branding_detection": {
    "has_unauthorized_branding": false,
    "detected_brands": [],
    "summary": "Logo detection contract ready."
  },
  "explainability": {
    "summary": "Grad-CAM spatial heatmap contract ready.",
    "focus_regions": [],
    "gradcam_heatmap_base64": null
  }
}
```

---

## 5. Endpoint 3: Audio Detection (`POST /api/v1/audio/analyze`) - ACTIVE

Live neural network inference using the trained AudioCNN log-mel spectrogram model. Automatically converts MP3/M4A/AAC to 16kHz WAV and outputs continuous timeline probabilities and suspicious segments.


### Request
- **URL**: `http://localhost:8000/api/v1/audio/analyze`
- **Method**: `POST`
- **Content-Type**: `multipart/form-data`
- **Body**: `file` (Audio Blob / File: `.wav`, `.mp3`, `.m4a`, `.aac`, `.flac`, `.ogg`)

### Response Schema (JSON)
```json
{
  "audio_duration_seconds": 8.42,
  "prediction": "AI_GENERATED",
  "ai_probability": 0.974,
  "confidence": "HIGH",
  "timeline": [
    {
      "timestamp_seconds": 0.0,
      "ai_probability": 0.82
    },
    {
      "timestamp_seconds": 2.0,
      "ai_probability": 0.91
    },
    {
      "timestamp_seconds": 4.0,
      "ai_probability": 0.97
    },
    {
      "timestamp_seconds": 6.0,
      "ai_probability": 0.95
    }
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

## 6. Ready-to-Paste Frontend Client (JavaScript / TypeScript / React)

Save this file in your frontend as `services/deepfakeApi.js`:

```javascript
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * 1. Analyze Video (ACTIVE)
 */
export async function analyzeVideo(file) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${BASE_URL}/api/v1/video/analyze`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Server error: ${res.status}`);
  }
  return await res.json();
}

/**
 * 2. Analyze Image (STAGED)
 */
export async function analyzeImage(file) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${BASE_URL}/api/v1/image/analyze`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Server error: ${res.status}`);
  }
  return await res.json();
}

/**
 * 3. Analyze Audio (STAGED)
 */
export async function analyzeAudio(file) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${BASE_URL}/api/v1/audio/analyze`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Server error: ${res.status}`);
  }
  return await res.json();
}

/**
 * 4. Check Health & Active Modules
 */
export async function checkApiHealth() {
  const res = await fetch(`${BASE_URL}/api/v1/health`);
  return await res.json();
}
```

---

## 7. UI Component Wiring Suggestions

1. **Prediction Badge (`prediction`)**:
   - `HIGH_RISK` $\rightarrow$ Red Badge (Fake / Scam)
   - `MEDIUM_RISK` $\rightarrow$ Orange Badge (Suspicious)
   - `LOW_RISK` $\rightarrow$ Green Badge (Real / Safe)
   - `UNCERTAIN` $\rightarrow$ Yellow Badge (Inconclusive / OOD)
   - `PENDING_MODEL` $\rightarrow$ Gray / Badge (Feature Staged)

2. **Grad-CAM Visual Heatmap (`explainability.gradcam_heatmap_base64`)**:
   - Display directly using standard `<img>`:
     ```jsx
     {data.explainability?.gradcam_heatmap_base64 && (
       <img
         src={data.explainability.gradcam_heatmap_base64}
         alt="Grad-CAM Anomaly Heatmap"
         className="rounded-lg shadow border border-red-500 w-48 h-48"
       />
     )}
     ```

3. **Timeframe Pill (`time_frame` or `suspicious_time_frame`)**:
   - Display e.g. `⏱️ 00:22.72 - 00:24.72`

4. **SHAP Feature Importance Chart (`explainability.shap.attributions`)**:
   - Render as a horizontal bar chart:
     - Positive values (Red/Warning) $\rightarrow$ Factors increasing fake risk
     - Negative values (Green/Neutral) $\rightarrow$ Factors indicating authenticity

5. **VIP Impersonation Alert (`identity_verification`)**:
   - If `is_impersonation_risk === true`, show banner: `⚠️ Likeness Alert: Impersonating ${matched_identity} (${category})`.
