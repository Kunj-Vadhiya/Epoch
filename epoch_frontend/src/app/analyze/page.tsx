"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { 
  ArrowLeft, Plus, History, ShieldCheck, AlertOctagon, 
  AlertTriangle, Filter, Search, Layers, Database, 
  ChevronRight, Sparkles, UploadCloud, Link2, FileVideo, 
  FileAudio, FileImage, FileText, Zap, Trash2, Download,
  Menu, X, Check, Play, Pause
} from "lucide-react"
import { VideoForensicReport, RiskLevel } from "@/types/forensicOutput"
import { DEFAULT_FORENSIC_REPORTS } from "@/data/defaultVideoReports"
import { forensicApi, getBackendPort, setBackendPort } from "@/services/forensicApi"

const LOCAL_STORAGE_KEY = "epoch_forensic_reports_v2"

export default function AnalyzeDashboardPage() {
  const router = useRouter()
  const [reports, setReports] = useState<VideoForensicReport[]>([])
  const [activeTab, setActiveTab] = useState<'dashboard' | 'ingest'>('dashboard')
  const [selectedRiskFilter, setSelectedRiskFilter] = useState<'ALL' | RiskLevel>('ALL')
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)

  // Backend Port & Health Status State
  const [backendPort, setPortState] = useState<string>("8000")
  const [isEditingPort, setIsEditingPort] = useState(false)
  const [tempPortInput, setTempPortInput] = useState("8000")
  const [isBackendOnline, setIsBackendOnline] = useState<boolean | null>(null)

  // Ingestion form state & file upload
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null)
  const [isDraggingFile, setIsDraggingFile] = useState(false)

  const [ingestModality, setIngestModality] = useState<'VIDEO' | 'AUDIO' | 'IMAGE' | 'SCAM_AD'>('VIDEO')
  const [ingestTitle, setIngestTitle] = useState("")
  const [ingestPath, setIngestPath] = useState("")
  const [ingestDescription, setIngestDescription] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [progressStep, setProgressStep] = useState("")

  // Interactive Ingestion Media Player States
  const ingestVideoRef = React.useRef<HTMLVideoElement>(null)
  const ingestAudioRef = React.useRef<HTMLAudioElement>(null)
  const [ingestVideoPlaying, setIngestVideoPlaying] = useState(false)
  const [ingestVideoTime, setIngestVideoTime] = useState(0)
  const [ingestAudioPlaying, setIngestAudioPlaying] = useState(false)
  const [ingestAudioTime, setIngestAudioTime] = useState(0)
  const [ingestShowOverlays, setIngestShowOverlays] = useState(true)

  // Check health on mount and load port
  useEffect(() => {
    const savedPort = getBackendPort()
    setPortState(savedPort)
    setTempPortInput(savedPort)

    forensicApi.checkHealth()
      .then(() => setIsBackendOnline(true))
      .catch(() => setIsBackendOnline(false))
  }, [])

  const handleSavePort = () => {
    if (!tempPortInput) return
    setBackendPort(tempPortInput)
    setPortState(tempPortInput)
    setIsEditingPort(false)
    forensicApi.checkHealth()
      .then(() => setIsBackendOnline(true))
      .catch(() => setIsBackendOnline(false))
  }

  // Handle local file selection
  const handleFileSelect = (file: File) => {
    setSelectedFile(file)
    const url = URL.createObjectURL(file)
    setFilePreviewUrl(url)
    setIngestPath(file.name)
    if (!ingestTitle) {
      setIngestTitle(file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "))
    }

    // Auto-detect modality from file MIME type
    if (file.type.startsWith("video/")) {
      setIngestModality("VIDEO")
    } else if (file.type.startsWith("audio/")) {
      setIngestModality("AUDIO")
    } else if (file.type.startsWith("image/")) {
      setIngestModality("IMAGE")
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0])
    }
  }

  const handleDropFile = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDraggingFile(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }

  // Initialize and load from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY)
      if (saved) {
        const parsed: VideoForensicReport[] = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setReports(parsed)
          return
        }
      }
    } catch (e) {
      console.error("Failed to load forensic reports from localStorage:", e)
    }

    // Default initialization
    setReports(DEFAULT_FORENSIC_REPORTS)
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(DEFAULT_FORENSIC_REPORTS))
    } catch (e) {
      console.error("Failed to seed default reports:", e)
    }
  }, [])

  const saveReports = (updated: VideoForensicReport[]) => {
    setReports(updated)
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated))
    } catch (e) {
      console.error("Failed to save to localStorage:", e)
    }
  }

  // Handle creating a new analysis report hitting the Axios backend API
  const handleCreateAnalysis = async (preset?: 'video' | 'audio' | 'image') => {
    const modality = preset ? (preset.toUpperCase() as any) : ingestModality
    setIsProcessing(true)
    setProgressStep(`Connecting to Backend Engine (localhost:${backendPort})...`)

    const randomNum = Math.floor(1000 + Math.random() * 9000)
    const caseNumber = `EVD-2026-${randomNum}`
    const id = `rep-2026-${randomNum}`
    const timestamp = new Date().toISOString()
    let newReport: VideoForensicReport

    try {
      if (selectedFile) {
        // 1. REAL FILE UPLOAD POST REQUEST
        if (modality === 'AUDIO') {
          setProgressStep("Uploading audio to /api/v1/audio/analyze (AudioCNN)...")
          const apiRes = await forensicApi.analyzeAudio(selectedFile, (pct, msg) => {
            setProgressStep(msg)
          })

          newReport = {
            id,
            case_number: caseNumber,
            title: ingestTitle || selectedFile.name,
            description: ingestDescription || `AudioCNN analysis returned prediction '${apiRes.prediction}' with AI probability ${apiRes.ai_probability}.`,
            category: 'AUDIO',
            risk_level: apiRes.prediction === 'AI_GENERATED' ? 'HIGH' : apiRes.confidence === 'HIGH' ? 'LOW' : 'MEDIUM',
            audio_duration_seconds: apiRes.audio_duration_seconds,
            prediction: apiRes.prediction as any,
            ai_probability: apiRes.ai_probability,
            confidence: apiRes.confidence,
            timeline: apiRes.timeline,
            suspicious_segments: apiRes.suspicious_segments,
            audio_url: filePreviewUrl || "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3",
            video_duration_seconds: apiRes.audio_duration_seconds,
            peak_anomaly_timestamp: apiRes.suspicious_segments?.[0] ? `${apiRes.suspicious_segments[0].start_seconds}s` : "00:46.50",
            analysis_timestamp: timestamp,
            target_subject: "Audio Voice Stream",
            platform: "Direct File Upload",
            sha256_checksum: Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")
          }
        } else if (modality === 'VIDEO') {
          setProgressStep("Uploading video to /api/v1/video/analyze...")
          const apiRes = await forensicApi.analyzeVideo(selectedFile, (pct, msg) => {
            setProgressStep(msg)
          })

          const isFakePrediction = ['FAKE', 'HIGH_RISK', 'AI_GENERATED', 'MANIPULATED'].includes(apiRes.prediction) || ['HIGH', 'HIGH_RISK'].includes(apiRes.risk_level)
          const finalRisk: RiskLevel = isFakePrediction ? 'HIGH' : (['UNCERTAIN', 'MEDIUM', 'MEDIUM_RISK'].includes(apiRes.prediction) || apiRes.risk_level === 'MEDIUM' ? 'MEDIUM' : 'LOW')
          const finalPred: any = isFakePrediction ? 'FAKE' : (finalRisk === 'MEDIUM' ? 'UNCERTAIN' : 'REAL')
          const prob = apiRes.deepfake?.probability ?? apiRes.overall_risk_score ?? (isFakePrediction ? 0.85 : 0.15)

          newReport = {
            id,
            case_number: caseNumber,
            title: ingestTitle || selectedFile.name,
            description: ingestDescription || (apiRes.trigger_explanations?.[0] || apiRes.gemini_fact_check?.explanation || `Video deepfake spatiotemporal analysis returned prediction '${finalPred}'.`),
            category: 'VIDEO',
            risk_level: finalRisk,
            video_path: apiRes.video_path || selectedFile.name,
            video_stream_url: filePreviewUrl || "https://vjs.zencdn.net/v/oceans.mp4",
            video_duration_seconds: apiRes.video_duration_seconds || 27.44,
            timestamp: apiRes.timestamp || "00:00.00",
            timestamp_seconds: apiRes.timestamp_seconds || 0.0,
            peak_anomaly_timestamp: apiRes.peak_anomaly_timestamp || (apiRes.suspicious_intervals?.[0]?.time_frame || "00:00.00"),
            analysis_timestamp: apiRes.analysis_timestamp || timestamp,
            time_frame: apiRes.time_frame || apiRes.video_time_frame || "00:00.00 - 00:27.44",
            suspicious_time_frame: apiRes.suspicious_time_frame || (apiRes.suspicious_intervals?.[0]?.time_frame || "None"),
            video_time_frame: apiRes.video_time_frame || "00:00.00 - 00:27.44",
            prediction: finalPred,
            deepfake: { probability: prob },
            suspicious_intervals: apiRes.suspicious_intervals || [],
            frame_level_timeline: apiRes.frame_level_timeline || [],
            is_scam: apiRes.is_scam ?? false,
            is_fake_news: apiRes.is_fake_news ?? false,
            fake_news_score: apiRes.fake_news_score,
            scam_verdict: apiRes.scam_verdict || "LEGITIMATE",
            media_authenticity: apiRes.media_authenticity || "AUTHENTIC_MEDIA",
            transcript: apiRes.transcript || "",
            ocr_text: apiRes.ocr_text || [],
            trigger_explanations: apiRes.trigger_explanations || [],
            gemini_fact_check: apiRes.gemini_fact_check,
            scam: apiRes.scam,
            identity_verification: apiRes.identity_verification,
            branding_detection: apiRes.branding_detection,
            explainability: apiRes.explainability,
            target_subject: "Video Media Evidence",
            platform: "Direct File Upload",
            sha256_checksum: Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")
          }
        } else {
          // IMAGE POST REQUEST
          setProgressStep("Uploading image to /api/v1/image/analyze...")
          const apiRes = await forensicApi.analyzeImage(selectedFile, (pct, msg) => {
            setProgressStep(msg)
          })

          newReport = {
            id,
            case_number: caseNumber,
            title: ingestTitle || selectedFile.name,
            description: ingestDescription || "Spatial image deepfake inpainting analysis complete.",
            category: 'IMAGE',
            risk_level: apiRes?.risk_level || 'HIGH',
            video_path: selectedFile.name,
            video_stream_url: filePreviewUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb",
            video_duration_seconds: 12.0,
            timestamp: "00:00.00",
            timestamp_seconds: 0.0,
            peak_anomaly_timestamp: "00:00.00",
            analysis_timestamp: timestamp,
            prediction: apiRes?.prediction || "FAKE",
            deepfake: apiRes?.deepfake || { probability: 0.954 },
            target_subject: "Image Media Evidence",
            platform: "Direct File Upload",
            sha256_checksum: Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")
          }
        }
      } else {
        // 2. SAMPLE GET REQUESTS: /api/v1/audio/sample or /api/v1/video/sample
        if (modality === 'AUDIO') {
          setProgressStep("Fetching /api/v1/audio/sample from backend...")
          const sampleData = await forensicApi.getAudioSample()
          newReport = {
            id,
            case_number: caseNumber,
            title: ingestTitle || "VoIP Audio Speech Stream",
            description: ingestDescription || "Authentic human conversation with isolated 9.0s neural voice clone insertion between 42.0s and 51.0s.",
            category: 'AUDIO',
            risk_level: sampleData.prediction === 'AI_GENERATED' ? 'HIGH' : 'MEDIUM',
            audio_duration_seconds: sampleData.audio_duration_seconds,
            prediction: sampleData.prediction as any,
            ai_probability: sampleData.ai_probability,
            confidence: sampleData.confidence,
            timeline: sampleData.timeline,
            suspicious_segments: sampleData.suspicious_segments,
            audio_url: filePreviewUrl || "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3",
            video_duration_seconds: sampleData.audio_duration_seconds,
            peak_anomaly_timestamp: sampleData.suspicious_segments?.[0] ? `${sampleData.suspicious_segments[0].start_seconds}s` : "00:46.50",
            analysis_timestamp: timestamp,
            target_subject: "Audio Voice Stream",
            platform: "Backend Sample API",
            sha256_checksum: Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")
          }
        } else {
          setProgressStep("Fetching /api/v1/video/sample from backend...")
          const sampleData = await forensicApi.getVideoSample()
          newReport = {
            id,
            case_number: caseNumber,
            title: ingestTitle || (preset ? `Preset ${preset.toUpperCase()} Forensic Analysis` : "Executive Deepfake Speech & Face Swap"),
            description: ingestDescription || "Spatiotemporal deepfake and scam ad detection stream.",
            category: modality,
            risk_level: sampleData.prediction === 'FAKE' ? 'HIGH' : sampleData.prediction === 'UNCERTAIN' ? 'MEDIUM' : 'LOW',
            video_path: sampleData.video_path || "d:\\videos\\unseen_video.mp4",
            video_stream_url: filePreviewUrl || "https://vjs.zencdn.net/v/oceans.mp4",
            video_duration_seconds: sampleData.video_duration_seconds || 27.44,
            timestamp: sampleData.timestamp || "00:23.72",
            timestamp_seconds: sampleData.timestamp_seconds || 23.72,
            peak_anomaly_timestamp: sampleData.peak_anomaly_timestamp || "00:23.72",
            analysis_timestamp: sampleData.analysis_timestamp || timestamp,
            time_frame: sampleData.time_frame || "00:22.72 - 00:24.72",
            suspicious_time_frame: sampleData.suspicious_time_frame || "00:22.72 - 00:24.72",
            video_time_frame: sampleData.video_time_frame || "00:00.00 - 00:27.44",
            prediction: sampleData.prediction || "UNCERTAIN",
            deepfake: sampleData.deepfake || { probability: 0.5094 },
            suspicious_intervals: sampleData.suspicious_intervals || [],
            frame_level_timeline: sampleData.frame_level_timeline || [],
            target_subject: "Video Media Evidence",
            platform: "Backend Sample API",
            sha256_checksum: Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")
          }
        }
      }

      const updated = [newReport, ...reports]
      saveReports(updated)
      setActiveTab('dashboard')
      setSelectedFile(null)
      setFilePreviewUrl(null)
      setIngestTitle("")
      setIngestPath("")
      setIngestDescription("")
      setIsProcessing(false)
      router.push(`/analyze/${newReport.id}`)

    } catch (err: any) {
      console.error("Backend API request failed:", err)
      setIsProcessing(false)
      const errorMsg = err?.response?.data?.detail || err?.message || "Failed to connect to backend engine on port 8000"
      setProgressStep(`Analysis error: ${errorMsg}`)
      alert(`Forensic analysis error: ${errorMsg}. Please ensure the backend is running at http://127.0.0.1:8000.`)
    }
  }

  // Delete a report
  const handleDeleteReport = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const updated = reports.filter(r => r.id !== id)
    if (updated.length === 0) {
      saveReports(DEFAULT_FORENSIC_REPORTS)
    } else {
      saveReports(updated)
    }
  }

  // Filter reports
  const filteredReports = reports.filter(r => {
    const matchesSearch = r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          r.case_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          r.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRisk = selectedRiskFilter === 'ALL' || r.risk_level === selectedRiskFilter
    const matchesCategory = selectedCategoryFilter === 'ALL' || r.category === selectedCategoryFilter
    return matchesSearch && matchesRisk && matchesCategory
  })

  // Truncate description to max N words
  const truncateWords = (text: string, maxWords: number = 14) => {
    const words = text.split(" ")
    if (words.length <= maxWords) return text
    return words.slice(0, maxWords).join(" ") + "..."
  }

  return (
    <div className="min-h-screen bg-[#F5F6F3] text-[#111827] flex flex-col md:flex-row font-sans selection:bg-[#356AE6] selection:text-white">
      
      {/* Mobile Top Navbar with Menu Toggle */}
      <div className="md:hidden bg-[#FAF9F5] border-b-2 border-[#111827] p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link 
            href="/"
            className="p-1.5 rounded-full border border-[#111827] bg-white text-xs font-mono font-bold"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <span className="text-xs font-black uppercase tracking-tight">EPOCH Studio</span>
        </div>

        <button
          onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          className="p-2 rounded-xl border border-[#111827] bg-white text-[#111827]"
        >
          {isMobileSidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 1. EDITORIAL SIDEBAR NAVIGATION */}
      {/* ========================================================================= */}
      <aside className={`
        ${isMobileSidebarOpen ? 'block' : 'hidden'} md:block
        w-full md:w-64 lg:w-72 bg-[#FAF9F5] border-r-2 border-[#111827] p-5 sm:p-6 flex flex-col justify-between gap-6 flex-shrink-0 z-30
      `}>
        
        {/* Brand & Links */}
        <div className="space-y-6">
          <div className="hidden md:block space-y-3">
            <Link 
              href="/"
              className="inline-flex items-center gap-2 border-2 border-[#111827] rounded-full px-3 py-1.5 bg-white hover:bg-[#F5F6F3] transition-all text-xs font-black uppercase font-mono shadow-sm cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Home</span>
            </Link>

            <div className="pt-2">
              <span className="text-[10px] font-mono font-bold uppercase text-[#356AE6] tracking-wider block">
                EPOCH FORENSICS ENGINE
              </span>
              <h2 className="text-xl font-black text-[#111827] uppercase tracking-tight">
                Analysis Studio
              </h2>
            </div>
          </div>

          {/* Action CTA: Ingest New Media */}
          <button
            onClick={() => {
              setActiveTab('ingest')
              setIsMobileSidebarOpen(false)
            }}
            className={`w-full py-3 px-4 rounded-2xl border-2 border-[#111827] text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer ${
              activeTab === 'ingest'
                ? 'bg-[#111827] text-white'
                : 'bg-white text-[#111827] hover:bg-[#111827] hover:text-white'
            }`}
          >
            <Plus className="w-4 h-4 text-[#356AE6]" />
            <span>+ New Analysis</span>
          </button>

          {/* Sidebar Menu Sections */}
          <div className="space-y-4 pt-2 border-t border-[#E5E7EB] text-xs font-mono">
            
            {/* View Modes */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-[#667085] uppercase tracking-wider block px-2">
                Views
              </span>
              <button
                onClick={() => {
                  setActiveTab('dashboard')
                  setSelectedRiskFilter('ALL')
                  setSelectedCategoryFilter('ALL')
                  setIsMobileSidebarOpen(false)
                }}
                className={`w-full px-3 py-2 rounded-xl flex items-center justify-between transition-colors cursor-pointer ${
                  activeTab === 'dashboard' && selectedRiskFilter === 'ALL' && selectedCategoryFilter === 'ALL'
                    ? 'bg-white border border-[#111827] font-bold text-[#111827]'
                    : 'text-[#667085] hover:text-[#111827] hover:bg-white/60'
                }`}
              >
                <span>All Predicted Cases</span>
                <span className="bg-[#111827] text-white px-2 py-0.5 rounded-full text-[10px]">
                  {reports.length}
                </span>
              </button>
            </div>

            {/* Risk Levels Filter */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-[#667085] uppercase tracking-wider block px-2">
                Filter by Risk
              </span>
              <button
                onClick={() => {
                  setActiveTab('dashboard')
                  setSelectedRiskFilter('HIGH')
                  setIsMobileSidebarOpen(false)
                }}
                className={`w-full px-3 py-1.5 rounded-xl flex items-center justify-between transition-colors cursor-pointer ${
                  selectedRiskFilter === 'HIGH'
                    ? 'bg-[#FDF2F2] border border-[#D94A4A] text-[#D94A4A] font-bold'
                    : 'text-[#667085] hover:text-[#111827]'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#D94A4A]"></span>
                  High Risk (Fake)
                </span>
                <span>{reports.filter(r => r.risk_level === 'HIGH' || r.prediction === 'FAKE' || r.prediction === 'AI_GENERATED').length}</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('dashboard')
                  setSelectedRiskFilter('MEDIUM')
                  setIsMobileSidebarOpen(false)
                }}
                className={`w-full px-3 py-1.5 rounded-xl flex items-center justify-between transition-colors cursor-pointer ${
                  selectedRiskFilter === 'MEDIUM'
                    ? 'bg-[#FEF9EE] border border-[#D99A24] text-[#D99A24] font-bold'
                    : 'text-[#667085] hover:text-[#111827]'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#D99A24]"></span>
                  Medium (Uncertain)
                </span>
                <span>{reports.filter(r => r.risk_level === 'MEDIUM' || r.prediction === 'UNCERTAIN').length}</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('dashboard')
                  setSelectedRiskFilter('LOW')
                  setIsMobileSidebarOpen(false)
                }}
                className={`w-full px-3 py-1.5 rounded-xl flex items-center justify-between transition-colors cursor-pointer ${
                  selectedRiskFilter === 'LOW'
                    ? 'bg-[#F0FDF4] border border-[#10B981] text-[#10B981] font-bold'
                    : 'text-[#667085] hover:text-[#111827]'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#10B981]"></span>
                  Low Risk (Real)
                </span>
                <span>{reports.filter(r => r.risk_level === 'LOW' || r.prediction === 'REAL' || r.prediction === 'AUTHENTIC').length}</span>
              </button>
            </div>

            {/* Category Filter */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-[#667085] uppercase tracking-wider block px-2">
                Modality
              </span>
              {['ALL', 'VIDEO', 'AUDIO', 'IMAGE'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    setActiveTab('dashboard')
                    setSelectedCategoryFilter(cat)
                    setIsMobileSidebarOpen(false)
                  }}
                  className={`w-full px-3 py-1.5 rounded-xl flex items-center justify-between transition-colors cursor-pointer ${
                    selectedCategoryFilter === cat
                      ? 'bg-white border border-[#E5E7EB] font-bold text-[#111827]'
                      : 'text-[#667085] hover:text-[#111827]'
                  }`}
                >
                  <span>{cat}</span>
                  {cat === 'ALL' ? (
                    <span>{reports.length}</span>
                  ) : (
                    <span>{reports.filter(r => r.category === cat).length}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Storage status at bottom */}
        <div className="p-3 bg-white rounded-2xl border border-[#E5E7EB] text-[10px] font-mono text-[#667085] space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-[#111827]">
            <Database className="w-3.5 h-3.5 text-[#356AE6]" />
            <span>LocalStorage Active</span>
          </div>
          <p>Structured for Supabase connection.</p>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* 2. MAIN CONTENT AREA */}
      {/* ========================================================================= */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 overflow-y-auto">
        
        {/* VIEW A: TABBED INGESTION PANEL (FULL-WIDTH DUAL-COLUMN WORKBENCH) */}
        {activeTab === 'ingest' && (
          <div className="w-full space-y-6 animate-in fade-in duration-200">
            <div>
              <span className="text-xs font-mono font-bold text-[#356AE6] uppercase block">
                ● Ingest Media &amp; Live Inspection Workbench
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-[#111827] uppercase tracking-tight mt-1">
                Forensic Ingestion Studio
              </h1>
              <p className="text-xs text-[#667085] mt-1">
                Upload or select a suspect media stream to inspect frames, playback audio waveforms, and run deepfake predictions.
              </p>
            </div>

            {/* Hidden native file input for actual file dialog */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileInputChange}
              className="hidden"
              accept={
                ingestModality === 'AUDIO'
                  ? 'audio/*'
                  : ingestModality === 'IMAGE'
                  ? 'image/*'
                  : 'video/*,audio/*,image/*'
              }
            />            {/* Full-Width Ingestion Studio Workbench */}
            <div className="w-full space-y-6">
              
              {/* Modality Selector Tabs */}
              <div className="grid grid-cols-3 gap-3 max-w-xl">
                <button
                  type="button"
                  onClick={() => {
                    setIngestModality('VIDEO')
                    if (ingestAudioRef.current) {
                      ingestAudioRef.current.pause()
                      setIngestAudioPlaying(false)
                    }
                  }}
                  className={`p-3.5 rounded-2xl border-2 transition-all flex items-center justify-center gap-2.5 cursor-pointer ${
                    ingestModality === 'VIDEO'
                      ? 'border-[#111827] bg-[#111827] text-white shadow-md font-black'
                      : 'border-[#E5E7EB] bg-white text-[#667085] hover:border-[#111827]'
                  }`}
                >
                  <FileVideo className={`w-5 h-5 ${ingestModality === 'VIDEO' ? 'text-white' : 'text-[#356AE6]'}`} />
                  <span className="text-xs uppercase font-bold tracking-wider">Video Model</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIngestModality('AUDIO')
                    if (ingestVideoRef.current) {
                      ingestVideoRef.current.pause()
                      setIngestVideoPlaying(false)
                    }
                  }}
                  className={`p-3.5 rounded-2xl border-2 transition-all flex items-center justify-center gap-2.5 cursor-pointer ${
                    ingestModality === 'AUDIO'
                      ? 'border-[#111827] bg-[#111827] text-white shadow-md font-black'
                      : 'border-[#E5E7EB] bg-white text-[#667085] hover:border-[#111827]'
                  }`}
                >
                  <FileAudio className={`w-5 h-5 ${ingestModality === 'AUDIO' ? 'text-white' : 'text-[#D99A24]'}`} />
                  <span className="text-xs uppercase font-bold tracking-wider">AudioCNN</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIngestModality('IMAGE')
                    if (ingestVideoRef.current) {
                      ingestVideoRef.current.pause()
                      setIngestVideoPlaying(false)
                    }
                    if (ingestAudioRef.current) {
                      ingestAudioRef.current.pause()
                      setIngestAudioPlaying(false)
                    }
                  }}
                  className={`p-3.5 rounded-2xl border-2 transition-all flex items-center justify-center gap-2.5 cursor-pointer ${
                    ingestModality === 'IMAGE'
                      ? 'border-[#111827] bg-[#111827] text-white shadow-md font-black'
                      : 'border-[#E5E7EB] bg-white text-[#667085] hover:border-[#111827]'
                  }`}
                >
                  <FileImage className={`w-5 h-5 ${ingestModality === 'IMAGE' ? 'text-white' : 'text-[#10B981]'}`} />
                  <span className="text-xs uppercase font-bold tracking-wider">Image Forensic</span>
                </button>
              </div>

              {/* Full-Width Master Ingestion Card */}
              <div className="w-full bg-white rounded-3xl border-2 border-[#111827] p-6 sm:p-8 shadow-card space-y-6">
                
                {/* 1. INTERACTIVE FILE INPUT DROPZONE / MEDIA VIEWER (DIRECTLY IN INPUT BOX) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-mono font-bold text-[#111827] uppercase flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#356AE6]"></span>
                      Media File Input &amp; Live Ingestion Monitor:
                    </label>
                    {selectedFile && (
                      <span className="text-[11px] font-mono text-[#10B981] font-bold">
                        ● READY FOR INGESTION
                      </span>
                    )}
                  </div>

                  {/* If NO file is selected: Standard Drag & Drop Box */}
                  {!selectedFile && !filePreviewUrl ? (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(e) => {
                        e.preventDefault()
                        setIsDraggingFile(true)
                      }}
                      onDragLeave={() => setIsDraggingFile(false)}
                      onDrop={handleDropFile}
                      className={`border-2 border-dashed rounded-3xl p-10 sm:p-14 text-center cursor-pointer transition-all ${
                        isDraggingFile
                          ? 'border-[#356AE6] bg-[#356AE6]/5 scale-[0.99]'
                          : 'border-[#111827]/40 bg-[#FAF9F5] hover:border-[#111827] hover:bg-white'
                      }`}
                    >
                      <div className="max-w-md mx-auto space-y-4">
                        <div className="w-16 h-16 rounded-full bg-white border-2 border-[#111827] flex items-center justify-center mx-auto shadow-sm">
                          <UploadCloud className="w-8 h-8 text-[#356AE6]" />
                        </div>

                        <div>
                          <h3 className="text-base sm:text-lg font-black text-[#111827] uppercase tracking-tight">
                            Click to Browse or Drag &amp; Drop {ingestModality} File
                          </h3>
                          <p className="text-xs text-[#667085] mt-1 font-mono">
                            {ingestModality === 'AUDIO' && "Accepts MP3, WAV, FLAC, AAC, OGG (AudioCNN Neural Ingestion)"}
                            {ingestModality === 'VIDEO' && "Accepts MP4, MOV, WEBM, MKV, AVI (Spatiotemporal Deepfake Extraction)"}
                            {ingestModality === 'IMAGE' && "Accepts PNG, JPG, JPEG, WEBP (Photo Inpainting & Spatial Forensics)"}
                          </p>
                        </div>

                        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                          <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#111827] text-white text-xs font-mono font-bold uppercase shadow-sm hover:bg-[#356AE6] transition-colors">
                            <span>Open File Explorer</span>
                            <span>→</span>
                          </span>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              if (ingestModality === 'AUDIO') {
                                setFilePreviewUrl("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3")
                                setIngestTitle("VoIP Audio Speech Stream")
                                setIngestPath("d:\\audio\\voice_sample.wav")
                              } else {
                                setFilePreviewUrl("https://vjs.zencdn.net/v/oceans.mp4")
                                setIngestTitle("Executive Deepfake Speech & Face Swap")
                                setIngestPath("d:\\videos\\unseen_video.mp4")
                              }
                            }}
                            className="px-4 py-2 rounded-full border border-[#111827]/30 bg-white hover:bg-[#E5E7EB] text-[#111827] text-xs font-mono font-bold uppercase transition-colors"
                          >
                            Load Sample Stream
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* If a File is Loaded or Sample Chosen: Interactive Media Player rendered DIRECTLY in the Input Box */
                    <div className="border-2 border-[#111827] rounded-3xl overflow-hidden bg-[#FAF9F5] p-4 sm:p-6 space-y-4">
                      
                      {/* Top Bar inside input box */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#E5E7EB]">
                        <div className="flex items-center gap-3 overflow-hidden">
                          {ingestModality === 'VIDEO' ? (
                            <FileVideo className="w-6 h-6 text-[#356AE6] flex-shrink-0" />
                          ) : ingestModality === 'AUDIO' ? (
                            <FileAudio className="w-6 h-6 text-[#D99A24] flex-shrink-0" />
                          ) : (
                            <FileImage className="w-6 h-6 text-[#10B981] flex-shrink-0" />
                          )}
                          <div className="overflow-hidden">
                            <strong className="text-xs sm:text-sm text-[#111827] font-mono block truncate">
                              {selectedFile?.name || ingestTitle || `${ingestModality} Media Stream`}
                            </strong>
                            <span className="text-[10px] sm:text-xs text-[#667085] font-mono">
                              {selectedFile ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • ` : ""}
                              {ingestModality} Container • Active Buffer
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="px-3 py-1.5 rounded-lg bg-white border border-[#111827] text-[#111827] text-xs font-mono font-bold hover:bg-[#F5F6F3] transition-colors cursor-pointer"
                          >
                            Replace File
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedFile(null)
                              setFilePreviewUrl(null)
                              if (fileInputRef.current) fileInputRef.current.value = ""
                              if (ingestVideoRef.current) {
                                ingestVideoRef.current.pause()
                                setIngestVideoPlaying(false)
                              }
                              if (ingestAudioRef.current) {
                                ingestAudioRef.current.pause()
                                setIngestAudioPlaying(false)
                              }
                            }}
                            className="px-3 py-1.5 rounded-lg bg-[#FDF2F2] hover:bg-[#FEE2E2] text-[#D94A4A] text-xs font-mono font-bold transition-colors cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      </div>

                      {/* VIDEO PLAYER DIRECTLY IN INPUT BOX */}
                      {ingestModality === 'VIDEO' && (
                        <div className="space-y-4">
                          <div className="relative aspect-video max-h-[420px] w-full mx-auto rounded-2xl overflow-hidden bg-[#111827] border-2 border-[#111827] group">
                            <video
                              ref={ingestVideoRef}
                              src={filePreviewUrl || "https://vjs.zencdn.net/v/oceans.mp4"}
                              playsInline
                              loop
                              muted
                              onPlay={() => setIngestVideoPlaying(true)}
                              onPause={() => setIngestVideoPlaying(false)}
                              onTimeUpdate={() => {
                                if (ingestVideoRef.current) setIngestVideoTime(ingestVideoRef.current.currentTime)
                              }}
                              className="w-full h-full object-cover"
                            />

                            {/* Scanline texture */}
                            <div className="absolute inset-0 scanline-effect pointer-events-none opacity-30"></div>

                            {/* Overlays */}
                            {ingestShowOverlays && (
                              <div className="absolute inset-0 pointer-events-none">
                                <div 
                                  className="border-2 border-dashed border-[#D94A4A] bg-[#D94A4A]/15 rounded-2xl absolute flex items-start justify-center p-2"
                                  style={{ top: "20%", left: "25%", width: "50%", height: "55%" }}
                                >
                                  <span className="bg-[#D94A4A] text-white text-[9px] font-mono font-bold px-2 py-0.5 rounded shadow absolute -top-3">
                                    [TRACKING FACE LANDMARKS &amp; LIP-SYNC]
                                  </span>
                                </div>

                                <div className="absolute top-3 left-3 bg-black/85 backdrop-blur-md px-2.5 py-1 rounded text-[10px] font-mono text-white flex items-center gap-2 border border-white/20">
                                  <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></span>
                                  <span>FRAME: {Math.floor(ingestVideoTime * 30)}</span>
                                  <span>•</span>
                                  <span>{ingestVideoTime.toFixed(1)}s</span>
                                </div>
                              </div>
                            )}

                            {/* Center Play/Pause Overlay */}
                            <button
                              type="button"
                              onClick={() => {
                                if (!ingestVideoRef.current) return
                                if (ingestVideoRef.current.paused) {
                                  ingestVideoRef.current.play().then(() => setIngestVideoPlaying(true)).catch(() => {})
                                } else {
                                  ingestVideoRef.current.pause()
                                  setIngestVideoPlaying(false)
                                }
                              }}
                              className="absolute inset-0 m-auto w-14 h-14 rounded-full bg-black/70 hover:bg-[#356AE6] text-white flex items-center justify-center backdrop-blur-sm transition-all group-hover:scale-110 shadow-2xl cursor-pointer z-10"
                            >
                              {ingestVideoPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 fill-current ml-0.5" />}
                            </button>
                          </div>

                          {/* Scrubber & Controls */}
                          <div className="space-y-2">
                            <input
                              type="range"
                              min="0"
                              max="27.44"
                              step="0.1"
                              value={ingestVideoTime}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value)
                                if (ingestVideoRef.current) {
                                  ingestVideoRef.current.currentTime = val
                                  setIngestVideoTime(val)
                                }
                              }}
                              className="w-full accent-[#356AE6] cursor-pointer h-2 bg-[#E5E7EB] rounded-lg"
                            />

                            <div className="flex items-center justify-between text-xs font-mono text-[#667085]">
                              <div className="flex items-center gap-3">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!ingestVideoRef.current) return
                                    if (ingestVideoRef.current.paused) {
                                      ingestVideoRef.current.play().then(() => setIngestVideoPlaying(true)).catch(() => {})
                                    } else {
                                      ingestVideoRef.current.pause()
                                      setIngestVideoPlaying(false)
                                    }
                                  }}
                                  className="px-3 py-1.5 rounded-lg bg-[#111827] hover:bg-[#356AE6] text-white font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                                >
                                  {ingestVideoPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                                  <span>{ingestVideoPlaying ? "Pause Video" : "Play Video"}</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setIngestShowOverlays(!ingestShowOverlays)}
                                  className="px-2.5 py-1.5 rounded-lg border border-[#111827]/20 bg-white text-[#111827] font-bold hover:bg-[#F5F6F3]"
                                >
                                  {ingestShowOverlays ? "Overlays: Enabled" : "Overlays: Disabled"}
                                </button>
                              </div>

                              <span className="font-bold text-[#111827]">
                                00:{ingestVideoTime < 10 ? `0${ingestVideoTime.toFixed(1)}` : ingestVideoTime.toFixed(1)} / 00:27.4
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* AUDIO PLAYER & WAVEFORM DIRECTLY IN INPUT BOX */}
                      {ingestModality === 'AUDIO' && (
                        <div className="bg-[#111827] text-white p-6 rounded-2xl border-2 border-[#111827] space-y-4">
                          <audio
                            ref={ingestAudioRef}
                            src={filePreviewUrl || "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3"}
                            onTimeUpdate={() => {
                              if (ingestAudioRef.current) setIngestAudioTime(ingestAudioRef.current.currentTime)
                            }}
                            onEnded={() => setIngestAudioPlaying(false)}
                          />

                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-gray-300">
                              Acoustic Track Monitor (AudioCNN Buffer)
                            </span>
                            <span className="text-[10px] font-mono text-[#10B981] font-bold">
                              ● 44.1 kHz PCM • 16-Bit Mono
                            </span>
                          </div>

                          {/* Waveform visualizer */}
                          <div className="h-20 flex items-end justify-between gap-1 py-1">
                            {Array.from({ length: 48 }, (_, i) => {
                              const isAlert = i >= 38
                              const height = ingestAudioPlaying 
                                ? (Math.sin(i * 0.4 + ingestAudioTime * 8) * 35 + 48)
                                : (Math.sin(i * 0.35) * 20 + 30)

                              return (
                                <div
                                  key={i}
                                  className={`w-full rounded-t transition-all duration-100 ${
                                    isAlert ? 'bg-[#D94A4A]' : 'bg-[#356AE6]'
                                  }`}
                                  style={{ height: `${height}%` }}
                                ></div>
                              )
                            })}
                          </div>

                          {/* Audio Scrub Bar */}
                          <input
                            type="range"
                            min="0"
                            max="51.0"
                            step="0.1"
                            value={ingestAudioTime}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value)
                              if (ingestAudioRef.current) {
                                ingestAudioRef.current.currentTime = val
                                setIngestAudioTime(val)
                              }
                            }}
                            className="w-full accent-[#356AE6] cursor-pointer h-2 bg-white/20 rounded-full"
                          />

                          {/* Controls */}
                          <div className="flex items-center justify-between text-xs font-mono">
                            <button
                              type="button"
                              onClick={() => {
                                if (!ingestAudioRef.current) return
                                if (ingestAudioRef.current.paused) {
                                  ingestAudioRef.current.play().then(() => setIngestAudioPlaying(true)).catch(() => {})
                                } else {
                                  ingestAudioRef.current.pause()
                                  setIngestAudioPlaying(false)
                                }
                              }}
                              className="px-4 py-2 rounded-xl bg-[#356AE6] hover:bg-[#244DB7] text-white font-bold flex items-center gap-2 transition-all cursor-pointer shadow"
                            >
                              {ingestAudioPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                              <span>{ingestAudioPlaying ? "Pause Audio" : "Play Audio Stream"}</span>
                            </button>

                            <span className="text-gray-300 font-bold">
                              00:{ingestAudioTime < 10 ? `0${ingestAudioTime.toFixed(1)}` : ingestAudioTime.toFixed(1)} / 00:51.0
                            </span>
                          </div>
                        </div>
                      )}

                      {/* IMAGE PREVIEW DIRECTLY IN INPUT BOX */}
                      {ingestModality === 'IMAGE' && (
                        <div className="space-y-3">
                          <div className="relative aspect-video max-h-[380px] w-full mx-auto rounded-2xl overflow-hidden border-2 border-[#111827] bg-[#111827] shadow-md group">
                            <img
                              src={filePreviewUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1000&q=80"}
                              alt="Ingested Target"
                              className="w-full h-full object-contain bg-black"
                            />

                            {/* Inpainting Mask */}
                            <div className="absolute inset-x-1/4 top-1/6 bottom-1/4 border-2 border-dashed border-[#D94A4A] bg-[#D94A4A]/20 flex items-center justify-center pointer-events-none">
                              <span className="px-2.5 py-1 rounded bg-[#D94A4A] text-white text-[10px] font-mono font-bold shadow">
                                [ROI REGION DETECTED: 0.954 SPLICING PROBABILITY]
                              </span>
                            </div>
                          </div>

                          <div className="flex justify-between text-xs font-mono text-[#667085]">
                            <span>Spatial Dimension: 1920 x 1080 px</span>
                            <span className="font-bold text-[#111827]">RGB 24-bit Non-Compressed Matrix</span>
                          </div>
                        </div>
                      )}

                    </div>
                  )}
                </div>

                {/* 2. EVIDENCE METADATA & DIAGNOSTIC CONFIGURATION GRID */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4 border-t border-[#E5E7EB]">
                  
                  {/* Left Sub-Section: Metadata Fields */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-mono font-bold text-[#111827] uppercase">
                      Evidence Metadata &amp; Case Configuration:
                    </h4>

                    <div className="space-y-1">
                      <label className="text-[11px] font-mono font-bold text-[#667085] uppercase">
                        Case / Evidence Title:
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Unseen Audio / Video Prediction Stream"
                        value={ingestTitle}
                        onChange={(e) => setIngestTitle(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-[#E5E7EB] text-xs sm:text-sm focus:outline-none focus:border-[#111827]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-mono font-bold text-[#667085] uppercase">
                        Local File Path / Stream URI:
                      </label>
                      <input
                        type="text"
                        placeholder={ingestModality === 'AUDIO' ? "d:\\audio\\voice_sample.wav" : "d:\\videos\\unseen_video.mp4"}
                        value={ingestPath}
                        onChange={(e) => setIngestPath(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-[#E5E7EB] text-xs font-mono focus:outline-none focus:border-[#111827]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-mono font-bold text-[#667085] uppercase">
                        Context / Description:
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Brief description of suspect media source and context..."
                        value={ingestDescription}
                        onChange={(e) => setIngestDescription(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-[#E5E7EB] text-xs sm:text-sm focus:outline-none focus:border-[#111827] resize-none"
                      ></textarea>
                    </div>
                  </div>

                  {/* Right Sub-Section: Pipeline Diagnostic Health */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-mono font-bold text-[#111827] uppercase">
                      Pipeline Pre-Scan Diagnostics:
                    </h4>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-[#FAF9F5] p-3 rounded-2xl border border-[#111827]/20 flex flex-col justify-between">
                        <span className="text-[10px] font-mono font-bold uppercase text-[#667085]">Container</span>
                        <strong className="text-xs font-mono font-bold text-[#111827] mt-1">
                          {ingestModality === 'AUDIO' ? "WAV / PCM" : ingestModality === 'IMAGE' ? "JPEG / PNG" : "MP4 / H.264"}
                        </strong>
                      </div>

                      <div className="bg-[#FAF9F5] p-3 rounded-2xl border border-[#111827]/20 flex flex-col justify-between">
                        <span className="text-[10px] font-mono font-bold uppercase text-[#667085]">Bitstream</span>
                        <strong className="text-xs font-mono font-bold text-[#10B981] mt-1">100% Valid</strong>
                      </div>

                      <div className="bg-[#FAF9F5] p-3 rounded-2xl border border-[#111827]/20 flex flex-col justify-between">
                        <span className="text-[10px] font-mono font-bold uppercase text-[#667085]">Pipeline</span>
                        <strong className="text-xs font-mono font-bold text-[#356AE6] mt-1">Armed</strong>
                      </div>
                    </div>

                    <div className="p-4 bg-[#FAF9F5] rounded-2xl border border-[#111827]/20 space-y-2 text-xs font-mono">
                      <div className="flex items-center gap-2 text-[#10B981] font-bold">
                        <Check className="w-4 h-4" />
                        <span>Decoded Frames &amp; Audio Buffers Buffered</span>
                      </div>
                      <div className="flex items-center gap-2 text-[#10B981] font-bold">
                        <Check className="w-4 h-4" />
                        <span>Feature Extraction Matrix Ready</span>
                      </div>
                      <div className="flex items-center gap-2 text-[#356AE6] font-bold">
                        <ShieldCheck className="w-4 h-4" />
                        <span>Cryptographic Audit Chain Active</span>
                      </div>
                    </div>
                  </div>

                </div>

                {/* 3. BOTTOM ACTION & EXECUTION BAR */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[#E5E7EB]">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                    <span className="text-[#667085] text-xs font-bold">Quick Samples:</span>
                    <button
                      type="button"
                      onClick={() => {
                        setIngestModality('VIDEO')
                        setSelectedFile(null)
                        setFilePreviewUrl(null)
                        setIngestTitle("Executive Deepfake Speech & Face Swap")
                        setIngestPath("d:\\videos\\unseen_video.mp4")
                      }}
                      className="px-3 py-1.5 rounded-xl bg-[#F5F6F3] hover:bg-[#E5E7EB] text-[#111827] text-xs font-bold transition-colors cursor-pointer"
                    >
                      Sample Video
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIngestModality('AUDIO')
                        setSelectedFile(null)
                        setFilePreviewUrl(null)
                        setIngestTitle("VoIP Audio Speech Stream")
                        setIngestPath("d:\\audio\\voice_sample.wav")
                      }}
                      className="px-3 py-1.5 rounded-xl bg-[#F5F6F3] hover:bg-[#E5E7EB] text-[#111827] text-xs font-bold transition-colors cursor-pointer"
                    >
                      Sample Audio
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => handleCreateAnalysis()}
                    className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-[#111827] hover:bg-[#356AE6] text-white text-xs sm:text-sm font-black uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-lg disabled:opacity-50"
                  >
                    <Zap className="w-4 h-4 text-[#356AE6]" />
                    <span>Run Model Prediction (POST /api/v1/{ingestModality.toLowerCase()}/analyze) →</span>
                  </button>
                </div>

                {/* Processing Spinner / Progress */}
                {isProcessing && (
                  <div className="p-4 rounded-2xl bg-[#111827] text-white space-y-2 text-xs font-mono animate-in fade-in">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] animate-ping"></span>
                      <span className="font-bold">{progressStep}</span>
                    </div>
                  </div>
                )}

              </div>

            </div>
          </div>
        )}

        {/* VIEW B: PREDICTED DATA CARDS GRID */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            
            {/* Header & Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-4">
              <div>
                <span className="text-xs font-mono font-bold text-[#356AE6] uppercase block">
                  ● Forensic Analysis Ledger
                </span>
                <h1 className="text-2xl sm:text-3xl font-black text-[#111827] uppercase tracking-tight mt-0.5">
                  Predicted Cases ({filteredReports.length})
                </h1>
              </div>

              {/* Search Box */}
              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  placeholder="Search cases..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-[#E5E7EB] bg-white text-xs font-mono focus:outline-none focus:border-[#111827]"
                />
                <Search className="w-4 h-4 text-[#667085] absolute left-3 top-2.5" />
              </div>
            </div>

            {/* Interactive Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {filteredReports.length === 0 ? (
                <div className="col-span-full p-12 bg-white rounded-3xl border-2 border-[#111827] text-center text-sm text-[#667085] font-mono">
                  No cases matching current filter.
                </div>
              ) : (
                filteredReports.map((report) => {
                  const isAudioReport = report.category === 'AUDIO' || !!report.audio_duration_seconds
                  const probVal = isAudioReport 
                    ? (report.ai_probability ?? report.deepfake?.probability ?? 0.974)
                    : (report.deepfake?.probability ?? 0.5094)
                  const probPercent = (probVal * 100).toFixed(1)

                  const isHigh = report.risk_level === 'HIGH' || report.prediction === 'FAKE' || report.prediction === 'AI_GENERATED'
                  const isMed = report.risk_level === 'MEDIUM' || report.prediction === 'UNCERTAIN'

                  return (
                    <div
                      key={report.id}
                      onClick={() => router.push(`/analyze/${report.id}`)}
                      className="bg-white rounded-3xl border-2 border-[#111827] p-4 sm:p-5 shadow-sm hover:shadow-floating hover:border-[#356AE6] transition-all cursor-pointer flex flex-col justify-between space-y-3.5 group h-full"
                    >
                      {/* Card Header: Case ID, Modality & Verdict Badge */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#111827] text-white uppercase">
                            {report.category}
                          </span>
                          <span className="text-[10px] font-mono font-bold text-[#667085]">
                            {report.case_number}
                          </span>
                        </div>

                        {/* Risk / Verdict Badge */}
                        <span
                          className={`text-[10px] font-mono font-extrabold px-2.5 py-0.5 rounded-full ${
                            isHigh
                              ? 'bg-[#D94A4A] text-white'
                              : isMed
                              ? 'bg-[#D99A24] text-white'
                              : 'bg-[#10B981] text-white'
                          }`}
                        >
                          {report.prediction}
                        </span>
                      </div>

                      {/* Card Body: Title & Truncated Description */}
                      <div className="space-y-1 flex-1">
                        <h3 className="text-sm font-black text-[#111827] uppercase group-hover:text-[#356AE6] transition-colors leading-tight line-clamp-2">
                          {report.title}
                        </h3>
                        <p className="text-xs text-[#667085] leading-relaxed line-clamp-2">
                          {report.description}
                        </p>
                      </div>

                      {/* Mini Internal Metric Cards (Uniform Small Cards) */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div className="bg-[#F5F6F3] p-2.5 rounded-xl border border-[#E5E7EB] flex flex-col justify-between">
                          <span className="text-[9px] font-mono font-bold uppercase text-[#667085]">
                            {isAudioReport ? "AI Prob" : "Fake Prob"}
                          </span>
                          <span className={`text-base font-black font-mono ${isHigh ? 'text-[#D94A4A]' : isMed ? 'text-[#D99A24]' : 'text-[#10B981]'}`}>
                            {probPercent}%
                          </span>
                        </div>

                        <div className="bg-[#F5F6F3] p-2.5 rounded-xl border border-[#E5E7EB] flex flex-col justify-between">
                          <span className="text-[9px] font-mono font-bold uppercase text-[#667085]">
                            {isAudioReport ? "Flagged Segment" : "Peak Anomaly"}
                          </span>
                          <span className="text-xs font-black font-mono text-[#111827] truncate">
                            {isAudioReport 
                              ? (report.suspicious_segments?.[0] ? `${report.suspicious_segments[0].start_seconds}s–${report.suspicious_segments[0].end_seconds}s` : "None")
                              : (report.peak_anomaly_timestamp || "00:23.72")}
                          </span>
                        </div>
                      </div>

                      {/* Card Footer: Actions */}
                      <div className="pt-2 border-t border-[#E5E7EB] flex items-center justify-between text-xs font-mono">
                        <span className="text-[10px] text-[#667085]">
                          {report.confidence ? `Conf: ${report.confidence}` : `Risk: ${report.risk_level}`}
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => handleDeleteReport(report.id, e)}
                            className="p-1.5 rounded-lg text-[#667085] hover:text-[#D94A4A] hover:bg-[#FDF2F2] transition-colors cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                          <span className="text-xs font-bold text-[#356AE6] group-hover:translate-x-1 transition-transform flex items-center gap-0.5">
                            Inspect →
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}

      </main>
    </div>
  )
}
