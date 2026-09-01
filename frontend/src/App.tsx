import { useCallback, useEffect, useState } from 'react'
import { api } from './api'
import type { DetectReport, AppState, User, DemoPersona } from './types'
import AuditView from './views/AuditView'
import LeakageView from './views/LeakageView'
import OverviewView from './views/OverviewView'
import QueueView from './views/QueueView'
import AnalyzeView from './views/AnalyzeView'
import B2BView from './views/B2BView'
import LoginView from './views/LoginView'
import LandingView from './views/LandingView'
import BatchSimulatorModal from './components/BatchSimulatorModal'

type TabId = 'overview' | 'leakage' | 'queue' | 'b2b' | 'audit' | 'analyze'

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
    icon: '📊',
    desc: 'Revenue health & recovery rate',
  },
  {
    id: 'leakage',
    label: 'Revenue Leakage',
    icon: '🔍',
    desc: 'Failure pattern clusters',
    badge: (report) => (report?.clusters.length ? report.clusters.length : null),
  },
  {
    id: 'queue',
    label: 'Recovery Queue',
    icon: '⚡',
    desc: 'EV-ranked action worklist',
    badge: (_r, state) => (state?.plan?.queue.length ? state.plan.queue.length : null),
  },
  {
    id: 'b2b',
    label: 'B2B & PTP Tracker',
    icon: '📋',
    desc: 'Corporate aging & PTP chaser',
  },
  {
    id: 'audit',
    label: 'Audit Trail',
    icon: '🛡️',
    desc: 'Consequential decision logs',
    badge: (_r, state) =>
      state?.execution?.audit_trail.length ? state.execution.audit_trail.length : null,
  },
  {
    id: 'analyze',
    label: 'Upload & Analyze',
    icon: '📁',
    desc: 'Custom CSV / Excel audit',
  },
]

function Logo({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-base font-black text-white shadow-md shadow-blue-600/30 border border-blue-400/30">
        🛡️
      </div>
      {!collapsed && (
        <div className="min-w-0 leading-tight">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold text-white tracking-tight">RevGuard</span>
            <span className="rounded bg-blue-500/20 px-1.5 py-0.2 text-[10px] font-semibold text-blue-300 border border-blue-400/30">
              AI
            </span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono">Control Tower</div>
        </div>
      )}
    </div>
  )
}

function ThemeToggle({
  theme,
  setTheme,
}: {
  theme: 'light' | 'dark'
  setTheme: (t: 'light' | 'dark') => void
}) {
  return (
    <div className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100/90 dark:bg-slate-900 p-0.5 shadow-sm">
      <button
        onClick={() => setTheme('light')}
        className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
          theme === 'light'
            ? 'bg-white text-slate-900 shadow-sm'
            : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
        }`}
      >
        <span>☀️</span>
        <span>Light</span>
      </button>
      <button
        onClick={() => setTheme('dark')}
        className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
          theme === 'dark'
            ? 'bg-blue-600 text-white shadow-sm'
            : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
        }`}
      >
        <span>🌙</span>
        <span>Dark</span>
      </button>
    </div>
  )
}

