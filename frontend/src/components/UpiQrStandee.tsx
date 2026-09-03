import React, { useEffect, useState, useRef } from 'react'
import QRCode from 'qrcode'
import { inr } from '../api'

interface UpiQrStandeeProps {
  transactionId: string
  amountInr: number
  clientName?: string
  onSettled?: () => void
}

export default function UpiQrStandee({
  transactionId,
  amountInr,
  clientName,
  onSettled,
}: UpiQrStandeeProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('')
  const [copied, setCopied] = useState<string | null>(null)
  const [isSettled, setIsSettled] = useState(false)
  const [timeLeft, setTimeLeft] = useState(899) // 14m 59s
  const [soundboxPlayed, setSoundboxPlayed] = useState(false)

  const upiPayload = `upi://pay?pa=revguard.recovery@razorpay&pn=RevGuard+Merchant&am=${amountInr.toFixed(2)}&cu=INR&tr=${transactionId}&tn=RevGuard+Recovery+${transactionId}`

  // 1. Generate Real High-Density Scannable QR Code
  useEffect(() => {
    QRCode.toDataURL(upiPayload, {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 320,
      color: {
        dark: '#090D16',
        light: '#FFFFFF',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('QR generation error:', err))
  }, [upiPayload])

  // 2. Countdown Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60
  const timerDisplay = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`

  function handleCopy(text: string, key: string) {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  // 3. Fintech Soundbox Speaker Simulation (Web Audio Chime + Spoken Alert)
  function playSoundboxChime() {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (AudioCtx) {
        const ctx = new AudioCtx()
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'

        // Dual pleasant chime: 784Hz (G5) -> 1046Hz (C6)
        osc.frequency.setValueAtTime(784, ctx.currentTime)
        osc.frequency.setValueAtTime(1046, ctx.currentTime + 0.12)

        gain.gain.setValueAtTime(0.3, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45)

        osc.connect(gain)
        gain.connect(ctx.destination)

        osc.start()
        osc.stop(ctx.currentTime + 0.5)
      }
    } catch {}

    // Authentic voice speaker announcement
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setTimeout(() => {
        try {
          window.speechSynthesis.cancel()
          const utterance = new SpeechSynthesisUtterance(
            `Payment of ${amountInr} rupees received on RevGuard UPI`,
          )
          utterance.rate = 1.05
          window.speechSynthesis.speak(utterance)
        } catch {}
      }, 500)
    }
  }

  async function handleSimulateScan() {
    setIsSettled(true)
    setSoundboxPlayed(true)
    playSoundboxChime()

    // Notify parent / settlement handler
    setTimeout(() => {
      onSettled?.()
    }, 2200)
  }

  return (
    <div className="space-y-4 font-sans">
      {/* Authentic Bharat UPI Standee Card */}
      <div className="relative mx-auto max-w-sm overflow-hidden rounded-2xl border-2 border-purple-500/40 bg-gradient-to-b from-[#0E1116] via-[#141720] to-[#0A0C11] p-4 text-white shadow-2xl shadow-purple-950/40">
        {/* Top Standee Header Banner */}
        <div className="rounded-xl bg-gradient-to-r from-purple-700 via-indigo-600 to-purple-800 p-2.5 text-center shadow-md">
          <div className="flex items-center justify-center gap-1.5">
            <span className="text-sm font-black tracking-widest text-amber-300 uppercase">BHARAT UPI</span>
            <span className="rounded bg-white/20 px-1.5 py-0.2 text-[9px] font-bold text-white uppercase tracking-wider">
              OFFICIAL
            </span>
          </div>
          <div className="text-[10px] font-medium text-purple-100 mt-0.5">
            Scan & Pay with Any Banking or UPI App
          </div>

          {/* Supported Brand Logos Strip */}
          <div className="mt-2 flex items-center justify-center gap-2 rounded-lg bg-black/25 py-1 px-2 text-[10px] font-bold text-white/90">
            <span className="text-blue-300">GPay</span>
            <span className="text-purple-300">• PhonePe</span>
            <span className="text-sky-300">• Paytm</span>
            <span className="text-emerald-300">• BHIM</span>
            <span className="text-amber-300">• CRED</span>
          </div>
        </div>

        {/* Amount & Merchant Identity Strip */}
        <div className="my-3 text-center space-y-0.5">
          <div className="text-[11px] font-semibold text-slate-400">
            {clientName ? `Corporate Invoice · ${clientName}` : 'RevGuard Dynamic Merchant Desk'}
          </div>
          <div className="text-2xl font-black text-white tracking-tight flex items-center justify-center gap-1">
            <span className="text-purple-400 text-lg">₹</span>
            <span className="num text-emerald-400">{amountInr.toLocaleString('en-IN')}</span>
            <span className="text-xs text-slate-400 font-normal">.00</span>
          </div>
          <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400 font-mono">
            <span>Ref: {transactionId.slice(0, 16)}</span>
            <span>•</span>
            <span className="text-amber-400">Session: {timerDisplay}</span>
          </div>
        </div>

        {/* High-Resolution QR Canvas with Laser Scan Beam */}
        <div className="relative mx-auto flex h-64 w-64 items-center justify-center rounded-2xl bg-white p-3 shadow-inner">
          {/* Target Corner Viewfinder Brackets */}
          <div className="absolute top-2 left-2 h-4 w-4 border-t-2 border-l-2 border-purple-600 rounded-tl-sm" />
          <div className="absolute top-2 right-2 h-4 w-4 border-t-2 border-r-2 border-purple-600 rounded-tr-sm" />
          <div className="absolute bottom-2 left-2 h-4 w-4 border-b-2 border-l-2 border-purple-600 rounded-bl-sm" />
          <div className="absolute bottom-2 right-2 h-4 w-4 border-b-2 border-r-2 border-purple-600 rounded-br-sm" />

          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt="Dynamic Scannable UPI QR"
              className="h-full w-full object-contain select-none"
            />
          ) : (
            <div className="flex flex-col items-center gap-2 text-slate-400 text-xs">
              <span className="animate-spin text-xl">⏳</span>
              <span>Generating Scannable QR…</span>
            </div>
          )}

          {/* Animated Cyan/Purple Laser Scan Line */}
          {!isSettled && (
            <div className="pointer-events-none absolute inset-x-3 top-3 bottom-3 overflow-hidden rounded-xl">
              <div className="h-1 w-full bg-gradient-to-r from-transparent via-purple-500 to-transparent shadow-lg shadow-purple-500 animate-bounce opacity-80" />
            </div>
          )}

          {/* Succeeded Soundbox Overlay */}
          {isSettled && (
            <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-emerald-600/95 text-white animate-fade-in p-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-emerald-600 text-3xl font-black shadow-lg">
                ✓
              </div>
              <div className="mt-2 text-base font-bold">Payment Received!</div>
              <div className="text-xs text-emerald-100">{inr(amountInr)} captured on UPI</div>
              <div className="mt-1 rounded-full bg-black/20 px-2.5 py-0.5 text-[10px] font-mono">
                Soundbox Chime Broadcasted
              </div>
            </div>
          )}
        </div>

        {/* VPA Copy Pill */}
        <div className="mt-3 flex items-center justify-between rounded-xl border border-slate-800 bg-[#080A0F] px-3 py-2 text-xs">
          <div className="min-w-0">
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Merchant VPA</div>
            <div className="font-mono text-[11px] text-purple-300 truncate">revguard.recovery@razorpay</div>
          </div>
          <button
            onClick={() => handleCopy('revguard.recovery@razorpay', 'vpa')}
            className="shrink-0 rounded-lg bg-purple-600/20 border border-purple-500/30 px-2.5 py-1 text-[10px] font-bold text-purple-300 hover:bg-purple-600/40 transition-colors cursor-pointer"
          >
            {copied === 'vpa' ? '✓ Copied' : 'Copy VPA'}
          </button>
        </div>
      </div>

      {/* 1-Tap Mobile Intent Deep-Links */}
      <div className="space-y-2 text-xs">
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
          <span>1-Tap Mobile Intent App Launchers:</span>
          <span>Zero-Redirect</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { name: 'Google Pay', icon: '🔵', app: 'gpay' },
            { name: 'PhonePe', icon: '🟣', app: 'phonepe' },
            { name: 'Paytm UPI', icon: '🔷', app: 'paytm' },
            { name: 'BHIM UPI', icon: '🟢', app: 'bhim' },
          ].map((item, idx) => (
            <button
              key={idx}
              onClick={() => handleCopy(upiPayload, item.app)}
              className="rounded-xl border border-slate-200 dark:border-[#1C202B] bg-slate-50 dark:bg-[#14171F] p-2.5 text-center hover:border-purple-500/40 transition-all cursor-pointer"
            >
              <div className="text-base">{item.icon}</div>
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{item.name}</div>
              <div className="text-[9px] text-purple-600 dark:text-purple-400 font-mono mt-0.5">
                {copied === item.app ? '✓ URI Copied' : 'Launch Intent'}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Action Controls & Soundbox Simulation */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 dark:border-[#1C202B] pt-3">
        <div className="flex items-center gap-2">
          {qrDataUrl && (
            <a
              href={qrDataUrl}
              download={`revguard_upi_qr_${transactionId}.png`}
              className="rounded-xl border border-slate-200 dark:border-[#242937] bg-white dark:bg-[#14171F] px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition-colors inline-flex items-center gap-1.5"
            >
              <span>📥</span>
              <span>Save QR (.png)</span>
            </a>
          )}
          <button
            onClick={() => handleCopy(upiPayload, 'uri')}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer font-medium"
          >
            {copied === 'uri' ? '✓ URI Copied' : 'Copy Raw UPI URI'}
          </button>
        </div>

        <button
          onClick={handleSimulateScan}
          disabled={isSettled}
          className="rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white hover:bg-purple-500 shadow-md transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-75"
        >
          <span>{isSettled ? '✓ Succeeded!' : '⚡ Simulate Phone Scan & Soundbox'}</span>
        </button>
      </div>
    </div>
  )
}
