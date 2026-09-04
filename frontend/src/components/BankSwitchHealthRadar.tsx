import React, { useState } from 'react'
import RbiIncidentModal from './RbiIncidentModal'

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

const HOURLY_LIQUIDITY = [
  { hour: 0, rate: 76, label: '00:00', status: 'maintenance', note: 'Batch settlement roll' },
  { hour: 1, rate: 58, label: '01:00', status: 'maintenance', note: 'Core Banking System (CBS) backup' },
  { hour: 2, rate: 46, label: '02:00', status: 'maintenance', note: 'NPCI central switch maintenance' },
  { hour: 3, rate: 42, label: '03:00', status: 'maintenance', note: 'Inter-bank batch clearing' },
  { hour: 4, rate: 64, label: '04:00', status: 'maintenance', note: 'CBS node restart window' },
  { hour: 5, rate: 82, label: '05:00', status: 'warmup', note: 'Early switch warm-up' },
  { hour: 6, rate: 89, label: '06:00', status: 'healthy', note: 'Morning transit volume' },
  { hour: 7, rate: 93, label: '07:00', status: 'healthy', note: 'Breakfast & bill payments' },
  { hour: 8, rate: 96, label: '08:00', status: 'healthy', note: 'SC-01 Contact Window opens' },
  { hour: 9, rate: 98, label: '09:00', status: 'prime', note: 'Peak salary & commercial liquidity' },
  { hour: 10, rate: 99, label: '10:00', status: 'prime', note: 'Optimal retry execution window' },
  { hour: 11, rate: 99, label: '11:00', status: 'prime', note: 'B2B wire reconciliation peak' },
  { hour: 12, rate: 98, label: '12:00', status: 'prime', note: 'E-commerce lunch rush' },
  { hour: 13, rate: 97, label: '13:00', status: 'healthy', note: 'High switch throughput' },
  { hour: 14, rate: 96, label: '14:00', status: 'healthy', note: 'Midday retail collect' },
  { hour: 15, rate: 98, label: '15:00', status: 'prime', note: 'Afternoon corporate AR clearing' },
  { hour: 16, rate: 98, label: '16:00', status: 'prime', note: 'High mandate debit success' },
  { hour: 17, rate: 99, label: '17:00', status: 'prime', note: 'Prime salary credit arrivals' },
  { hour: 18, rate: 98, label: '18:00', status: 'prime', note: 'Evening rush payments' },
  { hour: 19, rate: 97, label: '19:00', status: 'healthy', note: 'Dinner / quick commerce peak' },
  { hour: 20, rate: 96, label: '20:00', status: 'healthy', note: 'High UPI QR scan volume' },
  { hour: 21, rate: 94, label: '21:00', status: 'healthy', note: 'SC-01 Contact Window closes' },
  { hour: 22, rate: 88, label: '22:00', status: 'warmup', note: 'Late night volume taper' },
  { hour: 23, rate: 79, label: '23:00', status: 'maintenance', note: 'Pre-midnight reconciliation' },
]

