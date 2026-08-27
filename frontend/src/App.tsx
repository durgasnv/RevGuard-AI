import { useCallback, useEffect, useState } from 'react'
import { api } from './api'
import type { DetectReport, AppState } from './types'
import AuditView from './views/AuditView'
import LeakageView from './views/LeakageView'
import OverviewView from './views/OverviewView'
import QueueView from './views/QueueView'
import AnalyzeView from './views/AnalyzeView'

type TabId = 'overview' | 'leakage' | 'queue' | 'audit' | 'analyze'

interface NavItem {
  id: TabId
  label: string
  icon: string
  desc: string
  badge?: (report: DetectReport | null, state: AppState | null) => string | number | null
}

const NAV: NavItem[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: '◈',
    desc: 'Executive revenue health',
  },
  {
    id: 'leakage',
    label: 'Revenue Leakage',
    icon: '▤',
    desc: 'Clusters ranked by impact',
    badge: (report) => (report?.clusters.length ? report.clusters.length : null),
  },
  {
    id: 'queue',
    label: 'Recovery Queue',
    icon: '⑂',
    desc: 'Gated, EV-ranked actions',
    badge: (_r, state) => (state?.plan?.queue.length ? state.plan.queue.length : null),
  },
  {
    id: 'audit',
    label: 'Audit Trail',
    icon: '≣',
    desc: 'Immutable decision log',
    badge: (_r, state) =>
      state?.execution?.audit_trail.length ? state.execution.audit_trail.length : null,
  },
  {
    id: 'analyze',
    label: 'Upload & Analyze',
    icon: '⇪',
    desc: 'Instant CSV / Excel audit',
  },
]

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 via-indigo-600 to-emerald-500 text-lg font-black text-white shadow-lg shadow-blue-900/40 ring-1 ring-white/20">
        <span className="drop-shadow-sm">R</span>
        <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-slate-950 bg-emerald-400" />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 leading-none">
          <span className="text-base font-bold tracking-tight text-white">
            Rev<span className="text-gradient">Guard</span>
          </span>
          <span className="rounded bg-blue-500/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-blue-400 ring-1 ring-blue-500/20">
            AI
          </span>
        </div>
        <div className="mt-1 text-[11px] font-medium text-slate-400">Recovery Control Tower</div>
      </div>
    </div>
  )
}

