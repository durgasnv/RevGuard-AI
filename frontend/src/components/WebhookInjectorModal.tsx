import React, { useState, useEffect } from 'react'
import { api, inr } from '../api'
import type { WebhookEvent } from '../types'

interface WebhookInjectorModalProps {
  onClose: () => void
  onEventFired?: () => void
}

const PRESETS = [
  {
    label: 'High-Ticket Enterprise Drop-off (₹45,000)',
    description: 'Triggers Policy Gate check & CFO Slack Escalation',
    event: 'payment.failed',
    amount_inr: 45000,
    payment_method: 'upi',
    error_code: 'GATEWAY_TIMEOUT',
    icon: '🏢',
    tone: 'rose',
  },
  {
    label: 'UPI AutoPay Mandate Failure (₹2,499)',
    description: 'Triggers Salary-Drop Mandate Recovery Ladder',
    event: 'payment.failed',
    amount_inr: 2499,
    payment_method: 'upi_autopay',
    error_code: 'INSUFFICIENT_FUNDS',
    icon: '🔄',
    tone: 'purple',
  },
  {
    label: 'HDFC Switch Latency Spike (₹8,500)',
    description: 'Triggers Autonomous Axis Switch Failover',
    event: 'payment.failed',
    amount_inr: 8500,
    payment_method: 'upi',
    error_code: 'SWITCH_LATENCY_EXCEEDED',
    icon: '⚡',
    tone: 'amber',
  },
  {
    label: 'Provider Captured Event (₹12,000)',
    description: 'Simulates webhook notification of settled payment',
    event: 'payment.captured',
    amount_inr: 12000,
    payment_method: 'card',
    error_code: '',
    icon: '✅',
    tone: 'emerald',
  },
]

