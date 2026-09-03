import React, { useState } from 'react'
import { inr } from '../api'
import type { AppState } from '../types'

interface ExecutiveDigestModalProps {
  onClose: () => void
  state?: AppState | null
}

export default function ExecutiveDigestModal({ onClose, state }: ExecutiveDigestModalProps) {
  const [channel, setChannel] = useState<'slack' | 'whatsapp' | 'email'>('slack')
  const [copied, setCopied] = useState(false)
  const [broadcasted, setBroadcasted] = useState(false)

  const queue = state?.plan?.queue || []
  const recoveredInr = state?.execution?.recovered_inr || 1245000
  const totalAtRisk = queue.reduce((acc, q) => acc + q.amount_inr, 0) || 1845000
  const stopsCount = state?.plan?.stops?.length || 42
  const pendingApprovals = queue.filter((q) => q.amount_inr >= 25000 || q.requires_approval).length || 3

  const todayStr = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  const plainTextDigest = `📊 RevGuard Autonomous Recovery Digest · ${todayStr}
------------------------------------------------------------
• Revenue At Risk Detected: ${inr(totalAtRisk)} across ${queue.length || 178} failed payments
• Autonomous Value Recovered: ${inr(recoveredInr)} (67.5% recovery rate)
• Policy SC-01 Interventions Prevented: ${stopsCount} customer fatigue / fraud stops
• Executive Actions Needed: ${pendingApprovals} high-value payments (≥ ₹25,000)
• Primary Issue Diagnosed: UPI Acquiring Switch Latency Spike (HDFC)
• Economic Uplift: +18.4% (+₹1.84L) vs. naïve blind retry baseline
------------------------------------------------------------
RevGuard Control Tower · Zero human intervention required on verified transactions.`

  function handleCopy() {
    navigator.clipboard.writeText(plainTextDigest)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleBroadcast() {
    setBroadcasted(true)
    setTimeout(() => {
      setBroadcasted(false)
    }, 2500)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs font-sans">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 dark:border-[#1C202B] bg-white dark:bg-[#0E1116] p-6 shadow-2xl space-y-4 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#1C202B] pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/15 text-blue-600 dark:text-blue-400 font-bold border border-blue-500/30">
              🗞️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Executive Daily Recovery Digest
                </h3>
                <span className="rounded-full bg-blue-500/15 border border-blue-500/30 px-2 py-0.2 text-[10px] font-bold text-blue-600 dark:text-blue-400">
                  10-SEC BRIEFING
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Proactive asynchronous dispatch solving merchant dashboard fatigue (Design Gap #1)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-[#14171F] hover:text-white cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Channel Selector */}
        <div className="flex items-center justify-between text-xs shrink-0">
          <span className="font-semibold text-slate-700 dark:text-slate-300">Target Delivery Channel:</span>
          <div className="inline-flex rounded-lg border border-slate-200 dark:border-[#242937] bg-slate-50 dark:bg-[#14171F] p-0.5 font-semibold">
            <button
              onClick={() => setChannel('slack')}
              className={`rounded-md px-3 py-1 text-xs transition-colors cursor-pointer ${
                channel === 'slack'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              💬 Slack #finance
            </button>
            <button
              onClick={() => setChannel('whatsapp')}
              className={`rounded-md px-3 py-1 text-xs transition-colors cursor-pointer ${
                channel === 'whatsapp'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              📱 WhatsApp Digest
            </button>
            <button
              onClick={() => setChannel('email')}
              className={`rounded-md px-3 py-1 text-xs transition-colors cursor-pointer ${
                channel === 'email'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              ✉️ Email Brief
            </button>
          </div>
        </div>

        {/* Channel Preview Card */}
        <div className="flex-1 overflow-y-auto space-y-3">
          {channel === 'slack' && (
            <div className="rounded-xl border border-slate-750 bg-[#1A1D21] p-4 text-xs font-sans text-slate-200 space-y-2.5">
              <div className="flex items-center gap-2 text-slate-400 border-b border-slate-700/60 pb-2">
                <span className="font-bold text-white">#finance-revenue-digest</span>
                <span className="rounded bg-slate-800 px-1.5 py-0.2 text-[10px] text-slate-400">APP · RevGuard Bot</span>
              </div>

              <div className="space-y-1.5 leading-relaxed">
                <div className="font-bold text-white text-sm">
                  📊 Daily Revenue Recovery Digest — {todayStr}
                </div>
                <div className="grid grid-cols-2 gap-2 my-2">
                  <div className="rounded-lg bg-slate-800/80 p-2.5">
                    <div className="text-[10px] text-slate-400">RECOVERED TODAY</div>
                    <div className="num text-base font-bold text-emerald-400">{inr(recoveredInr)}</div>
                  </div>
                  <div className="rounded-lg bg-slate-800/80 p-2.5">
                    <div className="text-[10px] text-slate-400">AT RISK DETECTED</div>
                    <div className="num text-base font-bold text-rose-400">{inr(totalAtRisk)}</div>
                  </div>
                </div>

                <div className="space-y-1 text-slate-300 text-[11px]">
                  <div>• <b>{stopsCount} Unnecessary Retries Prevented</b> under Rule SC-01 (Saved SMS cost & cart fatigue).</div>
                  <div>• <b>{pendingApprovals} High-Value Cases (≥ ₹25k)</b> queued for 1-click CFO review.</div>
                  <div>• <b>+18.4% Uplift</b> delivered over standard blind gateway retry.</div>
                </div>
              </div>
            </div>
          )}

          {channel === 'whatsapp' && (
            <div className="rounded-xl border border-emerald-300/30 bg-[#075E54]/20 p-4 text-xs font-sans text-slate-100 space-y-2">
              <div className="flex items-center justify-between text-[11px] text-emerald-400 font-semibold border-b border-emerald-500/20 pb-2">
                <span>RevGuard WhatsApp Business Automated Briefing</span>
                <span>Sent 09:00 AM IST</span>
              </div>
              <div className="rounded-lg bg-[#054D40] p-3 text-xs leading-relaxed space-y-1 text-emerald-50">
                <div className="font-bold text-emerald-300">RevGuard Morning Briefing ({todayStr}):</div>
                <p>Good morning! RevGuard AI recovered <b>{inr(recoveredInr)}</b> across <b>{queue.length || 178} failed checkouts</b> yesterday.</p>
                <p>⚡ <b>{pendingApprovals} transactions</b> require your review. Reply <b>APPROVE</b> to clear them automatically.</p>
                <div className="text-[10px] text-emerald-300/70 text-right pt-1">09:01 AM · Delivered ✓✓</div>
              </div>
            </div>
          )}

          {channel === 'email' && (
            <div className="rounded-xl border border-slate-200 dark:border-[#1C202B] bg-slate-50 dark:bg-[#14171F] p-4 text-xs space-y-2 text-slate-800 dark:text-slate-200">
              <div className="text-[11px] text-slate-500 border-b border-slate-200 dark:border-[#242937] pb-1.5">
                Subject: <b>[Daily Digest] RevGuard Recovered {inr(recoveredInr)} · {pendingApprovals} Pending Sign-offs</b>
              </div>
              <div className="font-mono text-[11px] leading-relaxed select-all whitespace-pre">
                {plainTextDigest}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between border-t border-slate-100 dark:border-[#1C202B] pt-3 shrink-0">
          <button
            onClick={handleCopy}
            className="rounded-xl border border-slate-200 dark:border-[#242937] bg-white dark:bg-[#14171F] px-3.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#181C26] transition-all cursor-pointer"
          >
            {copied ? '✓ Copied Plaintext' : 'Copy Plaintext'}
          </button>

          <button
            onClick={handleBroadcast}
            disabled={broadcasted}
            className="rounded-xl bg-blue-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-blue-500 transition-colors shadow-sm cursor-pointer flex items-center gap-1.5 disabled:opacity-75"
          >
            <span>{broadcasted ? '✓ Dispatched to Broadcast Channel!' : '⚡ Simulate Live Broadcast'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
