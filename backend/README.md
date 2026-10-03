# DeepTrust AI — Telegram Bot & Easy Access Backend

> **"Is That Really Them?" — AI-Powered Deepfake & Scam Advertisement Detector**

An easy-access channel allowing users to forward suspicious video clips or paste video links directly to a **Telegram Bot** and receive an explainable **DeepTrust Trust Report** in under a minute.

---

## 1. Project Overview & Architecture

The Telegram bot acts as an **input/output interface** for users on mobile and desktop. It **does NOT** duplicate or rebuild any machine learning models; instead, it securely downloads the video, validates it, and calls the central DeepTrust AI analysis pipeline.

```
                      ┌──────────────────────┐
                      │    TELEGRAM USER     │
                      └──────────┬───────────┘
                                 │
                     Sends video / Paste link
                                 │
                                 ▼
                      ┌──────────────────────┐
                      │  TELEGRAM BOT API    │
                      └──────────┬───────────┘
                                 │
                        Polling / Webhook
                                 │
                                 ▼
            ┌─────────────────────────────────────────┐
            │   FASTAPI EASY ACCESS BACKEND GATEWAY   │
            │  (app/main.py, app/telegram/bot.py)     │
            └────────────────────┬────────────────────┘
                                 │
               Validate size (<= 20 MB) & duration (<= 90s)
                                 │
                                 ▼
                     ┌───────────────────────┐
                     │ CENTRAL AI ANALYZER   │
                     │ (src/inference.py)    │
                     └───────────┬───────────┘
                                 │
       ┌─────────────────────────┼─────────────────────────┐
       ▼                         ▼                         ▼
Visual & Temporal          SyncNet & Voice          Scam NLP & OCR
EfficientNet-B0 + GRU    Lip-Sync & AudioCNN       Whisper & EasyOCR
       │                         │                         │
       └─────────────────────────┼─────────────────────────┘
                                 │
                                 ▼
                     Multimodal Risk Fusion
                                 │
                                 ▼
                      Structured Risk Report
                                 │
                                 ▼
              Concise Telegram Trust Report with Evidence
```

---

## 2. Requirements

- **Python**: 3.11+ (Windows, Linux, macOS)
- **FFmpeg**: Required for audio stream extraction and video validation
- **PyTorch & Torchvision**: (Installed in your virtual environment)
- **Telegram Account**: To create your bot via `@BotFather`

---

## 3. Installation

1. **Navigate to the backend directory**:
   ```powershell
   cd d:\Epoch1.0\backend
   ```

2. **Activate your Python environment**:
   ```powershell
   # Windows PowerShell
   ..\Video\.venv\Scripts\Activate.ps1
   ```

3. **Install dependencies**:
   ```powershell
   pip install -r requirements.txt
   ```

---

## 4. Telegram Bot Creation (@BotFather)

To get your bot token:
1. Open Telegram on your phone or desktop.
2. Search for the official bot: **`@BotFather`** (verified blue checkmark).
3. Send the command:
   ```
   /newbot
   ```
4. Choose a friendly name (e.g. `DeepTrust AI Detector`).
5. Choose a username ending in `bot` (e.g. `deeptrust_detector_bot`).
6. BotFather will provide your **API Token** formatted like:
   `1234567890:ABCdefGhIJKlmNoPQRsTUVwxyZ`
7. Copy this token and put it into your `.env` file (never share or commit this token).

---

## 5. Environment Variables Configuration

Copy `.env.example` to `.env`:
```powershell
cp .env.example .env
```

Open `.env` and fill in your token:
```env
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGhIJKlmNoPQRsTUVwxyZ
TELEGRAM_MODE=polling
MAX_VIDEO_SIZE_MB=20
MAX_VIDEO_DURATION_SECONDS=90
MAX_CONCURRENT_ANALYSES=1
ANALYSIS_TIMEOUT_SECONDS=120
TEMP_VIDEO_DIR=./tmp/videos
```

---

## 6. Local Development (Long Polling Mode)

In local development mode, **no HTTPS tunnel or public URL is required**. The bot connects to Telegram using long polling:

Run the FastAPI application:
```powershell
python -m app.main
```
or with Uvicorn:
```powershell
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

You will see in the terminal:
```
[INFO] Starting Telegram bot in LONG POLLING mode (Local Development)...
[INFO] Telegram Bot long polling is ACTIVE.
Uvicorn running on http://0.0.0.0:8000
```

Now open Telegram, search for your bot, click **Start**, and send a video clip!

---

## 7. Supported Telegram Commands

| Command | Action |
| :--- | :--- |
| **`/start`** | Displays bot welcome screen, capabilities, and format requirements |
| **`/status`** | Real-time status of detectors, GPU availability, and system limits |
| **`/help`** | Usage instructions and guidelines |
| **`/about`** | DeepTrust AI architecture and academic disclaimer |
| **`/example`** | Previews a sample DeepTrust detection report |

---

## 8. Interactive Evidence Buttons

When a detection report is delivered to Telegram, it includes interactive inline buttons:
- **`[🎬 Evidence]`**: Returns timestamped intervals detailing lip-sync or facial anomalies.
- **`[📝 Transcript]`**: Displays full transcribed speech from Whisper.
- **`[🔎 OCR Text]`**: Displays all on-screen detected text from EasyOCR.
- **`[📊 Full Diagnostics]`**: Displays technical model breakdown scores.
- **`[🔄 Analyze Again]`**: Prompts the user to send their next video clip.

---

## 9. Production Deployment (Webhook Mode)

For production deployment (e.g. AWS, GCP, Railway, Render):

1. Set in `.env`:
   ```env
   TELEGRAM_MODE=webhook
   TELEGRAM_WEBHOOK_URL=https://your-domain.com/api/telegram/webhook
   TELEGRAM_WEBHOOK_SECRET=your_custom_secret_token
   ```

2. Register your webhook with Telegram:
   ```bash
   curl -X POST "https://api.telegram.org/bot<YOUR_TOKEN>/setWebhook" \
     -d "url=https://your-domain.com/api/telegram/webhook" \
     -d "secret_token=your_custom_secret_token"
   ```

---

## 10. Running Automated Tests

Run the test suite with pytest:
```powershell
pytest tests/ -v
```

Tests cover:
- `/start`, `/help`, `/about`, `/status`, `/example` commands
- Video message parsing and size limits
- Duplicate message idempotency
- SSRF prevention on URLs
- OpenCV video decodability and duration validation
- Report formatting and missing modality handling
- Central analyzer output normalization

---

## 11. Security & Privacy Guarantees

1. **No Bot Token in Source Code**: Loaded strictly from `.env`.
2. **Download Limit Enforced**: Rejects files exceeding Telegram's 20 MB limit.
3. **OpenCV Decodability Check**: Rejects corrupted, zero-byte, or malicious media.
4. **Automatic File Cleanup**: All temporary files in `tmp/videos` are purged immediately upon analysis completion in a `finally` block.
5. **SSRF Protection**: Direct video URL queries are validated against private IPs, loopback, and cloud metadata (169.254.169.254).
6. **No Stack Trace Leaks**: Users receive clean, professional error explanations.
