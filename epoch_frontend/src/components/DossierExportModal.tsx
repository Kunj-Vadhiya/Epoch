"use client"

import React from "react"
import { X, Printer, Download, CheckCircle, ShieldAlert, FileText, Hash } from "lucide-react"
import { ForensicCase } from "@/data/forensicCases"

interface DossierExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  forensicCase: ForensicCase;
}

export default function DossierExportModal({
  isOpen,
  onClose,
  forensicCase,
}: DossierExportModalProps) {
  if (!isOpen) return null

  const handleDownloadJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(forensicCase, null, 2))
    const downloadAnchor = document.createElement('a')
    downloadAnchor.setAttribute("href", dataStr)
    downloadAnchor.setAttribute("download", `${forensicCase.caseNumber}_FORENSIC_DOSSIER.json`)
    document.body.appendChild(downloadAnchor)
    downloadAnchor.click()
    downloadAnchor.remove()
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-floating max-w-3xl w-full my-8 overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Top Control Bar */}
        <div className="px-6 py-4 border-b border-[#E5E7EB] flex items-center justify-between bg-[#F5F6F3]">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#356AE6]" />
            <h3 className="text-sm font-bold text-[#111827] uppercase font-mono">
              Verifiable Forensic Dossier & Evidence Certificate
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg bg-white border border-[#E5E7EB] hover:bg-[#F5F6F3] text-xs font-mono font-bold flex items-center gap-1.5 text-[#111827]"
            >
              <Printer className="w-3.5 h-3.5" />
              Print / Save PDF
            </button>
            <button
              onClick={handleDownloadJSON}
              className="px-3 py-1.5 rounded-lg bg-[#356AE6] hover:bg-[#244DB7] text-white text-xs font-mono font-bold flex items-center gap-1.5 shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              Download JSON
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-[#E5E7EB] text-[#667085] hover:text-[#111827]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Forensic Report Document */}
        <div className="p-8 space-y-6 text-[#111827] font-sans">
          {/* Header Lab Stamp */}
          <div className="flex justify-between items-start border-b-2 border-[#111827] pb-6">
            <div>
              <div className="text-xs font-mono font-bold text-[#356AE6] uppercase tracking-wider">
                EPOCH DIGITAL FORENSICS INTELLIGENCE SUITE
              </div>
              <h1 className="text-2xl font-black uppercase tracking-tight">
                CERTIFICATE OF FORENSIC EXAMINATION
              </h1>
              <div className="text-xs font-mono text-[#667085] mt-1">
                COMPREHENSIVE MULTI-MODAL SYNTHETIC MEDIA DECOMPOSITION
              </div>
            </div>

            <div className="text-right font-mono text-xs space-y-1">
              <div><strong>CASE ID:</strong> {forensicCase.caseNumber}</div>
              <div><strong>DATE:</strong> {forensicCase.ingestionDate}</div>
              <div><strong>EXAMINER:</strong> AI ENGINE V4.8 [STABLE]</div>
            </div>
          </div>

          {/* Cryptographic Chain of Custody */}
          <div className="bg-[#F5F6F3] p-4 rounded-xl border border-[#E5E7EB] space-y-1 font-mono text-xs">
            <div className="text-[#667085] font-bold">SHA-256 CRYPTOGRAPHIC INTEGRITY HASH:</div>
            <div className="text-[#356AE6] font-bold break-all">
              {forensicCase.sha256Checksum}
            </div>
          </div>

          {/* Core Verdict Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border border-[#E5E7EB] rounded-xl p-4">
            <div>
              <span className="text-[10px] font-mono text-[#667085] uppercase">Primary Verdict</span>
              <div className="text-lg font-black text-[#D94A4A]">
                {forensicCase.riskVerdict}
              </div>
            </div>
            <div>
              <span className="text-[10px] font-mono text-[#667085] uppercase">Confidence Rating</span>
              <div className="text-lg font-black text-[#111827]">
                {forensicCase.accuracyScore}% Certified
              </div>
            </div>
            <div>
              <span className="text-[10px] font-mono text-[#667085] uppercase">Composite Risk Score</span>
              <div className="text-lg font-black text-[#D94A4A]">
                {forensicCase.overallRiskScore} / 100
              </div>
            </div>
          </div>

          {/* Plain Language Summary */}
          <div className="space-y-1.5 text-xs">
            <h4 className="font-mono font-bold uppercase text-[#111827]">
              1. Executive Diagnostic Findings:
            </h4>
            <p className="text-[#667085] leading-relaxed">
              {forensicCase.plainLanguageVerdict}
            </p>
          </div>

          {/* Anomaly Timeline Summary Table */}
          <div className="space-y-2 text-xs">
            <h4 className="font-mono font-bold uppercase text-[#111827]">
              2. Timestamped Anomaly Log:
            </h4>
            <table className="w-full text-left font-mono text-xs border border-[#E5E7EB]">
              <thead className="bg-[#F5F6F3] text-[#667085]">
                <tr>
                  <th className="p-2 border-b border-[#E5E7EB]">Timestamp</th>
                  <th className="p-2 border-b border-[#E5E7EB]">Category</th>
                  <th className="p-2 border-b border-[#E5E7EB]">Diagnostic Finding</th>
                  <th className="p-2 border-b border-[#E5E7EB]">P-Value</th>
                </tr>
              </thead>
              <tbody>
                {forensicCase.anomalies.map((ano) => (
                  <tr key={ano.id} className="border-b border-[#E5E7EB]">
                    <td className="p-2 font-bold">{ano.formattedTime}</td>
                    <td className="p-2">{ano.category}</td>
                    <td className="p-2 text-[#111827]">{ano.title}</td>
                    <td className="p-2 text-[#356AE6]">{ano.forensicEvidence.p_value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Actionable Recommendations */}
          <div className="space-y-1.5 text-xs border-t border-[#E5E7EB] pt-4">
            <h4 className="font-mono font-bold uppercase text-[#111827]">
              3. Recommended Mitigation / Enforcement:
            </h4>
            <p className="text-[#667085] leading-relaxed">
              {forensicCase.recommendedAction}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
