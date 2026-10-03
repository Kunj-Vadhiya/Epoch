"use client"

import React, { useState } from "react"
import { UploadCloud, Link2, X, CheckCircle2, Loader2, FileVideo, FileAudio, FileImage, ShieldCheck } from "lucide-react"
import { ForensicCase, MULTI_MODAL_CASES } from "@/data/forensicCases"

interface IngestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCaseCreated: (newCase: ForensicCase) => void;
}

export default function IngestionModal({ isOpen, onClose, onCaseCreated }: IngestionModalProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'url'>('upload')
  const [urlInput, setUrlInput] = useState<string>("")
  const [modality, setModality] = useState<'VIDEO' | 'IMAGE' | 'AUDIO'>('VIDEO')
  const [isProcessing, setIsProcessing] = useState<boolean>(false)
  const [currentStep, setCurrentStep] = useState<number>(0)

  if (!isOpen) return null

  const pipelineSteps = [
    "Step 1/5: Demuxing & Frame/Audio Stream Ingestion...",
    "Step 2/5: Extracting 468-point 3D Facial Landmark Delaunay Mesh...",
    "Step 3/5: Computing Vocoder Short-Time Fourier Transform (STFT)...",
    "Step 4/5: Calculating Phoneme-Viseme Lip-Sync Delta & EAR Blinking...",
    "Step 5/5: Running OCR Fraud Vector Scanner & Composite Scoring...",
  ]

  const handleStartAnalysis = () => {
    setIsProcessing(true)
    setCurrentStep(0)

    let step = 0
    const interval = setInterval(() => {
      step++
      if (step < pipelineSteps.length) {
        setCurrentStep(step)
      } else {
        clearInterval(interval)
        setIsProcessing(false)
        // Select an appropriate mock case corresponding to the chosen modality
        const targetCase = MULTI_MODAL_CASES.find((c) => c.modality === modality) || MULTI_MODAL_CASES[0]
        onCaseCreated(targetCase)
        onClose()
      }
    }, 900)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-floating max-w-xl w-full overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E5E7EB] flex items-center justify-between bg-[#F5F6F3]">
          <div>
            <h3 className="text-base font-bold text-[#111827] uppercase font-mono">
              Multi-Modal Ingestion Engine
            </h3>
            <p className="text-xs text-[#667085]">
              Upload image, audio, or video for forensic deconstruction
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[#E5E7EB] text-[#667085] hover:text-[#111827] transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Modality Selector */}
          <div className="space-y-2">
            <label className="text-xs font-mono font-bold text-[#667085] uppercase">
              Select Media Modality:
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setModality('VIDEO')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                  modality === 'VIDEO'
                    ? 'bg-[#EBF1FD] border-[#356AE6] text-[#356AE6] font-bold'
                    : 'bg-white border-[#E5E7EB] text-[#667085] hover:border-[#D1D5DB]'
                }`}
              >
                <FileVideo className="w-5 h-5" />
                <span className="text-xs">Video File</span>
              </button>

              <button
                type="button"
                onClick={() => setModality('IMAGE')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                  modality === 'IMAGE'
                    ? 'bg-[#EBF1FD] border-[#356AE6] text-[#356AE6] font-bold'
                    : 'bg-white border-[#E5E7EB] text-[#667085] hover:border-[#D1D5DB]'
                }`}
              >
                <FileImage className="w-5 h-5" />
                <span className="text-xs">Image File</span>
              </button>

              <button
                type="button"
                onClick={() => setModality('AUDIO')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                  modality === 'AUDIO'
                    ? 'bg-[#EBF1FD] border-[#356AE6] text-[#356AE6] font-bold'
                    : 'bg-white border-[#E5E7EB] text-[#667085] hover:border-[#D1D5DB]'
                }`}
              >
                <FileAudio className="w-5 h-5" />
                <span className="text-xs">Audio File</span>
              </button>
            </div>
          </div>

          {/* Upload or URL tabs */}
          <div className="flex border-b border-[#E5E7EB] text-xs font-mono">
            <button
              onClick={() => setActiveTab('upload')}
              className={`pb-2 px-4 font-bold border-b-2 transition-all ${
                activeTab === 'upload'
                  ? 'border-[#356AE6] text-[#356AE6]'
                  : 'border-transparent text-[#667085]'
              }`}
            >
              Direct File Drop
            </button>
            <button
              onClick={() => setActiveTab('url')}
              className={`pb-2 px-4 font-bold border-b-2 transition-all ${
                activeTab === 'url'
                  ? 'border-[#356AE6] text-[#356AE6]'
                  : 'border-transparent text-[#667085]'
              }`}
            >
              Social URL Ingestion
            </button>
          </div>

          {activeTab === 'upload' ? (
            <div className="border-2 border-dashed border-[#D1D5DB] hover:border-[#356AE6] rounded-xl p-8 text-center cursor-pointer transition-all bg-[#F5F6F3]/50">
              <UploadCloud className="w-10 h-10 text-[#356AE6] mx-auto mb-2" />
              <div className="text-sm font-bold text-[#111827]">
                Drag & Drop {modality.toLowerCase()} file here
              </div>
              <div className="text-xs text-[#667085] mt-1">
                Supports MP4, MOV, WAV, MP3, JPG, PNG (Max 250MB)
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-xs font-mono text-[#667085]">
                Paste Video / Social Media URL (YouTube, TikTok, Reels, X):
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="https://instagram.com/reel/..."
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  className="flex-1 text-xs border border-[#E5E7EB] rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-[#356AE6]"
                />
              </div>
            </div>
          )}

          {/* Processing Progress Animation */}
          {isProcessing && (
            <div className="bg-[#111827] text-white p-4 rounded-xl space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between text-[#356AE6]">
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  ANALYSIS PIPELINE RUNNING
                </span>
                <span>{Math.round(((currentStep + 1) / pipelineSteps.length) * 100)}%</span>
              </div>
              <div className="text-gray-300">
                {pipelineSteps[currentStep]}
              </div>
              <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#356AE6] transition-all duration-300"
                  style={{ width: `${((currentStep + 1) / pipelineSteps.length) * 100}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Submit Action Button */}
          <button
            disabled={isProcessing}
            onClick={handleStartAnalysis}
            className="w-full py-3 rounded-xl bg-[#111827] hover:bg-[#356AE6] text-white font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 shadow-sm"
          >
            {isProcessing ? "Processing Telemetry..." : "Deconstruct & Run Forensic Analysis"}
          </button>
        </div>
      </div>
    </div>
  )
}
