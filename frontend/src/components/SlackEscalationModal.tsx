import React, { useState } from 'react'
import { inr } from '../api'

interface SlackEscalationProps {
  transactionId?: string
  amountInr?: number
  reason?: string
  customer?: string
  onApprove?: (txnId: string) => Promise<void>
  onClose: () => void
  onOpenVoice?: () => void
}

export default function SlackEscalationModal({
  transactionId = 'txn_9843a871',
  amountInr = 45000,
  reason = 'Bank Switch Latency & High Ticket Size (>₹25k Approval Rule)',
  customer = 'Acme Logistics Corp (Enterprise)',
  onApprove,
  onClose,
  onOpenVoice,
}: SlackEscalationProps) {
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected'>('pending')
  const [approving, setApproving] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [replies, setReplies] = useState<{ author: string; time: string; text: string; role: string }[]>([
    {
      author: 'RevGuard Autonomous Bot',
      time: 'Just now',
      text: `🚨 High-Value Revenue Escalation Alert: Transaction ${transactionId} for ${inr(amountInr)} requires CFO sign-off before 1-click recovery dispatch.`,
      role: 'APP',
    },
  ])

  async function handleApprove() {
    setApproving(true)
    try {
      if (onApprove) {
        await onApprove(transactionId)
      }
      setStatus('approved')
      setReplies((prev) => [
        ...prev,
        {
          author: 'Priya Sharma (CFO)',
          time: 'Just now',
          text: `✅ Approved 1-click Razorpay payment link dispatch for ${inr(amountInr)}. Expected Value optimization ($EV = +₹39,500) validated.`,
          role: 'CFO',
        },
      ])
    } finally {
      setApproving(false)
    }
  }

  function handleReject() {
    setStatus('rejected')
    setReplies((prev) => [
      ...prev,
      {
        author: 'Priya Sharma (CFO)',
        time: 'Just now',
        text: `🛑 Blocked recovery attempt under Rule SC-01 (Risk Avoidance). Routed to manual account manager review.`,
        role: 'CFO',
      },
    ])
  }

  function handleSendReply() {
    if (!replyText.trim()) return
    setReplies((prev) => [
      ...prev,
      {
        author: 'Finance Team Member',
        time: 'Just now',
        text: replyText.trim(),
        role: 'USER',
      },
    ])
    setReplyText('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 dark:border-[#1C202B] bg-white dark:bg-[#0E1116] text-slate-900 dark:text-slate-200 shadow-2xl overflow-hidden font-sans">
        {/* Slack Channel Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#1C202B] bg-slate-50 dark:bg-[#14171F] px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-bold">#</span>
            <span className="font-bold text-slate-900 dark:text-white text-sm">finance-revenue-escalations</span>
            <span className="rounded bg-slate-200 dark:bg-[#1C202B] px-1.5 py-0.5 text-[10px] text-slate-600 dark:text-slate-400 font-mono">
              Slack Bridge
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Slack Message Body */}
        <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Thread messages */}
          {replies.map((r, i) => (
            <div key={i} className="flex items-start gap-3 text-xs leading-relaxed">
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white shadow-sm ${
                  r.role === 'APP' ? 'bg-blue-600' : r.role === 'CFO' ? 'bg-emerald-600' : 'bg-purple-600'
                }`}
              >
                {r.role === 'APP' ? '⚡' : r.role === 'CFO' ? 'PS' : 'FT'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white">{r.author}</span>
                  {r.role === 'APP' && (
                    <span className="rounded bg-slate-800 px-1 text-[9px] font-bold text-blue-400">
                      APP
                    </span>
                  )}
                  <span className="text-[10px] text-slate-500">{r.time}</span>
                </div>
                <div className="mt-1 text-slate-300">{r.text}</div>
              </div>
            </div>
          ))}

          {/* Interactive Escalation Card Inside Slack */}
          <div className="ml-11 rounded-xl border border-blue-500/30 bg-slate-50 dark:bg-[#14171F] p-4 text-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700/60 pb-2">
              <div className="font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                <span>🛡️ Policy Gate Check: High-Value Human Sign-off</span>
              </div>
              <span className="font-mono text-[11px] text-amber-500 dark:text-amber-400 font-bold">{inr(amountInr)}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-slate-500 dark:text-slate-400">Customer:</span>
                <div className="font-medium text-slate-900 dark:text-white truncate">{customer}</div>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400">Transaction ID:</span>
                <div className="font-mono text-slate-700 dark:text-slate-300 truncate">{transactionId}</div>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400">Expected Value ($EV):</span>
                <div className="font-bold text-emerald-600 dark:text-emerald-400">+₹39,500 (+88% P)</div>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400">Policy Trigger:</span>
                <div className="font-medium text-amber-600 dark:text-amber-300">Amount &gt; ₹25,000 threshold</div>
              </div>
            </div>

            <div className="rounded bg-slate-100 dark:bg-[#0E1116] p-2 text-[11px] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-[#1C202B]">
              <span className="text-slate-500">Root Cause Diagnosis: </span>
              {reason}
            </div>

            {/* Action Buttons */}
            {status === 'pending' ? (
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-700/60">
                <button
                  onClick={handleApprove}
                  disabled={approving}
                  className="rounded-lg bg-emerald-600 px-3.5 py-1.5 font-bold text-white hover:bg-emerald-500 transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <span>{approving ? 'Approving…' : '✅ Approve Recovery Link'}</span>
                </button>

                <button
                  onClick={handleReject}
                  className="rounded-lg bg-rose-600/80 px-3 py-1.5 font-semibold text-white hover:bg-rose-600 transition-colors cursor-pointer"
                >
                  🛑 Block (SC-01)
                </button>

                {onOpenVoice && (
                  <button
                    onClick={() => {
                      onClose()
                      onOpenVoice()
                    }}
                    className="rounded-lg border border-purple-500/50 bg-purple-900/30 px-3 py-1.5 font-semibold text-purple-300 hover:bg-purple-800/40 transition-colors cursor-pointer"
                  >
                    🎙️ Launch Voice Bot
                  </button>
                )}
              </div>
            ) : status === 'approved' ? (
              <div className="rounded-lg bg-emerald-950/60 border border-emerald-500/40 p-2.5 text-emerald-300 text-xs font-semibold flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>✅</span>
                  <span>Approved by CFO Priya Sharma · Razorpay 1-click link dispatched</span>
                </div>
                <span className="font-mono text-[10px] text-emerald-400">SETTLED_PENDING</span>
              </div>
            ) : (
              <div className="rounded-lg bg-rose-950/60 border border-rose-500/40 p-2.5 text-rose-300 text-xs font-semibold flex items-center gap-2">
                <span>🛑</span>
                <span>Action rejected & locked under safe stopping policy SC-01.</span>
              </div>
            )}
          </div>
        </div>

        {/* Slack Reply Box */}
        <div className="border-t border-slate-200 dark:border-[#1C202B] bg-slate-50 dark:bg-[#14171F] p-3 flex items-center gap-2">
          <input
            type="text"
            placeholder="Reply to thread or ask CFO for details…"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendReply()}
            className="flex-1 rounded-lg border border-slate-200 dark:border-[#242937] bg-white dark:bg-[#0E1116] px-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-blue-500"
          />
          <button
            onClick={handleSendReply}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-500 transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
