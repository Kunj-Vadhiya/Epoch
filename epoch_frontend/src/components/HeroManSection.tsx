"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowRight, Brain, Sparkles } from "lucide-react"

const CW = 600
const CH = 720

export function aim(px: number, py: number, cx: number, cy: number, rx: number, ry: number) {
  const sat = (v: number) => v / Math.sqrt(1 + v * v)
  return [sat((px - cx) / rx), sat((py - cy) / ry)]
}

export function approach(cur: number, target: number, dt: number, rate: number) {
  return target + (cur - target) * Math.exp(-rate * dt)
}

export function pose(x: number, y: number, near: number) {
  return {
    body: { dx: x * 4, dy: 0 },
    head: { dx: x * 10, dy: y * 7, rot: x * 4 },
    ears: { dx: -x * 7, dy: -y * 3, lead: 1 + x * 0.16, trail: 1 - x * 0.16 },
    beanie: { dx: x * 13, dy: y * 4 },
    tag: { dx: x * 7, dy: 0 },
    blush: { dx: x * 20, dy: y * 14 },
    face: { dx: x * 28, dy: y * (y < 0 ? 11 : 20) },
    nose: { dx: x * 10, dy: y * 7 },
    eyes: { dx: x * 4, dy: y * 4, scale: 1 + near * 0.14 },
    brows: { dx: x * 3, dy: y * 2 + Math.min(0, y) * 3 - near * 9 },
  }
}

export function blink(since: number) {
  const d = 0.15
  if (since < 0 || since > d) return 1
  return 1 - Math.sin((Math.PI * since) / d) * 0.92
}

/* ------------------------------------------------------------- perspective room */
type Seg = [number, number, number, number]
function room(): { back: Seg[]; rays: Seg[]; depth: string[] } {
  const x0 = 95
  const x1 = 905
  const y0 = 85
  const y1 = 865
  const vx = (x0 + x1) / 2
  const vy = (y0 + y1) / 2
  const cols = 14
  const rows = 11
  const back: Seg[] = []
  const rays: Seg[] = []
  const out = (x: number, y: number): Seg => {
    const dx = x - vx
    const dy = y - vy
    const tx = dx > 0 ? (1000 - x) / dx : dx < 0 ? -x / dx : Infinity
    const ty = dy > 0 ? (1000 - y) / dy : dy < 0 ? -y / dy : Infinity
    const t = Math.min(tx, ty)
    return [x, y, x + dx * t, y + dy * t]
  }
  for (let i = 0; i <= cols; i++) {
    const x = x0 + ((x1 - x0) * i) / cols
    back.push([x, y0, x, y1])
    rays.push(out(x, y0), out(x, y1))
  }
  for (let j = 0; j <= rows; j++) {
    const y = y0 + ((y1 - y0) * j) / rows
    back.push([x0, y, x1, y])
    rays.push(out(x0, y), out(x1, y))
  }
  const depth = [1.07, 1.16, 1.28, 1.45, 1.7].map((s) => {
    const l = vx + (x0 - vx) * s
    const r = vx + (x1 - vx) * s
    const t = vy + (y0 - vy) * s
    const b = vy + (y1 - vy) * s
    return "M" + l + " " + t + "H" + r + "V" + b + "H" + l + "Z"
  })
  return { back, rays, depth }
}

const ROOM = room()

const THOUGHTS_POOL_A = [
  "Wait... that mouth movement lags the audio syllable by 140ms.",
  "That jawline contour has a 22.4% spatial mesh jitter glitch.",
  "This voice clone has zero natural pitch tremor — robotic vocoder.",
  "Why is a prominent executive guaranteeing ₹85,000 daily returns?",
  "Zero blinks across 26 seconds of speech? That's not human."
]

const THOUGHTS_POOL_B = [
  "Counterfeit regulatory seal detected in the overlay banner.",
  "Error Level Analysis shows 92% compression delta on the face.",
  "Corneal specular glint doesn't match the scene's ambient light.",
  "This video is funneling users to an unverified private WhatsApp link.",
  "Synthetic smoothing detected — all natural skin pore texture is gone."
]

const THOUGHTS_POOL_C = [
  "Manufactured urgency detected: 'Offer expires in 12 minutes'.",
  "Phoneme-viseme correlation dropped below 0.18 on /p/ burst.",
  "Phase discontinuity identified across 3.2 kHz – 4.8 kHz band.",
  "Delaunay landmark grid shows bilinear interpolation blur."
]

