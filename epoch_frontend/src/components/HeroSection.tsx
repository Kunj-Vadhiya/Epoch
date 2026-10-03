"use client"

import React, { useState } from "react"
import MascotPortfolioHero from "@/components/ui/mascot-portfolio-hero"
import Hero3DSequence from "@/components/Hero3DSequence"
import { Eye, Box, Sparkles, ArrowDown } from "lucide-react"

interface HeroSectionProps {
  onExploreWorkbench: () => void;
}

export default function HeroSection({ onExploreWorkbench }: HeroSectionProps) {
  const [heroMode, setHeroMode] = useState<'poster' | '3d'>('poster')

  return (
    <div className="relative w-full border-b border-[#E5E7EB] bg-[#F5F6F3]">
      {/* Mode Switcher Floating Toggle */}
      <div className="absolute top-4 right-4 z-40 bg-white/90 backdrop-blur-md p-1 rounded-xl border border-[#E5E7EB] shadow-card flex items-center gap-1 text-xs font-mono">
        <button
          onClick={() => setHeroMode('poster')}
          className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
            heroMode === 'poster'
              ? 'bg-[#111827] text-white font-bold shadow-sm'
              : 'text-[#667085] hover:text-[#111827]'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Forensics Mascot Theme
        </button>
        <button
          onClick={() => setHeroMode('3d')}
          className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
            heroMode === '3d'
              ? 'bg-[#356AE6] text-white font-bold shadow-sm'
              : 'text-[#667085] hover:text-[#111827]'
          }`}
        >
          <Box className="w-3.5 h-3.5" />
          3D Three.js Sensor Scanner
        </button>
      </div>

      {/* Render selected Hero experience */}
      {heroMode === 'poster' ? (
        <div className="relative w-full">
          <MascotPortfolioHero
            height="86vh"
            minHeight="480px"
            index="EPOCH / 01"
            discipline="Digital Forensics Intelligence"
            tagline="Detect Synthesis • Explain Fraud"
            collection={["Multi-Modal", "Lab Suite"]}
            reel={["EPOCH Engine v4.8", "Deepfake Defense"]}
            year="2026"
            initials="AI"
            badge="Forensic"
            line2="Deepfake"
            line3="Scam"
            word="DETECT"
            verticalTag="Forensic"
            bracketed="Ω"
            seekingLabel="Engine Status"
            seeking="Launch Workbench"
            services={[
              "468-pt Mesh Warping",
              "Audio STFT Vocoder Analysis",
              "Lip-Sync Delta Offset",
              "Scam Ad NLP & Redirection",
            ]}
            greetings={[
              "EPOCH Forensics ready.",
              "Ingest media to begin deconstruction.",
              "Detecting GAN face swaps & cloned audio.",
              "Clinical investigation online.",
            ]}
            accent="#356AE6"
            paper="#F5F6F3"
            ink="#111827"
          />

          {/* Jump to Workbench Quick Ribbon */}
          <div className="bg-white border-t border-[#E5E7EB] py-3 px-4 flex items-center justify-between text-xs font-mono">
            <span className="text-[#667085] hidden sm:inline">
              PROVENANCE • DEEP SYNTHESIS • FRAUD NLP
            </span>
            <button
              onClick={onExploreWorkbench}
              className="text-[#356AE6] font-bold hover:underline flex items-center gap-1.5 mx-auto sm:mx-0"
            >
              Scroll down or click to explore Active Investigation Workbench <ArrowDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <Hero3DSequence onExploreWorkbench={onExploreWorkbench} />
      )}
    </div>
  )
}
