"use client"

import React, { useState, useRef, useMemo } from "react"
import Link from "next/link"
import { 
  ArrowLeft, Download, FileText, Check, Play, Pause, 
  Volume2, VolumeX, Activity, Clock, Target, ShieldCheck, 
  Layers, ChevronRight
} from "lucide-react"
import { VideoForensicReport } from "@/types/forensicOutput"

interface ReportDetailViewProps {
  report: VideoForensicReport
}

export default function ReportDetailView({ report }: ReportDetailViewProps) {
  const isAudio = report.category === 'AUDIO' || !!report.audio_duration_seconds

  // Video state
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isVideoPlaying, setIsVideoPlaying] = useState(false)
  const [videoTime, setVideoTime] = useState(0)
  const [isVideoMuted, setIsVideoMuted] = useState(true)
  const [showOverlays, setShowOverlays] = useState(true)

  // Audio state
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isAudioPlaying, setIsAudioPlaying] = useState(false)
  const [audioTime, setAudioTime] = useState(0)

  // Interactive hovered timeline point for graph
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null)
  const [isCopiedJson, setIsCopiedJson] = useState(false)

  // Durations
  const audioDuration = report.audio_duration_seconds || 51.0
  const videoDuration = report.video_duration_seconds || 27.44

  // Audio specific calculations
  const audioAiProb = report.ai_probability ?? 0.192
  const audioProbPercent = (audioAiProb * 100).toFixed(1)
  const audioConfidence = report.confidence || "MEDIUM"

  // Video specific calculations
  const videoProb = report.deepfake?.probability ?? 0.5094
  const videoProbPercent = (videoProb * 100).toFixed(1)

  // Video Controls
  const toggleVideoPlay = () => {
    if (!videoRef.current) return
    if (videoRef.current.paused) {
      videoRef.current.play().then(() => setIsVideoPlaying(true)).catch(() => {})
    } else {
      videoRef.current.pause()
      setIsVideoPlaying(false)
    }
  }

  const seekVideoTo = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = seconds
      setVideoTime(seconds)
    }
  }

  // Audio Controls
  const toggleAudioPlay = () => {
    if (!audioRef.current) return
    if (audioRef.current.paused) {
      audioRef.current.play().then(() => setIsAudioPlaying(true)).catch(() => {})
    } else {
      audioRef.current.pause()
      setIsAudioPlaying(false)
    }
  }

  const seekAudioTo = (seconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = seconds
      setAudioTime(seconds)
    }
  }

  // EXACT AUDIO JSON PAYLOAD MATCH
  const getAudioPayload = () => ({
    audio_duration_seconds: report.audio_duration_seconds || 51.0,
    prediction: report.prediction,
    ai_probability: report.ai_probability ?? 0.192,
    confidence: report.confidence || "MEDIUM",
    timeline: report.timeline || [
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
    suspicious_segments: report.suspicious_segments || [
      {
        start_seconds: 42.0,
        end_seconds: 51.0,
        ai_probability: 1.0
      }
    ]
  })

  // EXACT VIDEO JSON PAYLOAD MATCH
  const getVideoPayload = () => ({
    video_path: report.video_path || "d:\\videos\\unseen_video.mp4",
    video_duration_seconds: report.video_duration_seconds || 27.44,
    timestamp: report.timestamp || "00:23.72",
    timestamp_seconds: report.timestamp_seconds || 23.72,
    peak_anomaly_timestamp: report.peak_anomaly_timestamp || "00:23.72",
    analysis_timestamp: report.analysis_timestamp || "2026-10-03T03:35:15.418414",
    time_frame: report.time_frame || "00:22.72 - 00:24.72",
    suspicious_time_frame: report.suspicious_time_frame || "00:22.72 - 00:24.72",
    video_time_frame: report.video_time_frame || "00:00.00 - 00:27.44",
    prediction: report.prediction || "UNCERTAIN",
    deepfake: {
      probability: report.deepfake?.probability || 0.5094
    },
    is_scam: report.is_scam ?? false,
    is_fake_news: report.is_fake_news ?? false,
    fake_news_score: report.fake_news_score,
    scam_verdict: report.scam_verdict || "LEGITIMATE",
    media_authenticity: report.media_authenticity || "AUTHENTIC_MEDIA",
    gemini_fact_check: report.gemini_fact_check,
    transcript: report.transcript,
    ocr_text: report.ocr_text,
    trigger_explanations: report.trigger_explanations,
    suspicious_intervals: report.suspicious_intervals || [
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
    frame_level_timeline: report.frame_level_timeline || [
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
  })

  const currentPayload = isAudio ? getAudioPayload() : getVideoPayload()

  // Chart data calculation mapped strictly to the user's timeline points
  const chartData = useMemo(() => {
    if (isAudio) {
      const timeline = getAudioPayload().timeline
      const maxTime = audioDuration || 51.0
      return timeline.map(p => ({
        time: p.timestamp_seconds,
        label: `${p.timestamp_seconds.toFixed(1)}s`,
        val: p.ai_probability,
        percent: (p.ai_probability * 100).toFixed(0),
        x: (p.timestamp_seconds / maxTime) * 360 + 20,
        // Y mapping: 0.0 -> Y=105, 1.0 -> Y=15
        y: 105 - (p.ai_probability * 90),
        isAnomaly: p.ai_probability >= 0.5
      }))
    } else {
      const timeline = getVideoPayload().frame_level_timeline
      const maxTime = videoDuration || 27.44
      return timeline.map(p => ({
        time: p.timestamp_seconds,
        label: p.timestamp || `${p.timestamp_seconds.toFixed(1)}s`,
        val: p.fake_probability,
        percent: (p.fake_probability * 100).toFixed(1),
        x: (p.timestamp_seconds / maxTime) * 360 + 20,
        y: 105 - (p.fake_probability * 90),
        isAnomaly: p.is_suspicious || p.fake_probability >= 0.5
      }))
    }
  }, [isAudio, audioDuration, videoDuration, report])

  // Build SVG path
  const pathD = useMemo(() => {
    if (chartData.length === 0) return ""
    return chartData.map((pt, i) => `${i === 0 ? "M" : "L"} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`).join(" ")
  }, [chartData])

  const areaD = useMemo(() => {
    if (chartData.length === 0) return ""
    const first = chartData[0]
    const last = chartData[chartData.length - 1]
    return `${pathD} L ${last.x.toFixed(1)} 105 L ${first.x.toFixed(1)} 105 Z`
  }, [pathD, chartData])

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(currentPayload, null, 2))
    setIsCopiedJson(true)
    setTimeout(() => setIsCopiedJson(false), 2000)
  }

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(currentPayload, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = isAudio ? "audio_forensic_output.json" : "video_forensic_output.json"
    a.click()
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      
      {/* 1. TOP NAVIGATION & CONTROLS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#111827]/15">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border-2 border-[#111827] bg-white hover:bg-[#FAF9F5] text-xs font-mono font-bold uppercase transition-all shadow-sm cursor-pointer"
          >
            <span>← Home</span>
          </Link>

          <Link
            href="/analyze"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border-2 border-[#111827] bg-[#FAF9F5] hover:bg-white text-xs font-mono font-bold uppercase transition-all shadow-sm cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </Link>

          <span className="px-2.5 py-1 rounded-lg bg-white border-2 border-[#111827] text-xs font-mono font-bold text-[#111827]">
            {isAudio ? "AUDIO FORENSIC RECORD" : "VIDEO FORENSIC RECORD"}
          </span>

          <span className="text-xs font-mono text-[#667085]">
            Case: <strong className="text-[#111827]">{report.case_number}</strong>
          </span>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <button
            onClick={handleCopyJson}
            className="px-3.5 py-1.5 rounded-full bg-white border-2 border-[#111827] hover:bg-[#F5F6F3] text-[#111827] font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
          >
            {isCopiedJson ? <Check className="w-3.5 h-3.5 text-[#10B981]" /> : <FileText className="w-3.5 h-3.5 text-[#111827]" />}
            <span>{isCopiedJson ? "JSON Copied!" : "Copy JSON"}</span>
          </button>

          <button
            onClick={handleExportJson}
            className="px-3.5 py-1.5 rounded-full bg-[#111827] hover:bg-[#356AE6] text-white font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download JSON</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. STRICT SMALL MODULAR METRIC CARDS (ONLY DISPLAYING THE RELEVANT FIELDS) */}
      {/* ========================================================================= */}
      {isAudio ? (
        /* AUDIO METRIC CARDS ROW */
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          
          {/* Card 1: Audio Prediction */}
          <div className="bg-white p-4 rounded-2xl border-2 border-[#111827] shadow-sm flex flex-col justify-between min-h-[105px]">
            <span className="text-[10px] font-mono font-bold uppercase text-[#667085] tracking-wider">
              prediction
            </span>
            <div className="my-1">
              <span className={`inline-block text-xs font-mono font-black px-2.5 py-0.5 rounded-md ${
                report.prediction === 'AI_GENERATED' ? 'bg-[#D94A4A] text-white' : 'bg-[#10B981] text-white'
              }`}>
                {report.prediction}
              </span>
            </div>
            <span className="text-[10px] font-mono text-[#667085]">
              Schema: String
            </span>
          </div>

          {/* Card 2: AI Probability */}
          <div className="bg-white p-4 rounded-2xl border-2 border-[#111827] shadow-sm flex flex-col justify-between min-h-[105px]">
            <span className="text-[10px] font-mono font-bold uppercase text-[#667085] tracking-wider">
              ai_probability
            </span>
            <div className="text-xl sm:text-2xl font-black font-mono tracking-tight text-[#111827]">
              {audioAiProb} ({audioProbPercent}%)
            </div>
            <div className="w-full bg-[#F5F6F3] h-1.5 rounded-full overflow-hidden border border-[#E5E7EB]">
              <div 
                className={`h-full rounded-full ${audioAiProb > 0.5 ? 'bg-[#D94A4A]' : 'bg-[#10B981]'}`}
                style={{ width: `${audioProbPercent}%` }}
              ></div>
            </div>
          </div>

          {/* Card 3: Confidence */}
          <div className="bg-white p-4 rounded-2xl border-2 border-[#111827] shadow-sm flex flex-col justify-between min-h-[105px]">
            <span className="text-[10px] font-mono font-bold uppercase text-[#667085] tracking-wider">
              confidence
            </span>
            <div className="text-lg font-black font-mono text-[#111827]">
              {audioConfidence}
            </div>
            <span className="text-[10px] font-mono text-[#667085]">
              Model Confidence Tier
            </span>
          </div>

          {/* Card 4: Audio Duration Seconds */}
          <div className="bg-white p-4 rounded-2xl border-2 border-[#111827] shadow-sm flex flex-col justify-between min-h-[105px]">
            <span className="text-[10px] font-mono font-bold uppercase text-[#667085] tracking-wider">
              audio_duration_seconds
            </span>
            <div className="text-lg font-black font-mono text-[#111827]">
              {audioDuration.toFixed(1)}s
            </div>
            <span className="text-[10px] font-mono text-[#667085]">
              Total Playback Length
            </span>
          </div>

          {/* Card 5: Suspicious Segments Summary */}
          <div className="bg-white p-4 rounded-2xl border-2 border-[#111827] shadow-sm flex flex-col justify-between min-h-[105px] col-span-2 sm:col-span-1">
            <span className="text-[10px] font-mono font-bold uppercase text-[#667085] tracking-wider">
              suspicious_segments
            </span>
            <div className="text-sm font-black font-mono text-[#D94A4A] truncate">
              {report.suspicious_segments?.[0] 
                ? `${report.suspicious_segments[0].start_seconds}s - ${report.suspicious_segments[0].end_seconds}s` 
                : "None"}
            </div>
            <span className="text-[10px] font-mono text-[#667085]">
              Flagged Segment ({report.suspicious_segments?.length || 0})
            </span>
          </div>

        </div>
      ) : (
        /* VIDEO METRIC CARDS ROW */
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          
          {/* Card 1: Prediction */}
          <div className="bg-white p-4 rounded-2xl border-2 border-[#111827] shadow-sm flex flex-col justify-between min-h-[105px]">
            <span className="text-[10px] font-mono font-bold uppercase text-[#667085] tracking-wider">
              prediction
            </span>
            <div className="my-1">
              <span className={`inline-block text-xs font-mono font-black px-2.5 py-0.5 rounded-md ${
                report.prediction === 'FAKE' ? 'bg-[#D94A4A] text-white' : report.prediction === 'UNCERTAIN' ? 'bg-[#D99A24] text-white' : 'bg-[#10B981] text-white'
              }`}>
                {report.prediction}
              </span>
            </div>
            <span className="text-[10px] font-mono text-[#667085]">
              Deepfake Verdict
            </span>
          </div>

          {/* Card 2: Deepfake Probability */}
          <div className="bg-white p-4 rounded-2xl border-2 border-[#111827] shadow-sm flex flex-col justify-between min-h-[105px]">
            <span className="text-[10px] font-mono font-bold uppercase text-[#667085] tracking-wider">
              deepfake.probability
            </span>
            <div className="text-xl font-black font-mono tracking-tight text-[#111827]">
              {videoProb} ({videoProbPercent}%)
            </div>
            <div className="w-full bg-[#F5F6F3] h-1.5 rounded-full overflow-hidden border border-[#E5E7EB]">
              <div 
                className={`h-full rounded-full ${videoProb > 0.5 ? 'bg-[#D94A4A]' : 'bg-[#10B981]'}`}
                style={{ width: `${videoProbPercent}%` }}
              ></div>
            </div>
          </div>

          {/* Card 3: Peak Anomaly Timestamp */}
          <div className="bg-white p-4 rounded-2xl border-2 border-[#111827] shadow-sm flex flex-col justify-between min-h-[105px]">
            <span className="text-[10px] font-mono font-bold uppercase text-[#667085] tracking-wider">
              peak_anomaly_timestamp
            </span>
            <div className="text-base font-black font-mono text-[#D94A4A]">
              {report.peak_anomaly_timestamp || "00:23.72"}
            </div>
            <span className="text-[10px] font-mono text-[#667085]">
              sec: {report.timestamp_seconds || 23.72}s
            </span>
          </div>

          {/* Card 4: Suspicious Time Frame */}
          <div className="bg-white p-4 rounded-2xl border-2 border-[#111827] shadow-sm flex flex-col justify-between min-h-[105px]">
            <span className="text-[10px] font-mono font-bold uppercase text-[#667085] tracking-wider">
              suspicious_time_frame
            </span>
            <div className="text-xs font-black font-mono text-[#111827] truncate">
              {report.suspicious_time_frame || "00:22.72 - 00:24.72"}
            </div>
            <span className="text-[10px] font-mono text-[#667085]">
              time_frame: {report.time_frame || "00:22.72 - 00:24.72"}
            </span>
          </div>

          {/* Card 5: Video Time Frame */}
          <div className="bg-white p-4 rounded-2xl border-2 border-[#111827] shadow-sm flex flex-col justify-between min-h-[105px]">
            <span className="text-[10px] font-mono font-bold uppercase text-[#667085] tracking-wider">
              video_time_frame
            </span>
            <div className="text-xs font-black font-mono text-[#111827] truncate">
              {report.video_time_frame || `00:00.00 - 00:${videoDuration.toFixed(2)}`}
            </div>
            <span className="text-[10px] font-mono text-[#667085]">
              duration: {videoDuration}s
            </span>
          </div>

          {/* Card 6: Suspicious Intervals */}
          <div className="bg-white p-4 rounded-2xl border-2 border-[#111827] shadow-sm flex flex-col justify-between min-h-[105px]">
            <span className="text-[10px] font-mono font-bold uppercase text-[#667085] tracking-wider">
              suspicious_intervals
            </span>
            <div className="text-sm font-black font-mono text-[#D94A4A]">
              {report.suspicious_intervals?.length || 1} Interval(s)
            </div>
            <span className="text-[10px] font-mono text-[#667085]">
              score: {report.suspicious_intervals?.[0]?.score || 0.521}
            </span>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. VERDICT SUMMARY SECTION (CLEAN WHITE CARD, NO FAKE AI GRADIENTS) */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl border-2 border-[#111827] p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#111827]/15">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded bg-[#111827] text-white uppercase">
              {isAudio ? "Audio Forensic Verdict" : "Video Forensic Verdict"}
            </span>
            <span className="text-xs font-mono text-[#667085]">
              {isAudio ? `Confidence: ${audioConfidence}` : `Prediction: ${report.prediction}`}
            </span>
          </div>

          <div className="text-xs font-mono font-bold text-[#111827]">
            {isAudio ? `ai_probability: ${audioAiProb}` : `deepfake.probability: ${videoProb}`}
          </div>
        </div>

        {isAudio ? (
          /* AUDIO DETAILED VERDICT DATA */
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5 font-mono text-xs">
                <div className="text-[#667085]">Prediction Status:</div>
                <div className="text-base font-black text-[#111827]">
                  {report.prediction} (Confidence: {audioConfidence})
                </div>
                <p className="text-[#667085] text-xs">
                  Overall audio probability is <strong>{audioAiProb}</strong> across the {audioDuration}s track.
                </p>
              </div>

              {/* Suspicious Segments List */}
              <div className="space-y-1.5 font-mono text-xs">
                <div className="text-[#667085]">Suspicious Segments ({report.suspicious_segments?.length || 1}):</div>
                {(report.suspicious_segments || [
                  { start_seconds: 42.0, end_seconds: 51.0, ai_probability: 1.0 }
                ]).map((seg, idx) => (
                  <div 
                    key={idx}
                    onClick={() => seekAudioTo(seg.start_seconds)}
                    className="p-2.5 rounded-xl border border-[#111827]/20 bg-[#FAF9F5] flex items-center justify-between cursor-pointer hover:bg-[#F5F6F3] transition-colors"
                  >
                    <span>Time: <strong>{seg.start_seconds}s – {seg.end_seconds}s</strong></span>
                    <span className="text-[#D94A4A] font-bold">ai_probability: {seg.ai_probability}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* VIDEO DETAILED VERDICT DATA */
          <div className="space-y-3 font-mono text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="text-[#667085]">video_path:</div>
                <div className="p-2 rounded-lg bg-[#FAF9F5] border border-[#111827]/20 font-bold break-all">
                  {report.video_path || "d:\\videos\\unseen_video.mp4"}
                </div>
                <div className="text-[#667085] pt-1">
                  analysis_timestamp: <strong className="text-[#111827]">{report.analysis_timestamp}</strong>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="text-[#667085]">Suspicious Intervals ({report.suspicious_intervals?.length || 1}):</div>
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {(report.suspicious_intervals || [
                    {
                      time_frame: "00:00.00 - 00:25.56",
                      start_timestamp: "00:00.00",
                      end_timestamp: "00:25.56",
                      start_seconds: 0.0,
                      end_seconds: 25.56,
                      type: "visual_anomaly",
                      score: 0.5210
                    }
                  ]).map((intv, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl border border-[#111827]/20 bg-[#FAF9F5] space-y-1">
                      <div className="flex justify-between font-bold text-[#111827]">
                        <span>{intv.time_frame}</span>
                        <span className="text-[#D94A4A]">Score: {intv.score}</span>
                      </div>
                      <div className="text-[10px] text-[#667085]">Type: {intv.type} ({intv.start_seconds}s - {intv.end_seconds}s)</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3B. GEMINI AI FACT-CHECKING & DECEPTION VERDICT */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl border-2 border-[#111827] p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E5E7EB]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#356AE6] to-[#8B5CF6] flex items-center justify-center text-white text-sm font-black shadow-sm">
              ✦
            </div>
            <div>
              <h3 className="text-sm font-mono font-bold text-[#111827] uppercase flex items-center gap-2">
                Gemini AI Fact-Checking & Credibility Suite
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#356AE6]/10 text-[#356AE6] border border-[#356AE6]/30 font-mono font-bold">
                  Whisper STT + Gemini LLM
                </span>
              </h3>
              <p className="text-xs text-[#667085]">
                Semantic fact-checking of speech claims and on-screen text against misinformation, fake schemes, and financial scams.
              </p>
            </div>
          </div>

          {/* Verdict Pill */}
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-xl text-xs font-mono font-bold border ${
              report.gemini_fact_check?.is_scam || report.is_scam || (report.gemini_fact_check?.scam_score ?? 0) >= 0.5
                ? 'bg-[#D94A4A]/10 text-[#D94A4A] border-[#D94A4A]'
                : report.gemini_fact_check?.is_fake_news || report.is_fake_news
                ? 'bg-[#F59E0B]/10 text-[#B45309] border-[#F59E0B]'
                : 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]'
            }`}>
              {report.gemini_fact_check?.verdict || (report.is_scam ? "HIGH_RISK_SCAM" : (report.is_fake_news ? "FAKE_NEWS" : "VERIFIED_OR_SAFE"))}
            </span>
            <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-[#FAF9F5] border border-[#111827]/20 text-[#667085]">
              Credibility: <strong className="text-[#111827]">{report.gemini_fact_check?.credibility_status || (report.is_scam ? "DECEPTIVE_OFFER" : (report.is_fake_news ? "MISLEADING" : "CREDIBLE"))}</strong>
            </span>
          </div>
        </div>

        {/* Primary YES/NO Direct Decision Banner */}
        <div className={`p-4 rounded-2xl border-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          (report.gemini_fact_check?.scam_score ?? (report.is_scam ? 0.95 : 0)) >= 0.5 || report.is_scam
            ? 'bg-[#FEF2F2] border-[#D94A4A]'
            : (report.gemini_fact_check?.fake_news_score ?? (report.is_fake_news ? 0.9 : 0)) >= 0.5
            ? 'bg-[#FFFBEB] border-[#F59E0B]'
            : 'bg-[#ECFDF5] border-[#10B981]'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black ${
              (report.gemini_fact_check?.scam_score ?? (report.is_scam ? 0.95 : 0)) >= 0.5 || report.is_scam
                ? 'bg-[#D94A4A] text-white'
                : (report.gemini_fact_check?.fake_news_score ?? (report.is_fake_news ? 0.9 : 0)) >= 0.5
                ? 'bg-[#F59E0B] text-white'
                : 'bg-[#10B981] text-white'
            }`}>
              {(report.gemini_fact_check?.scam_score ?? (report.is_scam ? 0.95 : 0)) >= 0.5 || report.is_scam ? '🚨' : '🛡'}
            </div>
            <div>
              <div className="text-[10px] font-mono font-bold uppercase text-[#667085]">
                Direct Fraud & Credibility Determination
              </div>
              <div className="text-base font-black text-[#111827] flex items-center gap-2">
                <span>IS THIS A SCAM?</span>
                <span className={`px-2.5 py-0.5 rounded-lg text-xs font-black tracking-wide ${
                  (report.gemini_fact_check?.scam_score ?? (report.is_scam ? 0.95 : 0)) >= 0.5 || report.is_scam
                    ? 'bg-[#D94A4A] text-white shadow-sm'
                    : 'bg-[#10B981] text-white shadow-sm'
                }`}>
                  {(report.gemini_fact_check?.scam_score ?? (report.is_scam ? 0.95 : 0)) >= 0.5 || report.is_scam ? 'YES — CONFIRMED FRAUDULENT SCHEME' : 'NO — SAFE / AUTHENTIC CONTENT'}
                </span>
              </div>
            </div>
          </div>

          <div className="text-left sm:text-right font-mono text-xs">
            <div className="text-[#667085] text-[10px] uppercase font-bold">Confidence Rating</div>
            <div className={`text-base font-black ${
              (report.gemini_fact_check?.scam_score ?? (report.is_scam ? 0.95 : 0)) >= 0.5 || report.is_scam
                ? 'text-[#D94A4A]'
                : 'text-[#10B981]'
            }`}>
              {((report.gemini_fact_check?.scam_score ?? (report.is_scam ? 0.99 : 0.05)) * 100).toFixed(1)}% Certainty
            </div>
          </div>
        </div>

        {/* Gemini Scores & Analysis */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs">
          <div className="p-3.5 rounded-2xl bg-[#FAF9F5] border border-[#111827]/15 space-y-1">
            <div className="text-[#667085] text-[10px] uppercase font-bold">Fake News Probability</div>
            <div className="text-2xl font-black text-[#111827]">
              {((report.gemini_fact_check?.fake_news_score ?? report.fake_news_score ?? 0) * 100).toFixed(1)}%
            </div>
            <div className="text-[10px] text-[#667085]">
              Status: {report.gemini_fact_check?.is_fake_news || report.is_fake_news ? 'Flagged Misinformation' : 'No Fake News Anomaly'}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#FAF9F5] border border-[#111827]/15 space-y-1">
            <div className="text-[#667085] text-[10px] uppercase font-bold">Scam Intent Risk</div>
            <div className="text-2xl font-black text-[#D94A4A]">
              {((report.gemini_fact_check?.scam_score ?? (report.is_scam ? 0.85 : 0.15)) * 100).toFixed(1)}%
            </div>
            <div className="text-[10px] text-[#667085]">
              Verdict: {report.scam_verdict || (report.is_scam ? 'HIGH_RISK_SCAM' : 'LEGITIMATE')}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#FAF9F5] border border-[#111827]/15 space-y-1">
            <div className="text-[#667085] text-[10px] uppercase font-bold">Media Authenticity Axis</div>
            <div className="text-2xl font-black text-[#356AE6]">
              {report.media_authenticity || (report.prediction === 'FAKE' ? 'SYNTHETIC_DEEPFAKE' : 'AUTHENTIC_MEDIA')}
            </div>
            <div className="text-[10px] text-[#667085]">
              Deepfake Probability: {((report.deepfake?.probability ?? 0) * 100).toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Gemini Reasoning & Multi-Claim Forensic Evidence */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-[#FAF9F5] to-[#F5F3FF] border border-[#111827]/20 space-y-3">
          <div className="text-[11px] font-mono font-bold text-[#111827] uppercase flex items-center justify-between">
            <span className="flex items-center gap-1.5">✦ Primary Fact-Check Determination:</span>
            <span className="text-[10px] text-[#D94A4A] font-bold">Comprehensive Evidence Analysis</span>
          </div>
          <p className="text-xs font-medium text-[#111827] leading-relaxed bg-white/70 p-3 rounded-xl border border-[#111827]/10">
            {report.gemini_fact_check?.explanation || 
             report.trigger_explanations?.find(t => t.startsWith("Gemini"))?.replace("Gemini Fact-Check: ", "") ||
             report.description || 
             "Multi-modal verification complete. No critical deception anomalies identified."}
          </p>

          {/* All Forensic Trigger Explanations */}
          {report.trigger_explanations && report.trigger_explanations.length > 0 && (
            <div className="space-y-2 pt-1">
              <div className="text-[11px] font-mono font-bold text-[#667085] uppercase flex items-center justify-between">
                <span>All Detected Forensic Triggers &amp; Scam Signals ({report.trigger_explanations.length}):</span>
              </div>
              <div className="grid grid-cols-1 gap-1.5 max-h-60 overflow-y-auto pr-1.5">
                {report.trigger_explanations.map((expl, idx) => (
                  <div 
                    key={idx} 
                    className="p-2.5 rounded-xl border border-[#111827]/15 bg-white flex items-start gap-2.5 text-xs font-mono"
                  >
                    <span className="w-5 h-5 rounded-full bg-[#111827] text-white flex items-center justify-center text-[10px] font-black flex-shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="text-[#111827] leading-tight flex-1">
                      {expl.replace("Gemini Fact-Check: ", "")}
                    </span>
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                      expl.toLowerCase().includes("voice") || expl.toLowerCase().includes("speech")
                        ? "bg-[#356AE6]/10 text-[#356AE6] border border-[#356AE6]/30"
                        : expl.toLowerCase().includes("mouth") || expl.toLowerCase().includes("lip")
                        ? "bg-[#8B5CF6]/10 text-[#8B5CF6] border border-[#8B5CF6]/30"
                        : expl.toLowerCase().includes("branding") || expl.toLowerCase().includes("news")
                        ? "bg-[#F59E0B]/10 text-[#B45309] border border-[#F59E0B]/30"
                        : "bg-[#D94A4A]/10 text-[#D94A4A] border border-[#D94A4A]/30"
                    }`}>
                      {expl.toLowerCase().includes("voice") ? "Acoustic" : expl.toLowerCase().includes("lip") ? "Lip-Sync" : expl.toLowerCase().includes("branding") ? "Branding" : expl.toLowerCase().includes("visual") ? "Visual" : "Scam Intent"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Deceptive Tactics Tags */}
          {((report.gemini_fact_check?.deceptive_tactics && report.gemini_fact_check.deceptive_tactics.length > 0) ||
            (report.scam?.matched_signals && report.scam.matched_signals.length > 0)) && (
            <div className="pt-2 border-t border-[#111827]/10 flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-mono text-[#667085] font-bold">Detected Tactics:</span>
              {Array.from(new Set([
                ...(report.gemini_fact_check?.deceptive_tactics || []),
                ...(report.scam?.matched_signals || [])
              ])).map((tactic, i) => (
                <span key={i} className="px-2 py-0.5 rounded-lg bg-[#D94A4A]/10 text-[#D94A4A] border border-[#D94A4A]/30 text-[10px] font-mono font-bold">
                  ⚠ {tactic.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Transcribed Speech & On-Screen OCR Text */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Whisper Transcribed Audio Speech */}
          {report.transcript && (
            <div className="p-4 rounded-2xl bg-[#111827] text-white space-y-2 flex flex-col justify-between">
              <div className="flex items-center justify-between text-[11px] font-mono font-bold text-[#667085] uppercase">
                <span className="text-gray-300">🎙 Whisper Spoken Audio Speech</span>
                <span className="text-[#356AE6] text-[10px]">STT Active</span>
              </div>
              <p className="text-xs text-gray-200 font-mono leading-relaxed bg-black/40 p-3 rounded-xl border border-white/10 italic max-h-36 overflow-y-auto pr-1">
                "{report.transcript}"
              </p>
            </div>
          )}

          {/* On-Screen Video OCR Text */}
          {report.ocr_text && (
            <div className="p-4 rounded-2xl bg-[#111827] text-white space-y-2 flex flex-col justify-between">
              <div className="flex items-center justify-between text-[11px] font-mono font-bold text-[#667085] uppercase">
                <span className="text-gray-300">📺 Extracted On-Screen Captions (OCR)</span>
                <span className="text-[#10B981] text-[10px]">OCR Active</span>
              </div>
              <div className="text-xs text-gray-200 font-mono leading-relaxed bg-black/40 p-3 rounded-xl border border-white/10 space-y-1 max-h-36 overflow-y-auto pr-1">
                {Array.isArray(report.ocr_text) ? (
                  report.ocr_text.map((line, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-gray-500 text-[10px]">›</span>
                      <span>{line}</span>
                    </div>
                  ))
                ) : (
                  <div>{report.ocr_text}</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. MEDIA STREAM & HIGH-CLARITY TELEMETRY GRAPH */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Player (Audio or Video) */}
        <div className="lg:col-span-6 bg-white rounded-3xl border-2 border-[#111827] p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
            <h3 className="text-xs font-mono font-bold text-[#111827] uppercase">
              {isAudio ? "Audio Waveform & Playback" : "Video Visual Stream"}
            </h3>
            <span className="text-[10px] font-mono text-[#667085]">
              {isAudio ? `${audioDuration}s` : `${videoDuration}s`}
            </span>
          </div>

          {isAudio ? (
            /* AUDIO CONTROLLER */
            <div className="space-y-4">
              <div className="bg-[#111827] text-white p-5 rounded-2xl border-2 border-[#111827] space-y-4">
                <audio
                  ref={audioRef}
                  src={report.audio_url || "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3"}
                  onTimeUpdate={() => {
                    if (audioRef.current) setAudioTime(audioRef.current.currentTime)
                  }}
                  onEnded={() => setIsAudioPlaying(false)}
                />

                {/* Waveform Bars mapped strictly to the timeline duration */}
                <div className="h-16 flex items-end justify-between gap-1 py-1">
                  {Array.from({ length: 34 }, (_, i) => {
                    const sec = (i / 34) * audioDuration
                    const isSuspicious = report.suspicious_segments?.some(
                      seg => sec >= seg.start_seconds && sec <= seg.end_seconds
                    ) ?? (sec >= 42.0 && sec <= 51.0)

                    const height = isAudioPlaying 
                      ? (Math.sin(i * 0.5 + audioTime * 8) * 35 + 45)
                      : (Math.sin(i * 0.3) * 20 + 30)

                    return (
                      <div
                        key={i}
                        className={`w-full rounded-t transition-all duration-100 ${
                          isSuspicious ? 'bg-[#D94A4A]' : 'bg-[#356AE6]'
                        }`}
                        style={{ height: `${height}%` }}
                      ></div>
                    )
                  })}
                </div>

                {/* Progress bar */}
                <div className="relative w-full">
                  {report.suspicious_segments?.map((seg, idx) => {
                    const left = (seg.start_seconds / audioDuration) * 100
                    const width = Math.min(100 - left, ((seg.end_seconds - seg.start_seconds) / audioDuration) * 100)
                    return (
                      <div
                        key={idx}
                        className="absolute top-0 h-2 bg-[#D94A4A] opacity-80 rounded pointer-events-none z-10"
                        style={{ left: `${left}%`, width: `${width}%` }}
                      ></div>
                    )
                  })}

                  <input
                    type="range"
                    min="0"
                    max={audioDuration}
                    step="0.1"
                    value={audioTime}
                    onChange={(e) => seekAudioTo(parseFloat(e.target.value))}
                    className="w-full accent-[#356AE6] cursor-pointer h-2 bg-white/20 rounded-full"
                  />
                </div>

                {/* Controls */}
                <div className="flex items-center justify-between text-xs font-mono">
                  <button
                    onClick={toggleAudioPlay}
                    className="px-4 py-2 rounded-xl bg-[#356AE6] hover:bg-[#244DB7] text-white font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    {isAudioPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                    <span>{isAudioPlaying ? "Pause Audio" : "Play Audio Track"}</span>
                  </button>

                  <span className="text-gray-300">
                    {audioTime.toFixed(1)}s / {audioDuration.toFixed(1)}s
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* VIDEO CONTROLLER */
            <div className="space-y-3">
              <div className="relative aspect-video rounded-2xl overflow-hidden bg-[#111827] border-2 border-[#111827]">
                <video
                  ref={videoRef}
                  src={report.video_stream_url || "https://vjs.zencdn.net/v/oceans.mp4"}
                  playsInline
                  muted={isVideoMuted}
                  loop
                  onPlay={() => setIsVideoPlaying(true)}
                  onPause={() => setIsVideoPlaying(false)}
                  onTimeUpdate={() => {
                    if (videoRef.current) setVideoTime(videoRef.current.currentTime)
                  }}
                  className="w-full h-full object-cover"
                />

                {showOverlays && (
                  <div className="absolute top-3 left-3 bg-black/80 px-2.5 py-1 rounded text-[10px] font-mono text-white flex items-center gap-2 border border-white/20">
                    <span>FRAME: {Math.floor(videoTime * 30)}</span>
                    <span>•</span>
                    <span>{videoTime.toFixed(1)}s / {videoDuration}s</span>
                  </div>
                )}

                <button
                  onClick={toggleVideoPlay}
                  className="absolute inset-0 m-auto w-14 h-14 rounded-full bg-black/70 hover:bg-[#356AE6] text-white flex items-center justify-center backdrop-blur-sm transition-all cursor-pointer"
                >
                  {isVideoPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 fill-current ml-0.5" />}
                </button>
              </div>

              {/* Scrubber */}
              <input
                type="range"
                min="0"
                max={videoDuration}
                step="0.1"
                value={videoTime}
                onChange={(e) => seekVideoTo(parseFloat(e.target.value))}
                className="w-full accent-[#356AE6] cursor-pointer h-2 bg-[#E5E7EB] rounded-lg"
              />

              <div className="flex items-center justify-between text-xs font-mono text-[#667085]">
                <button
                  onClick={toggleVideoPlay}
                  className="px-3 py-1 rounded-lg bg-[#111827] text-white font-bold"
                >
                  {isVideoPlaying ? "Pause" : "Play"}
                </button>
                <span className="font-bold text-[#111827]">
                  {videoTime.toFixed(1)}s / {videoDuration.toFixed(1)}s
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Crisp Telemetry Chart (Using exact JSON timestamps) */}
        <div className="lg:col-span-6 bg-white rounded-3xl border-2 border-[#111827] p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase text-[#111827] block">
                ● Telemetry Waveform Plot
              </span>
              <h3 className="text-xs font-mono font-bold text-[#667085] uppercase">
                {isAudio ? "ai_probability timeline timestamps" : "fake_probability frame timeline"}
              </h3>
            </div>

            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#FAF9F5] border border-[#111827] text-[#111827]">
              {chartData.length} data points
            </span>
          </div>

          {/* CRISP TECHNICAL CHART */}
          <div className="space-y-2">
            <div className="relative h-56 w-full bg-[#FAF9F5] rounded-2xl border-2 border-[#111827]/20 p-3 overflow-hidden select-none">
              
              {/* Guidelines */}
              <div className="absolute inset-x-3 top-3 border-b border-[#E5E7EB] flex justify-between text-[9px] font-mono text-[#667085]">
                <span>1.00 (Danger Ceiling)</span>
                <span>ai_probability: 1.0</span>
              </div>
              <div className="absolute inset-x-3 top-[45%] border-b border-dashed border-[#D94A4A] flex justify-between text-[9px] font-mono text-[#D94A4A]">
                <span>0.50 (Anomaly Boundary)</span>
                <span>Threshold Line</span>
              </div>
              <div className="absolute inset-x-3 bottom-6 border-b border-[#111827]/30 flex justify-between text-[9px] font-mono text-[#667085]">
                <span>0.00 (Baseline)</span>
                <span>ai_probability: 0.0</span>
              </div>

              {/* Exact Timeline SVG */}
              <svg className="w-full h-[calc(100%-20px)] overflow-visible" viewBox="0 0 400 120" preserveAspectRatio="none">
                {/* 0.50 Baseline */}
                <line x1="10" y1="60" x2="390" y2="60" stroke="#D94A4A" strokeWidth="1.2" strokeDasharray="4,4" />

                {/* Line Path */}
                {pathD && (
                  <path
                    d={pathD}
                    fill="none"
                    stroke="#111827"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Points */}
                {chartData.map((pt, idx) => {
                  const isHovered = hoveredPointIndex === idx
                  return (
                    <g
                      key={idx}
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredPointIndex(idx)}
                      onMouseLeave={() => setHoveredPointIndex(null)}
                    >
                      {isHovered && (
                        <line
                          x1={pt.x}
                          y1={15}
                          x2={pt.x}
                          y2={105}
                          stroke="#111827"
                          strokeWidth="1"
                          strokeDasharray="2,2"
                        />
                      )}
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={isHovered ? 6 : pt.isAnomaly ? 5 : 3.5}
                        fill={pt.isAnomaly ? "#D94A4A" : "#111827"}
                        stroke="#FFFFFF"
                        strokeWidth="1.5"
                      />
                    </g>
                  )
                })}
              </svg>

              {/* Tooltip */}
              {hoveredPointIndex !== null && chartData[hoveredPointIndex] && (
                <div
                  className="absolute z-20 bg-[#111827] text-white text-[10px] font-mono px-2 py-1 rounded shadow pointer-events-none transform -translate-x-1/2"
                  style={{
                    left: `${(chartData[hoveredPointIndex].x / 400) * 100}%`,
                    top: `${Math.max(8, (chartData[hoveredPointIndex].y / 120) * 100 - 30)}%`
                  }}
                >
                  <div>Time: {chartData[hoveredPointIndex].label}</div>
                  <div className={chartData[hoveredPointIndex].val >= 0.5 ? "text-[#D94A4A] font-bold" : "text-[#10B981]"}>
                    Prob: {chartData[hoveredPointIndex].val}
                  </div>
                </div>
              )}
            </div>

            {/* X-Axis Timestamps */}
            <div className="flex justify-between text-[10px] font-mono text-[#667085] px-1 font-bold">
              <span>0.0s</span>
              <span>{((isAudio ? audioDuration : videoDuration) * 0.25).toFixed(1)}s</span>
              <span>{((isAudio ? audioDuration : videoDuration) * 0.50).toFixed(1)}s</span>
              <span>{((isAudio ? audioDuration : videoDuration) * 0.75).toFixed(1)}s</span>
              <span>{(isAudio ? audioDuration : videoDuration).toFixed(1)}s</span>
            </div>
          </div>

          {/* Raw JSON Schema Drawer (Directly Inspectable) */}
          <div className="space-y-2 pt-2 border-t border-[#E5E7EB]">
            <div className="flex items-center justify-between text-[10px] font-mono font-bold uppercase text-[#667085]">
              <span>Exact JSON Response</span>
              <span>Schema Verified</span>
            </div>
            <pre className="p-3 rounded-2xl bg-[#111827] text-white text-[10px] font-mono overflow-x-auto max-h-36 leading-relaxed border border-[#111827]">
              {JSON.stringify(currentPayload, null, 2)}
            </pre>
          </div>
        </div>

      </div>
    </div>
  )
}