export default function BankSwitchHealthRadar({ onSimulateReroute }: { onSimulateReroute?: () => void }) {
  const [isDegraded, setIsDegraded] = useState(true)
  const [rerouted] = useState(true)
  const [showRbiModal, setShowRbiModal] = useState(false)
  const [hoveredHour, setHoveredHour] = useState<number | null>(null)

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
            onClick={() => setShowRbiModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300 transition-colors cursor-pointer"
            title="Generate official 6-Hour RBI Disruption Incident Disclosure (Form INC-01)"
          >
            <span>🏛️</span>
            <span>RBI 6-Hr Incident Form</span>
          </button>

          <button
            onClick={() => {
              setIsDegraded(!isDegraded)
              onSimulateReroute?.()
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 transition-colors cursor-pointer"
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
            <div className="font-bold flex items-center justify-between gap-2 flex-wrap">
              <span>Rule SC-02 Triggered: HDFC UPI Switch Degradation Detected (4,280ms Latency)</span>
              <button
                onClick={() => setShowRbiModal(true)}
                className="rounded bg-amber-600 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-amber-700 transition-colors cursor-pointer"
              >
                🏛️ Generate RBI INC-01 Filing →
              </button>
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

      {/* NPCI 24-Hour Inter-Bank Switch Liquidity & Maintenance Heatmap */}
      <div className="mt-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 dark:border-slate-800/80 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="text-sm">📊</span>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>NPCI 24-Hour Inter-Bank Switch Liquidity & Maintenance Heatmap</span>
                <span className="rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold px-1.5 py-0.2 border border-emerald-500/30">
                  ALGORITHMIC ADVANTAGE
                </span>
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                Core Banking System (CBS) downtime windows vs. prime liquidity retry slots
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 text-[10px]">
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-slate-600 dark:text-slate-400">Prime (97-99%)</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              <span className="text-slate-600 dark:text-slate-400">Healthy (90-96%)</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              <span className="text-slate-600 dark:text-slate-400">CBS Maintenance (42-76%)</span>
            </div>
          </div>
        </div>

        {/* 24-Hour Grid */}
        <div className="grid grid-cols-12 sm:grid-cols-24 gap-1 items-end pt-2 pb-1">
          {HOURLY_LIQUIDITY.map((item) => {
            const isHovered = hoveredHour === item.hour
            let color = 'bg-emerald-500 dark:bg-emerald-400'
            if (item.status === 'maintenance') color = 'bg-rose-500 dark:bg-rose-400'
            else if (item.status === 'warmup') color = 'bg-amber-500 dark:bg-amber-400'
            else if (item.status === 'healthy') color = 'bg-blue-500 dark:bg-blue-400'

            const heightPct = Math.max(25, item.rate)

            return (
              <div
                key={item.hour}
                onMouseEnter={() => setHoveredHour(item.hour)}
                onMouseLeave={() => setHoveredHour(null)}
                className="group relative flex flex-col items-center cursor-pointer"
              >
                <div className="w-full flex items-end justify-center h-16 bg-slate-200/50 dark:bg-slate-800/40 rounded-t-sm overflow-hidden">
                  <div
                    style={{ height: `${heightPct}%` }}
                    className={`w-full ${color} transition-all duration-200 group-hover:opacity-80 rounded-t-xs`}
                  />
                </div>
                <span className="text-[9px] font-mono text-slate-500 dark:text-slate-400 mt-1">
                  {item.hour.toString().padStart(2, '0')}
                </span>

                {/* Tooltip */}
                {isHovered && (
                  <div className="absolute bottom-20 z-30 w-44 rounded-lg bg-slate-900 border border-slate-700 p-2 text-[10px] text-white shadow-xl pointer-events-none -translate-x-1/2 left-1/2">
                    <div className="font-bold flex items-center justify-between">
                      <span>{item.label} Window</span>
                      <span className="text-emerald-400">{item.rate}% Success</span>
                    </div>
                    <div className="text-slate-300 mt-0.5">{item.note}</div>
                    <div className="text-[9px] text-purple-300 font-mono mt-1 pt-1 border-t border-slate-800">
                      {item.status === 'maintenance'
                        ? '⛔ Retries Suppressed (Rule SC-01)'
                        : '✓ Recommended Recovery Window'}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Dynamic Detail Card when Hour is Hovered or Default */}
        <div className="rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700 dark:text-slate-300">
              {hoveredHour !== null
                ? `Hour ${HOURLY_LIQUIDITY[hoveredHour].label}: ${HOURLY_LIQUIDITY[hoveredHour].note}`
                : 'Hover over any hour to inspect bank core-banking maintenance and optimal retry windows'}
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-mono">
            <span className="text-rose-600 dark:text-rose-400">01h–04h: 42% Success (Blind Retries Fail)</span>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <span className="text-emerald-600 dark:text-emerald-400">09h–18h: 99% Success (+28.4% Uplift)</span>
          </div>
        </div>
      </div>

      {showRbiModal && (
        <RbiIncidentModal
          onClose={() => setShowRbiModal(false)}
          latencyMs={isDegraded ? 4280 : 340}
          errorRate={isDegraded ? 32.4 : 1.2}
        />
      )}
    </div>
  )
}
