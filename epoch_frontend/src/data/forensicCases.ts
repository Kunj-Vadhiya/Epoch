export type MediaModality = 'VIDEO' | 'IMAGE' | 'AUDIO';

export interface AnomalyMarker {
  id: string;
  timestamp: number; // in seconds
  formattedTime: string;
  category: 'FACIAL_WARP' | 'LIP_SYNC_DELTA' | 'AUDIO_CLONING' | 'SCAM_SIGNAL' | 'SYNTHETIC_TEXTURE' | 'ELA_INPAINTING' | 'VOCODER_PHASE';
  severity: 'HIGH_RISK' | 'WARNING' | 'ANOMALOUS';
  title: string;
  subtitle: string;
  confidence: number; // 0-100%
  description: string;
  forensicEvidence: {
    metric: string;
    value: string;
    baseline: string;
    p_value: string;
    coordinates?: { x: number; y: number; width: number; height: number };
    timeRange?: { start: string; end: string; durationSec: number };
    affectedArea: string;
    technicalDetails: string[];
  };
}

export interface RegionMask {
  id: string;
  label: string;
  type: 'FAKE' | 'REAL' | 'AMBIGUOUS';
  coordinates: { x: number; y: number; width: number; height: number };
  confidence: number;
  reason: string;
  elaVariance: number;
}

export interface AudioAnomalyInterval {
  id: string;
  startTime: number;
  endTime: number;
  startFormatted: string;
  endFormatted: string;
  anomalyType: 'VOCODER_PHASE_BREAK' | 'PITCH_FLATTENING' | 'SYNTHETIC_FORMANT' | 'SPECTRAL_SILENCE';
  confidence: number;
  severity: 'HIGH_RISK' | 'WARNING';
  description: string;
  frequencyBand: string;
}

export interface ForensicCase {
  id: string;
  caseNumber: string;
  title: string;
  modality: MediaModality;
  targetSubject: string;
  sourcePlatform: string;
  mediaType: string;
  mediaUrl: string;
  mediaThumbUrl: string;
  rawImageUrl?: string;
  elaHeatmapUrl?: string;
  audioWaveUrl?: string;
  duration?: number; // in seconds for audio/video
  overallRiskScore: number; // 0-100
  riskVerdict: 'CRITICAL_MANIPULATION' | 'HIGH_RISK_FRAUD' | 'SUSPICIOUS' | 'VERIFIED_AUTHENTIC';
  verdictCategory: 'HIGH' | 'MEDIUM' | 'LOW';
  sha256Checksum: string;
  ingestionDate: string;
  analyzedFrames?: number;
  fps?: number;
  accuracyScore: number; // Detection confidence %
  metrics: {
    syntheticMediaScore: number;
    scamSignalsScore: number;
    audioCloningScore: number;
    lipSyncDeltaMs?: number;
    eyeGazeDivergence?: number;
    boundaryBlurSeamPValue?: number;
    elaCompressionScore?: number;
  };
  summary: string;
  plainLanguageVerdict: string;
  recommendedAction: string;
  anomalies: AnomalyMarker[];
  regionMasks?: RegionMask[]; // For Image modality
  audioIntervals?: AudioAnomalyInterval[]; // For Audio modality
  scamSignals?: {
    type: 'FINANCIAL_PROMISE' | 'RED_FLAG_URL' | 'AUTHORITY_IMPERSONATION' | 'ARTIFICIAL_URGENCY';
    detectedText: string;
    riskScore: number;
    foundAt: string;
    nlpExplanation: string;
  }[];
  audioSpectralData: {
    frequency: number;
    syntheticArtifactsDetected: boolean;
    vocoderDiscontinuityScore: number;
  }[];
}

