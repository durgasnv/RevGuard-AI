import { useState } from 'react'
import { Card } from '../components/ui'

const ACTORS = ['all', 'strategy_api', 'ai_strategy', 'baseline', 'policy_guard'] as const

export default function AuditView({
  state,
}: {
  state: {
    execution?: {
      audit_trail: Array<{
        event_id: string
        timestamp: string
        actor: string
        action: string
        reason: string
        evidence: Record<string, unknown>
        policy_result: string
        outcome?: { value: string } | string
      }>
    } | null
  } | null
}) {
  const [filter, setFilter] = useState<string>('all')
  const [expanded, setExpanded] = useState<string | null>(null)

  const events = (state?.execution?.audit_trail ?? []).slice().reverse()
  const filtered = filter === 'all' ? events : events.filter((e) => e.actor === filter)

  if (!state?.execution) {
    return (
      <Card title="Audit Trail" icon="≣">
        <div className="py-12 text-center text-sm text-slate-400">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.08] bg-slate-800/60 text-xl text-slate-400">
            ≣
          </div>
          No recovery execution recorded yet. Run a recovery cycle to view consequential audit events.
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card
        title={`Audit Trail — ${events.length} Immutable Events`}
        subtitle="Consequential decision log capturing policy validations, agent actions, and outcome states"
        icon="≣"
        right={
          <div className="flex flex-wrap gap-1.5">
            {ACTORS.map((a) => (
              <button
                key={a}
                onClick={() => setFilter(a)}
                className={`rounded-full px-3 py-1 text-[11px] font-medium transition-all ${
                  filter === a
                    ? 'border border-blue-500/30 bg-blue-500/20 text-blue-300 shadow-sm shadow-blue-500/10'
                    : 'border border-white/[0.06] bg-slate-800/60 text-slate-400 hover:border-slate-700 hover:bg-slate-700/60 hover:text-slate-200'
                }`}
              >
                {a.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        }
      >
        <div className="max-h-[72vh] space-y-2 overflow-y-auto pr-1">
          {filtered.map((e) => {
            const open = expanded === e.event_id
            const outcomeStr =
              typeof e.outcome === 'object' ? e.outcome?.value : e.outcome
            return (
              <div
                key={e.event_id}
                className={`rounded-xl border transition-all duration-150 ${
                  open
                    ? 'border-blue-500/30 bg-slate-900/90 shadow-lg shadow-black/40'
                    : 'border-white/[0.06] bg-slate-900/40 hover:border-slate-700 hover:bg-slate-800/40'
                }`}
              >
                <button
                  className="flex w-full items-center gap-3.5 px-4 py-3 text-left text-xs"
                  onClick={() => setExpanded(open ? null : e.event_id)}
                >
                  <span className="num shrink-0 font-mono text-[11px] text-slate-400">
                    {e.timestamp.slice(11, 19)}
                  </span>
                  <span className="shrink-0 rounded-lg border border-slate-700/70 bg-slate-800 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-300">
                    {e.actor.replace(/_/g, ' ')}
                  </span>
                  <span className="shrink-0 font-semibold capitalize text-white">
                    {e.action.replace(/_/g, ' ').toLowerCase()}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-slate-400">{e.reason}</span>
                  {outcomeStr && <AuditOutcomeTag outcome={outcomeStr} />}
                  <span className="text-[10px] text-slate-500">{open ? '▲' : '▼'}</span>
                </button>

                {open && (
                  <div className="border-t border-white/[0.06] bg-slate-950/70 px-4 py-3.5">
                    <div className="mb-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                      <div className="rounded-lg border border-white/[0.04] bg-slate-900/60 p-2">
                        <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                          Policy Result
                        </span>
                        <span className="mt-0.5 font-medium text-emerald-400">
                          {e.policy_result}
                        </span>
                      </div>
                      <div className="rounded-lg border border-white/[0.04] bg-slate-900/60 p-2">
                        <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                          Transaction ID
                        </span>
                        <span className="mt-0.5 block truncate font-mono text-slate-300">
                          {e.evidence.transaction_id as string}
                        </span>
                      </div>
                      <div className="rounded-lg border border-white/[0.04] bg-slate-900/60 p-2">
                        <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                          Amount
                        </span>
                        <span className="num mt-0.5 font-bold text-white">
                          ₹{Number(e.evidence.amount_inr).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="rounded-lg border border-white/[0.04] bg-slate-900/60 p-2">
                        <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                          Failure Code
                        </span>
                        <span className="mt-0.5 font-mono text-slate-300">
                          {(e.evidence.failure_code as string) || 'N/A'}
                        </span>
                      </div>
                    </div>

                    <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                      Raw Evidence Payload
                    </div>
                    <pre className="overflow-x-auto rounded-xl border border-white/[0.06] bg-slate-950 p-3.5 font-mono text-[11px] leading-relaxed text-slate-300">
                      {JSON.stringify(e.evidence, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )
          })}
          {filtered.length === 0 && (
            <div className="py-8 text-center text-sm text-slate-500">
              No events found for actor &quot;{filter}&quot;
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

function AuditOutcomeTag({ outcome }: { outcome?: string }) {
  const map: Record<string, string> = {
    recovered: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    failed: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
    escalated: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    stopped: 'text-slate-400 bg-slate-700/30 border-slate-600/30',
    blocked_by_policy: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
  }
  if (!outcome) return null
  return (
    <span
      className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold capitalize backdrop-blur-sm ${
        map[outcome] ?? map.stopped
      }`}
    >
      {outcome.replace(/_/g, ' ')}
    </span>
  )
}

