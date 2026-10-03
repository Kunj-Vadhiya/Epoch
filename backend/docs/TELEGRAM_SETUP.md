# DeepTrust AI: Telegram Bot Setup & Deployment Guide

This guide walks you through setting up and connecting your Telegram bot to the DeepTrust AI deepfake detection backend.

---

## 1. Create Your Telegram Bot with @BotFather

1. Open your Telegram app on mobile or desktop.
2. In the search bar, search for **`@BotFather`** (ensure it has the official blue verification badge).
3. Tap **Start** or send `/start`.
4. Send the command:
   ```
   /newbot
   ```
5. **Choose a Name**: Enter a display name for your bot, e.g.:
   `DeepTrust AI Detector`
6. **Choose a Username**: Enter a unique username ending in `bot`, e.g.:
   `deeptrust_scam_detector_bot`
7. BotFather will reply with a congratulatory message containing your **HTTP API Token**:
   ```
   Use this token to access the HTTP API:
   1234567890:ABCdefGhIJKlmNoPQRsTUVwxyZ
   ```
   > ⚠️ **CRITICAL SECURITY RULE:** Never paste this token into chat or commit it to GitHub.

---

## 2. Configure Your Local Environment

1. Navigate to the backend folder:
   ```powershell
   cd d:\Epoch1.0\backend
   ```

2. Create your `.env` file from the template:
   ```powershell
   Copy-Item .env.example .env
   ```

3. Open `.env` and add your bot token:
   ```env
   TELEGRAM_BOT_TOKEN=1234567890:ABCdefGhIJKlmNoPQRsTUVwxyZ
   TELEGRAM_MODE=polling
   MAX_VIDEO_SIZE_MB=20
   MAX_VIDEO_DURATION_SECONDS=90
   MAX_CONCURRENT_ANALYSES=1
   ```

---

## 3. Run Locally (Long Polling Mode)

In polling mode, you **do not need ngrok, HTTPS tunnels, or domain names**.

Start the server using your virtual environment Python:
```powershell
& "D:\Epoch1.0\Video\.venv\Scripts\python.exe" -m app.main
```

You will see:
```
[INFO] Starting Telegram bot in LONG POLLING mode (Local Development)...
[INFO] Telegram Bot long polling is ACTIVE.
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

---

## 4. Test the Bot from Telegram

1. Open Telegram and search for your bot username (e.g. `@deeptrust_scam_detector_bot`).
2. Tap **START** or send `/start`.
3. The bot will reply immediately with the DeepTrust AI welcome message and capabilities.
4. Drag and drop or attach a video clip (under 20 MB).
5. The bot will reply:
   ```
   🔍 Video received.

   Analyzing:
   🎭 Facial manipulation
   👄 Lip-sync
   🎙️ Synthetic voice
   📝 Speech
   🔎 On-screen text
   🚨 Scam signals

   Please wait...
   ```
6. In ~15–30 seconds, the bot will deliver the complete trust report with interactive evidence buttons:
   ```
   🛡️ DEEPTRUST AI REPORT
   ━━━━━━━━━━━━━━━━━━
   Overall Risk: 🔴 HIGH RISK
   ...
   ```
7. Click **`[🎬 Evidence]`** or **`[📝 Transcript]`** to interact with the inline buttons.

---

## 5. Webhook Mode Deployment (Production)

If deploying to a production server with a public HTTPS URL (e.g. Railway, Render, AWS, GCP):

1. Update `.env`:
   ```env
   TELEGRAM_MODE=webhook
   TELEGRAM_WEBHOOK_URL=https://your-domain.com/api/telegram/webhook
   TELEGRAM_WEBHOOK_SECRET=your_random_secret_token
   ```

2. Register the webhook with Telegram:
   ```bash
   curl -F "url=https://your-domain.com/api/telegram/webhook" \
        -F "secret_token=your_random_secret_token" \
        "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook"
   ```

3. Telegram will now deliver all incoming video messages directly to `POST /api/telegram/webhook`.
