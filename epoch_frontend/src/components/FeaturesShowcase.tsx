"use client"

import React, { useState } from "react"
import { 
  Eye, Mic, Video, Image as ImageIcon, ShieldAlert, Sparkles, Layers, 
  CheckCircle2, FileSearch, ArrowRight, Activity, Terminal, Cpu, Database 
} from "lucide-react"

export default function FeaturesShowcase() {
  const [activeTab, setActiveTab] = useState<'all' | 'video' | 'audio' | 'image' | 'nlp'>('all')

  const features = [
    {
      id: "feat-1",
      category: "video",
      categoryLabel: "Video Forensic",
      title: "468-Point 3D Landmark Mesh Jitter",
      description: "Deconstructs facial geometry frame-by-frame with Delaunay triangulation. Flags micro-warping and seam blending artifacts along the jaw and eye contours ($MBJ$ index).",
      metric: "MBJ Index < 2.1% baseline",
      pill: "Spatial Jitter",
      color: "#356AE6",
      icon: Eye,
    },
    {
      id: "feat-2",
      category: "video",
      categoryLabel: "Audio-Visual",
      title: "Phoneme-Viseme Lip-Sync Delta",
      description: "Calculates the exact millisecond offset between audio speech bursts (/p/, /b/, /m/) and oral fissure movement, catching Wav2Lip and puppet generation.",
      metric: "Temporal Asynchrony ±25ms",
      pill: "Lip-Sync Sync",
      color: "#D99A24",
      icon: Video,
    },
    {
      id: "feat-3",
      category: "audio",
      categoryLabel: "Audio Spectral",
      title: "Vocoder STFT Phase Discontinuity",
      description: "Short-Time Fourier Transform (STFT) exposes synthetic vocoder harmonic breaks and robotic pitch flattening ($F_0$) characteristic of XTTS and ElevenLabs clones.",
      metric: "Phase Coherence Δ > 0.82",
      pill: "Voice Clone",
      color: "#D99A24",
      icon: Mic,
    },
    {
      id: "feat-4",
      category: "image",
      categoryLabel: "Image Spatial",
      title: "Spatial Real vs. Fake Region Masks",
      description: "Segments single photos into exact color-coded polygons: [RED = Synthesized Face / Inpainting] vs. [GREEN = Authentic Camera Sensor Torso / Background].",
      metric: "ELA Quantization Δ 38.4",
      pill: "Error Level Analysis",
      color: "#356AE6",
      icon: ImageIcon,
    },
    {
      id: "feat-5",
      category: "nlp",
      categoryLabel: "Scam NLP",
      title: "Fraud Vector & Emblem Usurpation",
      description: "OCR & Natural Language Processing scans on-screen text for fake regulatory stamps (counterfeit RBI/Ministry seals) and guaranteed financial returns (e.g. ₹85,000/day).",
      metric: "Linguistic Risk Vector 96%",
      pill: "Dark-Pattern Scan",
      color: "#D94A4A",
      icon: ShieldAlert,
    },
    {
      id: "feat-6",
      category: "nlp",
      categoryLabel: "Funnel Analysis",
      title: "WhatsApp & Telegram VIP Link Traps",
      description: "Automated URL reputation analysis flags short links (`wa.me/...`, `t.me/...`) directing users to unmonitored end-to-end encrypted groups.",
      metric: "Redirection Threat 94/100",
      pill: "Redirection Trap",
      color: "#D94A4A",
      icon: FileSearch,
    },
  ]

  const filteredFeatures = activeTab === 'all' 
    ? features 
    : features.filter(f => f.category === activeTab)

  return (
    <section id="features" className="w-full py-20 bg-white border-b border-[#E5E7EB]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#E5E7EB] pb-8">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F5F6F3] border border-[#E5E7EB] text-xs font-mono text-[#356AE6] font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              FORENSIC DETECTION CAPABILITIES
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-[#111827] tracking-tight">
              Engineered for Clinical Precision
            </h2>
            <p className="text-sm sm:text-base text-[#667085] max-w-2xl leading-relaxed">
              Every flagged anomaly is backed by raw mathematical telemetry, p-values, and peer-reviewable verification metrics.
            </p>
          </div>

          {/* Interactive Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#F5F6F3] rounded-xl border border-[#E5E7EB] text-xs font-mono">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'all'
                  ? 'bg-white text-[#111827] font-bold shadow-sm'
                  : 'text-[#667085] hover:text-[#111827]'
              }`}
            >
              All Vectors
            </button>
            <button
              onClick={() => setActiveTab('video')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'video'
                  ? 'bg-white text-[#356AE6] font-bold shadow-sm'
                  : 'text-[#667085] hover:text-[#111827]'
              }`}
            >
              Video &amp; Mesh
            </button>
            <button
              onClick={() => setActiveTab('audio')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'audio'
                  ? 'bg-white text-[#D99A24] font-bold shadow-sm'
                  : 'text-[#667085] hover:text-[#111827]'
              }`}
            >
              Voice Cloning
            </button>
            <button
              onClick={() => setActiveTab('image')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'image'
                  ? 'bg-white text-[#356AE6] font-bold shadow-sm'
                  : 'text-[#667085] hover:text-[#111827]'
              }`}
            >
              Image ELA
            </button>
            <button
              onClick={() => setActiveTab('nlp')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'nlp'
                  ? 'bg-white text-[#D94A4A] font-bold shadow-sm'
                  : 'text-[#667085] hover:text-[#111827]'
              }`}
            >
              Scam NLP
            </button>
          </div>
        </div>

        {/* Features Cards Grid with Micro-interactions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFeatures.map((feat) => {
            const Icon = feat.icon
            return (
              <div
                key={feat.id}
                className="group bg-[#F5F6F3] hover:bg-white rounded-2xl p-6 border border-[#E5E7EB] hover:border-[#356AE6] hover:shadow-floating transition-all duration-300 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-white border border-[#E5E7EB] flex items-center justify-center text-[#111827] shadow-sm group-hover:scale-105 transition-transform">
                      <Icon className="w-5 h-5 text-[#356AE6]" />
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-white text-[#111827] border border-[#E5E7EB]">
                      {feat.pill}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-mono uppercase font-bold text-[#667085]">
                      {feat.categoryLabel}
                    </span>
                    <h3 className="text-base font-black text-[#111827] mt-0.5">
                      {feat.title}
                    </h3>
                  </div>

                  <p className="text-xs text-[#667085] leading-relaxed">
                    {feat.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-[#E5E7EB] flex items-center justify-between text-xs font-mono">
                  <span className="text-[#356AE6] font-bold">{feat.metric}</span>
                  <span className="text-[#10B981] font-bold">✓ VERIFIED</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
