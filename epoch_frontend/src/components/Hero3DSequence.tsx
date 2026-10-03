"use client"

import React, { useEffect, useRef, useState } from "react"
import * as THREE from "three"
import { Shield, Eye, Mic, AlertOctagon, Activity, Radio, ArrowRight, Zap, RefreshCw } from "lucide-react"

interface Hero3DSequenceProps {
  onExploreWorkbench: () => void;
}

export default function Hero3DSequence({ onExploreWorkbench }: Hero3DSequenceProps) {
  const mountRef = useRef<HTMLDivElement>(null)
  const [stage, setStage] = useState<1 | 2 | 3>(1)
  const [scrollProgress, setScrollProgress] = useState<number>(0.15)
  const [isRotating, setIsRotating] = useState<boolean>(true)

  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    // Setup Three.js Scene
    const scene = new THREE.Scene()
    scene.background = new THREE.Color("#F5F6F3") // Warm off-white ivory

    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    )
    camera.position.set(0, 0, 8.5)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(renderer.domElement)

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9)
    scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0x356ae6, 1.2)
    directionalLight.position.set(5, 5, 5)
    scene.add(directionalLight)

    // Create 3D Parametric Head / Face Landmark Wireframe Mesh
    const headGroup = new THREE.Group()
    scene.add(headGroup)

    // Generate Face Mesh Nodes (468 analytical landmark simulation points)
    const pointsCount = 468
    const positions = new Float32Array(pointsCount * 3)
    const colors = new Float32Array(pointsCount * 3)

    const stageColors = {
      stage1: new THREE.Color("#356AE6"), // Tech Blue
      stage2: new THREE.Color("#D99A24"), // Amber
      stage3: new THREE.Color("#D94A4A"), // Risk Red
    }

    // Mathematical formulation of facial ellipsoid with jaw, nose, eyes definition
    for (let i = 0; i < pointsCount; i++) {
      const u = (i / pointsCount) * Math.PI * 2
      const v = ((i % 24) / 24) * Math.PI - Math.PI / 2

      const rx = 1.8 * Math.cos(v) * Math.sin(u)
      let ry = 2.4 * Math.sin(v)
      let rz = 1.6 * Math.cos(v) * Math.cos(u)

      // Add facial features protrusion (nose, eye sockets, chin)
      if (rz > 0 && Math.abs(rx) < 0.8 && ry > -0.5 && ry < 0.8) {
        rz += Math.cos(rx * 2) * 0.45 // Nose bridge
      }
      if (rz > 0.4 && ry < -0.8) {
        rz += 0.2 // Chin definition
      }

      positions[i * 3] = rx
      positions[i * 3 + 1] = ry
      positions[i * 3 + 2] = rz

      // Initial color: Tech Blue
      colors[i * 3] = stageColors.stage1.r
      colors[i * 3 + 1] = stageColors.stage1.g
      colors[i * 3 + 2] = stageColors.stage1.b
    }

    const pointsGeometry = new THREE.BufferGeometry()
    pointsGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3))
    pointsGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3))

    const pointsMaterial = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
    })

    const pointCloud = new THREE.Points(pointsGeometry, pointsMaterial)
    headGroup.add(pointCloud)

    // Triangulation Wireframe Cage
    const sphereGeo = new THREE.IcosahedronGeometry(2.1, 3)
    const wireframeMat = new THREE.MeshBasicMaterial({
      color: 0x356ae6,
      wireframe: true,
      transparent: true,
      opacity: 0.18,
    })
    const wireframeMesh = new THREE.Mesh(sphereGeo, wireframeMat)
    headGroup.add(wireframeMesh)

    // Stage 2 Acoustic Soundwave Ripple Rings
    const soundRingsGroup = new THREE.Group()
    headGroup.add(soundRingsGroup)

    const ringCount = 4
    const soundRings: THREE.Mesh[] = []
    for (let r = 0; r < ringCount; r++) {
      const ringGeo = new THREE.RingGeometry(0.3 + r * 0.4, 0.35 + r * 0.4, 32)
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xd99a24,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0,
      })
      const ringMesh = new THREE.Mesh(ringGeo, ringMat)
      ringMesh.position.set(0, -0.6, 1.8) // Near mouth node
      ringMesh.rotation.x = Math.PI / 12
      soundRingsGroup.add(ringMesh)
      soundRings.push(ringMesh)
    }

    // Stage 3 Target Reticle / Fraud Bounding Boxes
    const reticleGeo = new THREE.RingGeometry(1.2, 1.25, 4)
    const reticleMat = new THREE.MeshBasicMaterial({
      color: 0xd94a4a,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0,
    })
    const reticleMesh = new THREE.Mesh(reticleGeo, reticleMat)
    reticleMesh.position.set(0, 0, 2.2)
    reticleMesh.rotation.z = Math.PI / 4
    headGroup.add(reticleMesh)

    // Resize Handler
    const handleResize = () => {
      if (!container) return
      camera.aspect = container.clientWidth / container.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(container.clientWidth, container.clientHeight)
    }
    window.addEventListener("resize", handleResize)

    // Animation Loop
    let animationFrameId: number
    let clock = new THREE.Clock()

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate)
      const elapsedTime = clock.getElapsedTime()

      // Rotation & Floating
      if (isRotating) {
        headGroup.rotation.y = Math.sin(elapsedTime * 0.5) * 0.45
        headGroup.rotation.x = Math.cos(elapsedTime * 0.3) * 0.15
      }

      // Stage Dynamics based on current stage state
      if (stage === 1) {
        wireframeMat.color.set("#356AE6")
        wireframeMat.opacity = 0.22
        reticleMat.opacity = 0
        soundRings.forEach((r) => ((r.material as THREE.MeshBasicMaterial).opacity = 0))
      } else if (stage === 2) {
        wireframeMat.color.set("#D99A24")
        wireframeMat.opacity = 0.28
        reticleMat.opacity = 0
        soundRings.forEach((r, idx) => {
          const scale = 1 + (Math.sin(elapsedTime * 3 + idx * 0.8) + 1) * 0.3
          r.scale.set(scale, scale, scale)
          ;(r.material as THREE.MeshBasicMaterial).opacity = (Math.sin(elapsedTime * 3 + idx * 0.8) + 1) * 0.35
        })
      } else {
        wireframeMat.color.set("#D94A4A")
        wireframeMat.opacity = 0.35
        reticleMat.opacity = (Math.sin(elapsedTime * 4) + 1) * 0.4 + 0.2
        reticleMesh.rotation.z += 0.01
        soundRings.forEach((r) => ((r.material as THREE.MeshBasicMaterial).opacity = 0.15))
      }

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
  }, [stage, isRotating])

  // Scroll or Scrub to Change Stages
  const setStageDirectly = (newStage: 1 | 2 | 3) => {
    setStage(newStage)
    if (newStage === 1) setScrollProgress(0.18)
    if (newStage === 2) setScrollProgress(0.52)
    if (newStage === 3) setScrollProgress(0.88)
  }

  return (
    <section className="relative w-full min-h-[85vh] bg-[#F5F6F3] border-b border-[#E5E7EB] overflow-hidden flex flex-col justify-between">
      {/* Editorial Grid Background */}
      <div className="absolute inset-0 bg-forensic-grid opacity-60 pointer-events-none"></div>

      {/* Top Header Label */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-8 relative z-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#E5E7EB] pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#FFFFFF] border border-[#E5E7EB] text-xs font-mono text-[#356AE6] font-semibold mb-3">
              <span className="w-2 h-2 rounded-full bg-[#356AE6] animate-pulse"></span>
              SCROLL-DRIVEN 3-STAGE NARRATIVE ENGINE
            </div>
            <h1 className="text-3xl sm:text-5xl font-black text-[#111827] tracking-tight uppercase font-sans">
              Investigative Intelligence <br />
              <span className="text-[#356AE6]">Beyond Surface Deepfakes</span>
            </h1>
          </div>

          <div className="max-w-md text-xs sm:text-sm text-[#667085] leading-relaxed">
            Deconstructs short-form synthetic video media across 468-point spatial meshes, vocoder audio phase signatures, and financial fraud NLP redirection funnels.
          </div>
        </div>
      </div>

      {/* Center 3D Interactive Canvas & Floating Forensic Cards */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center relative z-10 flex-1">
        {/* Left Telemetry Card */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          <div className="glass-panel p-4 rounded-xl border border-[#E5E7EB] shadow-card">
            <div className="flex items-center justify-between pb-2 border-b border-[#E5E7EB] mb-3">
              <span className="text-[11px] font-mono font-bold text-[#111827] uppercase flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-[#356AE6]" />
                Live Sensor Telemetry
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#EBF1FD] text-[#356AE6]">
                NODE 468
              </span>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between py-1 border-b border-[#F5F6F3]">
                <span className="text-[#667085]">Z-Depth Jitter:</span>
                <span className="font-semibold text-[#111827]">0.024 mm [PASS]</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#F5F6F3]">
                <span className="text-[#667085]">Lip-Sync Offset:</span>
                <span className={`font-semibold ${stage >= 2 ? "text-[#D99A24]" : "text-[#111827]"}`}>
                  -140 ms [ASYNC]
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#F5F6F3]">
                <span className="text-[#667085]">Vocoder STFT:</span>
                <span className={`font-semibold ${stage >= 2 ? "text-[#D99A24]" : "text-[#111827]"}`}>
                  3.8 kHz Glitch
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#667085]">Fraud Risk Score:</span>
                <span className={`font-bold ${stage === 3 ? "text-[#D94A4A]" : "text-[#111827]"}`}>
                  {stage === 3 ? "87 / 100 [HIGH]" : "Evaluating..."}
                </span>
              </div>
            </div>
          </div>

          <div className="glass-panel p-4 rounded-xl border border-[#E5E7EB] shadow-card">
            <div className="text-[11px] font-mono font-bold text-[#667085] uppercase mb-1">
              Active Stage Focus
            </div>
            <div className="text-sm font-bold text-[#111827] mb-1">
              {stage === 1 && "Stage 1: 468-pt Landmark Extraction"}
              {stage === 2 && "Stage 2: Voice & Lip-Sync Delta Check"}
              {stage === 3 && "Stage 3: Scam NLP & Final Risk Verdict"}
            </div>
            <p className="text-xs text-[#667085] leading-relaxed">
              {stage === 1 && "Maps spatial boundary coordinates and checks for GAN face swap seam warping."}
              {stage === 2 && "Analyzes vocoder frequency phase breaks and temporal syllable-mouth lag."}
              {stage === 3 && "Identifies fake government branding, ₹85k guarantee, and WhatsApp funnels."}
            </p>
          </div>
        </div>

        {/* Center 3D Three.js Viewport */}
        <div className="lg:col-span-6 relative flex flex-col items-center">
          <div
            ref={mountRef}
            className="w-full h-[380px] sm:h-[460px] rounded-2xl relative overflow-hidden bg-transparent cursor-grab active:cursor-grabbing"
          >
            {/* Viewport Overlay Markers */}
            <div className="absolute top-4 left-4 font-mono text-[10px] text-[#667085] bg-white/80 px-2 py-1 rounded border border-[#E5E7EB]">
              COORD: [X: +14.2, Y: -05.1, Z: +08.9]
            </div>
            <div className="absolute top-4 right-4 font-mono text-[10px] text-[#667085] bg-white/80 px-2 py-1 rounded border border-[#E5E7EB]">
              FPS: 60.0 | DELAUNAY 3D
            </div>
            <div className="absolute bottom-4 left-4 font-mono text-[10px] text-[#667085] bg-white/80 px-2 py-1 rounded border border-[#E5E7EB]">
              TARGET: UNKNOWN_MALE_07
            </div>
          </div>
        </div>

        {/* Right Forensic Module Breakdown */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          <div className="glass-panel p-4 rounded-xl border border-[#E5E7EB] shadow-card">
            <div className="text-[11px] font-mono font-bold text-[#111827] uppercase mb-3 flex items-center justify-between">
              <span>Investigation Stages</span>
              <span className="text-[10px] text-[#356AE6] font-normal">Click to Jump</span>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => setStageDirectly(1)}
                className={`w-full p-2.5 rounded-lg text-left transition-all flex items-start gap-2.5 border ${
                  stage === 1
                    ? "bg-[#EBF1FD] border-[#356AE6] text-[#111827]"
                    : "bg-white border-[#E5E7EB] text-[#667085] hover:border-[#D1D5DB]"
                }`}
              >
                <Eye className={`w-4 h-4 mt-0.5 ${stage === 1 ? "text-[#356AE6]" : "text-[#667085]"}`} />
                <div>
                  <div className="text-xs font-bold text-[#111827]">Stage 1 (0%–35%)</div>
                  <div className="text-[11px] text-[#667085]">Visual Face Mesh (#356AE6)</div>
                </div>
              </button>

              <button
                onClick={() => setStageDirectly(2)}
                className={`w-full p-2.5 rounded-lg text-left transition-all flex items-start gap-2.5 border ${
                  stage === 2
                    ? "bg-[#FEF7EC] border-[#D99A24] text-[#111827]"
                    : "bg-white border-[#E5E7EB] text-[#667085] hover:border-[#D1D5DB]"
                }`}
              >
                <Mic className={`w-4 h-4 mt-0.5 ${stage === 2 ? "text-[#D99A24]" : "text-[#667085]"}`} />
                <div>
                  <div className="text-xs font-bold text-[#111827]">Stage 2 (35%–70%)</div>
                  <div className="text-[11px] text-[#667085]">Voice & Lip-Sync (#D99A24)</div>
                </div>
              </button>

              <button
                onClick={() => setStageDirectly(3)}
                className={`w-full p-2.5 rounded-lg text-left transition-all flex items-start gap-2.5 border ${
                  stage === 3
                    ? "bg-[#FDF2F2] border-[#D94A4A] text-[#111827]"
                    : "bg-white border-[#E5E7EB] text-[#667085] hover:border-[#D1D5DB]"
                }`}
              >
                <AlertOctagon className={`w-4 h-4 mt-0.5 ${stage === 3 ? "text-[#D94A4A]" : "text-[#667085]"}`} />
                <div>
                  <div className="text-xs font-bold text-[#111827]">Stage 3 (70%–101%)</div>
                  <div className="text-[11px] text-[#667085]">Scam Signal & Risk (#D94A4A)</div>
                </div>
              </button>
            </div>
          </div>

          {/* Launch Workbench CTA */}
          <button
            onClick={onExploreWorkbench}
            className="w-full py-3.5 px-4 rounded-xl bg-[#111827] hover:bg-[#356AE6] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-card transition-all"
          >
            <span>Open Investigation Workbench</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bottom Interactive Scroll / Scrub Controller */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-6 relative z-10">
        <div className="bg-white p-3 rounded-xl border border-[#E5E7EB] shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs font-mono">
          <div className="flex items-center gap-3">
            <span className="text-[#667085]">STAGE SCRUBBER:</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={scrollProgress}
              onChange={(e) => {
                const val = parseFloat(e.target.value)
                setScrollProgress(val)
                if (val < 0.35) setStage(1)
                else if (val < 0.7) setStage(2)
                else setStage(3)
              }}
              className="w-48 sm:w-64 accent-[#356AE6] cursor-pointer"
            />
            <span className="font-bold text-[#111827]">
              {Math.round(scrollProgress * 100)}% Progression
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsRotating(!isRotating)}
              className="px-2.5 py-1 rounded bg-[#F5F6F3] border border-[#E5E7EB] hover:bg-[#E5E7EB] text-[#111827] flex items-center gap-1 text-[11px]"
            >
              <RefreshCw className={`w-3 h-3 ${isRotating ? "animate-spin" : ""}`} />
              {isRotating ? "Auto-Rotate [ON]" : "Auto-Rotate [OFF]"}
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