export default function App() {
  const [tab, setTab] = useState<TabId>('overview')
  const [boot, setBoot] = useState<'checking' | 'empty' | 'ready'>('checking')
  const [detectReport, setDetectReport] = useState<DetectReport | null>(null)
  const [state, setState] = useState<AppState | null>(null)
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    const [report, st] = await Promise.all([api.detect(), api.state()])
    setDetectReport(report)
    setState(st)
  }, [])

  useEffect(() => {
    api.health().then((h) => setBoot(h.transactions_in_store > 0 ? 'ready' : 'empty'))
  }, [])

  async function loadDemo() {
    setBusy(true)
    try {
      await api.seedDemo(600)
      await refresh()
      await api.run()
      setState(await api.state())
      setBoot('ready')
    } catch (e) {
      console.error('loadDemo failed:', e)
    } finally {
      setBusy(false)
    }
  }

  const runRecovery = useCallback(async () => {
    setBusy(true)
    try {
      await api.run()
      await refresh()
    } finally {
      setBusy(false)
    }
  }, [refresh])

  if (boot === 'checking') {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500/30 border-t-blue-500" />
          <div className="text-xs font-medium tracking-wide text-slate-400">
            Connecting to RevGuard Control Tower…
          </div>
        </div>
      </div>
    )
  }

  if (boot === 'empty') {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-12">
        {/* Ambient background glow */}
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-blue-600/15 blur-[120px]" />
        <div className="pointer-events-none absolute -bottom-40 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-emerald-600/10 blur-[120px]" />

        <div className="animate-rise relative z-10 flex max-w-xl flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-600 to-emerald-400 text-3xl font-black text-white shadow-2xl shadow-blue-900/50 ring-1 ring-white/20">
            R
          </div>
          <h1 className="mt-6 text-3xl font-bold tracking-tight text-white lg:text-4xl">
            Rev<span className="text-gradient">Guard AI</span>
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            Next-generation revenue recovery control tower for payments ecosystems. Detects silent
            leakage clusters, triggers AI-driven diagnostics, and executes policy-bounded recoveries.
          </p>

          <div className="mt-8 grid w-full grid-cols-1 gap-3 text-left sm:grid-cols-3">
            <div className="rounded-xl border border-white/[0.08] bg-slate-900/50 p-3.5 backdrop-blur-sm">
              <div className="text-xs font-semibold text-blue-400">01. Leakage Discovery</div>
              <div className="mt-1 text-[11px] text-slate-400">
                Pattern matching & statistical clustering of failures
              </div>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-slate-900/50 p-3.5 backdrop-blur-sm">
              <div className="text-xs font-semibold text-purple-400">02. AI Root Cause</div>
              <div className="mt-1 text-[11px] text-slate-400">
                Context-aware diagnostic reasoning & probability scoring
              </div>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-slate-900/50 p-3.5 backdrop-blur-sm">
              <div className="text-xs font-semibold text-emerald-400">03. Guarded Execution</div>
              <div className="mt-1 text-[11px] text-slate-400">
                Deterministic policy gates (SC-01) with full audit trail
              </div>
            </div>
          </div>

          <button
            onClick={loadDemo}
            disabled={busy}
            className="animate-pulse-soft mt-8 inline-flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600 px-6 py-3.5 text-sm font-semibold text-white shadow-xl shadow-blue-900/40 transition-all hover:scale-[1.02] hover:shadow-blue-800/60 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Generating Synthetic Batch…
              </>
            ) : (
              <>
                <span>✦</span> Load Demo Batch (600 transactions)
              </>
            )}
          </button>

          <div className="mt-4 text-[11px] text-slate-500">
            Generates realistic Razorpay card, UPI, netbanking & wallet events
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen">
      {/* Modern Sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-white/[0.07] bg-slate-950/70 p-4 backdrop-blur-xl lg:flex">
        <Logo />

        <div className="mt-6 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          Navigation
        </div>

        <nav className="mt-2 flex flex-1 flex-col gap-1.5">
          {NAV.map((item) => {
            const active = tab === item.id
            const badgeValue = item.badge?.(detectReport, state)
            return (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`group flex items-center justify-between rounded-xl px-3 py-2.5 text-left transition-all duration-200 ${
                  active
                    ? 'border border-blue-500/30 bg-blue-500/10 text-white shadow-sm shadow-blue-500/10'
                    : 'border border-transparent text-slate-400 hover:border-white/[0.05] hover:bg-slate-900/60 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs transition-colors ${
                      active
                        ? 'bg-blue-500/20 text-blue-300'
                        : 'bg-slate-900 text-slate-400 group-hover:bg-slate-800 group-hover:text-slate-300'
                    }`}
                  >
                    {item.icon}
                  </span>
                  <div className="min-w-0">
                    <span className="block text-xs font-semibold tracking-tight">{item.label}</span>
                    <span className="block truncate text-[10px] text-slate-500">{item.desc}</span>
                  </div>
                </div>

                {badgeValue !== null && badgeValue !== undefined && (
                  <span
                    className={`num ml-2 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      active
                        ? 'bg-blue-500/20 text-blue-300'
                        : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700 group-hover:text-slate-300'
                    }`}
                  >
                    {badgeValue}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        {/* Sidebar System Telemetry Badge */}
        <div className="mt-auto rounded-xl border border-white/[0.07] bg-slate-900/60 p-3 text-[11px] backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-semibold text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              SC-01 Safe Mode
            </div>
            <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-medium text-emerald-400 border border-emerald-500/20">
              Active
            </span>
          </div>
          <p className="mt-1 text-[10px] leading-relaxed text-slate-400">
            Deterministic execution boundary active. No unauthorized mutations.
          </p>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Sticky Header Bar */}
        <header className="sticky top-0 z-20 border-b border-white/[0.07] bg-slate-950/80 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3 px-4 py-3 lg:px-8">
            <div className="lg:hidden">
              <Logo />
            </div>

            {/* Live Telemetry Pill (Desktop) */}
            <div className="hidden items-center gap-3 lg:flex">
              <div className="flex items-center gap-2 rounded-full border border-white/[0.07] bg-slate-900/60 px-3 py-1.5 text-xs text-slate-300 backdrop-blur-md">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                <span className="font-medium text-slate-400">Control Tower:</span>
                <span className="font-semibold text-white">
                  {detectReport
                    ? `${detectReport.failed_count} failed txns · ${inrShort(detectReport.revenue_at_risk_inr)} at risk`
                    : 'System Ready'}
                </span>
              </div>
            </div>

            {/* Header Actions */}
            <div className="flex items-center gap-2.5">
              <button
                onClick={runRecovery}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-emerald-950/50 transition-all duration-200 hover:from-emerald-500 hover:to-teal-500 hover:shadow-emerald-900/60 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busy ? (
                  <>
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    <span>Executing…</span>
                  </>
                ) : (
                  <>
                    <span>▶</span>
                    <span>Run recovery cycle</span>
                  </>
                )}
              </button>

              <button
                onClick={async () => {
                  await api.reset()
                  location.reload()
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700/80 bg-slate-800/40 px-3 py-2 text-xs font-medium text-slate-300 backdrop-blur-sm transition-all hover:border-slate-600 hover:bg-slate-700/50 hover:text-white active:scale-[0.98]"
              >
                <span>↺</span>
                <span>Reset</span>
              </button>
            </div>
          </div>

          {/* Mobile Navigation Tabs */}
          <nav className="flex gap-1.5 overflow-x-auto px-4 pb-2.5 lg:hidden">
            {NAV.map((item) => (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  tab === item.id
                    ? 'border border-blue-500/30 bg-blue-500/15 text-blue-200'
                    : 'border border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="mr-1.5">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>
        </header>

        {/* View Main Content */}
        <main className="flex-1 px-4 py-6 lg:px-8">
          {tab === 'overview' && (
            <OverviewView detectReport={detectReport} goLeakage={() => setTab('leakage')} />
          )}
          {tab === 'leakage' && <LeakageView detectReport={detectReport} />}
          {tab === 'queue' && <QueueView state={state} onRun={runRecovery} />}
          {tab === 'audit' && <AuditView state={state} />}
          {tab === 'analyze' && <AnalyzeView />}
        </main>

        {/* Global Footer */}
        <footer className="border-t border-white/[0.06] bg-slate-950/40 px-4 py-3.5 text-center text-[11px] text-slate-500 backdrop-blur-sm lg:px-8">
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
            <span>RevGuard-AI · Autonomous Revenue Recovery Control Tower</span>
            <span className="hidden sm:inline">·</span>
            <span>Engineered for the Razorpay Payment Gateway Ecosystem</span>
            <span className="hidden sm:inline">·</span>
            <span className="text-emerald-400/90 font-medium">SC-01 Safe Simulation Mode</span>
          </div>
        </footer>
      </div>
    </div>
  )
}

function inrShort(v: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(v)
}

