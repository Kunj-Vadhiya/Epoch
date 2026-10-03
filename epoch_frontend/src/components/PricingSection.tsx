"use client"

import React from "react"
import Link from "next/link"
import { Check, ArrowRight, ShieldCheck, Zap, Sparkles } from "lucide-react"

export default function PricingSection() {
  const tiers = [
    {
      name: "Starter Investigator",
      price: "$0",
      period: "Free Forever",
      description: "For individual researchers and journalists conducting basic verification.",
      features: [
        "15 Media Ingestions / month",
        "468-point 3D Landmark Mesh",
        "Basic Audio Vocoder Scanner",
        "Real vs. Fake Verdict & Score",
        "Standard Web Report",
      ],
      cta: "Get Started Free",
      popular: false,
      buttonStyle: "bg-white text-[#111827] border-2 border-[#111827] hover:bg-[#F5F6F3]",
    },
    {
      name: "Forensics Pro",
      price: "$49",
      period: "/ month",
      description: "For digital forensic labs, compliance officers, and fact-checking teams.",
      features: [
        "Unlimited Multi-Modal Ingestion",
        "Lip-Sync Delta Offset (-140ms)",
        "Scam Ad NLP & VIP Link Scanner",
        "Spatial Real vs Fake Inpainting Masks",
        "Exportable PDF/JSON Forensic Dossier",
        "SHA-256 Cryptographic Chain of Custody",
      ],
      cta: "Launch Pro Access",
      popular: true,
      buttonStyle: "bg-[#356AE6] text-white hover:bg-[#244DB7] shadow-card",
    },
    {
      name: "Enterprise & Enforcement",
      price: "$199",
      period: "/ month",
      description: "For regulatory agencies, intelligence units, and high-volume platforms.",
      features: [
        "Automated Social Stream Monitoring",
        "High-Throughput Batch API",
        "Custom Fraud NLP Dictionary",
        "On-Premises / Air-Gapped Deployment",
        "Court-Certified Audit Logs (ISO 27037)",
        "24/7 Forensic Engineer Support",
      ],
      cta: "Contact Lab Team",
      popular: false,
      buttonStyle: "bg-[#111827] text-white hover:bg-black shadow-card",
    },
  ]

  return (
    <section id="pricing" className="w-full py-20 bg-white border-b-2 border-[#111827]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">

        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          {/* <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F5F6F3] border border-[#E5E7EB] text-xs font-mono text-[#356AE6] font-bold">
            <span>●</span> SIMPLE &amp; TRANSPARENT PLANS
          </div> */}
          <h2 className="text-3xl sm:text-5xl font-black text-[#111827] tracking-tight uppercase">
            Investigative Intelligence Tiers
          </h2>
          <p className="text-sm sm:text-base text-[#667085] leading-relaxed">
            Choose the forensic bandwidth required for your investigations. All plans include immutable SHA-256 hash logging.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {tiers.map((tier, idx) => (
            <div
              key={idx}
              className={`rounded-3xl p-8 flex flex-col justify-between space-y-6 transition-all relative ${tier.popular
                  ? "bg-[#FAF9F5] border-3 border-[#356AE6] shadow-floating ring-2 ring-[#356AE6]/20 scale-105 z-10"
                  : "bg-white border-2 border-[#E5E7EB] hover:border-[#111827] shadow-sm hover:shadow-card"
                }`}
            >
              {tier.popular && (
                <div className="absolute -top-3.5 left-1/2 transform -translate-x-1/2 bg-[#356AE6] text-white text-[10px] font-mono font-black uppercase px-3 py-1 rounded-full shadow-sm">
                  ★ MOST POPULAR LAB CHOICE
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-black text-[#111827] uppercase tracking-wide">
                    {tier.name}
                  </h3>
                  <p className="text-xs text-[#667085] mt-1 leading-relaxed">
                    {tier.description}
                  </p>
                </div>

                <div className="pt-2 flex items-baseline gap-1 font-mono">
                  <span className="text-4xl sm:text-5xl font-black text-[#111827]">
                    {tier.price}
                  </span>
                  <span className="text-xs text-[#667085] font-bold">
                    {tier.period}
                  </span>
                </div>

                {/* Features List */}
                <div className="space-y-2.5 pt-4 border-t border-[#E5E7EB]">
                  {tier.features.map((feat, fIdx) => (
                    <div key={fIdx} className="flex items-start gap-2.5 text-xs text-[#111827]">
                      <div className="w-4 h-4 rounded-full bg-[#EBF1FD] text-[#356AE6] flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">
                        ✓
                      </div>
                      <span className="leading-snug">{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-4">
                <Link
                  href="/analyze"
                  className={`w-full py-3.5 px-4 rounded-full text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${tier.buttonStyle}`}
                >
                  <span>{tier.cta}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}
