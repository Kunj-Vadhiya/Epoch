"use client"

import React from "react"
import Navigation from "@/components/Navigation"
import HeroManSection from "@/components/HeroManSection"
import AboutSection from "@/components/AboutSection"
import SampleTabbedSection from "@/components/SampleTabbedSection"
import PricingSection from "@/components/PricingSection"

export default function Home() {
  return (
    <main className="min-h-screen bg-[#F5F6F3] text-[#111827] flex flex-col justify-between selection:bg-[#356AE6] selection:text-white font-sans">
      {/* 1. Theme-Compliant Navigation */}
      <Navigation />

      {/* 2. Hero Section: Animated Man with Thinking Cards & Perspective Grid Lines */}
      <HeroManSection />

      {/* 3. About Section with Feature Cards */}
      <AboutSection />

      {/* 4. Tabbed Sample Outputs (Video, Audio, Image) */}
      <SampleTabbedSection />

      {/* 5. Clean Editorial Pricing Section */}
      <PricingSection />

      {/* 6. Clinical Forensics Footer */}
      <footer className="w-full bg-[#111827] text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-xs font-mono">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#356AE6] text-white flex items-center justify-center font-black text-sm">
              Æ
            </div>
            <div>
              <span className="font-bold uppercase tracking-wider block text-white">
                EPOCH FORENSIC INTELLIGENCE SUITE
              </span>
              <span className="text-gray-400 text-[10px]">
                MULTI-MODAL DEEPFAKE &amp; FRAUDULENT AD DETECTOR
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-gray-400">
            <span>ISO/IEC 27037 FORENSIC METHODOLOGY</span>
            <span>SHA-256 AUDIT READY</span>
            <span>© 2026 EPOCH LABS</span>
          </div>
        </div>
      </footer>
    </main>
  )
}
