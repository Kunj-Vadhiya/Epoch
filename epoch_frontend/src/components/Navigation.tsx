"use client"

import React, { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ArrowRight, Menu, X } from "lucide-react"

export default function Navigation() {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false)
    if (pathname !== "/") {
      window.location.href = `/#${id}`
      return
    }
    const elem = document.getElementById(id)
    if (elem) {
      elem.scrollIntoView({ behavior: "smooth" })
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full bg-[#F5F6F3]/95 backdrop-blur-md border-b-2 border-[#111827] transition-all font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 py-3.5 flex items-center justify-between">
        
        {/* Brand Index Pill: Matching the Editorial Poster Theme */}
        <div className="flex items-center gap-3">
          <Link href="/" className="inline-flex items-center gap-2.5 border-2 border-[#111827] rounded-full p-1 pr-4 bg-white hover:bg-[#FAF9F5] transition-all group">
            <span className="bg-[#356AE6] text-white rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider font-mono">
              EPOCH
            </span>
            <span className="text-xs font-black uppercase tracking-wider text-[#111827]">
              Deepfake Forensics
            </span>
          </Link>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-xs font-black uppercase tracking-widest text-[#111827]">
          <button
            onClick={() => scrollToSection("about")}
            className="hover:text-[#356AE6] transition-colors relative py-1 group"
          >
            <span>About</span>
            <span className="absolute left-0 bottom-0 w-0 h-0.5 bg-[#356AE6] group-hover:w-full transition-all duration-200"></span>
          </button>
          <button
            onClick={() => scrollToSection("samples")}
            className="hover:text-[#356AE6] transition-colors relative py-1 group"
          >
            <span>Samples</span>
            <span className="absolute left-0 bottom-0 w-0 h-0.5 bg-[#356AE6] group-hover:w-full transition-all duration-200"></span>
          </button>
          <button
            onClick={() => scrollToSection("pricing")}
            className="hover:text-[#356AE6] transition-colors relative py-1 group"
          >
            <span>Pricing</span>
            <span className="absolute left-0 bottom-0 w-0 h-0.5 bg-[#356AE6] group-hover:w-full transition-all duration-200"></span>
          </button>
        </nav>

        {/* Action Button: Editorial Double-Pill "Go to Analyze →" */}
        <div className="hidden md:flex items-center">
          <Link
            href="/analyze"
            className="inline-flex items-center border-2 border-[#111827] rounded-full overflow-hidden shadow-sm group hover:scale-[1.02] transition-transform"
          >
            <span className="bg-white text-[#111827] px-4 py-2 text-xs font-black uppercase tracking-wider">
              Engine
            </span>
            <span className="bg-[#356AE6] group-hover:bg-[#244DB7] text-white px-4 py-2 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors">
              <span>Go to Analyze</span>
              <span className="font-mono text-sm group-hover:translate-x-1 transition-transform">→</span>
            </span>
          </Link>
        </div>

        {/* Mobile Menu Toggle */}
        <div className="flex md:hidden">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl border border-[#111827] text-[#111827] hover:bg-white"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#F5F6F3] border-b border-[#E5E7EB] px-6 py-5 space-y-4 font-black text-xs uppercase tracking-wider">
          <button
            onClick={() => scrollToSection("about")}
            className="block w-full text-left py-2 text-[#111827] hover:text-[#356AE6]"
          >
            About
          </button>
          <button
            onClick={() => scrollToSection("samples")}
            className="block w-full text-left py-2 text-[#111827] hover:text-[#356AE6]"
          >
            Samples
          </button>
          <button
            onClick={() => scrollToSection("pricing")}
            className="block w-full text-left py-2 text-[#111827] hover:text-[#356AE6]"
          >
            Pricing
          </button>
          <Link
            href="/analyze"
            onClick={() => setMobileMenuOpen(false)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-full bg-[#356AE6] text-white font-black text-xs uppercase shadow-sm"
          >
            <span>Go to Analyze →</span>
          </Link>
        </div>
      )}
    </header>
  )
}
