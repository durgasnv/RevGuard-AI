import { Fragment, useEffect, useState } from 'react'
import { api, inr } from '../api'
import type { DetectReport, Diagnosis } from '../types'
import { Card, ConfidenceBar, SeverityBadge } from '../components/ui'

const ACTORS = ['all', 'strategy_api', 'ai_strategy', 'baseline', 'policy_guard'] as const

export default function AuditView({
  state,
}: {
  state: { execution?: { audit_trail: Array<{ event_id: string; timestamp: string; actor: string; action: string; reason: string; evidence: Record<string, unknown>; policy_result: string; outcome?: { value: string } | string }> } | null } | null
}) {
  const [filter, setFilter] = useState<string>('all')
  const [expanded, setExpanded] = useState<string | null>(null)

  const events = (state?.execution?.audit_trail ?? []).slice().reverse()

  const filtered = filter === 'all' ? events : events.filter((e) => e.actor === filter)

  if (!state?.execution) {
    return (
      <Card title="Audit Trail">
        <div className="py-8 text-center text-sm text-slate-500">
          No execution yet — run a recovery cycle first.
        </div>
      </Card>
    )
  }

  return (
    <Card
      title={`Audit Trail — ${events.length} consequential events (FR-16)`}
      right={
        <div className="flex gap-1">
          {ACTORS.map((a) => (
            <button
              key={a}
              onClick={() => setFilter(a)}
              className={`rounded-full px-2.5 py-1 text-[11px] ${
                filter === a
                  ? 'bg-blue-500/20 text-blue-300'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-300'
              }`}
            >
              {a.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      }
    >
      <div className="max-h-[70vh] space-y-1 overflow-y-auto pr-1">
        {filtered.map((e) => {
          const open = expanded === e.event_id
          return (
            <div key={e.event_id} className="rounded-lg border border-slate-800/70 bg-slate-900/60">
              <button
                className="flex w-full items-center gap-3 px-3 py-2 text-left text-xs hover:bg-slate-800/30"
                onClick={() => setExpanded(open ? null : e.event_id)}
              >
                <span className="num shrink-0 text-slate-600">{e.timestamp.slice(11, 19)}</span>
                <span className="shrink-0 rounded bg-slate-800 px-1.5 py-0.5 font-medium text-slate-400">
                  {e.actor.replace(/_/g, ' ')}
                </span>
                <span className="shrink-0 font-medium text-slate-200">
                  {e.action.replace(/_/g, ' ').toLowerCase()}
                </span>
                <span className="min-w-0 flex-1 truncate text-slate-500">{e.reason}</span>
                <OutcomeTag outcome={typeof e.outcome === 'object' ? e.outcome?.value : e.outcome} />
              </button>
              {open && (
                <div className="border-t border-slate-800/70 px-3 py-2.5">
                  <div className="mb-1.5 grid grid-cols-2 gap-2 text-[11px] md:grid-cols-4">
                    <div>
                      <span className="text-slate-600">policy: </span>
                      <span className="text-slate-300">{e.policy_result}</span>
                    </div>
                    <div>
                      <span className="text-slate-600">txn: </span>
                      <span className="font-mono text-slate-300">
                        {(e.evidence.transaction_id as string)?.slice(0, 16)}…
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-600">amount: </span>
                      <span className="num text-slate-300">
                        ₹{Number(e.evidence.amount_inr).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-600">code: </span>
                      <span className="font-mono text-slate-300">
                        {e.evidence.failure_code as string}
                      </span>
                    </div>
                  </div>
                  <pre className="overflow-x-auto rounded-lg bg-slate-950 p-2.5 font-mono text-[10px] leading-relaxed text-slate-400">
                    {JSON.stringify(e.evidence, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </Card>
  )
}

function OutcomeTag({ outcome }: { outcome?: string }) {
  const map: Record<string, string> = {
    recovered: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    failed: 'text-red-400 bg-red-500/10 border-red-500/30',
    escalated: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    stopped: 'text-slate-400 bg-slate-500/10 border-slate-500/30',
    blocked_by_policy: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
  }
  if (!outcome) return null
  return (
    <span className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${map[outcome] ?? map.stopped}`}>
      {outcome?.replace(/_/g, ' ')}
    </span>
  )
}
