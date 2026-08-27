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
  backgroundColor: '#111622',
  border: '1px solid #1f2638',
  borderRadius: '8px',
  color: '#f8fafc',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
  fontSize: '12px',
  padding: '8px 12px',
}

const tooltipItemStyle = { color: '#e2e8f0', fontWeight: 500 }
const tooltipLabelStyle = { color: '#94a3b8', fontWeight: 600, marginBottom: '2px' }

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
      fill: '#334155',
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
          <h2 className="text-lg font-bold tracking-tight text-white">
            Revenue Recovery Overview
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Real-time leakage detection, AI recovery uplift, and failure clusters
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-md border border-slate-800 bg-slate-900 px-2.5 py-1 text-xs text-slate-400">
            Active Batch: <b className="text-slate-200">{detectReport.transactions_analyzed} txns</b>
          </span>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
          {error}
        </div>
      )}

      {/* KPI Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Revenue at Risk"
          value={inr(detectReport.revenue_at_risk_inr)}
          icon="₹"
          tone="red"
          delta={`${detectReport.failed_count} failed`}
          deltaTone="down"
          sub={`of ${detectReport.transactions_analyzed} transactions`}
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
          icon="✓"
          tone="green"
          delta={evaluation ? `${pct(recoveryRate, 1)}` : undefined}
          deltaTone="up"
          sub={evaluation ? 'autonomous recovery rate' : ''}
        />
        <KpiCard
          label="Recovery Uplift"
          value={evaluation ? `+${inr(uplift)}` : '…'}
          icon="↑"
          tone="amber"
          delta={evaluation ? `+${evaluation.uplift.rate_delta.toFixed(1)}pp` : undefined}
          deltaTone="up"
          sub={evaluation ? 'vs naïive retry baseline' : ''}
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card
          title="AI Strategy vs Baseline Recovery"
          subtitle="Recovered revenue under deterministic policy limits"
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
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2638" vertical={false} />
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
                      radius={[6, 6, 0, 0]}
                      maxBarSize={70}
                    >
                      <Cell fill="#334155" />
                      <Cell fill="#2563eb" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* 4 Metric Summary Row */}
              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-800 pt-4 sm:grid-cols-4">
                <div className="rounded-lg border border-slate-800 bg-slate-850 p-2.5">
                  <div className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                    Net Uplift
                  </div>
                  <div className="num mt-1 text-xs font-bold text-emerald-400">
                    +{inr(evaluation.uplift.extra_recovered_inr)}
                  </div>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-850 p-2.5">
                  <div className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                    Rate Delta
                  </div>
                  <div className="num mt-1 text-xs font-bold text-emerald-400">
                    +{evaluation.uplift.rate_delta.toFixed(2)} pp
                  </div>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-850 p-2.5">
                  <div className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                    Waste Avoided
                  </div>
                  <div className="num mt-1 text-xs font-bold text-blue-400">
                    {evaluation.uplift.avoided_unnecessary_interventions} txns
                  </div>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-850 p-2.5">
                  <div className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                    Hopeless Stopped
                  </div>
                  <div className="num mt-1 text-xs font-bold text-slate-300">
                    {evaluation.ai_strategy.prevented_interventions} txns
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex h-60 items-center justify-center text-xs text-slate-500">
              Running evaluation…
            </div>
          )}
        </Card>

        {/* Donut Chart Card */}
        <Card
          title="Revenue at Risk Split"
          subtitle="Recoverable vs unrecoverable breakdown"
        >
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donut}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={52}
                  outerRadius={78}
                  paddingAngle={3}
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

          <div className="mt-2 space-y-2 border-t border-slate-800 pt-3">
            {donut.map((d) => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-slate-300">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.fill }} />
                  <span>{d.name}</span>
                </div>
                <span className="num font-semibold text-white">{inr(d.value)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Failure Trend Area Chart */}
        <Card
          title="Failed Payments — Last 7 Days"
          subtitle="Daily transaction failure incidence"
        >
          <div className="h-52 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyFailures} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="failGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2638" vertical={false} />
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
                  strokeWidth={2}
                  fill="url(#failGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Top Clusters Ranking Card */}
        <Card
          title="Top Leakage Clusters"
          subtitle="Highest revenue opportunity ranked"
          right={
            <button
              onClick={goLeakage}
              className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors"
            >
              View all clusters →
            </button>
          }
        >
          <div className="space-y-2">
            {detectReport.clusters.slice(0, 4).map((c, i) => (
              <div
                key={c.cluster_id}
                onClick={goLeakage}
                className="group flex cursor-pointer items-center gap-3 rounded-lg border border-slate-800 bg-slate-850/50 p-2.5 transition-colors hover:border-slate-700 hover:bg-slate-850"
              >
                <span className="num flex h-7 w-7 shrink-0 items-center justify-center rounded bg-slate-800 text-xs font-bold text-slate-300">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-xs font-medium text-slate-200 group-hover:text-blue-400">
                      {c.title}
                    </span>
                    <SeverityBadge severity={c.severity} />
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-500">
                    <span className="num">{c.txn_count} txns</span>
                    <span>·</span>
                    <span className="uppercase">{c.payment_methods.join(', ')}</span>
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
              <div className="py-6 text-center text-xs text-slate-500">
                No active leakage clusters detected
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}


