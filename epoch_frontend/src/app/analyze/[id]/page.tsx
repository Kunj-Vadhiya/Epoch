"use client"

import React, { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { VideoForensicReport } from "@/types/forensicOutput"
import { DEFAULT_FORENSIC_REPORTS } from "@/data/defaultVideoReports"
import ReportDetailView from "@/components/ReportDetailView"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

const LOCAL_STORAGE_KEY = "epoch_forensic_reports_v2"

export default function ForensicReportDetailPage() {
  const params = useParams()
  const id = params?.id as string
  const [report, setReport] = useState<VideoForensicReport | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY)
      if (saved) {
        const parsed: VideoForensicReport[] = JSON.parse(saved)
        const found = parsed.find(r => r.id === id)
        if (found) {
          setReport(found)
          setLoading(false)
          return
        }
      }
    } catch (e) {
      console.error("Failed to load report from storage:", e)
    }

    // Check defaults
    const foundDefault = DEFAULT_FORENSIC_REPORTS.find(r => r.id === id)
    if (foundDefault) {
      setReport(foundDefault)
    } else {
      setReport(DEFAULT_FORENSIC_REPORTS[0])
    }
    setLoading(false)
  }, [id])

  if (loading || !report) {
    return (
      <div className="min-h-screen bg-[#F5F6F3] flex items-center justify-center font-mono text-sm text-[#667085]">
        Loading Forensic Report #{id}...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5F6F3] text-[#111827] font-sans p-4 sm:p-6 lg:p-8">
      <ReportDetailView report={report} />
    </div>
  )
}