export default function WebhookInjectorModal({ onClose, onEventFired }: WebhookInjectorModalProps) {
  const [eventType, setEventType] = useState('payment.failed')
  const [amount, setAmount] = useState(45000)
  const [method, setMethod] = useState('upi')
  const [errorCode, setErrorCode] = useState('GATEWAY_TIMEOUT')
  const [sending, setSending] = useState(false)
  const [lastResult, setLastResult] = useState<string | null>(null)
  const [recentEvents, setRecentEvents] = useState<WebhookEvent[]>([])

  useEffect(() => {
    loadRecentEvents()
  }, [])

  async function loadRecentEvents() {
    try {
      const res = await api.webhookEvents()
      if (res && res.events) {
        setRecentEvents(res.events)
      }
    } catch (e) {
      console.error('Failed to load webhook events:', e)
    }
  }

  async function handleFire(preset?: typeof PRESETS[0]) {
    const payload = preset
      ? {
          event: preset.event,
          amount_inr: preset.amount_inr,
          payment_method: preset.payment_method,
          error_code: preset.error_code,
        }
      : {
          event: eventType,
          amount_inr: Number(amount),
          payment_method: method,
          error_code: errorCode,
        }

    try {
      setSending(true)
      setLastResult(null)
      const res = await api.fireWebhook(payload)
      setLastResult(`Webhook ${res.status}: Event ID ${res.event?.event_id || 'evt_live'} successfully recorded in audit log`)
      await loadRecentEvents()
      onEventFired?.()
    } catch (e: unknown) {
      setLastResult(`Error: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs font-sans">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-[#1C202B] bg-white dark:bg-[#0E1116] p-6 shadow-2xl space-y-5 text-slate-900 dark:text-slate-100 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#1C202B] pb-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold border border-blue-500/20">
              ⚡
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Live Razorpay Webhook Injector & Simulator
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Inject live payment events into RevGuard AI's ingestion stream & watch autonomous agents react
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-[#151821] hover:text-white transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Quick Presets Grid */}
        <div className="space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Quick Simulation Presets
          </div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {PRESETS.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleFire(p)}
                disabled={sending}
                className="flex items-start gap-3 rounded-xl border border-slate-200 dark:border-[#1C202B] bg-slate-50/80 dark:bg-[#14171F] p-3 text-left transition-all hover:border-blue-500/40 hover:bg-blue-50/40 dark:hover:bg-[#181C26] cursor-pointer disabled:opacity-50 group"
              >
                <span className="text-xl group-hover:scale-110 transition-transform">{p.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                    {p.label}
                  </div>
                  <div className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400 leading-snug">
                    {p.description}
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-[9px] font-mono text-slate-400">
                    <span className="rounded bg-slate-200 dark:bg-[#1C202B] px-1 py-0.2">{p.event}</span>
                    <span>·</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">{inr(p.amount_inr)}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Custom Webhook Event Form */}
        <div className="rounded-xl border border-slate-200 dark:border-[#1C202B] bg-slate-50/60 dark:bg-[#14171F]/80 p-4 space-y-3">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Custom Webhook Event Payload
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Event Type
              </label>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-[#242937] bg-white dark:bg-[#0E1116] px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500"
              >
                <option value="payment.failed">payment.failed</option>
                <option value="payment.captured">payment.captured</option>
                <option value="order.paid">order.paid</option>
                <option value="invoice.overdue">invoice.overdue</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Transaction Amount (INR)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-200 dark:border-[#242937] bg-white dark:bg-[#0E1116] px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500 num"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Payment Method
              </label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-[#242937] bg-white dark:bg-[#0E1116] px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500"
              >
                <option value="upi">UPI (Collect / Intent)</option>
                <option value="upi_autopay">UPI AutoPay (Mandate)</option>
                <option value="card">Credit / Debit Card</option>
                <option value="netbanking">NetBanking (HDFC / ICICI / SBI)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Error Code
              </label>
              <select
                value={errorCode}
                onChange={(e) => setErrorCode(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-[#242937] bg-white dark:bg-[#0E1116] px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500"
              >
                <option value="GATEWAY_TIMEOUT">GATEWAY_TIMEOUT (Bank Switch Lag)</option>
                <option value="INSUFFICIENT_FUNDS">INSUFFICIENT_FUNDS (Mandate Retry)</option>
                <option value="AUTHENTICATION_FAILED">AUTHENTICATION_FAILED (3DS Drop)</option>
                <option value="EXPIRED_CARD">EXPIRED_CARD (Card Token Expired)</option>
                <option value="ACCOUNT_RESTRICTION">ACCOUNT_RESTRICTION (SC-01 Block)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
              Endpoint: <span className="text-blue-600 dark:text-blue-400">POST /api/webhooks/razorpay</span>
            </span>
            <button
              onClick={() => handleFire()}
              disabled={sending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-blue-500 transition-all shadow-md shadow-blue-600/20 disabled:opacity-50 cursor-pointer"
            >
              <span>{sending ? 'Injecting…' : '🚀 Fire Webhook Event'}</span>
            </button>
          </div>
        </div>

        {/* Live Result Feedback */}
        {lastResult && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
            <span>✅</span>
            <span className="font-semibold">{lastResult}</span>
          </div>
        )}

        {/* Live Webhook Event Stream */}
        {recentEvents.length > 0 && (
          <div className="space-y-2 border-t border-slate-100 dark:border-[#1C202B] pt-3">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Recent Ingestion Stream ({recentEvents.length})
              </span>
              <button
                onClick={loadRecentEvents}
                className="text-blue-600 dark:text-blue-400 hover:underline text-[10px] cursor-pointer"
              >
                ↻ Refresh
              </button>
            </div>

            <div className="max-h-36 space-y-1.5 overflow-y-auto">
              {recentEvents.slice(0, 5).map((evt, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-[#1C202B] bg-slate-50 dark:bg-[#14171F] px-3 py-1.5 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="font-mono text-[10px] text-slate-400">{evt.event_id}</span>
                    <span className="font-bold text-slate-900 dark:text-white">{evt.event}</span>
                    <span className="rounded bg-slate-200 dark:bg-[#1C202B] px-1.5 py-0.2 text-[9px] text-slate-400 uppercase">
                      {evt.payment_method}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="num font-bold text-slate-900 dark:text-white">{inr(evt.amount_inr)}</span>
                    <span className="text-[10px] text-slate-500">
                      {evt.timestamp ? new Date(evt.timestamp).toLocaleTimeString() : 'Just now'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