export default function App() {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('revguard_user')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {
        return null
      }
    }
    return null
  })
  const [personas, setPersonas] = useState<DemoPersona[]>([])
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showActionsMenu, setShowActionsMenu] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [tab, setTab] = useState<TabId>('overview')
  const [boot, setBoot] = useState<'checking' | 'empty' | 'ready'>('checking')
  const [detectReport, setDetectReport] = useState<DetectReport | null>(null)
  const [state, setState] = useState<AppState | null>(null)
  const [busy, setBusy] = useState(false)
  const [showWebhookSim, setShowWebhookSim] = useState(false)
  const [showHackathonMatrix, setShowHackathonMatrix] = useState(false)
  const [showBatchSimulator, setShowBatchSimulator] = useState(false)
  const [viewMode, setViewMode] = useState<'landing' | 'app'>('landing')
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('revguard_theme')
    return saved === 'dark' ? 'dark' : 'light'
  })

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('revguard_theme', theme)
  }, [theme])

  useEffect(() => {
    api.authPersonas().then((res) => {
      setPersonas(res.personas)
      // If first-time visitor (no stored session), auto-initialize with CFO persona for zero-friction judge evaluation
      const token = localStorage.getItem('revguard_auth_token')
      if (!token && !user) {
        const cfo = res.personas.find(p => p.key === 'cfo') || res.personas[0]
        if (cfo) {
          api.authLogin('', cfo.key).then((authRes) => {
            localStorage.setItem('revguard_auth_token', authRes.token)
            localStorage.setItem('revguard_user', JSON.stringify(authRes.user))
            setUser(authRes.user)
          }).catch(() => {})
        }
      }
    }).catch(() => {})

    const token = localStorage.getItem('revguard_auth_token')
    if (token) {
      api.authMe().then((u) => {
        setUser(u)
        localStorage.setItem('revguard_user', JSON.stringify(u))
      }).catch(() => {
        localStorage.removeItem('revguard_auth_token')
        localStorage.removeItem('revguard_user')
        setUser(null)
      })
    }
  }, [])

  const handleLogout = async () => {
    try {
      await api.authLogout()
    } catch {}
    localStorage.removeItem('revguard_auth_token')
    localStorage.removeItem('revguard_user')
    setUser(null)
    setShowUserMenu(false)
  }

  const handleSwitchPersona = async (personaKey: string) => {
    setBusy(true)
    try {
      const res = await api.authLogin('', personaKey)
      localStorage.setItem('revguard_auth_token', res.token)
      localStorage.setItem('revguard_user', JSON.stringify(res.user))
      setUser(res.user)
      setShowUserMenu(false)
    } catch (e) {
      console.error(e)
    } finally {
      setBusy(false)
    }
  }

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

  if (!user) {
    return (
      <LoginView
        personas={personas}
        onLoginSuccess={(loggedUser) => {
          setUser(loggedUser)
        }}
      />
    )
  }

  if (boot === 'checking') {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex items-center gap-3 text-xs font-medium text-slate-500 dark:text-slate-400">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600 dark:border-slate-700 dark:border-t-blue-500" />
          <span>Connecting to RevGuard Control Tower…</span>
        </div>
      </div>
    )
  }

  if (boot === 'empty') {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 px-6 py-12">
        <div className="absolute top-6 right-6">
          <ThemeToggle theme={theme} setTheme={setTheme} />
        </div>
        <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-sm dark:shadow-elevated text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-blue-600 text-2xl font-black text-white shadow-sm">
            R
          </div>
          <h1 className="mt-5 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            RevGuard Control Tower
          </h1>
          <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
            Autonomous revenue recovery engine for payment ecosystems. Detects silent failure
            clusters, diagnoses root causes, and executes policy-bounded recovery actions.
          </p>

          <div className="mt-6 grid grid-cols-3 gap-2.5 text-left">
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 p-3">
              <div className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">1. Detection</div>
              <div className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">Pattern clustering</div>
            </div>
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 p-3">
              <div className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">2. AI Diagnosis</div>
              <div className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">Root-cause reasoning</div>
            </div>
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 p-3">
              <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">3. Guarded Action</div>
              <div className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">SC-01 safe execution</div>
            </div>
          </div>

          <button
            onClick={loadDemo}
            disabled={busy}
            className="mt-6 w-full rounded-lg bg-blue-600 py-3 text-xs font-semibold text-white transition-colors hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50"
          >
            {busy ? 'Generating Synthetic Demo Batch…' : 'Load Demo Batch (600 Transactions)'}
          </button>
        </div>
      </div>
    )
  }

  if (viewMode === 'landing') {
    return (
      <>
        <LandingView
          onEnterDashboard={() => setViewMode('app')}
          onOpenSimulator={() => {
            setViewMode('app')
            setShowBatchSimulator(true)
          }}
          onOpenHackathonMatrix={() => {
            setViewMode('app')
            setShowHackathonMatrix(true)
          }}
          theme={theme}
          setTheme={setTheme}
        />
        {showBatchSimulator && (
          <BatchSimulatorModal onClose={() => setShowBatchSimulator(false)} />
        )}
      </>
    )
  }

  const currentNav = NAV.find((n) => n.id === tab)

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-[#08090C] text-slate-900 dark:text-slate-200 transition-colors">
      {/* Sleek Charcoal Black Sidebar matching docs/dashboard.jpg */}
      <aside
        onClick={() => {
          if (!sidebarOpen) setSidebarOpen(true)
        }}
        className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r border-slate-200 dark:border-[#1C202B] bg-slate-50 dark:bg-[#0B0D12] text-slate-700 dark:text-slate-300 transition-all duration-300 ease-in-out lg:flex ${
          sidebarOpen ? 'w-64 p-4' : 'w-20 p-3 cursor-pointer hover:border-slate-300 dark:hover:border-[#252A38]'
        }`}
      >
        {/* Sidebar Header & Toggle */}
        <div className="flex items-center justify-between">
          <div className="text-left">
            <Logo collapsed={!sidebarOpen} />
          </div>
          {sidebarOpen && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setSidebarOpen(false)
              }}
              title="Collapse Sidebar"
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 dark:hover:bg-[#151821] hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              ⇤
            </button>
          )}
        </div>

        {sidebarOpen && (
          <div className="mt-4 mb-1 px-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Navigation
          </div>
        )}

        <nav className="flex flex-1 flex-col gap-1 mt-1">
          {NAV.map((item) => {
            const active = tab === item.id
            const badgeValue = item.badge?.(detectReport, state)
            return (
              <button
                key={item.id}
                onClick={(e) => {
                  e.stopPropagation()
                  setTab(item.id)
                }}
                title={item.label}
                className={`group flex items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs transition-all cursor-pointer ${
                  active
                    ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/25'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/80 dark:hover:bg-[#151821] hover:text-slate-900 dark:hover:text-slate-100'
                } ${!sidebarOpen ? 'justify-center px-2' : ''}`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-sm opacity-90">{item.icon}</span>
                  {sidebarOpen && <span className="truncate">{item.label}</span>}
                </div>

                {sidebarOpen && badgeValue !== null && badgeValue !== undefined && (
                  <span
                    className={`num ml-2 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      active ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-[#1C202B] text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {badgeValue}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        {/* Sidebar Theme Switcher */}
        {sidebarOpen ? (
          <div className="mb-3 flex items-center justify-between rounded-xl border border-slate-200 dark:border-[#1C202B] bg-white dark:bg-[#14171F]/80 p-2 text-xs shadow-xs">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Appearance</span>
            <ThemeToggle theme={theme} setTheme={setTheme} />
          </div>
        ) : (
          <div className="mb-3 flex justify-center">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-lg border border-slate-200 dark:border-[#1C202B] bg-white dark:bg-[#14171F] text-xs cursor-pointer"
              title="Toggle Theme"
            >
              {theme === 'dark' ? '🌙' : '☀️'}
            </button>
          </div>
        )}

        {/* Sidebar User Profile Pill */}
        <div className={`mb-3 flex items-center justify-between rounded-xl border border-slate-200 dark:border-[#1C202B] bg-white dark:bg-[#14171F]/90 ${
          sidebarOpen ? 'p-2.5' : 'p-2 justify-center'
        }`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src={user.avatar_url || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150'}
              alt={user.name}
              className="h-8 w-8 rounded-full object-cover border border-slate-300 dark:border-[#252A38] shrink-0"
            />
            {sidebarOpen && (
              <div className="min-w-0">
                <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">{user.name}</div>
                <div className="text-[10px] text-blue-600 dark:text-blue-400 capitalize font-medium">
                  {user.role.replace('_', ' ')}
                </div>
              </div>
            )}
          </div>
          {sidebarOpen && (
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-[#1C202B] hover:text-rose-400 transition-colors"
            >
              🚪
            </button>
          )}
        </div>

        {/* Sidebar System Telemetry Box */}
        {sidebarOpen && (
          <div className="rounded-xl border border-slate-200 dark:border-[#1C202B] bg-white dark:bg-[#14171F]/90 p-3 text-xs shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                SC-01 Safe Mode
              </div>
              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">Enforced</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              Deterministic policy limits & zero fatigue enforcement.
            </p>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Sticky Header Bar — Clean Navigation Layout */}
        <header className="sticky top-0 z-20 border-b border-slate-200 dark:border-[#1C202B] bg-white/95 dark:bg-[#0E1116]/95 backdrop-blur-xl transition-colors">
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 lg:px-6">
            {/* Left: Sidebar Toggle + Breadcrumb + Status */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="hidden lg:flex items-center justify-center h-8 w-8 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all shadow-sm cursor-pointer"
                title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
              >
                <span className="text-sm">☰</span>
              </button>

              <div className="lg:hidden text-left">
                <Logo collapsed />
              </div>

              {/* Breadcrumb / Title with clickable RevGuard Home Link */}
              <div className="flex items-center gap-2 text-xs">
                <button
                  onClick={() => setViewMode('landing')}
                  className="hover:text-blue-600 dark:hover:text-blue-400 font-bold text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-1.5 group cursor-pointer"
                  title="Return to Landing Page"
                >
                  <span className="text-sm group-hover:scale-110 transition-transform">🛡️</span>
                  <span className="group-hover:underline underline-offset-4 font-bold">RevGuard</span>
                </button>
                <span className="text-slate-300 dark:text-slate-700">/</span>
                <span className="font-semibold text-slate-900 dark:text-white">{currentNav?.label}</span>
              </div>

              {/* Live Telemetry Pill */}
              <div className="hidden md:flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>
                  {detectReport
                    ? `${detectReport.failed_count} at risk (${inrShort(detectReport.revenue_at_risk_inr)})`
                    : 'System Ready'}
                </span>
              </div>
            </div>

            {/* Right: Clean Grouped Actions & Profile */}
            <div className="flex items-center gap-2">
              {/* Quick Actions Dropdown (Shadcn Menubar Style) */}
              <div className="relative">
                <button
                  onClick={() => setShowActionsMenu(!showActionsMenu)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-sm"
                >
                  <span>⚡</span>
                  <span>Tools</span>
                  <span className="text-[10px] text-slate-400">▾</span>
                </button>

                {showActionsMenu && (
                  <div
                    onClick={() => setShowActionsMenu(false)}
                    className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1.5 shadow-2xl z-50 text-xs space-y-1 animate-fade-in"
                  >
                    <button
                      onClick={() => setShowBatchSimulator(true)}
                      className="w-full flex items-center gap-2.5 rounded-lg p-2 text-left hover:bg-blue-50 dark:hover:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-semibold transition-colors"
                    >
                      <span>🚀</span>
                      <div>
                        <div>Live Batch Simulator</div>
                        <div className="text-[10px] text-slate-400 font-normal">A/B Engine with 600 Txns</div>
                      </div>
                    </button>
                    <button
                      onClick={() => setShowHackathonMatrix(true)}
                      className="w-full flex items-center gap-2.5 rounded-lg p-2 text-left hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-semibold transition-colors"
                    >
                      <span>🏆</span>
                      <div>
                        <div>Hackathon Matrix</div>
                        <div className="text-[10px] text-slate-400 font-normal">Scoring & Alignment Spec</div>
                      </div>
                    </button>
                    <button
                      onClick={() => setShowWebhookSim(true)}
                      className="w-full flex items-center gap-2.5 rounded-lg p-2 text-left hover:bg-purple-50 dark:hover:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-semibold transition-colors"
                    >
                      <span>⚡</span>
                      <div>
                        <div>Simulate Webhook</div>
                        <div className="text-[10px] text-slate-400 font-normal">Inject payment.failed event</div>
                      </div>
                    </button>
                    <div className="border-t border-slate-100 dark:border-slate-800 pt-1">
                      <button
                        onClick={async () => {
                          await api.reset()
                          location.reload()
                        }}
                        className="w-full flex items-center gap-2 rounded-lg p-2 text-left text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        <span>↺</span>
                        <span>Reset Demo State</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Prominent Live Batch Simulator Quick Pill */}
              <button
                onClick={() => setShowBatchSimulator(true)}
                className="hidden md:inline-flex items-center gap-1.5 rounded-lg border border-blue-400/30 bg-blue-600/15 hover:bg-blue-600/25 px-3 py-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 transition-all shadow-sm"
              >
                <span>🚀</span>
                <span>Batch Sim</span>
              </button>

              {/* Primary Run Action */}
              <button
                onClick={runRecovery}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 active:bg-blue-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-md shadow-blue-600/20 transition-all disabled:opacity-40"
              >
                {busy ? (
                  <>
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    <span>Running…</span>
                  </>
                ) : (
                  <>
                    <span>▶</span>
                    <span>Run Cycle</span>
                  </>
                )}
              </button>

              {/* Theme Toggle */}
              <ThemeToggle theme={theme} setTheme={setTheme} />

              {/* User Avatar Chip & Persona Switcher */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-1 text-xs hover:bg-slate-100 dark:hover:bg-slate-850 transition-colors"
                >
                  <img
                    src={user.avatar_url || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150'}
                    alt={user.name}
                    className="h-6 w-6 rounded-full object-cover border border-slate-300 dark:border-slate-700 shrink-0"
                  />
                  <span className="hidden md:inline font-semibold text-slate-800 dark:text-slate-200">
                    {user.name.split(' ')[0]}
                  </span>
                  <span className="text-[10px] text-slate-400">▾</span>
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 shadow-2xl z-50 text-xs space-y-2 animate-fade-in">
                    <div className="border-b border-slate-100 dark:border-slate-800 pb-2 px-2">
                      <div className="font-bold text-slate-900 dark:text-white">{user.name}</div>
                      <div className="text-[11px] text-slate-500 truncate">{user.email}</div>
                      <div className="text-[10px] text-blue-500 font-medium mt-0.5">{user.company}</div>
                    </div>

                    <div className="px-2 text-[10px] uppercase font-bold tracking-wider text-slate-400">
                      Switch Persona
                    </div>
                    <div className="space-y-1">
                      {personas.map((p) => (
                        <button
                          key={p.key}
                          onClick={() => handleSwitchPersona(p.key)}
                          className={`w-full flex items-center justify-between rounded-lg p-1.5 text-left transition-colors ${
                            user.email === p.email
                              ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-semibold'
                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <img
                              src={p.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                              alt={p.name}
                              className="h-5 w-5 rounded-full object-cover"
                            />
                            <span>{p.name}</span>
                          </div>
                          <span className="text-[9px] uppercase px-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                            {p.role.replace('_', ' ')}
                          </span>
                        </button>
                      ))}
                    </div>

                    <div className="border-t border-slate-100 dark:border-slate-800 pt-1">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 rounded-lg p-1.5 text-left text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors font-semibold"
                      >
                        <span>🚪</span>
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Mobile Navigation Bar */}
          <nav className="flex gap-1 overflow-x-auto px-4 pb-2.5 lg:hidden border-t border-slate-200 dark:border-slate-800 pt-2">
            {NAV.map((item) => (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`whitespace-nowrap rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                  tab === item.id
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <span className="mr-1">{item.icon}</span>
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
          {tab === 'b2b' && <B2BView />}
          {tab === 'audit' && <AuditView state={state} />}
          {tab === 'analyze' && <AnalyzeView />}
        </main>

        {/* Live Webhook Simulator Modal */}
        {showWebhookSim && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">⚡</span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Live Razorpay Webhook Simulator
                    </h3>
                    <div className="text-[11px] text-slate-500">
                      Inject real-time asynchronous payment events
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setShowWebhookSim(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Select Event Payload to Trigger:
                </div>

                <button
                  onClick={async () => {
                    await api.fireWebhook({
                      event: 'payment.failed',
                      amount_inr: 4500,
                      payment_method: 'upi',
                      error_code: 'UPI_COLLECT_DECLINED',
                    })
                    alert('⚡ Webhook payment.failed (UPI_COLLECT_DECLINED - ₹4,500) received!')
                    setShowWebhookSim(false)
                    refresh()
                  }}
                  className="w-full text-left rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 p-3 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                    <span>🔴 payment.failed</span>
                    <span className="font-mono text-purple-600 dark:text-purple-400">₹4,500</span>
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500">
                    UPI collect request timed out on PhonePe/GPay handle.
                  </div>
                </button>

                <button
                  onClick={async () => {
                    await api.fireWebhook({
                      event: 'payment.failed',
                      amount_inr: 18500,
                      payment_method: 'card',
                      error_code: 'GATEWAY_TIMEOUT',
                    })
                    alert('⚡ Webhook payment.failed (GATEWAY_TIMEOUT - ₹18,500) received!')
                    setShowWebhookSim(false)
                    refresh()
                  }}
                  className="w-full text-left rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 p-3 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                    <span>🟠 payment.failed</span>
                    <span className="font-mono text-purple-600 dark:text-purple-400">₹18,500</span>
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500">
                    HDFC Acquiring switch latency spike on credit card checkout.
                  </div>
                </button>

                <button
                  onClick={async () => {
                    await api.fireWebhook({
                      event: 'payment.captured',
                      amount_inr: 4500,
                      payment_method: 'upi',
                      error_code: 'NONE',
                    })
                    alert('⚡ Webhook payment.captured (₹4,500 settled via 1-Click Link) received!')
                    setShowWebhookSim(false)
                    refresh()
                  }}
                  className="w-full text-left rounded-lg border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-500/[0.04] p-3 hover:bg-emerald-100/60 transition-colors"
                >
                  <div className="flex items-center justify-between font-bold text-emerald-900 dark:text-emerald-300">
                    <span>🟢 payment.captured</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400">₹4,500</span>
                  </div>
                  <div className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">
                    Customer completed recovery payment through generated 1-click Razorpay link!
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Hackathon Alignment Matrix Modal */}
        {showHackathonMatrix && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-xs">
            <div className="w-full max-w-2xl rounded-2xl border border-amber-300/40 dark:border-amber-500/20 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-lg font-bold text-white shadow-sm">
                    🏆
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      AI Revenue Recovery — Hackathon Alignment Matrix
                    </h3>
                    <div className="text-[11px] text-slate-500">
                      100% Coverage of All 7 Directions & "The Bar" · Click Any Item to Launch
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setShowHackathonMatrix(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
                >
                  ✕
                </button>
              </div>

              {/* 8 Alignment Requirement Cards with 1-Click Action Launchers */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
                {/* 1 */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850/50 p-3 flex flex-col justify-between space-y-2">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>1.</span>
                      <span>Payment Degradation → Root Cause → Action</span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                      Statistical clustering of error codes + LLM diagnostic reasoning + EV optimization.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setTab('leakage')
                      setShowHackathonMatrix(false)
                    }}
                    className="self-start rounded bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 px-2.5 py-1 text-[10px] font-bold hover:bg-blue-100 transition-colors"
                  >
                    Launch: Leakage Clusters →
                  </button>
                </div>

                {/* 2 */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850/50 p-3 flex flex-col justify-between space-y-2">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>2.</span>
                      <span>Checkout Drop-Off Recovery</span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                      1-click Razorpay recovery links (rzp.io) & WhatsApp Business outreach studio.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setTab('queue')
                      setShowHackathonMatrix(false)
                    }}
                    className="self-start rounded bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300 px-2.5 py-1 text-[10px] font-bold hover:bg-emerald-100 transition-colors"
                  >
                    Launch: Outreach Studio →
                  </button>
                </div>

                {/* 3 */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850/50 p-3 flex flex-col justify-between space-y-2">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>3.</span>
                      <span>Failed-Subscription Recovery</span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                      Prevents involuntary churn on failed recurring debits before hard cancellation.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setTab('queue')
                      setShowHackathonMatrix(false)
                    }}
                    className="self-start rounded bg-purple-50 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300 px-2.5 py-1 text-[10px] font-bold hover:bg-purple-100 transition-colors"
                  >
                    Launch: Recovery Queue →
                  </button>
                </div>

                {/* 4 */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850/50 p-3 flex flex-col justify-between space-y-2">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>4.</span>
                      <span>B2B Receivables Chaser</span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                      Aging buckets (1–30d to 90+d) & autonomous 4-stage escalating dunning sequencer.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setTab('b2b')
                      setShowHackathonMatrix(false)
                    }}
                    className="self-start rounded bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 px-2.5 py-1 text-[10px] font-bold hover:bg-indigo-100 transition-colors"
                  >
                    Launch: B2B Ledger →
                  </button>
                </div>

                {/* 5 */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850/50 p-3 flex flex-col justify-between space-y-2">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>5.</span>
                      <span>Mandate Retry Sequencer</span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                      UPI AutoPay salary-cycle retry ladder (78% recovery vs 32% blind retry).
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setTab('b2b')
                      setShowHackathonMatrix(false)
                    }}
                    className="self-start rounded bg-cyan-50 dark:bg-cyan-900/40 text-cyan-600 dark:text-cyan-300 px-2.5 py-1 text-[10px] font-bold hover:bg-cyan-100 transition-colors"
                  >
                    Launch: Mandate Sequencer →
                  </button>
                </div>

                {/* 6 */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850/50 p-3 flex flex-col justify-between space-y-2">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>6.</span>
                      <span>Hinglish & English Voice Recovery</span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                      Bilingual AI Voice Call Bot simulator with browser speech synthesis & waveforms.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setTab('queue')
                      setShowHackathonMatrix(false)
                    }}
                    className="self-start rounded bg-rose-50 dark:bg-rose-900/40 text-rose-600 dark:text-rose-300 px-2.5 py-1 text-[10px] font-bold hover:bg-rose-100 transition-colors"
                  >
                    Launch: Voice Call Bot →
                  </button>
                </div>

                {/* 7 */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850/50 p-3 flex flex-col justify-between space-y-2">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>7.</span>
                      <span>Promise-to-Pay (PTP) Tracker</span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                      Corporate commitment state machine, promised dates, amounts, and audit trail.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setTab('b2b')
                      setShowHackathonMatrix(false)
                    }}
                    className="self-start rounded bg-amber-50 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-2.5 py-1 text-[10px] font-bold hover:bg-amber-100 transition-colors"
                  >
                    Launch: PTP Tracker →
                  </button>
                </div>

                {/* 8 */}
                <div className="rounded-xl border border-emerald-300/40 dark:border-emerald-500/20 bg-emerald-50/40 dark:bg-emerald-950/30 p-3 flex flex-col justify-between space-y-2">
                  <div>
                    <div className="font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                      <span>⭐</span>
                      <span>The Bar: Batch Uplift, Stopping Rules, Audit</span>
                    </div>
                    <p className="mt-1 text-[11px] text-emerald-700 dark:text-emerald-400">
                      Measured +₹1.82L uplift on 600 txns, SC-01 safe mode, fatigue caps, and audit trail.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setTab('overview')
                      setShowHackathonMatrix(false)
                    }}
                    className="self-start rounded bg-emerald-600 text-white px-2.5 py-1 text-[10px] font-bold hover:bg-emerald-700 transition-colors"
                  >
                    Launch: Uplift & Certificate →
                  </button>
                </div>
              </div>

              <div className="pt-2 text-right">
                <button
                  onClick={() => setShowHackathonMatrix(false)}
                  className="rounded-lg bg-slate-900 dark:bg-slate-700 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                >
                  Close Matrix
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Live Autonomous Batch Recovery Simulator Modal */}
        {showBatchSimulator && (
          <BatchSimulatorModal
            onClose={() => setShowBatchSimulator(false)}
            onComplete={() => refresh()}
          />
        )}

        {/* Global Footer */}
        <footer className="border-t border-slate-200 dark:border-[#1C202B] bg-white dark:bg-[#08090C] px-4 py-3 text-center text-xs text-slate-500 dark:text-slate-500 lg:px-8 transition-colors">
          <span>RevGuard-AI · Autonomous Revenue Recovery Control Tower</span>
          <span className="mx-2">·</span>
          <span>Razorpay Payments Gateway Ecosystem</span>
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



