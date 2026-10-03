"use client"

import React, { useState, useRef, useEffect } from "react"
import { 
  ShieldAlert, ShieldCheck, AlertTriangle, Play, Pause, RotateCcw, Volume2, 
  VolumeX, ZoomIn, Eye, Sparkles, Layers, Sliders, ExternalLink, CheckCircle2, 
  Clock, Hash, FileCheck, ArrowRight, Zap, Target, Search, BarChart3, AlertOctagon
} from "lucide-react"
import { ForensicCase, AnomalyMarker, RegionMask, AudioAnomalyInterval } from "@/data/forensicCases"

interface ModalityWorkbenchProps {
  forensicCase: ForensicCase;
  onOpenExport: () => void;
  onSelectCase: (c: ForensicCase) => void;
  allCases: ForensicCase[];
}

export default function ModalityWorkbench({
  forensicCase,
  onOpenExport,
  onSelectCase,
  allCases,
}: ModalityWorkbenchProps) {
  // Video / Audio Playback State
  const workbenchVideoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const [currentTime, setCurrentTime] = useState<number>(0)
  const [isWorkbenchMuted, setIsWorkbenchMuted] = useState<boolean>(true)
  const [selectedAnomaly, setSelectedAnomaly] = useState<AnomalyMarker | null>(
    forensicCase.anomalies[0] || null
  )
  const [activeOverlay, setActiveOverlay] = useState<'mesh' | 'seam' | 'ocr' | 'clean'>('mesh')
  const [investigatorMode, setInvestigatorMode] = useState<'technical' | 'executive'>('technical')
  const [splitPosition, setSplitPosition] = useState<number>(50) // For image split curtain
  const [selectedRegion, setSelectedRegion] = useState<RegionMask | null>(
    forensicCase.regionMasks ? forensicCase.regionMasks[0] : null
  )
  const [selectedAudioInterval, setSelectedAudioInterval] = useState<AudioAnomalyInterval | null>(
    forensicCase.audioIntervals ? forensicCase.audioIntervals[0] : null
  )

  const duration = forensicCase.duration || 52

  const togglePlayback = () => {
    if (workbenchVideoRef.current) {
      if (workbenchVideoRef.current.paused) {
        workbenchVideoRef.current.play().then(() => setIsPlaying(true)).catch(() => {})
      } else {
        workbenchVideoRef.current.pause()
        setIsPlaying(false)
      }
    } else {
      setIsPlaying(!isPlaying)
    }
  }

  // Seek handler
  const seekTo = (seconds: number) => {
    setCurrentTime(seconds)
    if (workbenchVideoRef.current) {
      workbenchVideoRef.current.currentTime = seconds
    }
    // Check if an anomaly exists near this timestamp
    const found = forensicCase.anomalies.find((a) => Math.abs(a.timestamp - seconds) < 2)
    if (found) {
      setSelectedAnomaly(found)
    }
  }

  return (
    <section className="w-full bg-[#F5F6F3] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* 1. MASTER COMMON OUTPUT BANNER */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 shadow-card">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-[#E5E7EB]">
            {/* Title & Case Meta */}
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[#111827] text-white">
                  CASE: {forensicCase.caseNumber}
                </span>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-[#EBF1FD] text-[#356AE6] font-semibold">
                  MODALITY: {forensicCase.modality}
                </span>
                <span className="font-mono text-xs text-[#667085]">
                  INGESTION: {forensicCase.ingestionDate}
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-[#111827] tracking-tight">
                {forensicCase.title}
              </h2>
              <p className="text-sm text-[#667085]">
                Target: <strong className="text-[#111827]">{forensicCase.targetSubject}</strong> • Source: {forensicCase.sourcePlatform}
              </p>
            </div>

            {/* Common Verdict Level & Accuracy Gauge */}
            <div className="flex items-center gap-4 bg-[#F5F6F3] p-4 rounded-xl border border-[#E5E7EB]">
              {/* Verdict Indicator */}
              <div className="text-right">
                <div className="text-[10px] font-mono uppercase font-bold text-[#667085]">
                  Forensic Verdict Level
                </div>
                <div className="flex items-center justify-end gap-1.5 font-sans font-black text-lg sm:text-xl">
                  {forensicCase.verdictCategory === 'HIGH' && (
                    <span className="text-[#D94A4A] flex items-center gap-1.5">
                      <AlertOctagon className="w-5 h-5 text-[#D94A4A]" />
                      CRITICAL RISK / FAKE
                    </span>
                  )}
                  {forensicCase.verdictCategory === 'MEDIUM' && (
                    <span className="text-[#D99A24] flex items-center gap-1.5">
                      <AlertTriangle className="w-5 h-5 text-[#D99A24]" />
                      SUSPICIOUS MEDIA
                    </span>
                  )}
                  {forensicCase.verdictCategory === 'LOW' && (
                    <span className="text-[#10B981] flex items-center gap-1.5">
                      <ShieldCheck className="w-5 h-5 text-[#10B981]" />
                      VERIFIED AUTHENTIC
                    </span>
                  )}
                </div>
                <div className="text-xs font-mono text-[#667085]">
                  Confidence: <strong className="text-[#111827]">{forensicCase.accuracyScore}%</strong>
                </div>
              </div>

              {/* Circular Gauge */}
              <div className="relative w-16 h-16 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-[#E5E7EB]"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className={
                      forensicCase.verdictCategory === 'HIGH'
                        ? 'text-[#D94A4A]'
                        : forensicCase.verdictCategory === 'MEDIUM'
                        ? 'text-[#D99A24]'
                        : 'text-[#10B981]'
                    }
                    strokeDasharray={`${forensicCase.overallRiskScore}, 100`}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute text-center">
                  <span className="text-xs font-mono font-black text-[#111827]">
                    {forensicCase.overallRiskScore}
                  </span>
                  <span className="block text-[8px] font-mono text-[#667085]">/100</span>
                </div>
              </div>
            </div>
          </div>

          {/* Diagnostic Text & Plain Language Toggle */}
          <div className="mt-4 pt-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold uppercase text-[#356AE6]">
                  {investigatorMode === 'technical' ? "Technical Diagnostic Breakdown:" : "Plain Language Legal Verdict:"}
                </span>
                <span className="text-[10px] font-mono text-[#667085] bg-[#F5F6F3] px-2 py-0.5 rounded">
                  {investigatorMode === 'technical' ? "Peer-Reviewable Telemetry" : "Non-Technical / Court-Ready"}
                </span>
              </div>
              <p className="text-sm text-[#111827] leading-relaxed">
                {investigatorMode === 'technical' ? forensicCase.summary : forensicCase.plainLanguageVerdict}
              </p>
            </div>

            {/* Toggle Modes */}
            <div className="flex items-center gap-2 bg-[#F5F6F3] p-1 rounded-lg border border-[#E5E7EB] self-start md:self-center">
              <button
                onClick={() => setInvestigatorMode('technical')}
                className={`text-xs font-medium px-2.5 py-1 rounded-md transition-all ${
                  investigatorMode === 'technical'
                    ? 'bg-white text-[#111827] shadow-sm font-bold'
                    : 'text-[#667085] hover:text-[#111827]'
                }`}
              >
                Technical Mode
              </button>
              <button
                onClick={() => setInvestigatorMode('executive')}
                className={`text-xs font-medium px-2.5 py-1 rounded-md transition-all ${
                  investigatorMode === 'executive'
                    ? 'bg-white text-[#356AE6] shadow-sm font-bold'
                    : 'text-[#667085] hover:text-[#111827]'
                }`}
              >
                Plain Language
              </button>
            </div>
          </div>
        </div>

        {/* 2. MODALITY-SPECIFIC INVESTIGATION SUITE */}
        {/* ========================================================================= */}
        {/* MODALITY A: VIDEO INVESTIGATION SUITE */}
        {/* ========================================================================= */}
        {forensicCase.modality === 'VIDEO' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Video Frame Viewport + Overlays */}
            <div className="lg:col-span-8 bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-card space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#D94A4A] animate-ping"></span>
                  <h3 className="text-sm font-bold text-[#111827] uppercase tracking-wide font-mono">
                    Video Frame Forensic Inspector
                  </h3>
                </div>

                {/* Overlays Toggle */}
                <div className="flex items-center gap-1.5 text-xs font-mono">
                  <span className="text-[#667085] mr-1">Overlays:</span>
                  <button
                    onClick={() => setActiveOverlay('mesh')}
                    className={`px-2 py-1 rounded border transition-all ${
                      activeOverlay === 'mesh'
                        ? 'bg-[#EBF1FD] border-[#356AE6] text-[#356AE6] font-bold'
                        : 'bg-white border-[#E5E7EB] text-[#667085]'
                    }`}
                  >
                    468-pt Mesh
                  </button>
                  <button
                    onClick={() => setActiveOverlay('seam')}
                    className={`px-2 py-1 rounded border transition-all ${
                      activeOverlay === 'seam'
                        ? 'bg-[#FEF7EC] border-[#D99A24] text-[#D99A24] font-bold'
                        : 'bg-white border-[#E5E7EB] text-[#667085]'
                    }`}
                  >
                    Seam Heatmap
                  </button>
                  <button
                    onClick={() => setActiveOverlay('ocr')}
                    className={`px-2 py-1 rounded border transition-all ${
                      activeOverlay === 'ocr'
                        ? 'bg-[#FDF2F2] border-[#D94A4A] text-[#D94A4A] font-bold'
                        : 'bg-white border-[#E5E7EB] text-[#667085]'
                    }`}
                  >
                    Scam NLP
                  </button>
                  <button
                    onClick={() => setActiveOverlay('clean')}
                    className={`px-2 py-1 rounded border transition-all ${
                      activeOverlay === 'clean'
                        ? 'bg-[#F5F6F3] border-[#111827] text-[#111827] font-bold'
                        : 'bg-white border-[#E5E7EB] text-[#667085]'
                    }`}
                  >
                    Raw
                  </button>
                </div>
              </div>

              {/* Video Player Display Container */}
              <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-[#111827] flex items-center justify-center border border-[#E5E7EB]">
                {/* Real Video Stream */}
                <video
                  ref={workbenchVideoRef}
                  src={forensicCase.mediaUrl}
                  playsInline
                  muted={isWorkbenchMuted}
                  loop
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onTimeUpdate={() => {
                    if (workbenchVideoRef.current) {
                      setCurrentTime(workbenchVideoRef.current.currentTime)
                    }
                  }}
                  className="w-full h-full object-cover"
                />

                {/* Simulated Scanline */}
                <div className="absolute inset-0 scanline-effect pointer-events-none opacity-40"></div>

                {/* Overlaid Forensic Graphics */}
                {activeOverlay === 'mesh' && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    {/* SVG 468-point Mesh Wireframe */}
                    <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                      {/* Facial Oval Wireframe */}
                      <ellipse cx="50" cy="48" rx="22" ry="30" fill="none" stroke="#356AE6" strokeWidth="0.8" strokeDasharray="2,2" />
                      <ellipse cx="50" cy="48" rx="16" ry="24" fill="none" stroke="#356AE6" strokeWidth="0.5" opacity="0.6" />
                      
                      {/* Bounding Box on Selected Anomaly if exists */}
                      {selectedAnomaly?.forensicEvidence.coordinates && (
                        <rect
                          x={selectedAnomaly.forensicEvidence.coordinates.x}
                          y={selectedAnomaly.forensicEvidence.coordinates.y}
                          width={selectedAnomaly.forensicEvidence.coordinates.width}
                          height={selectedAnomaly.forensicEvidence.coordinates.height}
                          fill="rgba(217, 74, 74, 0.15)"
                          stroke="#D94A4A"
                          strokeWidth="1.2"
                        />
                      )}

                      {/* Mouth Aperture / Lip Sync Indicator */}
                      <ellipse cx="50" cy="62" rx="8" ry="4" fill="none" stroke="#D99A24" strokeWidth="1" />
                      <line x1="42" y1="62" x2="58" y2="62" stroke="#D99A24" strokeWidth="0.6" />

                      {/* Eyes / Gaze Vector */}
                      <circle cx="42" cy="42" r="3" fill="none" stroke="#356AE6" strokeWidth="0.8" />
                      <circle cx="58" cy="42" r="3" fill="none" stroke="#356AE6" strokeWidth="0.8" />
                      <line x1="42" y1="42" x2="38" y2="39" stroke="#D94A4A" strokeWidth="1" />
                      <line x1="58" y1="42" x2="54" y2="39" stroke="#D94A4A" strokeWidth="1" />
                    </svg>

                    {/* HUD Labels */}
                    <div className="absolute top-4 left-4 bg-black/75 backdrop-blur-md px-2.5 py-1 rounded text-[10px] font-mono text-white border border-white/20">
                      FRAME: {Math.floor(currentTime * 30)} / 960 | FPS: 30.00
                    </div>
                    <div className="absolute top-4 right-4 bg-[#D94A4A]/90 px-2.5 py-1 rounded text-[10px] font-mono text-white font-bold">
                      JITTER: 22.4% [ANOMALOUS]
                    </div>
                  </div>
                )}

                {activeOverlay === 'seam' && (
                  <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-red-500/20 via-transparent to-amber-500/20 mix-blend-overlay flex items-center justify-center">
                    <div className="border-2 border-dashed border-[#D94A4A] w-64 h-80 rounded-full animate-pulseSlow flex items-center justify-center">
                      <span className="bg-[#D94A4A] text-white text-[10px] font-mono px-2 py-0.5 rounded shadow">
                        SYNTHETIC BLENDING SEAM Δ: 0.84
                      </span>
                    </div>
                  </div>
                )}

                {activeOverlay === 'ocr' && (
                  <div className="absolute inset-0 pointer-events-none p-6 flex flex-col justify-between">
                    <div className="self-center bg-red-600/90 text-white text-xs font-mono font-bold px-3 py-1 rounded border border-white">
                      [OCR USURPATION]: FAKE REGULATORY STAMP
                    </div>
                    <div className="self-end bg-amber-500/90 text-white text-xs font-mono font-bold px-3 py-1 rounded border border-white">
                      [FRAUD VECTOR]: GUARANTEED ₹85,000 DAILY
                    </div>
                    <div className="self-center bg-red-600/90 text-white text-xs font-mono font-bold px-3 py-1 rounded border border-white">
                      [RED-FLAG REDIRECTION]: WA.ME/VIP_GROUP
                    </div>
                  </div>
                )}

                {/* Center Play/Pause Floating Overlay */}
                <button
                  onClick={togglePlayback}
                  className="absolute p-4 rounded-full bg-black/60 hover:bg-[#356AE6] text-white backdrop-blur-md transition-all shadow-lg hover:scale-110 cursor-pointer z-10"
                >
                  {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 fill-current ml-0.5" />}
                </button>
              </div>

              {/* Video Playback & Timeline Controls */}
              <div className="space-y-3 pt-2">
                {/* Scrub Bar with Anomaly Markers */}
                <div className="relative w-full">
                  {/* Timeline Anomaly Badges */}
                  <div className="relative h-6 w-full mb-1">
                    {forensicCase.anomalies.map((ano) => {
                      const leftPercent = (ano.timestamp / duration) * 100
                      return (
                        <button
                          key={ano.id}
                          onClick={() => seekTo(ano.timestamp)}
                          className={`absolute top-0 transform -translate-x-1/2 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded shadow-sm flex items-center gap-1 transition-all ${
                            selectedAnomaly?.id === ano.id
                              ? 'bg-[#D94A4A] text-white scale-110 z-20 ring-2 ring-white'
                              : 'bg-white text-[#111827] border border-[#E5E7EB] hover:bg-[#F5F6F3] z-10'
                          }`}
                          style={{ left: `${leftPercent}%` }}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${ano.severity === 'HIGH_RISK' ? 'bg-[#D94A4A]' : 'bg-[#D99A24]'}`}></span>
                          {ano.formattedTime}
                        </button>
                      )
                    })}
                  </div>

                  {/* Main Slider Track */}
                  <input
                    type="range"
                    min="0"
                    max={duration}
                    step="0.1"
                    value={currentTime}
                    onChange={(e) => setCurrentTime(parseFloat(e.target.value))}
                    className="w-full accent-[#356AE6] cursor-pointer h-2 bg-[#E5E7EB] rounded-lg"
                  />
                </div>

                {/* Bottom Media Scrub Telemetry */}
                <div className="flex items-center justify-between text-xs font-mono text-[#667085]">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="p-1.5 rounded bg-[#F5F6F3] hover:bg-[#E5E7EB] text-[#111827]"
                    >
                      {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => seekTo(0)}
                      className="p-1.5 rounded bg-[#F5F6F3] hover:bg-[#E5E7EB] text-[#111827]"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-bold text-[#111827]">
                      {Math.floor(currentTime / 60)
                        .toString()
                        .padStart(2, "0")}
                      :
                      {(currentTime % 60).toFixed(1).padStart(4, "0")}{" "}
                      / 00:{duration.toString().padStart(2, "0")}
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    <span>LIP-SYNC DELTA: <strong className="text-[#D99A24] font-bold">-140ms</strong></span>
                    <span>FPS: 30</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Selected Anomaly Evidence Inspector */}
            <div className="lg:col-span-4 space-y-4">
              <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-card space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
                  <h3 className="text-xs font-mono font-bold text-[#111827] uppercase flex items-center gap-1.5">
                    <Target className="w-4 h-4 text-[#356AE6]" />
                    Evidence Breakdown Drawer
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#FDF2F2] text-[#D94A4A] font-bold">
                    {selectedAnomaly?.confidence}% CONFIDENCE
                  </span>
                </div>

                {selectedAnomaly ? (
                  <div className="space-y-3 text-xs">
                    <div>
                      <span className="text-[10px] font-mono text-[#667085] uppercase">
                        Flagged Anomaly Marker
                      </span>
                      <h4 className="text-sm font-bold text-[#111827]">
                        {selectedAnomaly.title}
                      </h4>
                      <p className="text-[#667085] text-xs mt-0.5">
                        {selectedAnomaly.subtitle}
                      </p>
                    </div>

                    <div className="bg-[#F5F6F3] p-3 rounded-xl border border-[#E5E7EB] space-y-1.5 font-mono">
                      <div className="flex justify-between">
                        <span className="text-[#667085]">Observed Metric:</span>
                        <strong className="text-[#D94A4A]">{selectedAnomaly.forensicEvidence.metric}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#667085]">Measured Value:</span>
                        <strong className="text-[#111827]">{selectedAnomaly.forensicEvidence.value}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#667085]">Baseline Range:</span>
                        <span className="text-[#667085]">{selectedAnomaly.forensicEvidence.baseline}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#667085]">Statistical Significance:</span>
                        <span className="text-[#356AE6] font-bold">{selectedAnomaly.forensicEvidence.p_value}</span>
                      </div>
                    </div>

                    <p className="text-xs text-[#111827] leading-relaxed">
                      {selectedAnomaly.description}
                    </p>

                    {/* Technical Details List */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono text-[#667085] uppercase font-bold">
                        Forensic Verification Points:
                      </span>
                      <ul className="space-y-1">
                        {selectedAnomaly.forensicEvidence.technicalDetails.map((td, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-[11px] text-[#667085]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#356AE6] mt-1 flex-shrink-0"></span>
                            {td}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-[#667085]">Click any timeline pin to view specific forensic diagnostics.</p>
                )}
              </div>

              {/* Sub-Metric Score Cards */}
              <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-card space-y-3 text-xs">
                <div className="text-xs font-mono font-bold text-[#111827] uppercase">
                  Multi-Modal Metric Scores
                </div>

                <div className="space-y-2.5">
                  <div>
                    <div className="flex justify-between text-xs mb-1 font-mono">
                      <span className="text-[#667085]">Synthetic Media Index</span>
                      <strong className="text-[#D94A4A]">{forensicCase.metrics.syntheticMediaScore}%</strong>
                    </div>
                    <div className="w-full h-1.5 bg-[#F5F6F3] rounded-full overflow-hidden">
                      <div className="h-full bg-[#D94A4A] rounded-full" style={{ width: `${forensicCase.metrics.syntheticMediaScore}%` }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1 font-mono">
                      <span className="text-[#667085]">Scam Signal Vectors</span>
                      <strong className="text-[#D94A4A]">{forensicCase.metrics.scamSignalsScore}%</strong>
                    </div>
                    <div className="w-full h-1.5 bg-[#F5F6F3] rounded-full overflow-hidden">
                      <div className="h-full bg-[#D94A4A] rounded-full" style={{ width: `${forensicCase.metrics.scamSignalsScore}%` }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1 font-mono">
                      <span className="text-[#667085]">Audio Clone Consistency</span>
                      <strong className="text-[#D99A24]">{forensicCase.metrics.audioCloningScore}%</strong>
                    </div>
                    <div className="w-full h-1.5 bg-[#F5F6F3] rounded-full overflow-hidden">
                      <div className="h-full bg-[#D99A24] rounded-full" style={{ width: `${forensicCase.metrics.audioCloningScore}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODALITY B: IMAGE INVESTIGATION SUITE (SPATIAL REAL VS FAKE MASKS) */}
        {/* ========================================================================= */}
        {forensicCase.modality === 'IMAGE' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Spatial Image Mask Viewer */}
            <div className="lg:col-span-8 bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-card space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#356AE6] animate-pulse"></span>
                  <h3 className="text-sm font-bold text-[#111827] uppercase tracking-wide font-mono">
                    Spatial Real vs. Fake Region Deconstructor
                  </h3>
                </div>

                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="flex items-center gap-1 text-[#D94A4A] font-bold">
                    <span className="w-2.5 h-2.5 rounded bg-[#D94A4A]"></span> FAKE (Inpainted)
                  </span>
                  <span className="flex items-center gap-1 text-[#10B981] font-bold">
                    <span className="w-2.5 h-2.5 rounded bg-[#10B981]"></span> REAL (Camera Sensor)
                  </span>
                </div>
              </div>

              {/* Interactive Image Frame with Spatial Polygon Regions */}
              <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-[#111827] border border-[#E5E7EB] group">
                <img
                  src={forensicCase.mediaUrl}
                  alt={forensicCase.title}
                  className="w-full h-full object-cover"
                />

                {/* Render Region Masks */}
                {forensicCase.regionMasks?.map((mask) => (
                  <button
                    key={mask.id}
                    onClick={() => setSelectedRegion(mask)}
                    className={`absolute border-2 transition-all cursor-pointer ${
                      mask.type === 'FAKE'
                        ? 'border-[#D94A4A] bg-[#D94A4A]/20 hover:bg-[#D94A4A]/30'
                        : 'border-[#10B981] bg-[#10B981]/20 hover:bg-[#10B981]/30'
                    } ${
                      selectedRegion?.id === mask.id ? 'ring-4 ring-white scale-[1.01] z-20' : 'z-10'
                    }`}
                    style={{
                      left: `${mask.coordinates.x}%`,
                      top: `${mask.coordinates.y}%`,
                      width: `${mask.coordinates.width}%`,
                      height: `${mask.coordinates.height}%`,
                    }}
                  >
                    <span className={`absolute top-1 left-1 text-[9px] font-mono font-black px-1.5 py-0.5 rounded text-white ${
                      mask.type === 'FAKE' ? 'bg-[#D94A4A]' : 'bg-[#10B981]'
                    }`}>
                      [{mask.type}]: {mask.label} ({mask.confidence}%)
                    </span>
                  </button>
                ))}
              </div>

              {/* Curtain Split Slider Controls */}
              <div className="bg-[#F5F6F3] p-3 rounded-xl border border-[#E5E7EB] flex items-center justify-between gap-4 text-xs font-mono">
                <div className="flex items-center gap-3">
                  <Sliders className="w-4 h-4 text-[#356AE6]" />
                  <span>ERROR LEVEL ANALYSIS (ELA) NOISE OVERLAY</span>
                </div>
                <div className="text-[#667085]">
                  Click highlighted boundary boxes to inspect pixel quantization deltas.
                </div>
              </div>
            </div>

            {/* Right: Selected Region Diagnostic Card */}
            <div className="lg:col-span-4 space-y-4">
              <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-card space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
                  <h3 className="text-xs font-mono font-bold text-[#111827] uppercase">
                    Spatial Region Analysis
                  </h3>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                    selectedRegion?.type === 'FAKE' ? 'bg-[#FDF2F2] text-[#D94A4A]' : 'bg-[#ECFDF5] text-[#10B981]'
                  }`}>
                    {selectedRegion?.type} REGION
                  </span>
                </div>

                {selectedRegion ? (
                  <div className="space-y-3 text-xs">
                    <div>
                      <h4 className="text-sm font-bold text-[#111827]">
                        {selectedRegion.label}
                      </h4>
                      <p className="text-xs text-[#667085] mt-1 leading-relaxed">
                        {selectedRegion.reason}
                      </p>
                    </div>

                    <div className="bg-[#F5F6F3] p-3 rounded-xl border border-[#E5E7EB] space-y-2 font-mono">
                      <div className="flex justify-between">
                        <span className="text-[#667085]">Confidence:</span>
                        <strong className="text-[#111827]">{selectedRegion.confidence}%</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#667085]">ELA Quantization Variance:</span>
                        <strong className={selectedRegion.type === 'FAKE' ? 'text-[#D94A4A]' : 'text-[#10B981]'}>
                          {selectedRegion.elaVariance}%
                        </strong>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-[#667085]">Click any bounded region on the image to inspect forensic details.</p>
                )}
              </div>

              {/* Recommended Action Card */}
              <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-card space-y-2 text-xs">
                <div className="text-[10px] font-mono font-bold text-[#667085] uppercase">
                  Recommended Investigative Action
                </div>
                <p className="text-[#111827] leading-relaxed">
                  {forensicCase.recommendedAction}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODALITY C: AUDIO INVESTIGATION SUITE (ERROR TIMEFRAME INTERVALS) */}
        {/* ========================================================================= */}
        {forensicCase.modality === 'AUDIO' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Audio Waveform & Timeframe Interval Player */}
            <div className="lg:col-span-8 bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-card space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#D99A24] animate-pulse"></span>
                  <h3 className="text-sm font-bold text-[#111827] uppercase tracking-wide font-mono">
                    Voice Clone Spectral Frequency Scanner
                  </h3>
                </div>

                <span className="text-xs font-mono text-[#667085]">
                  VOCODER FFT: 48 kHz / 24-BIT
                </span>
              </div>

              {/* Audio Waveform Canvas Simulation */}
              <div className="bg-[#111827] rounded-xl p-6 relative overflow-hidden border border-[#E5E7EB] space-y-6">
                {/* Visual Audio Spectrogram Bars */}
                <div className="h-28 flex items-end justify-between gap-1 px-2">
                  {Array.from({ length: 48 }, (_, i) => {
                    // Highlight anomalous interval bars
                    const isGlitch = i >= 8 && i <= 18 || i >= 26 && i <= 34
                    const barHeight = isGlitch ? Math.sin(i * 0.4) * 50 + 40 : Math.sin(i * 0.8) * 30 + 20
                    return (
                      <div
                        key={i}
                        className={`w-full rounded-t transition-all ${
                          isGlitch
                            ? 'bg-[#D94A4A] shadow-[0_0_8px_rgba(217,74,74,0.6)]'
                            : 'bg-[#356AE6]/70'
                        }`}
                        style={{ height: `${barHeight}%` }}
                      ></div>
                    )
                  })}
                </div>

                {/* Time-Range Error Interval Badges on Track */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono text-white/70">
                    <span>00:00.00</span>
                    <span className="text-[#D94A4A] font-bold">ERRORS DETECTED IN 2 INTERVALS</span>
                    <span>00:28.00</span>
                  </div>

                  <input
                    type="range"
                    min="0"
                    max={duration}
                    step="0.1"
                    value={currentTime}
                    onChange={(e) => setCurrentTime(parseFloat(e.target.value))}
                    className="w-full accent-[#D94A4A] cursor-pointer"
                  />
                </div>

                {/* Audio Playback Controls */}
                <div className="flex items-center justify-between text-white text-xs font-mono pt-2">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="px-4 py-2 rounded-lg bg-[#356AE6] hover:bg-[#244DB7] text-white font-bold flex items-center gap-2 transition-all"
                    >
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      <span>{isPlaying ? "Pause Audio" : "Play Cloned Stream"}</span>
                    </button>
                    <button
                      onClick={() => seekTo(0)}
                      className="p-2 rounded bg-white/10 hover:bg-white/20"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>

                  <span className="text-white font-bold">
                    {currentTime.toFixed(2)}s / {duration}s
                  </span>
                </div>
              </div>

              {/* List of Detected Audio Error Intervals */}
              <div className="space-y-2 pt-2">
                <div className="text-xs font-mono font-bold text-[#111827] uppercase">
                  Detected Synthetic Error Intervals (Click to Seek):
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {forensicCase.audioIntervals?.map((int) => (
                    <button
                      key={int.id}
                      onClick={() => {
                        setSelectedAudioInterval(int)
                        seekTo(int.startTime)
                      }}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        selectedAudioInterval?.id === int.id
                          ? 'bg-[#FEF7EC] border-[#D99A24] ring-1 ring-[#D99A24]'
                          : 'bg-white border-[#E5E7EB] hover:border-[#D1D5DB]'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-mono font-bold mb-1">
                        <span className="text-[#D94A4A]">[{int.startFormatted} → {int.endFormatted}]</span>
                        <span className="text-[#667085]">{int.confidence}% CONF</span>
                      </div>
                      <div className="text-xs font-bold text-[#111827]">{int.anomalyType}</div>
                      <div className="text-[11px] text-[#667085] mt-1">{int.description.slice(0, 75)}...</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Audio Frequency Breakdown Drawer */}
            <div className="lg:col-span-4 space-y-4">
              <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-card space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
                  <h3 className="text-xs font-mono font-bold text-[#111827] uppercase">
                    Vocoder Spectral Diagnostics
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#FDF2F2] text-[#D94A4A] font-bold">
                    {selectedAudioInterval?.frequencyBand}
                  </span>
                </div>

                {selectedAudioInterval ? (
                  <div className="space-y-3 text-xs">
                    <div>
                      <span className="text-[10px] font-mono text-[#667085] uppercase">
                        Error Interval: {selectedAudioInterval.startFormatted} – {selectedAudioInterval.endFormatted}
                      </span>
                      <h4 className="text-sm font-bold text-[#111827]">
                        {selectedAudioInterval.anomalyType}
                      </h4>
                      <p className="text-xs text-[#667085] mt-1 leading-relaxed">
                        {selectedAudioInterval.description}
                      </p>
                    </div>

                    <div className="bg-[#F5F6F3] p-3 rounded-xl border border-[#E5E7EB] space-y-2 font-mono">
                      <div className="flex justify-between">
                        <span className="text-[#667085]">Frequency Band:</span>
                        <strong className="text-[#D94A4A]">{selectedAudioInterval.frequencyBand}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#667085]">Neural Vocoder Score:</span>
                        <strong className="text-[#111827]">{selectedAudioInterval.confidence}%</strong>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-[#667085]">Select an error timeframe to inspect frequency details.</p>
                )}
              </div>

              {/* Voice Cloning Technical Specs */}
              <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-card space-y-2.5 text-xs font-mono">
                <div className="font-bold text-[#111827] uppercase">
                  Cloning Engine Telemetry
                </div>
                <div className="flex justify-between py-1 border-b border-[#F5F6F3]">
                  <span className="text-[#667085]">Architecture:</span>
                  <strong className="text-[#111827]">Zero-Shot XTTS / Tortoise</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-[#F5F6F3]">
                  <span className="text-[#667085]">Pitch Jitter ($F_0$):</span>
                  <strong className="text-[#D94A4A]">0.01 Hz [FLAT]</strong>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-[#667085]">Phase Coherence:</span>
                  <strong className="text-[#D94A4A]">0.12 [BROKEN]</strong>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </section>
  )
}
