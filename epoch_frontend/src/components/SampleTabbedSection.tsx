"use client"

import React, { useState, useRef, useEffect } from "react"
import { 
  Video, Mic, Image as ImageIcon, Play, Pause, RotateCcw, 
  Volume2, VolumeX, Maximize2, X, AlertOctagon, ShieldCheck, 
  CheckCircle2, Eye, Sparkles, Scan
} from "lucide-react"

export default function SampleTabbedSection() {
  const [activeTab, setActiveTab] = useState<'video' | 'audio' | 'image'>('video')
  
  // Video state
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isVideoPlaying, setIsVideoPlaying] = useState(false)
  const [videoTime, setVideoTime] = useState(0)
  const [videoDuration, setVideoDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(true)
  const [playbackRate, setPlaybackRate] = useState(1.0)
  const [showVideoDetection, setShowVideoDetection] = useState(true)

  // Audio state
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isAudioPlaying, setIsAudioPlaying] = useState(false)
  const [audioProgress, setAudioProgress] = useState(0)
  const [audioCurrentTime, setAudioCurrentTime] = useState(0)

  // Image Lightbox Modal State
  const [isImageModalOpen, setIsImageModalOpen] = useState(false)
  const [showMasks, setShowMasks] = useState(true)

  // Update playback speed when state changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate
    }
  }, [playbackRate])

  // Video Controls
  const toggleVideoPlay = () => {
    if (!videoRef.current) return
    if (videoRef.current.paused) {
      videoRef.current.play().then(() => {
        setIsVideoPlaying(true)
      }).catch((e) => {
        console.log("Play error:", e)
      })
    } else {
      videoRef.current.pause()
      setIsVideoPlaying(false)
    }
  }

  const toggleMute = () => {
    if (!videoRef.current) return
    videoRef.current.muted = !videoRef.current.muted
    setIsMuted(videoRef.current.muted)
  }

  const handleVideoTimeUpdate = () => {
    if (!videoRef.current) return
    setVideoTime(videoRef.current.currentTime)
    if (videoRef.current.duration && !isNaN(videoRef.current.duration)) {
      setVideoDuration(videoRef.current.duration)
    }
  }

  const handleVideoSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value)
    if (videoRef.current) {
      videoRef.current.currentTime = val
      setVideoTime(val)
    }
  }

  const handleVideoError = () => {
    if (videoRef.current && videoRef.current.src.includes('vjs.zencdn.net')) {
      videoRef.current.src = '/videos/case2_ocean.mp4'
      videoRef.current.load()
    }
  }

  // Audio Controls
  const toggleAudioPlay = () => {
    if (!audioRef.current) return
    if (audioRef.current.paused) {
      audioRef.current.play().then(() => {
        setIsAudioPlaying(true)
      }).catch((e) => console.log("Audio play error:", e))
    } else {
      audioRef.current.pause()
      setIsAudioPlaying(false)
    }
  }

  const handleAudioTimeUpdate = () => {
    if (!audioRef.current) return
    const cur = audioRef.current.currentTime
    const dur = audioRef.current.duration || 30
    setAudioCurrentTime(cur)
    setAudioProgress((cur / dur) * 100)
  }

  return (
    <section id="samples" className="w-full py-20 bg-[#F5F6F3] border-b-2 border-[#111827]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        
        {/* Section Header & Modality Navigation */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#E5E7EB] pb-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-[#E5E7EB] text-xs font-mono font-bold text-[#356AE6]">
              <Scan className="w-3.5 h-3.5 text-[#356AE6]" />
              <span>LIVE FORENSIC LAB SAMPLES</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-black text-[#111827] tracking-tight uppercase">
              Sample Forensic Outputs
            </h2>
            <p className="text-sm text-[#667085] max-w-2xl">
              Inspect multi-modal forensic detection pipelines. Test video playback with real-time detection overlays, audio neural vocoder FFT analysis, and spatial Error Level Analysis masks.
            </p>
          </div>

          {/* Modality Selector Tabs */}
          <div className="flex items-center gap-2 p-1.5 bg-white rounded-full border-2 border-[#111827] shadow-sm text-xs font-bold">
            <button
              onClick={() => {
                setActiveTab('video')
                if (audioRef.current) {
                  audioRef.current.pause()
                  setIsAudioPlaying(false)
                }
              }}
              className={`px-5 py-2.5 rounded-full flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'video'
                  ? 'bg-[#111827] text-white shadow'
                  : 'text-[#667085] hover:text-[#111827]'
              }`}
            >
              <Video className="w-4 h-4 text-[#356AE6]" />
              <span>Video</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('audio')
                if (videoRef.current) {
                  videoRef.current.pause()
                  setIsVideoPlaying(false)
                }
              }}
              className={`px-5 py-2.5 rounded-full flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'audio'
                  ? 'bg-[#111827] text-white shadow'
                  : 'text-[#667085] hover:text-[#111827]'
              }`}
            >
              <Mic className="w-4 h-4 text-[#D99A24]" />
              <span>Audio</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('image')
                if (videoRef.current) {
                  videoRef.current.pause()
                  setIsVideoPlaying(false)
                }
                if (audioRef.current) {
                  audioRef.current.pause()
                  setIsAudioPlaying(false)
                }
              }}
              className={`px-5 py-2.5 rounded-full flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'image'
                  ? 'bg-[#111827] text-white shadow'
                  : 'text-[#667085] hover:text-[#111827]'
              }`}
            >
              <ImageIcon className="w-4 h-4 text-[#356AE6]" />
              <span>Image</span>
            </button>
          </div>
        </div>

        {/* 1. VIDEO MODALITY TAB (WORKING PLAYABLE VIDEO WITH REAL-TIME DETECTION OVERLAYS) */}
        {activeTab === 'video' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-[#111827] shadow-floating grid grid-cols-1 lg:grid-cols-12 gap-8 items-center animate-in fade-in duration-300">
            {/* Real Playable Video Stream with Detection Bounding Boxes */}
            <div className="lg:col-span-6 space-y-3">
              <div className="relative aspect-video rounded-2xl overflow-hidden border-2 border-[#111827] bg-[#111827] shadow-md group">
                
                {/* HTML5 Video Tag with verified stream */}
                <video
                  ref={videoRef}
                  src="https://vjs.zencdn.net/v/oceans.mp4"
                  playsInline
                  muted={isMuted}
                  loop
                  crossOrigin="anonymous"
                  onPlay={() => setIsVideoPlaying(true)}
                  onPause={() => setIsVideoPlaying(false)}
                  onTimeUpdate={handleVideoTimeUpdate}
                  onError={handleVideoError}
                  className="w-full h-full object-cover"
                />

                {/* Scanline grid texture */}
                <div className="absolute inset-0 scanline-effect pointer-events-none opacity-30"></div>

                {/* Real-time Forensic Detection Overlays on Active Video */}
                {showVideoDetection && (
                  <div className="absolute inset-0 pointer-events-none">
                    {/* Bounding Box tracking the optical flow in the video */}
                    <div 
                      className="border-2 border-dashed border-[#D94A4A] bg-[#D94A4A]/15 rounded-2xl absolute flex items-start justify-center p-2 transition-all duration-300"
                      style={{
                        top: "22%",
                        left: "20%",
                        width: "60%",
                        height: "54%"
                      }}
                    >
                      <span className="bg-[#D94A4A] text-white text-[9px] font-mono font-bold px-2 py-0.5 rounded shadow absolute -top-3">
                        [DIFFUSION ARTIFACT: 88.6%]
                      </span>

                      {/* Optical Flow Phase Shift Indicator */}
                      <div className="w-28 h-8 border-2 border-[#D99A24] bg-[#D99A24]/30 rounded-lg absolute bottom-3 flex items-center justify-center">
                        <span className="text-[8px] font-mono font-bold text-white bg-[#D99A24] px-1.5 py-0.5 rounded">
                          PHASE SHIFT Δ: +62%
                        </span>
                      </div>
                    </div>

                    {/* HUD Coordinates & Live Frame */}
                    <div className="absolute top-3 left-3 bg-black/85 backdrop-blur-md px-2.5 py-1 rounded text-[10px] font-mono text-white flex items-center gap-2 border border-white/20">
                      <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></span>
                      <span>FRAME: {Math.floor(videoTime * 30)}</span>
                      <span>•</span>
                      <span>{videoTime.toFixed(1)}s</span>
                      <span>•</span>
                      <span>{playbackRate}x</span>
                    </div>
                  </div>
                )}

                {/* Overlaid Anomaly Tag */}
                <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-[#D94A4A] text-white text-[11px] font-bold shadow pointer-events-none">
                  87/100 RISK • FAKE
                </div>

                {/* Center Play/Pause Controller */}
                <button
                  onClick={toggleVideoPlay}
                  className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-black/70 hover:bg-[#356AE6] text-white flex items-center justify-center backdrop-blur-sm transition-all group-hover:scale-110 shadow-2xl cursor-pointer z-10"
                  title={isVideoPlaying ? "Pause Video" : "Play Video"}
                >
                  {isVideoPlaying ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 fill-current ml-1" />}
                </button>
              </div>

              {/* Video Timeline & Scrubbing Controller */}
              <div className="space-y-2 pt-1">
                {/* Progress Scrub Bar */}
                <input
                  type="range"
                  min="0"
                  max={videoDuration || 46}
                  step="0.1"
                  value={videoTime}
                  onChange={handleVideoSeek}
                  className="w-full accent-[#356AE6] cursor-pointer h-2 bg-[#E5E7EB] rounded-lg"
                />

                {/* Playback Controls & Frame Stepping */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#667085]">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={toggleVideoPlay}
                      className="px-3.5 py-1.5 rounded-lg bg-[#111827] hover:bg-[#356AE6] text-white font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {isVideoPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                      <span>{isVideoPlaying ? "Pause Video" : "Play Video"}</span>
                    </button>

                    <button
                      onClick={toggleMute}
                      className="p-1.5 rounded-lg bg-[#F5F6F3] hover:bg-[#E5E7EB] text-[#111827] font-bold cursor-pointer"
                      title={isMuted ? "Unmute Audio" : "Mute Audio"}
                    >
                      {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>

                    {/* Speed Controller */}
                    <div className="flex items-center bg-[#F5F6F3] rounded-lg p-0.5 border border-[#E5E7EB]">
                      {[0.5, 1.0, 2.0].map((rate) => (
                        <button
                          key={rate}
                          onClick={() => setPlaybackRate(rate)}
                          className={`px-2 py-1 rounded text-[10px] font-mono font-bold cursor-pointer transition-all ${
                            playbackRate === rate ? 'bg-[#111827] text-white' : 'text-[#667085] hover:text-[#111827]'
                          }`}
                        >
                          {rate}x
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => setShowVideoDetection(!showVideoDetection)}
                      className={`px-3 py-1.5 rounded-lg border font-bold transition-all cursor-pointer ${
                        showVideoDetection ? 'bg-[#356AE6] text-white border-[#356AE6]' : 'bg-white text-[#111827] border-[#E5E7EB]'
                      }`}
                    >
                      {showVideoDetection ? "Detection [ON]" : "Detection [OFF]"}
                    </button>
                  </div>

                  <span className="font-mono text-xs font-bold text-[#111827]">
                    00:{videoTime < 10 ? `0${videoTime.toFixed(1)}` : videoTime.toFixed(1)} / 00:{videoDuration ? videoDuration.toFixed(1) : "46.0"}
                  </span>
                </div>
              </div>
            </div>

            {/* Diagnostic Output */}
            <div className="lg:col-span-6 space-y-5 text-left">
              <div>
                <span className="text-xs font-bold text-[#D94A4A] uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#D94A4A] animate-ping"></span>
                  ● Video Forensic Diagnostic
                </span>
                <h3 className="text-2xl font-black text-[#111827] mt-1">
                  Diffusion Optical Flow &amp; Generative Synthesis
                </h3>
                <p className="text-sm text-[#667085] mt-2 leading-relaxed">
                  Temporal phase discontinuities detected across consecutive high-frequency fluid turbulence frames. Optical flow vector tracking exhibits non-Euclidean variance characteristic of AI generative diffusion video synthesis.
                </p>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3.5 bg-[#F5F6F3] rounded-2xl border border-[#E5E7EB]">
                  <span className="text-[#667085] block text-[11px]">Verdict</span>
                  <strong className="text-[#D94A4A] text-sm font-black">Manipulated</strong>
                </div>

                <div className="p-3.5 bg-[#F5F6F3] rounded-2xl border border-[#E5E7EB]">
                  <span className="text-[#667085] block text-[11px]">Confidence</span>
                  <strong className="text-[#111827] text-sm font-black">94.8%</strong>
                </div>

                <div className="p-3.5 bg-[#F5F6F3] rounded-2xl border border-[#E5E7EB] col-span-2 sm:col-span-1">
                  <span className="text-[#667085] block text-[11px]">Optical Flow Delta</span>
                  <strong className="text-[#D99A24] text-sm font-black">+62% Variance</strong>
                </div>
              </div>

              {/* Telemetry Strip */}
              <div className="p-3 bg-[#FAF9F5] rounded-xl border border-[#E5E7EB] flex items-center justify-between text-xs font-mono text-[#667085]">
                <span>CODEC: H.264 / AAC</span>
                <span>BITRATE: 4.8 Mbps</span>
                <span>SAMPLE: EVD-2026-0894X</span>
              </div>
            </div>
          </div>
        )}

        {/* 2. AUDIO MODALITY TAB */}
        {activeTab === 'audio' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-[#111827] shadow-floating grid grid-cols-1 lg:grid-cols-12 gap-8 items-center animate-in fade-in duration-300">
            {/* Playable Audio Player */}
            <div className="lg:col-span-6 space-y-4">
              <div className="bg-[#111827] text-white p-6 rounded-2xl border-2 border-[#111827] space-y-5">
                <audio
                  ref={audioRef}
                  src="https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3"
                  onTimeUpdate={handleAudioTimeUpdate}
                  onEnded={() => setIsAudioPlaying(false)}
                />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#D99A24] animate-pulse"></span>
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-300">
                      Voice Recording Track
                    </span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#D94A4A] text-white text-[10px] font-bold">
                    91/100 CLONE RISK
                  </span>
                </div>

                {/* Animated Waveform Bars */}
                <div className="h-16 flex items-end justify-between gap-1 py-1">
                  {Array.from({ length: 32 }, (_, i) => {
                    const isError = i >= 8 && i <= 18
                    const height = isAudioPlaying 
                      ? (Math.sin(i * 0.5 + audioCurrentTime * 8) * 35 + 45)
                      : (Math.sin(i * 0.4) * 20 + 30)
                    return (
                      <div
                        key={i}
                        className={`w-full rounded-t transition-all duration-100 ${
                          isError ? 'bg-[#D94A4A]' : 'bg-[#356AE6]'
                        }`}
                        style={{ height: `${height}%` }}
                      ></div>
                    )
                  })}
                </div>

                {/* Audio Progress Track */}
                <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-[#D99A24] h-full transition-all duration-150"
                    style={{ width: `${audioProgress}%` }}
                  ></div>
                </div>

                {/* Play / Pause Action Button */}
                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={toggleAudioPlay}
                    className="px-5 py-2.5 rounded-xl bg-[#356AE6] hover:bg-[#244DB7] text-white text-xs font-bold flex items-center gap-2 transition-all shadow cursor-pointer"
                  >
                    {isAudioPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    <span>{isAudioPlaying ? "Pause Audio" : "Play Sample Voice"}</span>
                  </button>
                  <span className="text-xs text-gray-400 font-mono">
                    00:{audioCurrentTime < 10 ? `0${audioCurrentTime.toFixed(1)}` : audioCurrentTime.toFixed(1)} / 00:28.0
                  </span>
                </div>
              </div>

              <div className="flex justify-between text-xs text-[#667085]">
                <span>Sample ID: EVD-2026-0671A</span>
                <span className="font-semibold text-[#111827]">Vocoder FFT Analyzed</span>
              </div>
            </div>

            {/* Diagnostic Output */}
            <div className="lg:col-span-6 space-y-5 text-left">
              <div>
                <span className="text-xs font-bold text-[#D99A24] uppercase tracking-wider">
                  ● Audio Spectral Diagnostic
                </span>
                <h3 className="text-2xl font-black text-[#111827] mt-1">
                  Neural Vocoder Voice Clone
                </h3>
                <p className="text-sm text-[#667085] mt-2 leading-relaxed">
                  Spectral phase discontinuities identified in the 3.8 kHz band. 
                  The fundamental pitch contour demonstrates artificial flatness with zero natural vocal micro-tremor.
                </p>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3.5 bg-[#F5F6F3] rounded-2xl border border-[#E5E7EB]">
                  <span className="text-[#667085] block text-[11px]">Prediction</span>
                  <strong className="text-[#D94A4A] text-sm font-black">AI_GENERATED</strong>
                </div>

                <div className="p-3.5 bg-[#F5F6F3] rounded-2xl border border-[#E5E7EB]">
                  <span className="text-[#667085] block text-[11px]">AI Probability</span>
                  <strong className="text-[#111827] text-sm font-black">97.4% (HIGH)</strong>
                </div>

                <div className="p-3.5 bg-[#F5F6F3] rounded-2xl border border-[#E5E7EB] col-span-2 sm:col-span-1">
                  <span className="text-[#667085] block text-[11px]">Suspicious Segment</span>
                  <strong className="text-[#D94A4A] text-sm font-black">03.2s – 05.1s (94.2%)</strong>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3. IMAGE MODALITY TAB (WITH LIGHTBOX MODAL) */}
        {activeTab === 'image' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-[#111827] shadow-floating grid grid-cols-1 lg:grid-cols-12 gap-8 items-center animate-in fade-in duration-300">
            {/* Interactive Image Preview with Modal trigger */}
            <div className="lg:col-span-6 space-y-3">
              <div 
                onClick={() => setIsImageModalOpen(true)}
                className="relative aspect-video rounded-2xl overflow-hidden border-2 border-[#111827] bg-[#111827] shadow-md cursor-pointer group"
              >
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1000&q=80"
                  alt="Manipulated Portrait"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />

                {/* Overlaid Inpainting Box */}
                <div className="absolute inset-x-1/4 top-1/6 bottom-1/4 border-2 border-dashed border-[#D94A4A] bg-[#D94A4A]/20 flex items-center justify-center">
                  <span className="px-2.5 py-1 rounded bg-[#D94A4A] text-white text-[10px] font-bold shadow">
                    SYNTHESIZED INPAINTING (96.4%)
                  </span>
                </div>

                {/* Hover Click to Enlarge Prompt */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-2">
                  <Maximize2 className="w-5 h-5" />
                  <span>Click to Inspect Full Resolution</span>
                </div>
              </div>

              <div className="flex justify-between text-xs text-[#667085]">
                <span>Sample ID: EVD-2026-0248I</span>
                <span className="font-semibold text-[#111827]">Click Image for Full Modal</span>
              </div>
            </div>

            {/* Diagnostic Output */}
            <div className="lg:col-span-6 space-y-5 text-left">
              <div>
                <span className="text-xs font-bold text-[#356AE6] uppercase tracking-wider">
                  ● Image Spatial Diagnostic
                </span>
                <h3 className="text-2xl font-black text-[#111827] mt-1">
                  Generative Facial Inpainting
                </h3>
                <p className="text-sm text-[#667085] mt-2 leading-relaxed">
                  Error Level Analysis (ELA) detected a 92% compression delta on the facial crop compared to the authentic clothing and natural background.
                </p>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3.5 bg-[#F5F6F3] rounded-2xl border border-[#E5E7EB]">
                  <span className="text-[#667085] block text-[11px]">Verdict</span>
                  <strong className="text-[#D94A4A] text-sm font-black">Composite Fake</strong>
                </div>

                <div className="p-3.5 bg-[#F5F6F3] rounded-2xl border border-[#E5E7EB]">
                  <span className="text-[#667085] block text-[11px]">Confidence</span>
                  <strong className="text-[#111827] text-sm font-black">95.4%</strong>
                </div>

                <div className="p-3.5 bg-[#F5F6F3] rounded-2xl border border-[#E5E7EB] col-span-2 sm:col-span-1">
                  <span className="text-[#667085] block text-[11px]">Inpainted Region</span>
                  <strong className="text-[#356AE6] text-sm font-black">Face Only (Mask)</strong>
                </div>
              </div>

              {/* Open Modal Button */}
              <div>
                <button
                  onClick={() => setIsImageModalOpen(true)}
                  className="px-5 py-2.5 rounded-full bg-[#111827] hover:bg-[#356AE6] text-white text-xs font-bold flex items-center gap-2 transition-all shadow cursor-pointer"
                >
                  <Maximize2 className="w-4 h-4" />
                  <span>Open High-Resolution Inspector Modal</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* FULL-SCREEN IMAGE INSPECTOR MODAL */}
      {isImageModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border-2 border-[#111827] max-w-4xl w-full overflow-hidden shadow-2xl relative">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[#E5E7EB] flex items-center justify-between bg-[#F5F6F3]">
              <div>
                <h3 className="text-base font-black text-[#111827] uppercase">
                  Spatial Image Inspector (Case EVD-2026-0248I)
                </h3>
                <p className="text-xs text-[#667085]">
                  High-resolution Error Level Analysis &amp; Spatial Bounding Masks
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowMasks(!showMasks)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                    showMasks ? 'bg-[#356AE6] text-white border-[#356AE6]' : 'bg-white text-[#111827] border-[#E5E7EB]'
                  }`}
                >
                  {showMasks ? "Masks [ON]" : "Masks [OFF]"}
                </button>
                <button
                  onClick={() => setIsImageModalOpen(false)}
                  className="p-1.5 rounded-full hover:bg-[#E5E7EB] text-[#111827] cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Image Body */}
            <div className="p-6 relative flex flex-col items-center bg-[#FAF9F5]">
              <div className="relative rounded-2xl overflow-hidden border-2 border-[#111827] max-h-[60vh]">
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=80"
                  alt="High Resolution Forensic Inspection"
                  className="max-h-[60vh] object-contain"
                />

                {showMasks && (
                  <>
                    {/* Fake Facial Region */}
                    <div className="absolute inset-x-[28%] top-[15%] h-[55%] border-2 border-dashed border-[#D94A4A] bg-[#D94A4A]/25 rounded-lg flex items-start justify-center p-2">
                      <span className="bg-[#D94A4A] text-white text-[11px] font-bold px-2 py-0.5 rounded shadow">
                        [FAKE] Synthesized Inpainting
                      </span>
                    </div>

                    {/* Real Torso */}
                    <div className="absolute inset-x-[15%] bottom-[2%] h-[25%] border-2 border-[#10B981] bg-[#10B981]/15 rounded-lg flex items-center justify-center">
                      <span className="bg-[#10B981] text-white text-[11px] font-bold px-2 py-0.5 rounded shadow">
                        [REAL] Camera Sensor Torso
                      </span>
                    </div>
                  </>
                )}
              </div>

              <div className="w-full mt-4 flex items-center justify-between text-xs text-[#667085] px-2">
                <span>Error Level Analysis: Δ 38.4 units variance</span>
                <span className="text-[#D94A4A] font-bold">Face Region Interpolated</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