type Layers = Partial<
  Record<
    | "body" | "head" | "earL" | "earR" | "beanie" | "tag" | "blush"
    | "face" | "nose" | "eyes" | "brows",
    SVGGElement | null
  >
>

export default function HeroManSection() {
  const uid = React.useId().replace(/:/g, "")
  const id = (n: string) => n + uid
  const u = (n: string) => "url(#" + id(n) + ")"

  const rootRef = React.useRef<HTMLDivElement>(null)
  const charRef = React.useRef<HTMLButtonElement>(null)
  const layers = React.useRef<Layers>({})
  const set = (k: keyof Layers) => (el: SVGGElement | null) => {
    layers.current[k] = el
  }

  const [idxA, setIdxA] = React.useState(0)
  const [idxB, setIdxB] = React.useState(0)
  const [idxC, setIdxC] = React.useState(0)

  // Continuously advance multiple thinking thoughts
  React.useEffect(() => {
    const intervalA = setInterval(() => {
      setIdxA((prev) => (prev + 1) % THOUGHTS_POOL_A.length)
    }, 2800)
    const intervalB = setInterval(() => {
      setIdxB((prev) => (prev + 1) % THOUGHTS_POOL_B.length)
    }, 3400)
    const intervalC = setInterval(() => {
      setIdxC((prev) => (prev + 1) % THOUGHTS_POOL_C.length)
    }, 4000)

    return () => {
      clearInterval(intervalA)
      clearInterval(intervalB)
      clearInterval(intervalC)
    }
  }, [])

  // Parallax & Mouse Gaze
  React.useEffect(() => {
    const root = rootRef.current
    const char = charRef.current
    if (!root || !char) return

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    let still = mq.matches
    const onMq = () => (still = mq.matches)
    mq.addEventListener("change", onMq)

    let px = 0
    let py = 0
    let lastMove = -1e9
    let gx = 0
    let gy = 0
    let near = 0
    let prev = performance.now()
    let nextBlink = prev + 1800
    let blinkAt = -1e9
    let raf = 0
    let visible = true

    const onMove = (e: PointerEvent) => {
      px = e.clientX
      py = e.clientY
      lastMove = performance.now()
    }
    const onLeave = () => (lastMove = -1e9)
    window.addEventListener("pointermove", onMove, { passive: true })
    window.addEventListener("pointerdown", onMove, { passive: true })
    document.documentElement.addEventListener("pointerleave", onLeave)
    window.addEventListener("blur", onLeave)

    const tr = (dx: number, dy: number) => "translate(" + dx.toFixed(2) + " " + dy.toFixed(2) + ")"
    const L = layers.current

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      if (!visible) return
      const dt = Math.min(0.05, (now - prev) / 1000)
      prev = now

      const r = char.getBoundingClientRect()
      const cx = r.left + r.width * 0.5
      const cy = r.top + r.height * 0.48
      let tx = 0
      let ty = 0
      let tn = 0
      const idle = now - lastMove > 3500
      if (!idle) {
        const reach = Math.max(window.innerWidth, window.innerHeight)
        ;[tx, ty] = aim(px, py, cx, cy, reach * 0.3, reach * 0.26)
        const dist = Math.hypot(px - cx, py - cy)
        tn = Math.max(0, 1 - dist / (r.width * 0.45))
      } else if (!still) {
        const t = now / 1000
        tx = Math.sin(t * 0.45) * 0.55 + Math.sin(t * 1.1) * 0.1
        ty = Math.sin(t * 0.31 + 1) * 0.25
      }

      const rate = still ? 30 : 7
      gx = approach(gx, tx, dt, rate)
      gy = approach(gy, ty, dt, rate)
      near = approach(near, tn, dt, 8)
      const p = pose(gx, gy, near)
      const breathe = still ? 0 : Math.sin(now / 620) * 1.6

      if (!still && now > nextBlink) {
        blinkAt = now
        nextBlink = now + (Math.random() < 0.2 ? 260 : 2200 + Math.random() * 3200)
      }
      const open = still ? 1 : blink((now - blinkAt) / 1000)

      L.body?.setAttribute("transform", tr(p.body.dx, p.body.dy + breathe * 0.4))
      L.head?.setAttribute(
        "transform",
        tr(p.head.dx, p.head.dy + breathe) + " rotate(" + p.head.rot.toFixed(2) + " 300 560)",
      )
      L.earL?.setAttribute("transform", tr(p.ears.dx, p.ears.dy) + " translate(138 380) scale(" + p.ears.lead.toFixed(3) + " 1) translate(-138 -380)")
      L.earR?.setAttribute("transform", tr(p.ears.dx, p.ears.dy) + " translate(462 380) scale(" + p.ears.trail.toFixed(3) + " 1) translate(-462 -380)")
      L.beanie?.setAttribute("transform", tr(p.beanie.dx, p.beanie.dy))
      L.tag?.setAttribute("transform", tr(p.tag.dx, p.tag.dy))
      L.blush?.setAttribute("transform", tr(p.blush.dx, p.blush.dy))
      L.face?.setAttribute("transform", tr(p.face.dx, p.face.dy))
      L.nose?.setAttribute("transform", tr(p.nose.dx, p.nose.dy))
      L.brows?.setAttribute("transform", tr(p.brows.dx, p.brows.dy))
      L.eyes?.setAttribute(
        "transform",
        tr(p.eyes.dx, p.eyes.dy) +
          " translate(300 350) scale(" + p.eyes.scale.toFixed(3) + " " + (p.eyes.scale * open).toFixed(3) + ") translate(-300 -350)",
      )
    }
    raf = requestAnimationFrame(frame)

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
      prev = performance.now()
    })
    io.observe(root)

    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
      mq.removeEventListener("change", onMq)
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerdown", onMove)
      document.documentElement.removeEventListener("pointerleave", onLeave)
      window.removeEventListener("blur", onLeave)
    }
  }, [])

  return (
    <section ref={rootRef} className="relative w-full min-h-[90vh] bg-[#F5F6F3] border-b-2 border-[#111827] overflow-hidden flex items-center">
      
      {/* Perspective Room Grid Lines (Clearly visible with higher contrast) */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none text-[#111827]" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true">
        <g stroke="currentColor" strokeWidth="1.1" fill="none" opacity="0.28">
          {ROOM.back.map((s, i) => (
            <line key={"b" + i} x1={s[0]} y1={s[1]} x2={s[2]} y2={s[3]} />
          ))}
          {ROOM.rays.map((s, i) => (
            <line key={"r" + i} x1={s[0]} y1={s[1]} x2={s[2]} y2={s[3]} />
          ))}
          {ROOM.depth.map((d, i) => (
            <path key={"d" + i} d={d} />
          ))}
        </g>
      </svg>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Left Hero: ONLY Big Bold Typography + High-Impact CTA */}
          <div className="lg:col-span-6 space-y-8 text-left">
            <div className="space-y-3">
              <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black text-[#111827] tracking-tighter uppercase leading-[0.92]">
                Is that really them??
              </h1>
              <p className="text-2xl sm:text-4xl lg:text-5xl font-black text-[#356AE6] tracking-tight uppercase">
                Deepfake &amp; Scam Ad Detector
              </p>
            </div>

            {/* High-Impact "Go to Analysis →" Button */}
            <div className="pt-2">
              <Link
                href="/analyze"
                className="inline-flex items-center border-3 border-[#111827] rounded-full overflow-hidden shadow-floating hover:scale-105 transition-all group"
              >
                <span className="bg-[#111827] text-white px-7 py-5 text-sm sm:text-base font-black uppercase tracking-wider">
                  Engine
                </span>
                <span className="bg-[#356AE6] group-hover:bg-[#244DB7] text-white px-8 py-5 text-sm sm:text-base font-black uppercase tracking-wider flex items-center gap-3 transition-colors">
                  <span>Go to Analysis</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
                </span>
              </Link>
            </div>
          </div>

          {/* Right Hero: The Animated Man with Multiple Thinking Cards */}
          <div className="lg:col-span-6 relative flex flex-col items-center justify-center min-h-[480px] sm:min-h-[560px]">
            
            {/* THOUGHT CARD 1: Main Speech Bubble directly from head */}
            <div
              key={`thought-a-${idxA}`}
              className="absolute -top-6 sm:-top-2 left-2 sm:left-4 z-30 max-w-[270px] sm:max-w-[320px] animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-300 pointer-events-none"
            >
              <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-none border-2 border-[#111827] shadow-floating">
                <div className="text-xs sm:text-[13px] font-bold text-[#111827] leading-snug">
                  &ldquo;{THOUGHTS_POOL_A[idxA]}&rdquo;
                </div>
              </div>
              <div className="flex gap-1 mt-1 ml-3">
                <div className="w-2.5 h-2.5 rounded-full bg-white border-2 border-[#111827]"></div>
                <div className="w-2 h-2 rounded-full bg-white border border-[#111827]"></div>
              </div>
            </div>

            {/* THOUGHT CARD 2: Floating Thinking Card (Top Right) */}
            <div
              key={`thought-b-${idxB}`}
              className="absolute top-10 sm:top-14 right-2 sm:right-4 z-20 max-w-[220px] sm:max-w-[250px] animate-in fade-in zoom-in-90 slide-in-from-right-2 duration-300 pointer-events-none"
            >
              <div className="bg-[#FAF9F5] px-3.5 py-2.5 rounded-2xl rounded-br-none border-2 border-[#356AE6] shadow-card">
                <span className="block text-[9px] font-mono font-black text-[#356AE6] uppercase mb-0.5">
                  ANALYSIS THOUGHT
                </span>
                <div className="text-[11px] font-bold text-[#111827] leading-tight">
                  &ldquo;{THOUGHTS_POOL_B[idxB]}&rdquo;
                </div>
              </div>
            </div>

            {/* THOUGHT CARD 3: Floating Thought Card (Bottom Left) */}
            <div
              key={`thought-c-${idxC}`}
              className="absolute bottom-6 left-0 sm:left-2 z-20 max-w-[220px] sm:max-w-[260px] animate-in fade-in slide-in-from-bottom-2 duration-300 pointer-events-none hidden sm:block"
            >
              <div className="bg-white px-3.5 py-2.5 rounded-2xl rounded-tl-none border-2 border-[#111827] shadow-card">
                <span className="block text-[9px] font-mono font-black text-[#D94A4A] uppercase mb-0.5">
                  CRITICAL OBSERVATION
                </span>
                <div className="text-[11px] font-bold text-[#111827] leading-tight">
                  &ldquo;{THOUGHTS_POOL_C[idxC]}&rdquo;
                </div>
              </div>
            </div>

            {/* Interactive Animated Man Character SVG */}
            <button
              ref={charRef}
              type="button"
              className="relative w-full max-w-[420px] sm:max-w-[480px] aspect-[600/720] p-0 m-0 border-0 bg-transparent cursor-pointer select-none outline-none focus:outline-none"
              aria-label="Forensic Examiner Character"
            >
              <svg viewBox={"0 0 " + CW + " " + CH} className="w-full h-full block overflow-visible">
                <defs>
                  <radialGradient id={id("shade")} cx="46%" cy="40%" r="62%">
                    <stop offset="0.55" stopColor="#7a2e14" stopOpacity="0" />
                    <stop offset="1" stopColor="#7a2e14" stopOpacity="0.34" />
                  </radialGradient>
                  <radialGradient id={id("hi")} cx="36%" cy="30%" r="42%">
                    <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
                    <stop offset="1" stopColor="#fff" stopOpacity="0" />
                  </radialGradient>
                  <radialGradient id={id("blush")}>
                    <stop offset="0" stopColor="#ff6f6f" stopOpacity="0.55" />
                    <stop offset="1" stopColor="#ff6f6f" stopOpacity="0" />
                  </radialGradient>
                  <radialGradient id={id("knit")} cx="38%" cy="22%" r="80%">
                    <stop offset="0" stopColor="#fff" stopOpacity="0.2" />
                    <stop offset="0.6" stopColor="#fff" stopOpacity="0" />
                    <stop offset="1" stopColor="#000" stopOpacity="0.35" />
                  </radialGradient>
                  <radialGradient id={id("eye")} cx="40%" cy="35%" r="70%">
                    <stop offset="0" stopColor="#3a3a3c" />
                    <stop offset="1" stopColor="#050505" />
                  </radialGradient>
                  <radialGradient id={id("nose")} cx="42%" cy="36%" r="66%">
                    <stop offset="0" stopColor="#ff9c82" stopOpacity="0.18" />
                    <stop offset="1" stopColor="#b8583a" stopOpacity="0.42" />
                  </radialGradient>
                  <linearGradient id={id("neck")} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#6b2a14" stopOpacity="0.45" />
                    <stop offset="0.5" stopColor="#6b2a14" stopOpacity="0.08" />
                  </linearGradient>
                  <linearGradient id={id("cloth")} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#fff" stopOpacity="0.1" />
                    <stop offset="1" stopColor="#000" stopOpacity="0.3" />
                  </linearGradient>
                  <filter id={id("fuzz")} x="-5%" y="-5%" width="110%" height="110%">
                    <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" result="n" />
                    <feDisplacementMap in="SourceGraphic" in2="n" scale="4" xChannelSelector="R" yChannelSelector="G" />
                  </filter>
                  <clipPath id={id("mouth")}>
                    <path d="M218 440 Q300 458 382 440 Q376 524 300 530 Q224 524 218 440 Z" />
                  </clipPath>
                  <clipPath id={id("cuff")}>
                    <path d="M114 262 Q300 222 486 262 L490 322 Q300 286 110 322 Z" />
                  </clipPath>
                </defs>

                {/* Floor Shadow */}
                <ellipse cx="300" cy="712" rx="250" ry="16" fill="#000" opacity="0.1" />

                {/* Body & Shirt */}
                <g ref={set("body")}>
                  <path d="M28 730 C40 646 104 604 206 588 L394 588 C496 604 560 646 572 730 Z" fill="#18181a" />
                  <path d="M28 730 C40 646 104 604 206 588 L394 588 C496 604 560 646 572 730 Z" fill={u("cloth")} />
                  {/* Neck */}
                  <path d="M246 500 L354 500 L360 600 Q300 624 240 600 Z" fill="#f7cfb0" />
                  <path d="M246 500 L354 500 L360 600 Q300 624 240 600 Z" fill={u("neck")} />
                  {/* Collar */}
                  <path d="M236 566 Q262 604 300 628 L250 668 Q214 628 194 594 Z" fill="#18181a" />
                  <path d="M364 566 Q338 604 300 628 L350 668 Q386 628 406 594 Z" fill="#18181a" />
                  <rect x="288" y="628" width="24" height="102" fill="#fff" opacity="0.05" stroke="#000" strokeOpacity="0.35" strokeWidth="2" />
                  <circle cx="300" cy="656" r="6" fill="#2a2a2c" stroke="#000" strokeOpacity="0.5" />
                  <circle cx="300" cy="698" r="6" fill="#2a2a2c" stroke="#000" strokeOpacity="0.5" />
                </g>

                {/* Head Group */}
                <g ref={set("head")}>
                  {/* Ears */}
                  <g ref={set("earL")}>
                    <ellipse cx="138" cy="380" rx="46" ry="60" fill="#f7cfb0" />
                    <ellipse cx="138" cy="380" rx="46" ry="60" fill={u("shade")} />
                    <path d="M150 348 Q118 360 124 392 Q130 416 150 414" fill="none" stroke="#a24c2e" strokeOpacity="0.35" strokeWidth="7" strokeLinecap="round" />
                    <ellipse cx="136" cy="392" rx="24" ry="22" fill={u("blush")} />
                  </g>
                  <g ref={set("earR")}>
                    <ellipse cx="462" cy="380" rx="46" ry="60" fill="#f7cfb0" />
                    <ellipse cx="462" cy="380" rx="46" ry="60" fill={u("shade")} />
                    <path d="M450 348 Q482 360 476 392 Q470 416 450 414" fill="none" stroke="#a24c2e" strokeOpacity="0.35" strokeWidth="7" strokeLinecap="round" />
                    <ellipse cx="464" cy="392" rx="24" ry="22" fill={u("blush")} />
                  </g>

                  {/* Face */}
                  <path d="M300 150 C402 150 470 226 470 348 C470 472 396 562 300 562 C204 562 130 472 130 348 C130 226 198 150 300 150 Z" fill="#f7cfb0" />
                  <path d="M300 150 C402 150 470 226 470 348 C470 472 396 562 300 562 C204 562 130 472 130 348 C130 226 198 150 300 150 Z" fill={u("shade")} />
                  <path d="M300 150 C402 150 470 226 470 348 C470 472 396 562 300 562 C204 562 130 472 130 348 C130 226 198 150 300 150 Z" fill={u("hi")} />

                  {/* Blush */}
                  <g ref={set("blush")}>
                    <ellipse cx="190" cy="430" rx="44" ry="30" fill={u("blush")} />
                    <ellipse cx="410" cy="430" rx="44" ry="30" fill={u("blush")} />
                  </g>

                  {/* Features */}
                  <g ref={set("face")}>
                    <g ref={set("brows")}>
                      <path d="M198 300 Q230 282 264 294" fill="none" stroke="#3b2518" strokeWidth="22" strokeLinecap="round" />
                      <path d="M336 294 Q370 282 402 300" fill="none" stroke="#3b2518" strokeWidth="22" strokeLinecap="round" />
                    </g>

                    <g ref={set("eyes")}>
                      <ellipse cx="240" cy="350" rx="25" ry="31" fill={u("eye")} />
                      <circle cx="231" cy="336" r="8.5" fill="#fff" />
                      <circle cx="250" cy="361" r="3.5" fill="#fff" opacity="0.8" />
                      <ellipse cx="360" cy="350" rx="25" ry="31" fill={u("eye")} />
                      <circle cx="351" cy="336" r="8.5" fill="#fff" />
                      <circle cx="370" cy="361" r="3.5" fill="#fff" opacity="0.8" />
                    </g>

                    {/* Star Mark */}
                    <path d="M420 382 L423.5 391 L433 391.5 L425.6 397.5 L428.2 406.8 L420 401.5 L411.8 406.8 L414.4 397.5 L407 391.5 L416.5 391 Z" fill="#2a1a14" />

                    {/* Mouth */}
                    <g>
                      <path d="M218 440 Q300 458 382 440 Q376 524 300 530 Q224 524 218 440 Z" fill="#3d0f0f" />
                      <g clipPath={u("mouth")}>
                        <ellipse cx="300" cy="530" rx="46" ry="22" fill="#d9575a" />
                        <path d="M210 436 Q300 456 390 436 L390 474 Q300 490 210 474 Z" fill="#fff" />
                        <path d="M236 516 Q300 500 364 516 L364 540 L236 540 Z" fill="#f3efe9" />
                      </g>
                      <path d="M218 440 Q300 458 382 440 Q376 524 300 530 Q224 524 218 440 Z" fill="none" stroke="#8a3524" strokeOpacity="0.45" strokeWidth="3" />
                    </g>

                    {/* Nose */}
                    <g ref={set("nose")}>
                      <ellipse cx="300" cy="414" rx="28" ry="12" fill="#6b2a14" opacity="0.14" />
                      <ellipse cx="300" cy="398" rx="29" ry="26" fill="#f7cfb0" />
                      <ellipse cx="300" cy="398" rx="29" ry="26" fill={u("nose")} />
                      <ellipse cx="291" cy="387" rx="10" ry="8" fill="#fff" opacity="0.45" />
                    </g>
                  </g>

                  {/* Beanie Hat */}
                  <g ref={set("beanie")}>
                    <g transform="translate(0 -22)">
                      <g filter={u("fuzz")}>
                        <path d="M126 300 C112 168 196 88 300 88 C404 88 488 168 474 300 Z" fill="#1d1d1f" />
                        <path d="M126 300 C112 168 196 88 300 88 C404 88 488 168 474 300 Z" fill={u("knit")} />
                        <path d="M114 262 Q300 222 486 262 L490 322 Q300 286 110 322 Z" fill="#1d1d1f" />
                        <g clipPath={u("cuff")} stroke="#fff" strokeOpacity="0.08" strokeWidth="5">
                          {Array.from({ length: 34 }, (_, i) => (
                            <line key={i} x1={112 + i * 11.4} y1="220" x2={112 + i * 11.4} y2="330" />
                          ))}
                        </g>
                        <path d="M114 262 Q300 222 486 262 L490 322 Q300 286 110 322 Z" fill="#000" opacity="0.18" />
                        <path d="M112 292 Q300 254 488 292" fill="none" stroke="#000" strokeOpacity="0.25" strokeWidth="3" />
                      </g>
                      <g ref={set("tag")}>
                        <g transform="rotate(-7 190 272)">
                          <rect x="172" y="238" width="36" height="64" rx="5" fill="#356AE6" />
                          <rect x="172" y="238" width="36" height="64" rx="5" fill={u("cloth")} />
                          <rect x="177" y="243" width="26" height="54" rx="3" fill="none" stroke="#fff" strokeOpacity="0.6" strokeWidth="1.6" strokeDasharray="3 3" />
                        </g>
                      </g>
                    </g>
                  </g>
                </g>
              </svg>
            </button>
          </div>

        </div>
      </div>
    </section>
  )
}
