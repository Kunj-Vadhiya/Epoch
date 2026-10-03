"use client"

import React, { useEffect, useRef, useState } from "react"
import Link from "next/link"
import * as THREE from "three"
import { ArrowRight, RefreshCw, Scan } from "lucide-react"

// Professional analytical thoughts from the man assessing the media
const MAN_THOUGHT_COMMENTS = [
  "Wait... that mouth movement lags the audio syllable by 140ms.",
  "That jawline contour has a 22.4% spatial mesh jitter glitch.",
  "This voice clone has zero natural pitch tremor — robotic vocoder.",
  "Why is a prominent executive guaranteeing ₹85,000 daily returns?",
  "Zero blinks across 26 seconds of speech? That's not human.",
  "Counterfeit regulatory seal detected in the overlay banner.",
  "Error Level Analysis shows 92% compression delta on the face.",
  "Corneal specular glint doesn't match the scene's ambient light.",
  "This video is funneling users to an unverified private WhatsApp link.",
  "Synthetic smoothing detected — all natural skin pore texture is gone.",
  "Manufactured urgency detected: 'Offer expires in 12 minutes'."
]

export default function Hero3DModel() {
  const mountRef = useRef<HTMLDivElement>(null)
  const [thoughtIndex, setThoughtIndex] = useState<number>(0)
  const [isRotating, setIsRotating] = useState<boolean>(true)

  // Continuously cycle thoughts in short intervals (every 2.6 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      setThoughtIndex((prev) => (prev + 1) % MAN_THOUGHT_COMMENTS.length)
    }, 2600)
    return () => clearInterval(interval)
  }, [])

  // 3D Three.js Scene Setup for Man / Facial Mesh Model
  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const scene = new THREE.Scene()
    scene.background = new THREE.Color("#F5F6F3")

    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    )
    camera.position.set(0, -0.1, 8.2)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(renderer.domElement)

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.95)
    scene.add(ambientLight)

    const pointLight = new THREE.PointLight(0x356ae6, 2.2, 50)
    pointLight.position.set(5, 5, 5)
    scene.add(pointLight)

    // 3D Parametric Head & Facial Landmark Model
    const headGroup = new THREE.Group()
    scene.add(headGroup)

    const pointsCount = 468
    const positions = new Float32Array(pointsCount * 3)
    const colors = new Float32Array(pointsCount * 3)

    const blueColor = new THREE.Color("#356AE6")
    const amberColor = new THREE.Color("#D99A24")
    const redColor = new THREE.Color("#D94A4A")

    for (let i = 0; i < pointsCount; i++) {
      const u = (i / pointsCount) * Math.PI * 2
      const v = ((i % 24) / 24) * Math.PI - Math.PI / 2

      const rx = 1.8 * Math.cos(v) * Math.sin(u)
      let ry = 2.4 * Math.sin(v)
      let rz = 1.6 * Math.cos(v) * Math.cos(u)

      // Anatomical protrusion for nose, chin, eye sockets
      if (rz > 0 && Math.abs(rx) < 0.8 && ry > -0.5 && ry < 0.8) {
        rz += Math.cos(rx * 2) * 0.48
      }
      if (rz > 0.4 && ry < -0.8) {
        rz += 0.22
      }

      positions[i * 3] = rx
      positions[i * 3 + 1] = ry
      positions[i * 3 + 2] = rz

      const col = i % 14 === 0 ? redColor : i % 6 === 0 ? amberColor : blueColor
      colors[i * 3] = col.r
      colors[i * 3 + 1] = col.g
      colors[i * 3 + 2] = col.b
    }

    const pointsGeometry = new THREE.BufferGeometry()
    pointsGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3))
    pointsGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3))

    const pointsMaterial = new THREE.PointsMaterial({
      size: 0.088,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
    })

    const pointCloud = new THREE.Points(pointsGeometry, pointsMaterial)
    headGroup.add(pointCloud)

    // Triangulation wireframe mesh
    const sphereGeo = new THREE.IcosahedronGeometry(2.1, 3)
    const wireframeMat = new THREE.MeshBasicMaterial({
      color: 0x356ae6,
      wireframe: true,
      transparent: true,
      opacity: 0.2,
    })
    const wireframeMesh = new THREE.Mesh(sphereGeo, wireframeMat)
    headGroup.add(wireframeMesh)

    // Soundwave Ring
    const ringGeo = new THREE.RingGeometry(0.3, 0.36, 32)
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xd99a24,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.45,
    })
    const ringMesh = new THREE.Mesh(ringGeo, ringMat)
    ringMesh.position.set(0, -0.6, 1.8)
    headGroup.add(ringMesh)

    const handleResize = () => {
      if (!container) return
      camera.aspect = container.clientWidth / container.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(container.clientWidth, container.clientHeight)
    }
    window.addEventListener("resize", handleResize)

    let animationFrameId: number
    let clock = new THREE.Clock()

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate)
      const elapsedTime = clock.getElapsedTime()

      if (isRotating) {
        headGroup.rotation.y = Math.sin(elapsedTime * 0.45) * 0.42
        headGroup.rotation.x = Math.cos(elapsedTime * 0.3) * 0.1
      }

      const scale = 1 + (Math.sin(elapsedTime * 3) + 1) * 0.22
      ringMesh.scale.set(scale, scale, scale)

      renderer.render(scene, camera)
    }

    animate()

    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener("resize", handleResize)
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement)
      }
      renderer.dispose()
    }
  }, [isRotating])

  const currentThought = MAN_THOUGHT_COMMENTS[thoughtIndex]

  return (
    <section className="relative w-full min-h-[88vh] bg-[#F5F6F3] border-b border-[#E5E7EB] overflow-hidden flex items-center">
      {/* Subtle Background Forensic Grid */}
      <div className="absolute inset-0 bg-forensic-grid opacity-60 pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Left Hero Content */}
          <div className="lg:col-span-6 space-y-6 text-left">
            {/* Editorial Index Pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-[#E5E7EB] text-xs font-mono text-[#356AE6] font-bold shadow-sm">
              <span className="w-2 h-2 rounded-full bg-[#356AE6] animate-pulse"></span>
              MULTI-MODAL FORENSIC INTELLIGENCE
            </div>

            {/* Headline */}
            <div className="space-y-2">
              <h1 className="text-4xl sm:text-6xl font-black text-[#111827] tracking-tight leading-[1.05]">
                Is that really them??
              </h1>
              <p className="text-2xl sm:text-3xl font-extrabold text-[#356AE6] tracking-tight">
                Deepfake &amp; Scam Ad Detector
              </p>
            </div>

            {/* Description */}
            <p className="text-sm sm:text-base text-[#667085] leading-relaxed max-w-xl">
              An investigative platform that deconstructs synthesized faces, voice cloning signatures, 
              lip-sync asynchrony, and fraudulent social media ad patterns in short-form video media.
            </p>

            {/* Editorial Feature Badges */}
            <div className="flex flex-wrap gap-2 pt-1 font-mono text-xs font-bold text-[#111827]">
              <span className="px-3.5 py-1.5 rounded-full bg-white border border-[#E5E7EB] shadow-sm">
                🎥 468-pt Mesh Warping
              </span>
              <span className="px-3.5 py-1.5 rounded-full bg-white border border-[#E5E7EB] shadow-sm">
                🎙️ Vocoder Spectral FFT
              </span>
              <span className="px-3.5 py-1.5 rounded-full bg-white border border-[#E5E7EB] shadow-sm">
                👄 Lip-Sync Delta Offset
              </span>
              <span className="px-3.5 py-1.5 rounded-full bg-white border border-[#E5E7EB] shadow-sm">
                🚨 Scam NLP &amp; VIP Links
              </span>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 flex flex-wrap items-center gap-4">
              <Link
                href="/analyze"
                className="inline-flex items-center border-2 border-[#111827] rounded-full overflow-hidden shadow-card hover:scale-105 transition-all group"
              >
                <span className="bg-[#111827] text-white px-5 py-3.5 text-xs font-black uppercase tracking-wider">
                  Engine
                </span>
                <span className="bg-[#356AE6] group-hover:bg-[#244DB7] text-white px-5 py-3.5 text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-colors">
                  <span>Go to Analysis</span>
                  <span className="font-mono text-sm group-hover:translate-x-1 transition-transform">→</span>
                </span>
              </Link>

              <button
                onClick={() => {
                  const elem = document.getElementById("samples")
                  if (elem) elem.scrollIntoView({ behavior: "smooth" })
                }}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-white hover:bg-[#FAF9F5] text-[#111827] border-2 border-[#E5E7EB] font-black text-xs uppercase tracking-wider transition-all shadow-sm"
              >
                <span>Explore Samples</span>
              </button>
            </div>
          </div>

          {/* Right Hero: 3D Model of the Man with Clean Professional Thought Comment */}
          <div className="lg:col-span-6 relative flex flex-col items-center justify-center">
            {/* 3D Three.js Container */}
            <div
              ref={mountRef}
              className="w-full h-[420px] sm:h-[490px] rounded-3xl relative overflow-hidden bg-transparent cursor-grab active:cursor-grabbing"
            >
              {/* CLEAN PROFESSIONAL THOUGHT COMMENT OF THE MAN (Just the comment!) */}
              <div
                key={`thought-${thoughtIndex}`}
                className="absolute top-8 left-4 sm:left-8 z-30 max-w-[280px] sm:max-w-[320px] animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-300 pointer-events-none"
              >
                {/* Thought Comment Bubble */}
                <div className="bg-white/95 backdrop-blur-md px-5 py-4 rounded-3xl rounded-bl-none border-2 border-[#111827] shadow-floating relative">
                  <div className="text-[13px] sm:text-sm font-bold text-[#111827] leading-snug">
                    &ldquo;{currentThought}&rdquo;
                  </div>
                </div>

                {/* Thought Dots leading to the man's head */}
                <div className="flex gap-1.5 mt-1.5 ml-3">
                  <div className="w-3 h-3 rounded-full bg-white border-2 border-[#111827] shadow-sm"></div>
                  <div className="w-2 h-2 rounded-full bg-white border border-[#111827] shadow-sm"></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-white border border-[#111827] shadow-sm"></div>
                </div>
              </div>
            </div>

            {/* Minimal Rotation Toggle */}
            <div className="w-full flex items-center justify-between pt-2 px-3 text-[11px] font-mono text-[#667085]">
              <span className="flex items-center gap-1.5">
                <Scan className="w-3.5 h-3.5 text-[#356AE6]" />
                468 DELAUNAY MESH NODES
              </span>
              <button
                onClick={() => setIsRotating(!isRotating)}
                className="hover:text-[#111827] flex items-center gap-1 bg-white px-2.5 py-1 rounded-full border border-[#E5E7EB] shadow-sm"
              >
                <RefreshCw className={`w-3 h-3 ${isRotating ? "animate-spin" : ""}`} />
                {isRotating ? "Rotation [ON]" : "Rotation [OFF]"}
              </button>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}
