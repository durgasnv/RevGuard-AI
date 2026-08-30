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
      <Card title="Audit Trail">
        <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-850 text-base text-slate-600 dark:text-slate-400">
            📋
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
        right={
          <div className="flex flex-wrap gap-1">
            {ACTORS.map((a) => (
              <button
                key={a}
                onClick={() => setFilter(a)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  filter === a
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {a.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        }
      >
        <div className="max-h-[72vh] space-y-1.5 overflow-y-auto pr-1">
          {filtered.map((e) => {
            const open = expanded === e.event_id
            const outcomeStr =
              typeof e.outcome === 'object' ? e.outcome?.value : e.outcome
            return (
              <div
                key={e.event_id}
                className={`rounded-xl border transition-colors ${
                  open
                    ? 'border-primary/40 bg-card shadow-xs'
                    : 'border-border bg-card/60 hover:bg-muted/50'
                }`}
              >
                <button
                  className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left text-xs"
                  onClick={() => setExpanded(open ? null : e.event_id)}
                >
                  <span className="num shrink-0 font-mono text-[11px] text-muted-foreground">
                    {e.timestamp.slice(11, 19)}
                  </span>
                  <span className="shrink-0 rounded-md border border-border bg-muted/60 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-foreground">
                    {e.actor.replace(/_/g, ' ')}
                  </span>
                  <span className="shrink-0 font-semibold capitalize text-foreground">
                    {e.action.replace(/_/g, ' ').toLowerCase()}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-muted-foreground">{e.reason}</span>
                  {outcomeStr && <AuditOutcomeTag outcome={outcomeStr} />}
                  <span className="text-[10px] text-muted-foreground">{open ? '▲' : '▼'}</span>
                </button>

                {open && (
                  <div className="border-t border-border bg-muted/20 px-4 py-3">
                    <div className="mb-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                      <div className="rounded-lg border border-border bg-card p-2 shadow-xs">
                        <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Policy Result
                        </span>
                        <span className="mt-0.5 font-medium text-emerald-600 dark:text-emerald-400">
                          {e.policy_result}
                        </span>
                      </div>
                      <div className="rounded-lg border border-border bg-card p-2 shadow-xs">
                        <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Transaction ID
                        </span>
                        <span className="mt-0.5 block truncate font-mono text-foreground">
                          {e.evidence.transaction_id as string}
                        </span>
                      </div>
                      <div className="rounded-lg border border-border bg-card p-2 shadow-xs">
                        <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Amount
                        </span>
                        <span className="num mt-0.5 font-bold text-foreground">
                          ₹{Number(e.evidence.amount_inr).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="rounded-lg border border-border bg-card p-2 shadow-xs">
                        <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Failure Code
                        </span>
                        <span className="mt-0.5 font-mono text-foreground">
                          {(e.evidence.failure_code as string) || 'N/A'}
                        </span>
                      </div>
                    </div>

                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                      Raw Evidence Payload
                    </div>
                    <pre className="overflow-x-auto rounded-lg border border-border bg-muted/80 text-foreground p-3 font-mono text-[11px] leading-relaxed">
                      {JSON.stringify(e.evidence, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )
          })}
          {filtered.length === 0 && (
            <div className="py-8 text-center text-sm text-slate-400">
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
    recovered: 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-500/10 dark:border-emerald-500/20',
    failed: 'text-rose-700 bg-rose-50 border-rose-200 dark:text-rose-400 dark:bg-rose-500/10 dark:border-rose-500/20',
    escalated: 'text-amber-800 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-500/10 dark:border-amber-500/20',
    stopped: 'text-slate-600 bg-slate-100 border-slate-200 dark:text-slate-400 dark:bg-slate-800 dark:border-slate-700',
    blocked_by_policy: 'text-orange-800 bg-orange-50 border-orange-200 dark:text-orange-400 dark:bg-orange-500/10 dark:border-orange-500/20',
  }
  if (!outcome) return null
  return (
    <span
      className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold capitalize ${
        map[outcome] ?? map.stopped
      }`}
    >
      {outcome.replace(/_/g, ' ')}
    </span>
  )
}