export const MULTI_MODAL_CASES: ForensicCase[] = [
  // CASE 1: Video Multi-Modal (Deepfake + Scam Ad)
  {
    id: "case-video-089",
    caseNumber: "EVD-2026-0894X",
    title: "Fake CEO & Minister Guaranteed ₹85,000 Daily AI Trading Scheme",
    modality: "VIDEO",
    targetSubject: "Prominent Tech Executive & Finance Minister Deepfake Swap",
    sourcePlatform: "Instagram Reels & YouTube Shorts Ad",
    mediaType: "MP4 / H.264 (Forensic Stream)",
    mediaUrl: "https://vjs.zencdn.net/v/oceans.mp4",
    mediaThumbUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=800&q=80",
    duration: 46,
    overallRiskScore: 87,
    accuracyScore: 96.8,
    riskVerdict: "CRITICAL_MANIPULATION",
    verdictCategory: "HIGH",
    sha256Checksum: "e7b99c42a8f09b5521b33fa439001b67f1c4df2e9871ab874ef6d99a314b8a21",
    ingestionDate: "2026-10-02 14:22:08 UTC",
    analyzedFrames: 960,
    fps: 30,
    metrics: {
      syntheticMediaScore: 92,
      scamSignalsScore: 88,
      audioCloningScore: 81,
      lipSyncDeltaMs: -140, // audio leads mouth by 140ms
      eyeGazeDivergence: 78,
      boundaryBlurSeamPValue: 0.0001,
    },
    summary: "Multi-layer generative synthesis detected. Visual stream exhibits boundary blending artifacts along the chin-jaw contour and 468-point landmark jitter. Audio stream is a fine-tuned XTTS/ElevenLabs voice clone with robotic pitch flattening. High-risk NLP engine flagged WhatsApp VIP group redirection with illegal ₹85,000/day return claims.",
    plainLanguageVerdict: "This video is CONFIRMED FAKE. The speaker's face has been digitally swapped using artificial intelligence, the voice is an automated clone, and the video is designed to funnel victims into a fraudulent WhatsApp investment scam.",
    recommendedAction: "Issue immediate takedown request under IT Rules / Fraudulent Ad Policy. Block destination WhatsApp link and report payment funnel.",
    anomalies: [
      {
        id: "ano-v1",
        timestamp: 4.2,
        formattedTime: "00:04",
        category: "FACIAL_WARP",
        severity: "HIGH_RISK",
        title: "Facial Landmark Mesh & Seam Discontinuity",
        subtitle: "Spatial warping along zygomatic and mandibular boundary",
        confidence: 94.8,
        description: "Significant warping and pixel blur variance identified along the jawline contour. Delaunay triangulation of the 468-point facial mesh shows a 22.4% positional jitter between frame 124 and frame 138, characteristic of a GAN-based face swap overlay.",
        forensicEvidence: {
          metric: "Mesh Boundary Jitter (MBJ)",
          value: "22.4% displacement",
          baseline: "< 2.1% in natural footage",
          p_value: "p < 0.0001",
          coordinates: { x: 28, y: 32, width: 44, height: 48 },
          affectedArea: "Mandibular contour & lower lip region",
          technicalDetails: [
            "Bilinear interpolation blurring detected along 18 landmark boundary nodes",
            "Spectral power density loss at high frequency facial texture (skin pores)",
            "Gaze vector deviates 18.2° from head pose normal axis"
          ]
        }
      },
      {
        id: "ano-v2",
        timestamp: 7.5,
        formattedTime: "00:07",
        category: "LIP_SYNC_DELTA",
        severity: "HIGH_RISK",
        title: "Phoneme-Viseme Lip-Sync Delta Mismatch",
        subtitle: "Acoustic audio precedes bilabial mouth closure by 140ms",
        confidence: 91.2,
        description: "Waveform analysis of the plosive consonant /p/ in 'Platform' occurs at 00:07.12, whereas visual lip closure occurs at 00:07.26. This 140ms temporal offset exceeds natural speech tolerance by over 300%.",
        forensicEvidence: {
          metric: "Audio-Visual Temporal Asynchrony",
          value: "-140 ms delay",
          baseline: "± 25 ms natural alignment",
          p_value: "p = 0.0004",
          coordinates: { x: 38, y: 54, width: 24, height: 18 },
          affectedArea: "Perioral / Oral fissure viseme dynamics",
          technicalDetails: [
            "Lip aperture index is 1.48 during acoustic stop burst /p/",
            "Wav2Lip latent feature correlation dropped to 0.18",
            "Temporal optical flow discontinuity detected at frame 225"
          ]
        }
      },
      {
        id: "ano-v3",
        timestamp: 12.8,
        formattedTime: "00:12",
        category: "AUDIO_CLONING",
        severity: "WARNING",
        title: "Voice Cloning Spectral Artifacts",
        subtitle: "Vocoder phase discontinuity & unnatural formant clustering",
        confidence: 86.5,
        description: "Short-Time Fourier Transform (STFT) reveals robotic harmonic suppression in the 3.2 kHz – 4.8 kHz frequency band. Pitch contour demonstrates unnatural flatness with zero micro-prosodic pitch drift, typical of synthesized neural TTS.",
        forensicEvidence: {
          metric: "Spectral Flux Anomaly Index",
          value: "0.84 SFAI",
          baseline: "< 0.22 SFAI",
          p_value: "p = 0.002",
          timeRange: { start: "00:11.40", end: "00:14.80", durationSec: 3.4 },
          affectedArea: "3.2 kHz – 4.8 kHz acoustic spectrum",
          technicalDetails: [
            "Zero pitch micro-tremor detected across 800ms phonation",
            "Phase inconsistencies at Mel-spectrogram bin transitions",
            "Background noise floor synthetic silence during voiced intervals"
          ]
        }
      },
      {
        id: "ano-v4",
        timestamp: 19.4,
        formattedTime: "00:19",
        category: "SCAM_SIGNAL",
        severity: "HIGH_RISK",
        title: "Fraudulent Return Claim & WhatsApp Funnel",
        subtitle: "Linguistic fraud pattern: 'Guaranteed ₹85,000 daily' + VIP Link",
        confidence: 96.0,
        description: "OCR overlay text extraction matched high-risk financial fraud patterns. The video pairs a falsified government regulatory stamp with an urgent directive to join a private WhatsApp/Telegram trading funnel.",
        forensicEvidence: {
          metric: "Scam Linguistic Vector Score",
          value: "96 / 100 Risk",
          baseline: "< 15 / 100 Legitimate",
          p_value: "p < 0.00001",
          coordinates: { x: 12, y: 72, width: 76, height: 22 },
          affectedArea: "Lower-third banner and transcript NLP",
          technicalDetails: [
            "Explicit promise of 100% risk-free daily financial yield",
            "Counterfeit RBI / Ministry of Finance emblem watermark detected",
            "WhatsApp short-link redirection (wa.me/...) in video overlay"
          ]
        }
      }
    ],
    scamSignals: [
      {
        type: "FINANCIAL_PROMISE",
        detectedText: "Deposit ₹5,000 today and receive ₹85,000 every single morning guaranteed by new AI policy.",
        riskScore: 98,
        foundAt: "00:18 - 00:24",
        nlpExplanation: "Guaranteed fixed return promise exceeding 1600% daily ROI with synthetic authoritative endorsement."
      },
      {
        type: "AUTHORITY_IMPERSONATION",
        detectedText: "APPROVED BY RESERVE BANK & MINISTRY OF DIGITAL INFRASTRUCTURE",
        riskScore: 95,
        foundAt: "00:02 - 00:30",
        nlpExplanation: "Falsified regulatory badge overlaid to deceive retail users into trusting unverified payment gateway."
      },
      {
        type: "RED_FLAG_URL",
        detectedText: "Click link below -> Join VIP WhatsApp Group before 50 slots fill up!",
        riskScore: 92,
        foundAt: "00:25 - 00:32",
        nlpExplanation: "High-risk redirection funnel leading to unmoderated end-to-end encrypted chat group for money transfer."
      }
    ],
    audioSpectralData: [
      { frequency: 250, syntheticArtifactsDetected: false, vocoderDiscontinuityScore: 0.12 },
      { frequency: 1000, syntheticArtifactsDetected: false, vocoderDiscontinuityScore: 0.19 },
      { frequency: 2400, syntheticArtifactsDetected: true, vocoderDiscontinuityScore: 0.74 },
      { frequency: 3800, syntheticArtifactsDetected: true, vocoderDiscontinuityScore: 0.89 },
      { frequency: 5200, syntheticArtifactsDetected: true, vocoderDiscontinuityScore: 0.82 },
      { frequency: 7500, syntheticArtifactsDetected: false, vocoderDiscontinuityScore: 0.31 }
    ]
  },

  // CASE 2: Image Modality (Spatial Real vs Fake Region Marks)
  {
    id: "case-img-024",
    caseNumber: "EVD-2026-0248I",
    title: "Synthesized Political Candidate Photo with Inpainted Background",
    modality: "IMAGE",
    targetSubject: "High-Resolution Generative Face Swap on Authentic Podium",
    sourcePlatform: "X (formerly Twitter) Viral News Post",
    mediaType: "JPEG / RGB (2400x1600)",
    mediaUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=80",
    mediaThumbUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80",
    rawImageUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=80",
    overallRiskScore: 82,
    accuracyScore: 95.4,
    riskVerdict: "CRITICAL_MANIPULATION",
    verdictCategory: "HIGH",
    sha256Checksum: "44b20199fe71cb339029aab18012cc4ef991024ab771029cde882910fa883921",
    ingestionDate: "2026-10-02 17:05:14 UTC",
    metrics: {
      syntheticMediaScore: 89,
      scamSignalsScore: 12,
      audioCloningScore: 0,
      eyeGazeDivergence: 68,
      elaCompressionScore: 92,
      boundaryBlurSeamPValue: 0.0002,
    },
    summary: "Spatial forensic analysis reveals composite generation. Error Level Analysis (ELA) and Fourier transform noise prints identify high compression variance around the facial mask (eyes, nose, mouth) compared to the authentic clothing and podium background. Asymmetrical corneal specular lighting proves synthetic insertion.",
    plainLanguageVerdict: "This photograph is a COMPOSITE FAKE. The face has been synthetically grafted onto another person's body using an AI generative inpainting model. The surrounding clothing and podium background are authentic.",
    recommendedAction: "Flag as manipulated media with provenance watermark. Notify fact-checking network.",
    regionMasks: [
      {
        id: "mask-1",
        label: "Synthesized Facial Inpainting (AI Face)",
        type: "FAKE",
        coordinates: { x: 32, y: 18, width: 36, height: 46 },
        confidence: 96.4,
        reason: "ELA compression anomaly: 92% higher quantization error than surrounding pixels. Zero natural pore texture, smoothed skin gradient.",
        elaVariance: 92
      },
      {
        id: "mask-2",
        label: "Authentic Clothing & Shoulders",
        type: "REAL",
        coordinates: { x: 18, y: 64, width: 64, height: 34 },
        confidence: 98.1,
        reason: "Natural weave fiber noise, organic shadow gradient matching camera sensor baseline.",
        elaVariance: 4
      },
      {
        id: "mask-3",
        label: "Authentic Background Environment",
        type: "REAL",
        coordinates: { x: 2, y: 2, width: 96, height: 28 },
        confidence: 97.5,
        reason: "Consistent ISO 400 camera sensor grain and natural optical bokeh falloff.",
        elaVariance: 6
      },
      {
        id: "mask-4",
        label: "Corneal Specular Glint Asymmetry",
        type: "FAKE",
        coordinates: { x: 42, y: 32, width: 16, height: 10 },
        confidence: 91.8,
        reason: "Left eye shows dual light sources at 45°, right eye shows single ambient reflection.",
        elaVariance: 84
      }
    ],
    anomalies: [
      {
        id: "ano-i1",
        timestamp: 0,
        formattedTime: "00:00",
        category: "ELA_INPAINTING",
        severity: "HIGH_RISK",
        title: "Error Level Analysis (ELA) Quantization Discontinuity",
        subtitle: "High compression delta on facial region vs torso",
        confidence: 96.4,
        description: "When resaved at 95% JPEG quality, the facial crop exhibits an error level delta of +38.4 units compared to the torso. This proves the face was composited from an external high-noise image generator.",
        forensicEvidence: {
          metric: "ELA Mean Pixel Delta",
          value: "Δ 38.4 units",
          baseline: "Δ < 4.2 units",
          p_value: "p < 0.0001",
          coordinates: { x: 32, y: 18, width: 36, height: 46 },
          affectedArea: "Facial oval (eyebrows to chin)",
          technicalDetails: [
            "Quantization table mismatch between 8x8 DCT blocks",
            "Laplacian edge variance indicates Gaussian smoothing along seam"
          ]
        }
      }
    ],
    audioSpectralData: []
  },

  // CASE 3: Audio Modality (Voice Cloning & Robocall with Error Timeframes)
  {
    id: "case-audio-067",
    caseNumber: "EVD-2026-0671A",
    title: "Urgent Bank Fraud Alert Phone Call (Cloned Executive Voice)",
    modality: "AUDIO",
    targetSubject: "Synthesized Bank Security Officer Phishing Wire Transfer",
    sourcePlatform: "VoIP Telecom Robocall Recording",
    mediaType: "WAV / 48kHz 24-bit PCM",
    mediaUrl: "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3",
    mediaThumbUrl: "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=800&q=80",
    duration: 28,
    overallRiskScore: 91,
    accuracyScore: 97.2,
    riskVerdict: "CRITICAL_MANIPULATION",
    verdictCategory: "HIGH",
    sha256Checksum: "bb198300fc771890ab2230198afe991024ab771029cde882910fa8839210089a",
    ingestionDate: "2026-10-02 21:11:45 UTC",
    metrics: {
      syntheticMediaScore: 0,
      scamSignalsScore: 94,
      audioCloningScore: 96,
      boundaryBlurSeamPValue: 0.0001,
    },
    summary: "Voice cloning engine identified (Tortoise/XTTS architecture). High-precision spectral analysis mapped two distinct error timeframes where synthetic vocoder phase breaks and robotic fundamental frequency ($F_0$) pitch flattening occur. NLP confirms urgent demand for OTP verification.",
    plainLanguageVerdict: "This audio recording is a CONFIRMED SYNTHETIC CLONE. The caller's voice is computer-generated. The caller claims to be a bank security executive demanding an emergency wire transfer, which is an active social engineering fraud.",
    recommendedAction: "Report origin VoIP SIP trunk to national telecommunications registry. Freeze recipient transaction account.",
    audioIntervals: [
      {
        id: "int-1",
        startTime: 3.2,
        endTime: 7.8,
        startFormatted: "00:03.20",
        endFormatted: "00:07.80",
        anomalyType: "PITCH_FLATTENING",
        confidence: 96.5,
        severity: "HIGH_RISK",
        description: "Robotic fundamental frequency flattening. Fundamental pitch $F_0$ stays locked at 124.0 Hz with zero physiological vocal cord micro-jitter across 4.6 seconds.",
        frequencyBand: "100 Hz – 300 Hz"
      },
      {
        id: "int-2",
        startTime: 14.5,
        endTime: 19.2,
        startFormatted: "00:14.50",
        endFormatted: "00:19.20",
        anomalyType: "VOCODER_PHASE_BREAK",
        confidence: 94.2,
        severity: "HIGH_RISK",
        description: "Neural vocoder phase discontinuity during emergency call-to-action ('Transfer funds immediately to escrow account'). Spectral floor drops to digital silence between words.",
        frequencyBand: "3.2 kHz – 5.5 kHz"
      },
      {
        id: "int-3",
        startTime: 23.0,
        endTime: 27.5,
        startFormatted: "00:23.00",
        endFormatted: "00:27.50",
        anomalyType: "SYNTHETIC_FORMANT",
        confidence: 88.9,
        severity: "WARNING",
        description: "Unnatural formant clustering at second harmonic $F_2$, characteristic of zero-shot voice cloning latent embeddings.",
        frequencyBand: "1.8 kHz – 2.6 kHz"
      }
    ],
    anomalies: [
      {
        id: "ano-a1",
        timestamp: 4.5,
        formattedTime: "00:04",
        category: "VOCODER_PHASE",
        severity: "HIGH_RISK",
        title: "Voice Cloning Neural Vocoder Glitch",
        subtitle: "Unnatural pitch lockdown & digital silence gap at 00:03.20 - 00:07.80",
        confidence: 96.5,
        description: "Mel-spectrogram analysis shows synthetic pitch stability at 124 Hz without human vocal cord micro-tremor. Clear signature of neural zero-shot TTS model.",
        forensicEvidence: {
          metric: "Pitch Micro-Prosody Variance",
          value: "0.01 Hz Jitter",
          baseline: "1.4 - 3.8 Hz in human speech",
          p_value: "p < 0.00001",
          timeRange: { start: "00:03.20", end: "00:07.80", durationSec: 4.6 },
          affectedArea: "Vocal tract harmonics (100 Hz - 5.5 kHz)",
          technicalDetails: [
            "Synthetic digital silence in inter-syllable pauses",
            "Missing vocal fry at phrase termination"
          ]
        }
      }
    ],
    scamSignals: [
      {
        type: "FINANCIAL_PROMISE",
        detectedText: "Your account is flagged for immediate seizure unless you authorize transfer to secure holding node.",
        riskScore: 98,
        foundAt: "00:12 - 00:22",
        nlpExplanation: "High-pressure urgency trigger combined with unauthorized escrow routing."
      }
    ],
    audioSpectralData: [
      { frequency: 250, syntheticArtifactsDetected: true, vocoderDiscontinuityScore: 0.92 },
      { frequency: 1000, syntheticArtifactsDetected: true, vocoderDiscontinuityScore: 0.88 },
      { frequency: 2400, syntheticArtifactsDetected: true, vocoderDiscontinuityScore: 0.94 },
      { frequency: 3800, syntheticArtifactsDetected: true, vocoderDiscontinuityScore: 0.96 },
      { frequency: 5200, syntheticArtifactsDetected: true, vocoderDiscontinuityScore: 0.87 },
      { frequency: 7500, syntheticArtifactsDetected: false, vocoderDiscontinuityScore: 0.22 }
    ]
  },

  // CASE 4: Control Baseline (Authentic Control)
  {
    id: "case-control-001",
    caseNumber: "EVD-2026-0012A",
    title: "Official Government Press Conference - Authentic Baseline Control",
    modality: "VIDEO",
    targetSubject: "Accredited Spokesperson Live Press Briefing",
    sourcePlatform: "Public Broadcaster Official Feed",
    mediaType: "MP4 / H.264 (1920x1080 Landscape)",
    mediaUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=800&q=80",
    mediaThumbUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=800&q=80",
    duration: 30,
    overallRiskScore: 4,
    accuracyScore: 99.2,
    riskVerdict: "VERIFIED_AUTHENTIC",
    verdictCategory: "LOW",
    sha256Checksum: "11a0088fe7bc449012cdfae0192837bc991024ab771029cde882910fa8839210",
    ingestionDate: "2026-10-02 11:00:00 UTC",
    analyzedFrames: 900,
    fps: 30,
    metrics: {
      syntheticMediaScore: 3,
      scamSignalsScore: 1,
      audioCloningScore: 4,
      lipSyncDeltaMs: 4,
      eyeGazeDivergence: 5,
      boundaryBlurSeamPValue: 0.92,
    },
    summary: "Baseline control file verified authentic across all 6 diagnostic vector tests. Natural micro-pore skin texture, organic 18 blinks/min rate, specular corneal alignment matching key-lighting, and audio-viseme lip sync within ±4ms.",
    plainLanguageVerdict: "This media is VERIFIED AUTHENTIC. No signs of generative AI manipulation, voice cloning, face synthesis, or fraudulent scam patterns detected.",
    recommendedAction: "Archive as authentic evidence baseline. No mitigation required.",
    anomalies: [],
    audioSpectralData: [
      { frequency: 250, syntheticArtifactsDetected: false, vocoderDiscontinuityScore: 0.02 },
      { frequency: 1000, syntheticArtifactsDetected: false, vocoderDiscontinuityScore: 0.04 },
      { frequency: 2400, syntheticArtifactsDetected: false, vocoderDiscontinuityScore: 0.03 },
      { frequency: 3800, syntheticArtifactsDetected: false, vocoderDiscontinuityScore: 0.05 },
      { frequency: 5200, syntheticArtifactsDetected: false, vocoderDiscontinuityScore: 0.03 },
      { frequency: 7500, syntheticArtifactsDetected: false, vocoderDiscontinuityScore: 0.01 }
    ]
  }
];
