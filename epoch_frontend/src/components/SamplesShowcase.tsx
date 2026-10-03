"use client"

import React from "react"
import Link from "next/link"
import { ArrowRight, AlertOctagon, ShieldCheck, Video, Image as ImageIcon, Mic, ExternalLink } from "lucide-react"
import { MULTI_MODAL_CASES } from "@/data/forensicCases"

export default function SamplesShowcase() {
  return (
    <section id="samples" className="w-full py-20 bg-[#F5F6F3] border-b border-[#E5E7EB]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#E5E7EB] pb-8">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-[#E5E7EB] text-xs font-mono text-[#356AE6] font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></span>
              VERIFIED INVESTIGATION REPOSITORY
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-[#111827] tracking-tight">
              Pre-Loaded Forensic Test Benches
            </h2>
            <p className="text-sm sm:text-base text-[#667085] max-w-2xl leading-relaxed">
              Explore real-world investigative cases across video face swaps, audio voice clones, inpainting, and authentic control files.
            </p>
          </div>

          <Link
            href="/analyze"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#111827] hover:bg-[#356AE6] text-white text-xs font-mono font-bold uppercase transition-all shadow-sm"
          >
            <span>Launch Analysis Studio</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Samples Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {MULTI_MODAL_CASES.map((c) => (
            <div
              key={c.id}
              className="bg-white rounded-2xl border border-[#E5E7EB] hover:border-[#356AE6] overflow-hidden shadow-card hover:shadow-floating transition-all flex flex-col justify-between group"
            >
              <div>
                {/* Media Thumbnail */}
                <div className="relative aspect-video bg-[#111827] overflow-hidden">
                  <img
                    src={c.mediaThumbUrl}
                    alt={c.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-2 left-2 flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded bg-black/70 backdrop-blur-md text-white text-[10px] font-mono font-bold">
                      {c.modality}
                    </span>
                  </div>
                  <div className="absolute top-2 right-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold text-white ${
                      c.verdictCategory === 'HIGH' ? 'bg-[#D94A4A]' : 'bg-[#10B981]'
                    }`}>
                      {c.overallRiskScore}/100 RISK
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 space-y-2">
                  <div className="text-[10px] font-mono text-[#667085]">
                    CASE: {c.caseNumber}
                  </div>
                  <h3 className="text-sm font-bold text-[#111827] leading-snug line-clamp-2">
                    {c.title}
                  </h3>
                  <p className="text-xs text-[#667085] line-clamp-2 mt-1 leading-relaxed">
                    {c.summary}
                  </p>
                </div>
              </div>

              {/* Action */}
              <div className="p-5 pt-0">
                <Link
                  href={`/analyze?caseId=${c.id}`}
                  className="w-full py-2.5 px-3 rounded-xl bg-[#F5F6F3] hover:bg-[#356AE6] hover:text-white text-[#111827] text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all"
                >
                  <span>Inspect in Analyzer</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
