import { useEffect, useState } from 'react'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { api, inr, pct } from '../api'
import { Card, KpiCard } from '../components/ui'

export default function OverviewView({ detectReport, goLeakage }) {
  const [evaluation, setEvaluation] = useState(null)
  const [dailyFailures, setDailyFailures] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    api.evaluate().then(setEvaluation).catch((e) => setError(String(e)))
    api.transactions('failed')
      .then((txns) => {
        const byDay = {}
        for (const t of txns) {
          const day = t.timestamp.slice(5, 10)
          byDay[day] = (byDay[day] || 0) + 1
        }
        setDailyFailures(Object.entries(byDay).map(([day, n]) => ({ day, n })))
      })
      .catch((e) => setError(String(e)))
  }, [])

  if (!detectReport) return null
  const donut = [
    { name: 'Expected recoverable', value: detectReport.expected_recoverable_inr, fill: '#34d399' },
    { name: 'Unrecoverable / escalated', value: detectReport.unrecoverable_inr, fill: '#475569' },
  ].filter((d) => d.value > 0)

  return (
    <div className="space-y-4">
      {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Revenue at Risk" value={inr(detectReport.revenue_at_risk_inr)}
          sub={`${detectReport.failed_count} failed of ${detectReport.transactions_analyzed} txns`} tone="red" />
        <KpiCard label="Expected Recoverable" value={inr(detectReport.expected_recoverable_inr)}
          sub="detection-time estimate" tone="blue" />
        <KpiCard label="AI Recovered" value={evaluation ? inr(evaluation.ai_strategy.recovered_inr) : '…'}
          sub={evaluation ? `${pct(evaluation.ai_strategy.recovery_rate, 2)} recovery rate` : ''} tone="green" />
        <KpiCard label="Unnecessary Interventions" value={evaluation ? evaluation.ai_strategy.unnecessary_interventions : '…'}
          sub={evaluation ? `baseline: ${evaluation.baseline.unnecessary_interventions}` : ''} tone="amber" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="AI Strategy vs Baseline" className="lg:col-span-2">
          {evaluation ? (
            <>
              <div className="h-44">
                <ResponsiveContainer>
                  <BarChart data={[
                    { name: 'Baseline', recovered: evaluation.baseline.recovered_inr },
                    { name: 'AI Strategy', recovered: evaluation.ai_strategy.recovered_inr },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                    <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v) => inr(v)} contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8 }} />
                    <Bar dataKey="recovered" radius={[6, 6, 0, 0]}>
                      <Cell fill="#475569" /><Cell fill="#34d399" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 flex flex-wrap gap-4 border-t border-slate-800 pt-3 text-xs text-slate-400">
                <span>Uplift: <b className="num text-emerald-400">+{inr(evaluation.uplift.extra_recovered_inr)}</b></span>
                <span>Rate delta: <b className="num text-emerald-400">+{evaluation.uplift.rate_delta.toFixed(2)}pp</b></span>
                <span>Waste avoided: <b className="num text-emerald-400">{evaluation.uplift.avoided_unnecessary_interventions}</b> interventions</span>
                <span>Prevented hopeless actions: <b className="num text-blue-300">{evaluation.ai_strategy.prevented_interventions}</b></span>
              </div>
            </>
          ) : <div className="flex h-44 items-center justify-center text-sm text-slate-500">running evaluation…</div>}
        </Card>

        <Card title="Revenue at Risk Split">
          <div className="h-44">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={donut} dataKey="value" innerRadius={45} outerRadius={70} paddingAngle={3}>
                  {donut.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Pie>
                <Tooltip formatter={(v) => inr(v)} contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5">
            {donut.map((d) => (
              <div key={d.name} className="flex items-center gap-2 text-xs text-slate-400">
                <span className="h-2 w-2 rounded-full" style={{ background: d.fill }} />
                {d.name}<span className="num ml-auto font-medium text-slate-300">{inr(d.value)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Failed Payments — last 7 days">
          <div className="h-40">
            <ResponsiveContainer>
              <AreaChart data={dailyFailures}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="day" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8 }} />
                <Area type="monotone" dataKey="n" stroke="#ef4444" fill="#ef444422" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Top Leakage Clusters"
          right={<button onClick={goLeakage} className="text-xs text-blue-400 hover:text-blue-300">view all →</button>}>
          <div className="space-y-2">
            {detectReport.clusters.slice(0, 4).map((c) => (
              <div key={c.cluster_id} className="flex items-center gap-3 rounded-lg bg-slate-800/40 px-3 py-2">
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${c.severity === 'high' ? 'bg-red-400' : 'bg-amber-400'}`} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-medium text-slate-300">{c.title}</div>
                  <div className="text-[11px] text-slate-500">{c.txn_count} transactions</div>
                </div>
                <span className="num text-xs font-semibold text-red-300">{inr(c.revenue_at_risk_inr)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
