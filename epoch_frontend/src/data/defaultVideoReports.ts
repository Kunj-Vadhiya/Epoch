import { VideoForensicReport } from "@/types/forensicOutput";

export const DEFAULT_FORENSIC_REPORTS: VideoForensicReport[] = [
  // 1. Video Case (Exact user video format)
  {
    id: "rep-2026-0894",
    case_number: "EVD-2026-0894",
    title: "Executive Deepfake Speech & Facial Swap Stream",
    description: "Multi-frame visual anomaly detected with peak displacement at 00:23.72s. Boundary jitter across mandibular jawline contour.",
    category: "VIDEO",
    risk_level: "HIGH",

    video_path: "d:\\videos\\unseen_video.mp4",
    video_stream_url: "https://vjs.zencdn.net/v/oceans.mp4",
    video_duration_seconds: 27.44,

    timestamp: "00:23.72",
    timestamp_seconds: 23.72,
    peak_anomaly_timestamp: "00:23.72",
    analysis_timestamp: "2026-10-03T03:35:15.418414",

    time_frame: "00:22.72 - 00:24.72",
    suspicious_time_frame: "00:22.72 - 00:24.72",
    video_time_frame: "00:00.00 - 00:27.44",

    prediction: "FAKE",
    deepfake: {
      probability: 0.9482
    },

    suspicious_intervals: [
      {
        time_frame: "00:00.00 - 00:25.56",
        start_timestamp: "00:00.00",
        end_timestamp: "00:25.56",
        start_seconds: 0.0,
        end_seconds: 25.56,
        type: "visual_anomaly",
        score: 0.9410
      },
      {
        time_frame: "00:22.72 - 00:24.72",
        start_timestamp: "00:22.72",
        end_timestamp: "00:24.72",
        start_seconds: 22.72,
        end_seconds: 24.72,
        type: "lip_sync_viseme_delta",
        score: 0.9680
      }
    ],

    frame_level_timeline: [
      { frame_index: 0, timestamp: "00:00.00", timestamp_seconds: 0.0, time_frame: "00:00.00", fake_probability: 0.5006, is_suspicious: true },
      { frame_index: 3, timestamp: "00:05.10", timestamp_seconds: 5.1, time_frame: "00:05.10", fake_probability: 0.5820, is_suspicious: true },
      { frame_index: 6, timestamp: "00:10.40", timestamp_seconds: 10.4, time_frame: "00:10.40", fake_probability: 0.6940, is_suspicious: true },
      { frame_index: 9, timestamp: "00:15.80", timestamp_seconds: 15.8, time_frame: "00:15.80", fake_probability: 0.8120, is_suspicious: true },
      { frame_index: 12, timestamp: "00:20.20", timestamp_seconds: 20.2, time_frame: "00:20.20", fake_probability: 0.8950, is_suspicious: true },
      { frame_index: 13, timestamp: "00:23.72", timestamp_seconds: 23.72, time_frame: "00:23.72", fake_probability: 0.9680, is_suspicious: true },
      { frame_index: 15, timestamp: "00:27.44", timestamp_seconds: 27.44, time_frame: "00:27.44", fake_probability: 0.7420, is_suspicious: false }
    ],

    is_scam: true,
    is_fake_news: true,
    fake_news_score: 0.96,
    scam_verdict: "HIGH_RISK_SCAM",
    media_authenticity: "SYNTHETIC_DEEPFAKE",
    transcript: "Thanks to which, by investing 22,000 rupees, you are guaranteed to earn 25.5 lakh rupees in the very first month. I am giving you a guaranteed way to earn 85,000 rupees within the next 24 hours, that is,",
    gemini_fact_check: {
      is_fake_news: true,
      is_scam: true,
      fake_news_score: 0.96,
      scam_score: 0.99,
      verdict: "HIGH_RISK_SCAM",
      credibility_status: "FABRICATED_FINANCIAL_FRAUD",
      explanation: "CONFIRMED FRAUD: Mathematically impossible 115x return scheme promising ₹25.5 Lakhs from ₹22,000 and guaranteed ₹85,000 within 24 hours with zero risk. No legal investment vehicle provides guaranteed instant multi-lakh returns.",
      highlighted_claims: [
        "₹22,000 to ₹25.5 Lakhs promise (115x return in 30 days)",
        "Guaranteed ₹85,000 in 24 hours",
        "100% Guaranteed profit promise"
      ],
      deceptive_tactics: [
        "unrealistic_astronomical_returns",
        "instant_daily_income_guarantee",
        "guaranteed_returns"
      ]
    },
    ocr_text: [
      "~PROJECT HAS",
      "32 :21",
      "YOUR PERSONAL REGISTRATION LINK IS BELOW THE VIDEO",
      "YOU ARE GUARANTEED",
      "05 : 32:13",
      "WITHIN THE NEXT 24 HOURS",
      "YOUR PERSONAL REGISTRATION LINK IS BELOW THE VIDEO"
    ],
    trigger_explanations: [
      "Gemini Fact-Check: CONFIRMED FRAUD: Mathematically impossible 115x return scheme promising ₹25.5 Lakhs from ₹22,000 and guaranteed ₹85,000 within 24 hours.",
      "Peak visual feature attention observed around 00:31.30.",
      "Synthetic voice generation detected in speech at 00:00.00–00:10.00.",
      "Synthetic voice generation detected in speech at 00:20.00–00:31.34.",
      "Mouth movement doesn't match speech at 00:00.00–00:31.30.",
      "Flagged typical fraud pattern: Guaranteed high returns / doubling money claims.",
      "Flagged typical fraud pattern: Artificial urgency / high-pressure FOMO tactics.",
      "Fake news-channel / unauthorized branding detected: News Broadcast Lower-Third Ticker."
    ],

    target_subject: "Tech Executive Impersonation",
    platform: "Reels / Ad Stream",
    sha256_checksum: "e7b99c42a8f09b5521b33fa439001b67f1c4df2e9871ab874ef6d99a314b8a21"
  },

  // 2. Audio Case (Exact user final audio format - 51.0s)
  {
    id: "rep-2026-0671",
    case_number: "EVD-2026-0671",
    title: "VoIP Audio Stream - Hybrid Speech Verification",
    description: "Authentic human conversation with isolated 9.0s neural voice clone insertion between 42.0s and 51.0s.",
    category: "AUDIO",
    risk_level: "MEDIUM",

    // User's exact final audio schema payload
    audio_duration_seconds: 51.0,
    prediction: "REAL",
    ai_probability: 0.192,
    confidence: "MEDIUM",

    timeline: [
      { timestamp_seconds: 5.0, ai_probability: 0.0 },
      { timestamp_seconds: 7.0, ai_probability: 0.0 },
      { timestamp_seconds: 9.0, ai_probability: 0.0 },
      { timestamp_seconds: 11.0, ai_probability: 0.0 },
      { timestamp_seconds: 15.0, ai_probability: 0.0 },
      { timestamp_seconds: 17.0, ai_probability: 0.0 },
      { timestamp_seconds: 19.0, ai_probability: 0.0 },
      { timestamp_seconds: 23.0, ai_probability: 0.0 },
      { timestamp_seconds: 25.0, ai_probability: 0.0 },
      { timestamp_seconds: 27.0, ai_probability: 0.0 },
      { timestamp_seconds: 31.0, ai_probability: 0.0 },
      { timestamp_seconds: 33.0, ai_probability: 0.0 },
      { timestamp_seconds: 35.0, ai_probability: 0.0 },
      { timestamp_seconds: 39.0, ai_probability: 0.0 },
      { timestamp_seconds: 41.0, ai_probability: 0.0 },
      { timestamp_seconds: 43.0, ai_probability: 0.0 },
      { timestamp_seconds: 46.5, ai_probability: 1.0 },
      { timestamp_seconds: 47.5, ai_probability: 1.0 },
      { timestamp_seconds: 48.5, ai_probability: 1.0 },
      { timestamp_seconds: 50.5, ai_probability: 1.0 }
    ],

    suspicious_segments: [
      {
        start_seconds: 42.0,
        end_seconds: 51.0,
        ai_probability: 1.0
      }
    ],

    audio_url: "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3",
    video_duration_seconds: 51.0,
    peak_anomaly_timestamp: "00:46.50",
    analysis_timestamp: "2026-10-03T03:38:12.891042",
    target_subject: "Telephony Audio Verification",
    platform: "VoIP Audio Track",
    sha256_checksum: "9f82c401b5a2f8910e34cba8291402fe0184bdae56019385c721830182410982"
  },

  // 3. Image Case (Low risk / authentic)
  {
    id: "rep-2026-0248",
    case_number: "EVD-2026-0248",
    title: "Verified Camera Sensor Press Conference",
    description: "Consistent Photo-Response Non-Uniformity (PRNU) noise patterns and natural ocular micro-saccades confirmed.",
    category: "IMAGE",
    risk_level: "LOW",

    video_path: "d:\\images\\press_conference_raw.jpg",
    video_stream_url: "https://vjs.zencdn.net/v/oceans.mp4",
    video_duration_seconds: 12.00,

    timestamp: "00:00.00",
    timestamp_seconds: 0.0,
    peak_anomaly_timestamp: "00:00.00",
    analysis_timestamp: "2026-10-02T18:40:02.991204",

    time_frame: "00:00.00 - 00:12.00",
    suspicious_time_frame: "None",
    video_time_frame: "00:00.00 - 00:12.00",

    prediction: "REAL",
    deepfake: {
      probability: 0.0840
    },

    suspicious_intervals: [],

    frame_level_timeline: [
      { frame_index: 0, timestamp: "00:00.00", timestamp_seconds: 0.0, time_frame: "00:00.00", fake_probability: 0.0840, is_suspicious: false },
      { frame_index: 4, timestamp: "00:04.00", timestamp_seconds: 4.0, time_frame: "00:04.00", fake_probability: 0.0610, is_suspicious: false },
      { frame_index: 8, timestamp: "00:08.00", timestamp_seconds: 8.0, time_frame: "00:08.00", fake_probability: 0.0920, is_suspicious: false },
      { frame_index: 12, timestamp: "00:12.00", timestamp_seconds: 12.0, time_frame: "00:12.00", fake_probability: 0.0750, is_suspicious: false }
    ],

    target_subject: "Live Official Briefing",
    platform: "Broadcast Clean Feed",
    sha256_checksum: "a314b8a21e7b99c42a8f09b5521b33fa439001b67f1c4df2e9871ab874ef6d99"
  }
];
