import { useEffect, useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { api, inr, pct } from '../api'
import type { DetectReport, Evaluation } from '../types'
import { Card, KpiCard, SeverityBadge } from '../components/ui'

const customTooltipStyle = {
  backgroundColor: 'rgba(11, 15, 25, 0.92)',
  backdropFilter: 'blur(12px)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '14px',
  color: '#f8fafc',
  boxShadow: '0 16px 36px -10px rgba(0, 0, 0, 0.7)',
  fontSize: '12px',
  padding: '10px 14px',
}

const tooltipItemStyle = { color: '#e2e8f0', fontWeight: 500 }
const tooltipLabelStyle = { color: '#94a3b8', fontWeight: 600, marginBottom: '4px' }

export default function OverviewView({
  detectReport,
  goLeakage,
}: {
  detectReport: DetectReport | null
  goLeakage: () => void
}) {
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null)
  const [dailyFailures, setDailyFailures] = useState<{ day: string; n: number }[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.evaluate().then(setEvaluation).catch((e: unknown) => setError(String(e)))
    api
      .transactions('failed')
      .then((txns) => {
        const byDay: Record<string, number> = {}
        for (const t of txns) {
          const day = t.timestamp.slice(5, 10)
          byDay[day] = (byDay[day] || 0) + 1
        }
        setDailyFailures(Object.entries(byDay).map(([day, n]) => ({ day, n })))
      })
      .catch((e: unknown) => setError(String(e)))
  }, [])

  if (!detectReport) return null

  const donut = [
    {
      name: 'Expected recoverable',
      value: detectReport.expected_recoverable_inr,
      fill: '#10b981',
    },
    {
      name: 'Unrecoverable / escalated',
      value: detectReport.unrecoverable_inr,
      fill: '#475569',
    },
  ].filter((d) => d.value > 0)

  const recoveryRate = evaluation ? evaluation.ai_strategy.recovery_rate : 0
  const uplift = evaluation ? evaluation.uplift.extra_recovered_inr : 0
  const recoverableRatio =
    detectReport.revenue_at_risk_inr > 0
      ? detectReport.expected_recoverable_inr / detectReport.revenue_at_risk_inr
      : 0

  return (
    <div className="space-y-6">
      {/* Top Section Header */}
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-white lg:text-2xl">
              Revenue at a Glance
            </h2>
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
              Live Evaluation
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Real-time telemetry, AI strategy uplift vs baseline, and failure leakage clusters
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">
          {error}
        </div>
      )}

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Revenue at Risk"
          value={inr(detectReport.revenue_at_risk_inr)}
          icon="₹"
          tone="red"
          delta={`${detectReport.failed_count} failed`}
          deltaTone="down"
          sub={`of ${detectReport.transactions_analyzed.toLocaleString()} txns`}
        />
        <KpiCard
          label="Expected Recoverable"
          value={inr(detectReport.expected_recoverable_inr)}
          icon="◈"
          tone="blue"
          delta={recoverableRatio > 0 ? `${pct(recoverableRatio, 0)} potential` : undefined}
          deltaTone="up"
          sub="detection-time estimate"
        />
        <KpiCard
          label="AI Recovered"
          value={evaluation ? inr(evaluation.ai_strategy.recovered_inr) : '…'}
          icon="✦"
          tone="green"
          delta={evaluation ? `${pct(recoveryRate, 1)}` : undefined}
          deltaTone="up"
          sub={evaluation ? 'success rate' : ''}
        />
        <KpiCard
          label="Recovery Uplift"
          value={evaluation ? `+${inr(uplift)}` : '…'}
          icon="▲"
          tone="amber"
          delta={evaluation ? `+${evaluation.uplift.rate_delta.toFixed(1)}pp` : undefined}
          deltaTone="up"
          sub={evaluation ? 'vs naïive retry' : ''}
        />
      </div>

      {/* Charts Row 1: Comparison & Donut */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card
          title="AI Strategy vs Baseline Recovery"
          subtitle="Direct comparison of recovered revenue under policy constraints"
          icon="⑂"
          className="lg:col-span-2"
        >
          {evaluation ? (
            <>
              <div className="h-60 pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { name: 'Baseline (Naïve Retry)', recovered: evaluation.baseline.recovered_inr },
                      { name: 'RevGuard AI Strategy', recovered: evaluation.ai_strategy.recovered_inr },
                    ]}
                    barGap={12}
                    margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis
                      dataKey="name"
                      stroke="#64748b"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: '#94a3b8' }}
                    />
                    <YAxis
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v: number) => `₹${(v / 1000).toFixed(0)}k`}
                      tick={{ fill: '#94a3b8' }}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(255, 255, 255, 0.03)' }}
                      formatter={(v: number) => [inr(v), 'Recovered Revenue']}
                      contentStyle={customTooltipStyle}
                      itemStyle={tooltipItemStyle}
                      labelStyle={tooltipLabelStyle}
                    />
                    <Bar
                      dataKey="recovered"
                      name="Recovered"
                      radius={[10, 10, 0, 0]}
                      maxBarSize={80}
                    >
                      <Cell fill="#475569" />
                      <Cell fill="#10b981" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* 4 Metrics Summary Grid */}
              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/[0.07] pt-4 sm:grid-cols-4">
                <MetricChip
                  label="Extra Revenue"
                  value={`+${inr(evaluation.uplift.extra_recovered_inr)}`}
                  tone="text-emerald-400"
                  icon="✦"
                  bg="bg-emerald-500/10 border-emerald-500/20"
                />
                <MetricChip
                  label="Rate Delta"
                  value={`+${evaluation.uplift.rate_delta.toFixed(2)} pp`}
                  tone="text-emerald-400"
                  icon="↑"
                  bg="bg-emerald-500/10 border-emerald-500/20"
                />
                <MetricChip
                  label="Waste Avoided"
                  value={`${evaluation.uplift.avoided_unnecessary_interventions} txns`}
                  tone="text-cyan-300"
                  icon="🛡"
                  bg="bg-cyan-500/10 border-cyan-500/20"
                />
                <MetricChip
                  label="Hopeless Prevented"
                  value={`${evaluation.ai_strategy.prevented_interventions} txns`}
                  tone="text-purple-300"
                  icon="■"
                  bg="bg-purple-500/10 border-purple-500/20"
                />
              </div>
            </>
          ) : (
            <div className="flex h-60 items-center justify-center text-sm text-slate-500">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500/30 border-t-blue-500 mr-2" />
              Running real-time evaluation…
            </div>
          )}
        </Card>

        {/* Donut Chart Card */}
        <Card
          title="Revenue at Risk Split"
          subtitle="Recoverable potential vs unrecoverable"
          icon="◐"
        >
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donut}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={56}
                  outerRadius={84}
                  paddingAngle={4}
                  stroke="none"
                >
                  {donut.map((d, i) => (
                    <Cell key={i} fill={d.fill} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: number) => inr(v)}
                  contentStyle={customTooltipStyle}
                  itemStyle={tooltipItemStyle}
                  labelStyle={tooltipLabelStyle}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-2 space-y-2 border-t border-white/[0.06] pt-3">
            {donut.map((d) => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-slate-300">
                  <span
                    className="h-2.5 w-2.5 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                    style={{ background: d.fill }}
                  />
                  <span>{d.name}</span>
                </div>
                <span className="num font-semibold text-white">{inr(d.value)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Charts Row 2: Trend & Top Clusters */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Failure Trend Chart */}
        <Card
          title="Failed Payments — Last 7 Days"
          subtitle="Daily transaction failure incidence"
          icon="☍"
        >
          <div className="h-56 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyFailures} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="failGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis
                  dataKey="day"
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#94a3b8' }}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                  tick={{ fill: '#94a3b8' }}
                />
                <Tooltip
                  contentStyle={customTooltipStyle}
                  itemStyle={tooltipItemStyle}
                  labelStyle={tooltipLabelStyle}
                  formatter={(v: number) => [`${v} failures`, 'Volume']}
                />
                <Area
                  type="monotone"
                  dataKey="n"
                  name="Failures"
                  stroke="#f43f5e"
                  strokeWidth={2.5}
                  fill="url(#failGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Top Clusters Ranking Card */}
        <Card
          title="Top Leakage Clusters"
          subtitle="Ranked by total revenue at risk"
          icon="⚡"
          right={
            <button
              onClick={goLeakage}
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-400 transition-colors hover:text-blue-300"
            >
              <span>View all clusters</span>
              <span>→</span>
            </button>
          }
        >
          <div className="space-y-2.5">
            {detectReport.clusters.slice(0, 4).map((c, i) => (
              <div
                key={c.cluster_id}
                onClick={goLeakage}
                className="group flex cursor-pointer items-center gap-3.5 rounded-xl border border-white/[0.05] bg-slate-900/40 p-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-700 hover:bg-slate-800/60"
              >
                <span className="num flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-xs font-bold text-slate-300 shadow-inner group-hover:bg-blue-500/20 group-hover:text-blue-300">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-xs font-semibold text-slate-100 group-hover:text-blue-300">
                      {c.title}
                    </span>
                    <SeverityBadge severity={c.severity} />
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-400">
                    <span className="num">{c.txn_count} transactions</span>
                    <span>·</span>
                    <span className="uppercase text-slate-500">{c.payment_methods.join(', ')}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="num block text-xs font-bold text-rose-300">
                    {inr(c.revenue_at_risk_inr)}
                  </span>
                  <span className="text-[10px] text-slate-500">at risk</span>
                </div>
              </div>
            ))}
            {detectReport.clusters.length === 0 && (
              <div className="py-8 text-center text-sm text-slate-500">
                No active leakage clusters detected
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Proactive Action Insight Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-blue-500/30 bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-emerald-950/20 p-5 shadow-xl shadow-black/30 backdrop-blur-md">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-400/30 bg-blue-500/20 text-lg text-blue-300 shadow-md shadow-blue-900/30">
              ✦
            </div>
            <div>
              <h4 className="text-sm font-bold tracking-tight text-white">
                AI Diagnostic Engine Ready
              </h4>
              <p className="mt-0.5 text-xs text-slate-300">
                Identified <span className="font-semibold text-white">{detectReport.clusters.length} active leakage clusters</span> with{' '}
                <span className="font-semibold text-emerald-400">{inr(detectReport.expected_recoverable_inr)}</span> recoverable under SC-01 safe-mode guardrails.
              </p>
            </div>
          </div>
          <button
            onClick={goLeakage}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-blue-900/40 transition-all hover:bg-blue-500 active:scale-[0.98]"
          >
            Explore Leakage Clusters →
          </button>
        </div>
      </div>
    </div>
  )
}

function MetricChip({
  label,
  value,
  tone,
  icon,
  bg,
}: {
  label: string
  value: string
  tone: string
  icon?: string
  bg: string
}) {
  return (
    <div className={`rounded-xl border p-2.5 backdrop-blur-sm ${bg}`}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
          {label}
        </span>
        {icon && <span className="text-[10px] text-slate-500">{icon}</span>}
      </div>
      <div className={`num mt-1 text-xs font-bold tracking-tight ${tone}`}>{value}</div>
    </div>
  )
}

