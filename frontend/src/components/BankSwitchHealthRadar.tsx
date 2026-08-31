import React, { useState } from 'react'

export interface SwitchHealth {
  id: string
  name: string
  rail: string
  latencyMs: number
  successRate: number
  volume24h: string
  status: 'healthy' | 'degraded' | 'critical'
  reroutedCount?: number
}

export default function BankSwitchHealthRadar({ onSimulateReroute }: { onSimulateReroute?: () => void }) {
  const [isDegraded, setIsDegraded] = useState(true)
  const [rerouted] = useState(true)

  const switches: SwitchHealth[] = [
    {
      id: 'hdfc_upi',
      name: 'HDFC Bank UPI Switch',
      rail: 'UPI 2.0 / VPA',
      latencyMs: isDegraded ? 4280 : 210,
      successRate: isDegraded ? 38.4 : 96.8,
      volume24h: '₹28.4L',
      status: isDegraded ? 'degraded' : 'healthy',
      reroutedCount: rerouted ? 68 : 0,
    },
    {
      id: 'icici_cards',
      name: 'ICICI Acquiring Switch',
      rail: 'Credit/Debit (Visa/MC)',
      latencyMs: 240,
      successRate: 98.2,
      volume24h: '₹19.2L',
      status: 'healthy',
    },
    {
      id: 'sbi_nb',
      name: 'SBI NetBanking Gateway',
      rail: 'Direct Debit / NetBanking',
      latencyMs: 320,
      successRate: 94.5,
      volume24h: '₹12.6L',
      status: 'healthy',
    },
    {
      id: 'axis_upi',
      name: 'Axis Bank Dynamic VPA Rail',
      rail: 'UPI Alternate Rail',
      latencyMs: 180,
      successRate: 98.9,
      volume24h: '₹14.1L',
      status: 'healthy',
    },
  ]

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm transition-colors">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold">
            🚦
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Acquiring Switch Health & Dynamic Re-Routing Radar
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Real-time payment gateway latency anomalies & autonomous traffic failover
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setIsDegraded(!isDegraded)
              onSimulateReroute?.()
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 transition-colors"
          >
            <span>{isDegraded ? '🔄 Restore HDFC Normal' : '⚡ Simulate HDFC Outage'}</span>
          </button>
        </div>
      </div>

      {/* Reroute Alert Banner */}
      {isDegraded && (
        <div className="mt-4 flex items-start gap-3 rounded-lg border border-amber-200 dark:border-amber-500/30 bg-amber-50/80 dark:bg-amber-950/40 p-3 text-xs text-amber-900 dark:text-amber-200">
          <span className="text-base leading-none">⚠️</span>
          <div className="min-w-0 flex-1">
            <div className="font-bold flex items-center gap-2">
              <span>Rule SC-02 Triggered: HDFC UPI Switch Degradation Detected (4,280ms Latency)</span>
              <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 dark:text-amber-300 border border-amber-500/30">
                ACTIVE RE-ROUTE
              </span>
            </div>
            <p className="mt-0.5 text-[11px] leading-relaxed text-amber-800/90 dark:text-amber-300/90">
              RevGuard AI automatically intercepted 68 checkout drop-offs and re-routed to <strong>Axis Dynamic UPI Collect Rail</strong>, protecting <strong>₹3.84 Lakhs</strong> in revenue without customer drop-off.
            </p>
          </div>
        </div>
      )}

      {/* Switch Grid */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {switches.map((sw) => (
          <div
            key={sw.id}
            className={`rounded-xl border p-3.5 transition-all ${
              sw.status === 'degraded'
                ? 'border-rose-300 dark:border-rose-500/40 bg-rose-50/40 dark:bg-rose-950/20'
                : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{sw.name}</span>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  sw.status === 'degraded'
                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300'
                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300'
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    sw.status === 'degraded' ? 'bg-rose-500 animate-ping' : 'bg-emerald-500'
                  }`}
                />
                {sw.status === 'degraded' ? 'Degraded' : 'Healthy'}
              </span>
            </div>

            <div className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">{sw.rail}</div>

            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-200/60 dark:border-slate-800/80 pt-2.5 text-xs">
              <div>
                <div className="text-[10px] text-slate-500">Latency</div>
                <div
                  className={`font-mono font-bold ${
                    sw.latencyMs > 1000 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-200'
                  }`}
                >
                  {sw.latencyMs} ms
                </div>
              </div>

              <div>
                <div className="text-[10px] text-slate-500">Success Rate</div>
                <div
                  className={`font-mono font-bold ${
                    sw.successRate < 70 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {sw.successRate}%
                </div>
              </div>
            </div>

            {sw.reroutedCount ? (
              <div className="mt-2.5 rounded bg-blue-50 dark:bg-blue-950/50 px-2 py-1 text-[10px] font-semibold text-blue-700 dark:text-blue-300 flex items-center justify-between">
                <span>Auto Re-Routed:</span>
                <span className="font-mono">{sw.reroutedCount} txns</span>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  )
}
