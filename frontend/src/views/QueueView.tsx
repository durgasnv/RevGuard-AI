import { useMemo, useState } from 'react'
import { api, inr } from '../api'
import type { AppState } from '../types'
import { ActionPill, Card, ConfidenceBar } from '../components/ui'

export default function QueueView({
  state,
  onRun,
}: {
  state: AppState | null
  onRun?: () => void
}) {
  const [approving, setApproving] = useState(false)
  const plan = state?.plan
  const execution = state?.execution

  const pendingApprovals = useMemo(
    () =>
      (plan?.escalations ?? []).filter(
        (d) => d.requires_approval && d.action !== 'ESCALATE_HUMAN',
      ),
    [plan],
  )

  if (!plan)
    return (
      <Card title="Recovery Queue">
        <div className="py-12 text-center text-sm text-slate-400">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg border border-slate-800 bg-slate-850 text-base text-slate-400">
            ⚡
          </div>
          No active recovery plan generated yet. Run a recovery cycle from the top header to populate.
        </div>
      </Card>
    )

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
    <div className="space-y-5">
      {/* Top 4 KPI metrics */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Queued For Action
          </div>
          <div className="num mt-1.5 text-2xl font-bold text-blue-400">{plan.queue.length}</div>
          <div className="mt-1 text-[11px] text-slate-500">Autonomous executions</div>
        </Card>
        <Card>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Expected Recovery
          </div>
          <div className="num mt-1.5 text-2xl font-bold text-emerald-400">
            {inr(plan.total_expected_recovery_inr)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">EV-weighted potential</div>
        </Card>
        <Card>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Escalations / Review
          </div>
          <div className="num mt-1.5 text-2xl font-bold text-amber-400">
            {plan.escalations.length}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">Requires human review</div>
        </Card>
        <Card>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Stopped (Fatigue Cap)
          </div>
          <div className="num mt-1.5 text-2xl font-bold text-slate-400">{plan.stops.length}</div>
          <div className="mt-1 text-[11px] text-slate-500">Customer fatigue prevented</div>
        </Card>
      </div>

      {execution && (
        <Card title="Last Execution Outcome">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 font-medium text-emerald-300">
              <span>Recovered Revenue:</span>
              <b className="num font-bold text-emerald-400">{inr(execution.recovered_inr ?? 0)}</b>
            </span>
            {Object.entries(execution.outcome_counts ?? {}).map(([k, v]) => (
              <span
                key={k}
                className="rounded-lg border border-slate-800 bg-slate-850 px-3 py-1.5 text-slate-300 capitalize"
              >
                {k.replace(/_/g, ' ')}: <b className="num text-white font-semibold">{v}</b>
              </span>
            ))}
            <span className="ml-auto text-xs text-slate-400">
              Audit Events Generated: <b className="num text-white">{execution.audit_trail.length}</b>
            </span>
          </div>
        </Card>
      )}

      <Card
        title="Recovery Execution Queue"
        subtitle="Ranked dynamically by expected economic value (EV)"
        right={
          pendingApprovals.length > 0 && (
            <button
              onClick={approveAll}
              disabled={approving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-amber-500 active:bg-amber-700 disabled:opacity-50"
            >
              {approving ? (
                <>
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Approving…
                </>
              ) : (
                <>
                  <span>Approve {pendingApprovals.length} high-value items</span>
                </>
              )}
            </button>
          )
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                <th className="py-3 pr-3">#</th>
                <th className="py-3 pr-3">Transaction ID</th>
                <th className="py-3 pr-3 text-right">Amount</th>
                <th className="py-3 pr-3">Failure Code</th>
                <th className="py-3 pr-3">Recommended Action</th>
                <th className="py-3 pr-3 text-right">P(Recovery)</th>
                <th className="py-3 pr-3 text-right">Expected Value</th>
                <th className="py-3 pr-3">Confidence</th>
                <th className="py-3 pr-3">Gate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {plan.queue.slice(0, 25).map((d) => (
                <tr
                  key={d.transaction_id}
                  className="transition-colors hover:bg-slate-850/60"
                >
                  <td className="num py-3 pr-3 text-xs font-bold text-slate-500">{d.rank}</td>
                  <td className="py-3 pr-3 font-mono text-xs text-slate-300">
                    {d.transaction_id.slice(0, 14)}…
                  </td>
                  <td className="num py-3 pr-3 text-right font-semibold text-white">
                    {inr(d.amount_inr)}
                  </td>
                  <td className="py-3 pr-3 font-mono text-[11px] text-slate-400">
                    {d.failure_code}
                  </td>
                  <td className="py-3 pr-3">
                    <ActionPill action={d.action} />
                  </td>
                  <td className="num py-3 pr-3 text-right text-slate-300 font-medium">
                    {d.recovery_probability.toFixed(2)}
                  </td>
                  <td className="num py-3 pr-3 text-right font-bold text-emerald-400">
                    {inr(d.expected_recovery_value_inr)}
                  </td>
                  <td className="py-3 pr-3">
                    <ConfidenceBar value={d.confidence} />
                  </td>
                  <td className="py-3 pr-3 text-[11px]">
                    {d.requires_approval ? (
                      <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-2 py-0.5 font-medium text-amber-300 border border-amber-500/20">
                        Review
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 font-medium text-emerald-400 border border-emerald-500/20">
                        Auto
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {plan.queue.length > 25 && (
            <div className="pt-3 text-center text-xs text-slate-500">
              + {plan.queue.length - 25} more queued actions below the priority threshold
            </div>
          )}
        </div>
      </Card>

      {plan.escalations.length > 0 && (
        <Card
          title={`Escalated Transactions — Human Review Required (${plan.escalations.length})`}
        >
          <div className="space-y-2">
            {plan.escalations.slice(0, 10).map((d) => (
              <div
                key={d.transaction_id}
                className="flex items-center gap-3 rounded-lg border border-amber-500/20 bg-amber-500/[0.04] p-3 text-xs"
              >
                <span className="text-amber-400 font-bold">⚐</span>
                <span className="font-mono text-slate-300">
                  {d.transaction_id.slice(0, 14)}…
                </span>
                <span className="num ml-auto font-bold text-white">{inr(d.amount_inr)}</span>
                <ActionPill action={d.action} />
                <span className="max-w-md truncate text-slate-400">{d.reason}</span>
              </div>
            ))}
            {plan.escalations.length > 10 && (
              <div className="pt-1 text-center text-xs text-slate-500">
                + {plan.escalations.length - 10} more escalations
              </div>
            )}
          </div>
        </Card>
      )}

      {plan.stops.length > 0 && (
        <Card
          title={`Stopped Actions — Unrecoverable / Fatigue Prevention (${plan.stops.length})`}
        >
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {plan.stops.slice(0, 8).map((d) => (
              <div
                key={d.transaction_id}
                className="flex items-center gap-2.5 rounded-lg border border-slate-800 bg-slate-850 p-2.5 text-xs"
              >
                <span className="font-mono text-slate-400">
                  {d.transaction_id.slice(0, 14)}…
                </span>
                <span className="num ml-auto font-medium text-slate-300">{inr(d.amount_inr)}</span>
                <span className="max-w-xs truncate text-slate-500">{d.reason}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}


