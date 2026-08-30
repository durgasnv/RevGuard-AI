import { Fragment, useEffect, useState } from 'react'
import { api, inr } from '../api'
import type { Cluster, DetectReport, Diagnosis } from '../types'
import { Card, ConfidenceBar, SeverityBadge } from '../components/ui'

export default function LeakageView({
  detectReport,
}: {
  detectReport: DetectReport | null
}) {
  const [diagnoses, setDiagnoses] = useState<Record<string, Diagnosis>>({})
  const [openId, setOpenId] = useState<string | null>(null)
  const [selectedCluster, setSelectedCluster] = useState<Cluster | null>(null)

  useEffect(() => {
    api
      .diagnose(100)
      .then((d) => {
        const map: Record<string, Diagnosis> = {}
        for (const diag of d.diagnoses) map[diag.cluster_id] = diag
        setDiagnoses(map)
      })
      .catch((e: unknown) => console.error('diagnose failed:', e))
  }, [])

  if (!detectReport) return null

  return (
    <div className="space-y-4">
      <Card
        title={`Revenue Leakage Clusters (${detectReport.clusters.length})`}
        subtitle="Ranked by total revenue at risk with AI root-cause diagnostics"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="py-3 pr-3">Severity</th>
                <th className="py-3 pr-3">Cluster Title</th>
                <th className="py-3 pr-3 text-right">Transactions</th>
                <th className="py-3 pr-3 text-right">Revenue at Risk</th>
                <th className="py-3 pr-3">Methods</th>
                <th className="py-3 pr-3">Confidence</th>
                <th className="py-3 pr-3 text-center">Diagnosis</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {detectReport.clusters.map((c) => {
                const open = openId === c.cluster_id
                const d = diagnoses[c.cluster_id]
                return (
                  <Fragment key={c.cluster_id}>
                    <tr
                      onClick={() => setOpenId(open ? null : c.cluster_id)}
                      className={`cursor-pointer transition-colors ${
                        open ? 'bg-primary/10' : 'hover:bg-muted/50'
                      }`}
                    >
                      <td className="py-3 pr-3">
                        <SeverityBadge severity={c.severity} />
                      </td>
                      <td className="py-3 pr-3">
                        <span className="font-semibold text-foreground">{c.title}</span>
                        <div className="mt-0.5 text-[11px] text-muted-foreground">
                          Top code: <code className="text-foreground font-mono">{c.top_failure_codes?.[0] ?? '—'}</code>
                        </div>
                      </td>
                      <td className="num py-3 pr-3 text-right text-foreground font-semibold">
                        {c.txn_count}
                      </td>
                      <td className="num py-3 pr-3 text-right font-bold text-rose-600 dark:text-rose-400">
                        {inr(c.revenue_at_risk_inr)}
                      </td>
                      <td className="py-3 pr-3 text-xs uppercase text-muted-foreground">
                        {c.payment_methods.join(', ')}
                      </td>
                      <td className="py-3 pr-3">{d && <ConfidenceBar value={d.confidence} />}</td>
                      <td className="py-3 pr-3 text-center text-xs text-muted-foreground">
                        <span
                          className={`inline-block transition-transform duration-200 ${
                            open ? 'rotate-180 text-primary' : ''
                          }`}
                        >
                          ▼
                        </span>
                      </td>
                    </tr>

                    {open && (
                      <tr className="border-b border-border bg-muted/20">
                        <td colSpan={7} className="p-4">
                          {d ? (
                            <div className="space-y-3 rounded-xl border border-border bg-card text-card-foreground p-4 shadow-xs">
                              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2.5">
                                <div>
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                                    Root Cause Analysis
                                  </span>
                                  <span className="ml-2 rounded-md bg-muted px-2 py-0.5 text-[10px] font-mono text-muted-foreground border border-border">
                                    Source: {d.source.replace('_', ' ')}
                                  </span>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  Estimated confidence:{' '}
                                  <b className="num text-foreground">{(d.confidence * 100).toFixed(0)}%</b>
                                </span>
                              </div>

                              <p className="max-w-4xl text-xs leading-relaxed text-foreground">
                                {d.root_cause}
                              </p>

                              {d.contributing_factors?.length > 0 && (
                                <div>
                                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                    Contributing Factors
                                  </div>
                                  <div className="flex flex-wrap gap-1.5">
                                    {d.contributing_factors.map((f, i) => (
                                      <span
                                        key={i}
                                        className="rounded-md border border-border bg-muted/50 px-2.5 py-0.5 text-xs text-foreground"
                                      >
                                        {f}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {c.evidence?.length > 0 && (
                                <div>
                                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                    Pattern Evidence
                                  </div>
                                  <div className="space-y-1">
                                    {c.evidence.map((e, i) => (
                                      <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                                        <span className="text-primary font-bold">→</span>
                                        <span className="text-foreground">{e}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <div className="flex items-center justify-between pt-1 border-t border-border">
                                <span className="text-[10px] font-mono text-muted-foreground">
                                  Sample Transactions: {c.sample_transaction_ids.join(', ')}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setSelectedCluster(c)
                                  }}
                                  className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs"
                                >
                                  <span>✦</span>
                                  <span>Inspect AI Decision Chain</span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1 p-2">
                              {c.evidence.map((e, i) => (
                                <div key={i} className="text-xs text-muted-foreground">
                                  — {e}
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Cluster AI Decision Chain Modal */}
      {selectedCluster && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-2xl border border-border bg-card text-card-foreground p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl text-primary">✦</span>
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    Explainable AI Decision Chain — Cluster View
                  </h3>
                  <div className="font-mono text-[11px] text-muted-foreground">
                    {selectedCluster.title} · {inr(selectedCluster.revenue_at_risk_inr)} at risk
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedCluster(null)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                ✕
              </button>
            </div>

            {/* 5-Step Visual Decision Progression */}
            <div className="space-y-2.5">
              {/* Step 1: Cluster Event Signature */}
              <div className="rounded-xl border border-border bg-muted/40 p-3.5 text-xs">
                <div className="flex items-center justify-between font-semibold text-foreground">
                  <span>1. Concentrated Failure Cluster</span>
                  <span className="font-mono text-muted-foreground">{selectedCluster.txn_count} transactions</span>
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  Detected pattern across payment methods: {selectedCluster.payment_methods.join(', ').toUpperCase()}.
                </div>
              </div>

              {/* Step 2: Statistical Pattern Evidence */}
              <div className="rounded-xl border border-border bg-muted/40 p-3.5 text-xs">
                <div className="flex items-center justify-between font-semibold text-foreground">
                  <span>2. Statistical Evidence</span>
                  <SeverityBadge severity={selectedCluster.severity} />
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground space-y-0.5">
                  {selectedCluster.evidence?.slice(0, 2).map((ev, i) => (
                    <div key={i}>• {ev}</div>
                  ))}
                </div>
              </div>

              {/* Step 3: LLM Root Cause Diagnosis */}
              <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-3.5 text-xs">
                <div className="flex items-center justify-between font-semibold text-blue-700 dark:text-blue-300">
                  <span>3. LLM Diagnostic Reasoning</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">
                    {diagnoses[selectedCluster.cluster_id]
                      ? `${(diagnoses[selectedCluster.cluster_id].confidence * 100).toFixed(0)}% Confidence`
                      : 'Diagnostic Active'}
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-foreground leading-relaxed">
                  {diagnoses[selectedCluster.cluster_id]?.root_cause || 'Analyzing root cause pattern and issuer telemetry.'}
                </div>
              </div>

              {/* Step 4: Expected Value Optimization */}
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs">
                <div className="flex items-center justify-between font-semibold text-emerald-700 dark:text-emerald-300">
                  <span>4. Expected Value (EV) Strategy Formulation</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    EV &gt; 0 Prioritized
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  Evaluates candidate interventions (Retry vs Payment Link vs Customer Notification) against intervention cost (₹5) to pick highest-EV action.
                </div>
              </div>

              {/* Step 5: Deterministic Policy Gate (SC-01) */}
              <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-3.5 text-xs">
                <div className="flex items-center justify-between font-semibold text-purple-700 dark:text-purple-300">
                  <span>5. Deterministic Policy Gate (SC-01)</span>
                  <span className="font-bold text-purple-600 dark:text-purple-400">Bounded & Logged</span>
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  Zero unconstrained execution. Every action is verified against fatigue caps, idempotency keys, and logged to the immutable audit trail.
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedCluster(null)}
                className="rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 px-4 py-2 text-xs font-semibold transition-colors"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

