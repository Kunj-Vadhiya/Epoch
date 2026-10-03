import axios, { AxiosInstance, AxiosProgressEvent } from "axios";
import { VideoForensicReport, AudioForensicOutput } from "@/types/forensicOutput";

// Default backend configuration
const DEFAULT_PORT = "8000";
const STORAGE_PORT_KEY = "epoch_backend_port";

export const getBackendPort = (): string => {
  if (typeof window !== "undefined") {
    return localStorage.getItem(STORAGE_PORT_KEY) || DEFAULT_PORT;
  }
  return DEFAULT_PORT;
};

export const setBackendPort = (port: string): void => {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_PORT_KEY, port);
  }
};

export const getBaseApiUrl = (): string => {
  // Uses Next.js proxy route by default, or allows direct port connection
  return "";
};

// Create Axios Instance
export const apiClient: AxiosInstance = axios.create({
  baseURL: getBaseApiUrl(),
  timeout: 120000, // 120s for ML model inferences on CPU
  headers: {
    "Accept": "application/json",
  },
});

export interface HealthCheckResponse {
  status: string;
  modalities?: {
    audio?: string;
    video?: string;
    image?: string;
  };
  models?: Record<string, string>;
}

export interface ProgressCallback {
  (percentage: number, statusText: string): void;
}

/**
 * Forensic API Service Layer
 * Interacts with backend on localhost:8000 with Next.js CORS proxy rewrites
 */
export const forensicApi = {
  /**
   * Check system health status
   * GET /api/v1/health
   */
  async checkHealth(): Promise<HealthCheckResponse> {
    try {
      const response = await apiClient.get<HealthCheckResponse>("/api/v1/health");
      return response.data;
    } catch (error) {
      console.warn("Backend health check failed on localhost:8000 (Backend may be offline):", error);
      throw error;
    }
  },

  /**
   * Fetch sample output JSON for audio schema without uploading a file
   * GET /api/v1/audio/sample
   */
  async getAudioSample(): Promise<AudioForensicOutput> {
    try {
      const response = await apiClient.get<AudioForensicOutput>("/api/v1/audio/sample");
      return response.data;
    } catch (error) {
      console.warn("Could not fetch /api/v1/audio/sample from server. Using standard fallback audio JSON:", error);
      return {
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
        ]
      };
    }
  },

  /**
   * Fetch sample output JSON for video schema without uploading a file
   * GET /api/v1/video/sample
   */
  async getVideoSample(): Promise<any> {
    try {
      const response = await apiClient.get<any>("/api/v1/video/sample");
      return response.data;
    } catch (error) {
      console.warn("Could not fetch /api/v1/video/sample from server. Using standard fallback video JSON:", error);
      return {
        video_path: "d:\\videos\\unseen_video.mp4",
        video_duration_seconds: 27.44,
        timestamp: "00:23.72",
        timestamp_seconds: 23.72,
        peak_anomaly_timestamp: "00:23.72",
        analysis_timestamp: new Date().toISOString(),
        time_frame: "00:22.72 - 00:24.72",
        suspicious_time_frame: "00:22.72 - 00:24.72",
        video_time_frame: "00:00.00 - 00:27.44",
        prediction: "UNCERTAIN",
        deepfake: {
          probability: 0.5094
        },
        suspicious_intervals: [
          {
            time_frame: "00:00.00 - 00:25.56",
            start_timestamp: "00:00.00",
            end_timestamp: "00:25.56",
            start_seconds: 0.0,
            end_seconds: 25.56,
            type: "visual_anomaly",
            score: 0.5210
          }
        ],
        frame_level_timeline: [
          {
            frame_index: 0,
            timestamp: "00:00.00",
            timestamp_seconds: 0.0,
            time_frame: "00:00.00",
            fake_probability: 0.5006,
            is_suspicious: true
          },
          {
            frame_index: 13,
            timestamp: "00:23.72",
            timestamp_seconds: 23.72,
            time_frame: "00:23.72",
            fake_probability: 0.9680,
            is_suspicious: true
          }
        ]
      };
    }
  },

  /**
   * Analyze audio file using AudioCNN model
   * POST /api/v1/audio/analyze (or alias /analyze-audio)
   * @param file Audio file to upload
   * @param onProgress Optional progress callback
   */
  async analyzeAudio(file: File, onProgress?: ProgressCallback): Promise<AudioForensicOutput> {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await apiClient.post<AudioForensicOutput>("/api/v1/audio/analyze", formData, {
        onUploadProgress: (progressEvent: AxiosProgressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress?.(percent, `Uploading Audio (${percent}%)...`);
          }
        },
      });
      return response.data;
    } catch (proxyErr) {
      console.warn("Proxy call failed, connecting directly to backend at 127.0.0.1:8000...", proxyErr);
      const direct = await axios.post<AudioForensicOutput>("http://127.0.0.1:8000/api/v1/audio/analyze", formData, {
        timeout: 120000,
        onUploadProgress: (progressEvent: AxiosProgressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress?.(percent, `Uploading Audio (${percent}%)...`);
          }
        },
      });
      return direct.data;
    }
  },

  /**
   * Analyze video file for deepfake and scam ad detection
   * POST /api/v1/video/analyze (or alias /analyze-video)
   * @param file Video file to upload
   * @param onProgress Optional progress callback
   */
  async analyzeVideo(file: File, onProgress?: ProgressCallback): Promise<any> {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await apiClient.post<any>("/api/v1/video/analyze", formData, {
        onUploadProgress: (progressEvent: AxiosProgressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress?.(percent, `Uploading Video Stream (${percent}%)...`);
          }
        },
      });
      return response.data;
    } catch (proxyErr) {
      console.warn("Proxy call failed, connecting directly to backend at 127.0.0.1:8000...", proxyErr);
      const direct = await axios.post<any>("http://127.0.0.1:8000/api/v1/video/analyze", formData, {
        timeout: 120000,
        onUploadProgress: (progressEvent: AxiosProgressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress?.(percent, `Uploading Video Stream (${percent}%)...`);
          }
        },
      });
      return direct.data;
    }
  },

  /**
   * Analyze image file for photo deepfakes & inpainting
   * POST /api/v1/image/analyze
   * @param file Image file to upload
   * @param onProgress Optional progress callback
   */
  async analyzeImage(file: File, onProgress?: ProgressCallback): Promise<any> {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await apiClient.post<any>("/api/v1/image/analyze", formData, {
        onUploadProgress: (progressEvent: AxiosProgressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress?.(percent, `Uploading Image File (${percent}%)...`);
          }
        },
      });
      return response.data;
    } catch (proxyErr) {
      console.warn("Proxy call failed, connecting directly to backend at 127.0.0.1:8000...", proxyErr);
      const direct = await axios.post<any>("http://127.0.0.1:8000/api/v1/image/analyze", formData, {
        timeout: 120000,
        onUploadProgress: (progressEvent: AxiosProgressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress?.(percent, `Uploading Image File (${percent}%)...`);
          }
        },
      });
      return direct.data;
    }
  },
};
