import { useMemo, useState } from 'react'
import { api, inr } from '../api'
import { ActionPill, Card, ConfidenceBar } from '../components/ui'

export default function QueueView({ state, onRun }) {
  const [approving, setApproving] = useState(false)
  const plan = state?.plan
  const execution = state?.execution

  const pendingApprovals = useMemo(
    () => (plan?.escalations || []).filter((d) => d.requires_approval && d.action !== 'ESCALATE_HUMAN'),
    [plan],
  )

  if (!plan) return <Card title="Recovery Queue"><div className="py-8 text-center text-sm text-slate-500">Run a recovery cycle first (Overview → Run Recovery)</div></Card>

  async function approveAll() {
    setApproving(true)
    try {
      const ids = pendingApprovals.map((d) => d.transaction_id)
      await api.run(ids)
      onRun?.()
    } catch (e) {
      console.error('approveAll failed:', e)
    } finally {
      setApproving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card><div className="text-[11px] uppercase tracking-wider text-slate-500">Queued</div>
          <div className="num mt-1 text-xl font-semibold text-blue-300">{plan.queue.length}</div></Card>
        <Card><div className="text-[11px] uppercase tracking-wider text-slate-500">Expected Recovery</div>
          <div className="num mt-1 text-xl font-semibold text-emerald-300">{inr(plan.total_expected_recovery_inr)}</div></Card>
        <Card><div className="text-[11px] uppercase tracking-wider text-slate-500">Escalations / Approvals</div>
          <div className="num mt-1 text-xl font-semibold text-amber-300">{plan.escalations.length}</div></Card>
        <Card><div className="text-[11px] uppercase tracking-wider text-slate-500">Stopped (hopeless)</div>
          <div className="num mt-1 text-xl font-semibold text-slate-400">{plan.stops.length}</div></Card>
      </div>

      {execution && (
        <Card title="Last Execution Outcome">
          <div className="flex flex-wrap gap-3 text-xs">
            <span className="rounded-lg bg-emerald-500/10 px-3 py-1.5 text-emerald-300">
              Recovered <b className="num">{inr(execution.recovered_inr ?? 0)}</b>
            </span>
            {Object.entries(execution.outcome_counts || {}).map(([k, v]) => (
              <span key={k} className="rounded-lg bg-slate-800/60 px-3 py-1.5 text-slate-300 capitalize">
                {k.replace(/_/g, ' ')}: <b className="num">{v}</b>
              </span>
            ))}
            <span className="ml-auto text-slate-500">audit events: <b className="num">{execution.audit_trail.length}</b></span>
          </div>
        </Card>
      )}

      <Card title={`Recovery Queue — ranked by expected value`}
        right={pendingApprovals.length > 0 && (
          <button onClick={approveAll} disabled={approving}
            className="rounded-lg bg-amber-500/15 px-3 py-1.5 text-xs font-medium text-amber-300 hover:bg-amber-500/25 disabled:opacity-50">
            {approving ? 'Approving…' : `Approve ${pendingApprovals.length} high-value items`}
          </button>
        )}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-500">
                <th className="py-2 pr-3">#</th>
                <th className="py-2 pr-3">Transaction</th>
                <th className="py-2 pr-3 text-right">Amount</th>
                <th className="py-2 pr-3">Failure</th>
                <th className="py-2 pr-3">Action</th>
                <th className="py-2 pr-3 text-right">P(recover)</th>
                <th className="py-2 pr-3 text-right">Expected Value</th>
                <th className="py-2 pr-3">Confidence</th>
                <th className="py-2 pr-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {plan.queue.slice(0, 25).map((d) => (
                <tr key={d.transaction_id} className="border-b border-slate-800/60 hover:bg-slate-800/30">
                  <td className="num py-2 pr-3 text-xs text-slate-600">{d.rank}</td>
                  <td className="py-2 pr-3 font-mono text-xs text-slate-300">{d.transaction_id.slice(0, 12)}…</td>
                  <td className="num py-2 pr-3 text-right font-medium text-slate-200">{inr(d.amount_inr)}</td>
                  <td className="py-2 pr-3 font-mono text-[11px] text-slate-500">{d.failure_code}</td>
                  <td className="py-2 pr-3"><ActionPill action={d.action} /></td>
                  <td className="num py-2 pr-3 text-right text-slate-400">{d.recovery_probability.toFixed(2)}</td>
                  <td className="num py-2 pr-3 text-right font-semibold text-emerald-300">{inr(d.expected_recovery_value_inr)}</td>
                  <td className="py-2 pr-3"><ConfidenceBar value={d.confidence} /></td>
                  <td className="py-2 pr-3 text-[11px] text-slate-500">
                    {d.requires_approval ? '🔒 approval' : 'auto'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {plan.queue.length > 25 && (
            <div className="pt-2 text-center text-xs text-slate-600">+ {plan.queue.length - 25} more items below EV threshold</div>
          )}
        </div>
      </Card>

      {plan.escalations.length > 0 && (
        <Card title={`Escalations — human review required (${plan.escalations.length})`}>
          <div className="space-y-1.5">
            {plan.escalations.slice(0, 10).map((d) => (
              <div key={d.transaction_id} className="flex items-center gap-3 rounded-lg bg-amber-500/[0.04] px-3 py-2 text-sm">
                <span className="text-amber-400">⚠</span>
                <span className="font-mono text-xs text-slate-400">{d.transaction_id.slice(0, 14)}…</span>
                <span className="num ml-auto text-xs text-slate-300">{inr(d.amount_inr)}</span>
                <ActionPill action={d.action} />
                <span className="max-w-md truncate text-[11px] text-slate-500">{d.reason}</span>
              </div>
            ))}
            {plan.escalations.length > 10 && (
              <div className="pt-1 text-center text-xs text-slate-600">+ {plan.escalations.length - 10} more</div>
            )}
          </div>
        </Card>
      )}

      {plan.stops.length > 0 && (
        <Card title={`Stopped — no safe or economic action (${plan.stops.length})`}>
          <div className="grid grid-cols-1 gap-1.5 md:grid-cols-2">
            {plan.stops.slice(0, 8).map((d) => (
              <div key={d.transaction_id} className="flex items-center gap-2 rounded-lg bg-slate-800/40 px-3 py-2 text-xs">
                <span className="font-mono text-slate-500">{d.transaction_id.slice(0, 14)}…</span>
                <span className="num ml-auto text-slate-400">{inr(d.amount_inr)}</span>
                <span className="max-w-xs truncate text-slate-600">{d.reason}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
