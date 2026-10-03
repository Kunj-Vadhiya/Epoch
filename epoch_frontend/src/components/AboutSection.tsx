"use client"

import React from "react"
import { Eye, Mic, Video, Image as ImageIcon, ShieldAlert, Cpu, CheckCircle2 } from "lucide-react"

export default function AboutSection() {
  const coreFeatures = [
    {
      title: "Multi-Modal Ingestion",
      desc: "Takes in short-form videos and audio files, splitting them up so the system can check both the visuals and the sound at the same time.",
      icon: Video,
      accent: "#356AE6",
    },
    {
      title: "Facial Feature Check",
      desc: "Scans the person's face across video frames to catch weird blending, awkward edges, or signs of a face swap.",
      icon: Eye,
      accent: "#356AE6",
    },
    {
      title: "Voice Clone Detection",
      desc: "Listens to the audio track to spot robotic pitch changes or fake computer-generated voices.",
      icon: Mic,
      accent: "#D99A24",
    },
    {
      title: "Lip-Sync Delay Check",
      desc: "Checks if the mouth movements match up with what the person is actually saying, flagging any awkward delays.",
      icon: Cpu,
      accent: "#D99A24",
    },
    {
      title: "Scam & Fraud Scanner",
      desc: "Reads the text on screen and speech audio to catch fake money promises, fake brand logos, and shady WhatsApp or Telegram links.",
      icon: ShieldAlert,
      accent: "#D94A4A",
    },
    {
      title: "Clear Risk Report",
      desc: "Combines all the checks into a simple risk score with clear proof, showing exactly why a video was flagged.",
      icon: ImageIcon,
      accent: "#356AE6",
    },
  ];

  return (
    <section id="about" className="w-full py-20 bg-white border-b-2 border-[#111827]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#E5E7EB] pb-8">
          <div className="space-y-3">
            {/* <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F5F6F3] border border-[#E5E7EB] text-xs font-mono text-[#356AE6] font-bold">
              <span>●</span> ABOUT EPOCH ENGINE
            </div> */}
            <h2 className="text-3xl sm:text-5xl font-black text-[#111827] tracking-tight uppercase">
              Investigative Forensics Architecture
            </h2>
            <p className="text-sm sm:text-base text-[#667085] max-w-2xl leading-relaxed">
              Designed as an end-to-end investigative platform that goes beyond standard black-box AI detection to provide verifiable, mathematical proof.
            </p>
          </div>
        </div>

        {/* Features Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {coreFeatures.map((feat, idx) => {
            const Icon = feat.icon
            return (
              <div
                key={idx}
                className="bg-[#F5F6F3] hover:bg-white rounded-3xl p-7 border-2 border-[#E5E7EB] hover:border-[#111827] shadow-sm hover:shadow-floating transition-all flex flex-col justify-between space-y-4 group"
              >
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-white border-2 border-[#111827] flex items-center justify-center text-[#111827] shadow-sm group-hover:scale-105 transition-transform">
                    <Icon className="w-6 h-6 text-[#356AE6]" />
                  </div>
                  <h3 className="text-lg font-black text-[#111827] leading-snug">
                    {feat.title}
                  </h3>
                  <p className="text-xs text-[#667085] leading-relaxed">
                    {feat.desc}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
