"use client"

import React, { useState } from "react"
import { ArrowLeftRight, CheckCircle2, AlertOctagon, Sliders } from "lucide-react"
import { ForensicCase } from "@/data/forensicCases"

interface ComparativeAnalysisProps {
  suspectCase: ForensicCase;
  baselineCase: ForensicCase;
}

export default function ComparativeAnalysis({
  suspectCase,
  baselineCase,
}: ComparativeAnalysisProps) {
  const [sliderPos, setSliderPos] = useState<number>(50)

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 shadow-card space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E7EB]">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#EBF1FD] text-[#356AE6] text-xs font-mono font-bold mb-1">
              <ArrowLeftRight className="w-3.5 h-3.5" />
              SIDE-BY-SIDE DIFFERENTIAL TELEMETRY
            </div>
            <h3 className="text-xl font-black text-[#111827] tracking-tight">
              Suspect Media vs. Authentic Baseline Comparator
            </h3>
          </div>

          <div className="text-xs font-mono text-[#667085]">
            DIFFERENTIAL NOISE ANALYSIS
          </div>
        </div>

        {/* Comparative Dual Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Suspect Media */}
          <div className="space-y-3 bg-[#FDF2F2] p-4 rounded-xl border border-[#D94A4A]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-[#D94A4A] uppercase flex items-center gap-1.5">
                <AlertOctagon className="w-4 h-4" />
                SUSPECT CASE: {suspectCase.caseNumber}
              </span>
              <span className="text-xs font-bold text-[#D94A4A]">
                RISK: {suspectCase.overallRiskScore}/100
              </span>
            </div>

            <div className="aspect-video rounded-lg overflow-hidden border border-[#D94A4A] relative">
              <img
                src={suspectCase.mediaUrl}
                alt="Suspect"
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2 left-2 bg-red-600 text-white font-mono text-[10px] px-2 py-0.5 rounded">
                FLAGGED SYNTHETIC
              </div>
            </div>

            <div className="space-y-1 text-xs font-mono">
              <div className="flex justify-between py-1 border-b border-red-200">
                <span className="text-[#667085]">Lip-Sync Offset:</span>
                <strong className="text-[#D94A4A]">{suspectCase.metrics.lipSyncDeltaMs || -140}ms</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-red-200">
                <span className="text-[#667085]">468-pt Mesh Jitter:</span>
                <strong className="text-[#D94A4A]">22.4% [ANOMALOUS]</strong>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#667085]">Vocoder STFT:</span>
                <strong className="text-[#D94A4A]">Phase Discontinuity</strong>
              </div>
            </div>
          </div>

          {/* Authentic Baseline */}
          <div className="space-y-3 bg-[#ECFDF5] p-4 rounded-xl border border-[#10B981]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-[#10B981] uppercase flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                AUTHENTIC BASELINE: {baselineCase.caseNumber}
              </span>
              <span className="text-xs font-bold text-[#10B981]">
                RISK: {baselineCase.overallRiskScore}/100 [SAFE]
              </span>
            </div>

            <div className="aspect-video rounded-lg overflow-hidden border border-[#10B981] relative">
              <img
                src={baselineCase.mediaUrl}
                alt="Baseline"
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2 left-2 bg-[#10B981] text-white font-mono text-[10px] px-2 py-0.5 rounded">
                CONTROL PASS
              </div>
            </div>

            <div className="space-y-1 text-xs font-mono">
              <div className="flex justify-between py-1 border-b border-emerald-200">
                <span className="text-[#667085]">Lip-Sync Offset:</span>
                <strong className="text-[#10B981]">±4ms [NATURAL]</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-emerald-200">
                <span className="text-[#667085]">468-pt Mesh Jitter:</span>
                <strong className="text-[#10B981]">0.8% [ORGANIC]</strong>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#667085]">Vocoder STFT:</span>
                <strong className="text-[#10B981]">Smooth Harmonics</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
