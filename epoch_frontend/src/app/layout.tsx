import type { Metadata } from "next"
import { Inter, JetBrains_Mono } from "next/font/google"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export const metadata: Metadata = {
  title: "EPOCH | Multi-Modal Deepfake & Scam Ad Detection Engine",
  description: "End-to-end digital forensics investigation platform detecting synthetic video, cloned audio, lip-sync deltas, and scam ad patterns.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable}`}>
      <body className="font-sans antialiased bg-[#F5F6F3] text-[#111827] selection:bg-[#356AE6] selection:text-white">
        {children}
      </body>
    </html>
  )
}
