import { useState } from 'react'
import { inr } from '../api'

interface LandingViewProps {
  onEnterDashboard: () => void
  onOpenSimulator: () => void
  onOpenHackathonMatrix: () => void
  theme: 'light' | 'dark'
  setTheme: (t: 'light' | 'dark') => void
}

function ThemeToggle({
  theme,
  setTheme,
}: {
  theme: 'light' | 'dark'
  setTheme: (t: 'light' | 'dark') => void
}) {
  return (
    <div className="inline-flex items-center rounded-full border border-slate-200 dark:border-slate-800 bg-slate-100/90 dark:bg-slate-900 p-0.5 shadow-sm">
      <button
        onClick={() => setTheme('light')}
        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
          theme === 'light'
            ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
            : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
        }`}
      >
        <span>☀️</span>
        <span className="hidden sm:inline">Light</span>
      </button>
      <button
        onClick={() => setTheme('dark')}
        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
          theme === 'dark'
            ? 'bg-blue-600 text-white shadow-sm'
            : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
        }`}
      >
        <span>🌙</span>
        <span className="hidden sm:inline">Dark</span>
      </button>
    </div>
  )
}

export default function LandingView({
  onEnterDashboard,
  onOpenSimulator,
  onOpenHackathonMatrix,
  theme,
  setTheme,
}: LandingViewProps) {
  // Interactive ROI Calculator State
  const [monthlyVolume, setMonthlyVolume] = useState<number>(25000000) // ₹2.5 Crores
  const [failureRate, setFailureRate] = useState<number>(12) // 12% failure
  const [aov, setAov] = useState<number>(4500) // ₹4,500 average order value

  // Calculated Metrics
  const grossAtRisk = monthlyVolume * (failureRate / 100)
  const estimatedRecovered = grossAtRisk * 0.286 // ~28.6% recovery rate
  const counterfactualUplift = grossAtRisk * 0.082 // +8.2% uplift vs naive retry
  const annualUplift = counterfactualUplift * 12

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#07090e] dark:text-slate-100 font-sans selection:bg-blue-600 selection:text-white overflow-x-hidden transition-colors duration-200">
      {/* Dynamic Background Glows */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[550px] bg-gradient-to-b from-blue-600/15 via-indigo-600/5 to-transparent rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="fixed top-[600px] right-10 w-[500px] h-[400px] bg-emerald-600/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="fixed bottom-10 left-10 w-[600px] h-[500px] bg-purple-600/10 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* ── 1. Top Navbar (Ramp Style) ─────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-slate-200/80 dark:border-white/[0.06] bg-white/80 dark:bg-[#07090e]/80 backdrop-blur-xl transition-colors">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-lg font-bold text-white shadow-lg shadow-blue-500/20 border border-blue-400/30">
              🛡️
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white">RevGuard</span>
                <span className="rounded bg-blue-500/20 px-1.5 py-0.5 text-[10px] font-bold text-blue-600 dark:text-blue-300 border border-blue-400/30">
                  AI
                </span>
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">Revenue Recovery Control Tower</div>
            </div>
          </div>

          {/* Center Links */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-medium text-slate-600 dark:text-slate-300">
            <a href="#features" className="hover:text-slate-900 dark:hover:text-white transition-colors">Capabilities</a>
            <a href="#calculator" className="hover:text-slate-900 dark:hover:text-white transition-colors">ROI Calculator</a>
            <button
              onClick={onEnterDashboard}
              className="hover:text-blue-700 dark:hover:text-white transition-colors flex items-center gap-1.5 font-bold text-blue-600 dark:text-blue-400"
            >
              <span>Control Tower</span>
              <span className="text-[10px] rounded-full bg-blue-500/20 px-2 py-0.5 border border-blue-400/30 text-blue-700 dark:text-blue-300 font-mono">LIVE</span>
            </button>
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            <ThemeToggle theme={theme} setTheme={setTheme} />

            <button
              onClick={onOpenHackathonMatrix}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 transition-all"
            >
              <span>🏆</span>
              <span>Hackathon Matrix</span>
            </button>

            <button
              onClick={onEnterDashboard}
              className="inline-flex items-center gap-2 rounded-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-blue-600/30 transition-all hover:scale-[1.02]"
            >
              <span>Open Control Tower</span>
              <span>→</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── 2. Hero Section ────────────────────────────────────────── */}
      <section className="relative pt-20 pb-16 px-6 text-center max-w-5xl mx-auto space-y-8">
        {/* Pill Tag */}
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-50 dark:bg-blue-500/10 px-4 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 backdrop-blur-md shadow-inner">
          <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
          <span>Autonomous AI Revenue Recovery · Native Razorpay & UPI 2.0 Integration</span>
        </div>

        {/* Hero Title */}
        <div className="space-y-4">
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.1]">
            Find revenue that's slipping away. <br />
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600 dark:from-blue-400 dark:via-indigo-300 dark:to-emerald-400 bg-clip-text text-transparent">
              And win it back automatically.
            </span>
          </h1>
          <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
            Revenue loss rarely happens in one clean step. RevGuard-AI continuously detects payment switch
            degradation, checkout drop-offs, and overdue B2B receivables — executing bounded, mathematically optimal recovery workflows in real-time.
          </p>
        </div>

        {/* Hero CTAs */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <button
            onClick={onEnterDashboard}
            className="flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 px-6 py-3.5 text-sm font-bold text-white shadow-xl shadow-blue-600/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>🚀 Launch Live Control Tower</span>
            <span>→</span>
          </button>

          <button
            onClick={onOpenSimulator}
            className="flex items-center gap-2 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 px-5 py-3.5 text-sm font-semibold text-slate-800 dark:text-slate-200 transition-all shadow-sm"
          >
            <span>⚡ Run 600-Txn Batch Sim</span>
          </button>
        </div>

        {/* Trust Badges */}
        <div className="pt-4 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 dark:text-slate-400 font-mono">
          <span className="flex items-center gap-1.5">
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓</span> +18.4% Measured Counterfactual Uplift
          </span>
          <span>·</span>
          <span className="flex items-center gap-1.5">
            <span className="text-blue-600 dark:text-blue-400 font-bold">🛡️</span> Rule SC-01 Zero-Fatigue Guard
          </span>
          <span>·</span>
          <span className="flex items-center gap-1.5">
            <span className="text-purple-600 dark:text-purple-400 font-bold">🎙️</span> 2-Way Voice (STT + TTS)
          </span>
        </div>
      </section>

      {/* ── 3. Interactive Hero Dashboard Showcase (docs/dashboard.jpg style) ── */}
      <section id="demo-preview" className="px-4 sm:px-6 py-8 max-w-6xl mx-auto">
        <div className="relative rounded-3xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#0c1017]/95 p-4 sm:p-6 shadow-2xl backdrop-blur-2xl space-y-6">
          {/* Mockup Topbar */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 dark:border-white/[0.06] pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-black text-white shadow-sm">
                R
              </div>
              <span className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">RevGuard Control Tower</span>
            </div>

            {/* Fake Search Pill */}
            <div className="hidden md:flex items-center gap-2 rounded-full border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-4 py-1.5 text-xs text-slate-500 dark:text-slate-400 w-72">
              <span>🔍</span>
              <span>Ask RevGuard AI diagnostics…</span>
            </div>

            {/* Status & Persona */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Ingestion Active
              </div>
              <div className="flex items-center gap-2 rounded-full border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-2.5 py-1 text-xs text-slate-700 dark:text-slate-300">
                <img
                  src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150"
                  alt="CFO"
                  className="h-5 w-5 rounded-full object-cover"
                />
                <span className="font-semibold text-xs">Priya Sharma (CFO)</span>
              </div>
            </div>
          </div>

          {/* Hero Metrics Row (Inspired by docs/dashboard.jpg) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left Big Holding Card */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-gradient-to-br dark:from-[#121824] dark:via-[#0d121c] dark:to-[#07090e] p-6 space-y-3 relative overflow-hidden shadow-sm">
              <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
                <span className="font-semibold uppercase tracking-wider text-[11px]">
                  Total Revenue Recovered
                </span>
                <span className="pill-button bg-slate-200/80 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[10px]">
                  Batch 600 txns
                </span>
              </div>
              <div className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
                ₹19,62,450
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                  +18.4% Uplift
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">(+₹1.82L vs Blind Retry)</span>
              </div>
            </div>

            {/* Right Mini Stream Cards */}
            <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-850/90 p-3.5 space-y-1.5 shadow-sm dark:shadow-md backdrop-blur-md">
                <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">UPI 2.0 Failover</div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">₹3,84,000</div>
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">68 re-routed</div>
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-850/90 p-3.5 space-y-1.5 shadow-sm dark:shadow-md backdrop-blur-md">
                <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Voice Bot (PTP)</div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">₹2,45,000</div>
                <div className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">82% Intent Confirmed</div>
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-850/90 p-3.5 space-y-1.5 shadow-sm dark:shadow-md backdrop-blur-md">
                <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Mandate Ladder</div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">₹8,12,000</div>
                <div className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold">Stage 2 Liquidity</div>
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-850/90 p-3.5 space-y-1.5 shadow-sm dark:shadow-md backdrop-blur-md">
                <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">SC-01 Blocked</div>
                <div className="text-sm font-bold text-rose-600 dark:text-rose-400">42 Stopped</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">0 Fatigue Violations</div>
              </div>
            </div>
          </div>

          {/* Performance Area Chart Preview */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0d121c] p-5 space-y-3 shadow-inner">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Recovery Trajectory vs. Naïve Baseline</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Measured money recovered across time under deterministic policy bounds</p>
              </div>
              <div className="flex items-center gap-1 rounded-full border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 p-1 text-[10px] font-semibold">
                <span className="px-2 py-0.5 text-slate-500 dark:text-slate-400">1D</span>
                <span className="px-2 py-0.5 text-slate-500 dark:text-slate-400">1W</span>
                <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white shadow">1M</span>
                <span className="px-2 py-0.5 text-slate-500 dark:text-slate-400">6M</span>
                <span className="px-2 py-0.5 text-slate-500 dark:text-slate-400">ALL</span>
              </div>
            </div>

            {/* Custom SVG Line Chart Graphic */}
            <div className="h-40 w-full pt-3">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 800 150">
                <defs>
                  <linearGradient id="heroGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                {/* Baseline Area */}
                <path
                  d="M0,130 Q200,110 400,100 T800,85 L800,150 L0,150 Z"
                  fill="rgba(148, 163, 184, 0.08)"
                />
                <path
                  d="M0,130 Q200,110 400,100 T800,85"
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                />
                {/* RevGuard AI Recovery Curve */}
                <path
                  d="M0,140 Q150,90 300,50 T600,25 T800,15 L800,150 L0,150 Z"
                  fill="url(#heroGradient)"
                />
                <path
                  d="M0,140 Q150,90 300,50 T600,25 T800,15"
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="3"
                />
                {/* Floating Tooltip Callout */}
                <circle cx="600" cy="25" r="5" fill="#2563eb" className="animate-ping" />
                <circle cx="600" cy="25" r="4" fill="#ffffff" stroke="#2563eb" strokeWidth="2" />
              </svg>
            </div>

            <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 pt-1 border-t border-slate-200 dark:border-white/[0.04]">
              <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-semibold">
                <span className="h-2 w-2 rounded-full bg-blue-500" /> RevGuard-AI Strategy (₹19.62L)
              </span>
              <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                <span className="h-2 w-2 rounded-full bg-slate-400" /> Naïve Retry Baseline (₹17.80L)
              </span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">Net Uplift: +₹1,82,450 (+18.4%)</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. Interactive Live ROI Calculator ─────────────────────── */}
      <section id="calculator" className="px-6 py-16 max-w-5xl mx-auto space-y-10">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 px-3.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 font-mono">
            Interactive Recovery Estimator
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
            Calculate Your Revenue Won Back
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
            Input your monthly transaction volume and failure rates to see how much revenue RevGuard-AI rescues automatically.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-xl dark:shadow-2xl grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sliders (Left Column) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Slider 1: Monthly Volume */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Monthly Processing Volume</span>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-sm">{inr(monthlyVolume)}</span>
              </div>
              <input
                type="range"
                min={1000000}
                max={100000000}
                step={1000000}
                value={monthlyVolume}
                onChange={(e) => setMonthlyVolume(Number(e.target.value))}
                className="w-full accent-blue-600 bg-slate-200 dark:bg-slate-800 h-2 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                <span>₹10 Lakhs</span>
                <span>₹5 Crores</span>
                <span>₹10 Crores</span>
              </div>
            </div>

            {/* Slider 2: Failure Rate */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Average Payment Failure Rate</span>
                <span className="font-mono font-bold text-rose-600 dark:text-rose-400 text-sm">{failureRate}%</span>
              </div>
              <input
                type="range"
                min={4}
                max={30}
                step={1}
                value={failureRate}
                onChange={(e) => setFailureRate(Number(e.target.value))}
                className="w-full accent-rose-500 bg-slate-200 dark:bg-slate-800 h-2 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                <span>4% (Low)</span>
                <span>15% (Industry Avg)</span>
                <span>30% (High Volatility)</span>
              </div>
            </div>

            {/* Slider 3: Average Order Value */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Average Order Value (AOV)</span>
                <span className="font-mono font-bold text-purple-600 dark:text-purple-400 text-sm">{inr(aov)}</span>
              </div>
              <input
                type="range"
                min={500}
                max={50000}
                step={500}
                value={aov}
                onChange={(e) => setAov(Number(e.target.value))}
                className="w-full accent-purple-500 bg-slate-200 dark:bg-slate-800 h-2 rounded-lg cursor-pointer"
              />
            </div>
          </div>

          {/* Output Card (Right Column) */}
          <div className="lg:col-span-5 rounded-2xl border border-emerald-500/30 bg-emerald-50/80 dark:border-emerald-500/20 dark:bg-emerald-950/30 p-6 flex flex-col justify-between space-y-4 shadow-inner">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
                Estimated Net Annual Uplift
              </div>
              <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mt-1 font-mono">
                +{inr(annualUplift)}
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                Pure incremental cash recovered over standard naïve retry attempts.
              </p>
            </div>

            <div className="space-y-2.5 border-t border-emerald-500/20 pt-4 text-xs font-mono">
              <div className="flex justify-between text-slate-700 dark:text-slate-300">
                <span>Gross Monthly at Risk:</span>
                <span className="text-rose-600 dark:text-rose-400 font-bold">{inr(grossAtRisk)}</span>
              </div>
              <div className="flex justify-between text-slate-700 dark:text-slate-300">
                <span>Monthly Won Back:</span>
                <span className="text-emerald-700 dark:text-emerald-400 font-bold">{inr(estimatedRecovered)}</span>
              </div>
              <div className="flex justify-between text-slate-700 dark:text-slate-300">
                <span>Wasted Gateway Fees Saved:</span>
                <span className="text-blue-600 dark:text-blue-400 font-bold">-81.6%</span>
              </div>
            </div>

            <button
              onClick={onEnterDashboard}
              className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 py-3 text-xs font-bold text-white transition-all shadow-lg shadow-emerald-600/25"
            >
              Start Recovering This Revenue →
            </button>
          </div>
        </div>
      </section>

      {/* ── 5. Bento Grid Feature Capabilities (Ramp Style) ───────── */}
      <section id="features" className="px-6 py-16 max-w-6xl mx-auto space-y-12">
        <div className="text-center space-y-3">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
            Engineered for Modern Payment Rails
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
            From acquiring switch latency spikes to enterprise aging invoices — RevGuard closes the loop.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Bento 1: 2-Way Voice Bot */}
          <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/95 p-6 space-y-4 shadow-sm hover:shadow-md dark:shadow-2xl dark:shadow-black/50 hover:border-blue-500/40 dark:hover:border-blue-500/50 transition-all backdrop-blur-xl group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-xl text-blue-600 dark:text-blue-400 border border-blue-500/20">
              🎙️
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">2-Way Bilingual Voice AI</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Integrated real-time Speech-to-Text (<code className="text-[11px] font-mono text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded border border-blue-200/60 dark:border-blue-800/60">webkitSpeechRecognition</code>) supporting <b className="text-slate-900 dark:text-white font-semibold">English</b> &amp; <b className="text-slate-900 dark:text-white font-semibold">Hinglish</b>. Voice commitments automatically register active Promise-to-Pay (PTP) records.
            </p>
          </div>

          {/* Bento 2: Bank Switch Health Radar */}
          <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/95 p-6 space-y-4 shadow-sm hover:shadow-md dark:shadow-2xl dark:shadow-black/50 hover:border-emerald-500/40 dark:hover:border-emerald-500/50 transition-all backdrop-blur-xl group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-xl text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              🚦
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Acquiring Switch Failover (SC-02)</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Real-time latency telemetry across HDFC UPI, ICICI Cards, SBI, and Axis. Autonomously re-routes checkouts to healthy UPI collect rails during transient bank switch degradation.
            </p>
          </div>

          {/* Bento 3: Live Batch Simulator */}
          <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/95 p-6 space-y-4 shadow-sm hover:shadow-md dark:shadow-2xl dark:shadow-black/50 hover:border-purple-500/40 dark:hover:border-purple-500/50 transition-all backdrop-blur-xl group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-xl text-purple-600 dark:text-purple-400 border border-purple-500/20">
              🚀
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Autonomous Batch Simulator</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              High-speed execution engine running 600 transactions with speed controls (1x, 5x, 10x Turbo) and real-time ticking counters of gross revenue recovered and fee savings.
            </p>
          </div>

          {/* Bento 4: Slack CFO Escalation Bridge */}
          <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/95 p-6 space-y-4 shadow-sm hover:shadow-md dark:shadow-2xl dark:shadow-black/50 hover:border-amber-500/40 dark:hover:border-amber-500/50 transition-all backdrop-blur-xl group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-xl text-amber-600 dark:text-amber-400 border border-amber-500/20">
              💬
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Slack / Teams CFO Bridge</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Interactive Slack cards for high-ticket transactions (&gt;₹25k) and critical B2B invoices with 1-click approvals, safe mode blocks, and audit trail generation.
            </p>
          </div>

          {/* Bento 5: B2B Aging & PTP Tracker */}
          <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/95 p-6 space-y-4 shadow-sm hover:shadow-md dark:shadow-2xl dark:shadow-black/50 hover:border-indigo-500/40 dark:hover:border-indigo-500/50 transition-all backdrop-blur-xl group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-xl text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              📋
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">B2B Receivables & PTP Ledger</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              4-tier aging buckets (<span className="text-slate-900 dark:text-white font-semibold">1–30d</span>, <span className="text-slate-900 dark:text-white font-semibold">31–60d</span>, <span className="text-slate-900 dark:text-white font-semibold">61–90d</span>, <span className="text-slate-900 dark:text-white font-semibold">90+d</span>) with automated escalating dunning and customer Promise-to-Pay state machine verification.
            </p>
          </div>

          {/* Bento 6: Margin-Bounded Dynamic Yield */}
          <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/95 p-6 space-y-4 shadow-sm hover:shadow-md dark:shadow-2xl dark:shadow-black/50 hover:border-cyan-500/40 dark:hover:border-cyan-500/50 transition-all backdrop-blur-xl group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-xl text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
              ⚡
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Dynamic Incentive EV Optimizer</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Calculates dynamic checkout incentives (instant cashback / discounts) bounded strictly by merchant gross margin constraints to maximize Expected Value (<span className="font-mono text-cyan-600 dark:text-cyan-400 font-semibold">EV</span>).
            </p>
          </div>
        </div>
      </section>

      {/* ── 6. Footer CTA ─────────────────────────────────────────── */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1017] py-12 px-6 transition-colors">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
          <div className="space-y-1">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <span className="text-base font-bold text-slate-900 dark:text-white">RevGuard·AI</span>
              <span className="rounded bg-blue-500/20 px-1.5 py-0.5 text-[9px] font-bold text-blue-600 dark:text-blue-300">
                Enterprise
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Autonomous Revenue Recovery Control Tower · Built for the Razorpay Buildathon
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onEnterDashboard}
              className="rounded-full bg-blue-600 hover:bg-blue-500 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-600/30 transition-all"
            >
              Launch Control Tower →
            </button>
          </div>
        </div>
      </footer>
    </div>
  )
}
