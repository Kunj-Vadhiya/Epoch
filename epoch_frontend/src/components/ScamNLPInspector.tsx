"use client"

import React from "react"
import { AlertTriangle, AlertOctagon, Link2, DollarSign, Clock, ShieldAlert, ArrowRight, ExternalLink } from "lucide-react"
import { ForensicCase } from "@/data/forensicCases"

interface ScamNLPInspectorProps {
  forensicCase: ForensicCase;
}

export default function ScamNLPInspector({ forensicCase }: ScamNLPInspectorProps) {
  const scamSignals = forensicCase.scamSignals || []

  return (
    <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 shadow-card space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E7EB]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#FDF2F2] text-[#D94A4A] text-xs font-mono font-bold mb-1">
            <AlertOctagon className="w-3.5 h-3.5" />
            FRAUD PATTERN & NLP REDIRECTION DECONSTRUCTOR
          </div>
          <h3 className="text-xl font-black text-[#111827] tracking-tight">
            Scam Ad Linguistic & Dark-Pattern Engine
          </h3>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="px-3 py-1.5 rounded-lg bg-[#F5F6F3] border border-[#E5E7EB] text-[#111827]">
            SCAM RISK SCORE: <strong className="text-[#D94A4A] font-bold">{forensicCase.metrics.scamSignalsScore || 88}%</strong>
          </div>
        </div>
      </div>

      {/* Main Grid: Mobile Ad Simulation & Linguistic Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Mobile Short-Form Ad Frame */}
        <div className="lg:col-span-5 bg-[#F5F6F3] p-4 rounded-2xl border border-[#E5E7EB] flex flex-col items-center">
          <div className="text-[11px] font-mono text-[#667085] uppercase mb-2 font-bold">
            Mobile Ad OCR Layer Reconstruction
          </div>

          <div className="w-[280px] rounded-3xl bg-[#111827] border-4 border-[#111827] overflow-hidden shadow-2xl relative text-white">
            {/* Top Speaker Frame */}
            <div className="h-96 relative">
              <img
                src={forensicCase.mediaUrl}
                alt="Ad Preview"
                className="w-full h-full object-cover"
              />

              {/* Counterfeit Authority Stamp Alert */}
              <div className="absolute top-4 inset-x-4 bg-red-600/90 backdrop-blur-sm p-2 rounded-lg border border-white text-center shadow-lg animate-pulseSlow">
                <div className="text-[9px] font-mono font-bold uppercase tracking-wider text-yellow-300">
                  ⚠️ USURPATION DETECTED
                </div>
                <div className="text-[11px] font-bold">
                  Counterfeit Government / Bank Seal
                </div>
              </div>

              {/* Highlighted Fraudulent Return Hook */}
              <div className="absolute bottom-16 inset-x-4 bg-black/85 p-2 rounded-lg border-2 border-[#D94A4A] text-center shadow-lg">
                <div className="text-[10px] font-mono text-[#D94A4A] font-bold uppercase">
                  [OCR LINGUISTIC TRAP]
                </div>
                <div className="text-xs font-black text-white">
                  &quot;Guaranteed ₹85,000 Daily AI Return&quot;
                </div>
              </div>

              {/* Redirection CTA */}
              <div className="absolute bottom-3 inset-x-4 bg-[#25D366] text-black font-black text-xs py-2 rounded-xl text-center shadow-md flex items-center justify-center gap-1.5">
                <span>Join VIP WhatsApp Group</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        </div>

        {/* Right Linguistic Vectors & Redirection Breakdown */}
        <div className="lg:col-span-7 space-y-4">
          <div className="space-y-3">
            <h4 className="text-xs font-mono font-bold text-[#667085] uppercase">
              Detected Fraud Signatures & Linguistic Vectors:
            </h4>

            {scamSignals.length > 0 ? (
              scamSignals.map((sig, idx) => (
                <div
                  key={idx}
                  className="bg-[#F5F6F3] p-4 rounded-xl border border-[#E5E7EB] space-y-2 hover:border-[#D94A4A] transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-[#FDF2F2] text-[#D94A4A] border border-[#D94A4A]/20">
                      {sig.type}
                    </span>
                    <span className="font-mono text-xs text-[#667085]">
                      FOUND AT: <strong className="text-[#111827]">{sig.foundAt}</strong> • RISK: <strong className="text-[#D94A4A]">{sig.riskScore}%</strong>
                    </span>
                  </div>

                  <div className="text-xs font-mono font-semibold text-[#111827] bg-white p-2.5 rounded-lg border border-[#E5E7EB]">
                    &quot;{sig.detectedText}&quot;
                  </div>

                  <p className="text-xs text-[#667085] leading-relaxed">
                    <strong>Forensic NLP Analysis:</strong> {sig.nlpExplanation}
                  </p>
                </div>
              ))
            ) : (
              <div className="p-4 rounded-xl bg-[#ECFDF5] border border-[#10B981]/30 text-xs text-[#10B981] font-mono">
                ✓ No fraudulent linguistic hooks or high-risk scam redirections detected in this baseline media.
              </div>
            )}
          </div>

          {/* Redirection Link Risk Score Card */}
          <div className="bg-[#FEF7EC] border border-[#D99A24] p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs font-mono">
            <div>
              <div className="font-bold text-[#111827] flex items-center gap-1.5 mb-0.5">
                <Link2 className="w-4 h-4 text-[#D99A24]" />
                Destination Funnel Risk: 96%
              </div>
              <div className="text-[#667085]">
                Short URL wa.me/vip_invest redirects to unmonitored encrypted group.
              </div>
            </div>
            <span className="px-2.5 py-1 rounded bg-[#D94A4A] text-white font-bold self-start sm:self-center">
              HIGH RISK TRAP
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
