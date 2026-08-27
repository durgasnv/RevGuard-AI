import { Fragment, useEffect, useState } from 'react'
import { api, inr } from '../api'
import type { DetectReport, Diagnosis } from '../types'
import { Card, ConfidenceBar, SeverityBadge } from '../components/ui'

export default function LeakageView({
  detectReport,
}: {
  detectReport: DetectReport | null
}) {
  const [diagnoses, setDiagnoses] = useState<Record<string, Diagnosis>>({})
  const [openId, setOpenId] = useState<string | null>(null)

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
              <tr className="border-b border-slate-800 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                <th className="py-3 pr-3">Severity</th>
                <th className="py-3 pr-3">Cluster Title</th>
                <th className="py-3 pr-3 text-right">Transactions</th>
                <th className="py-3 pr-3 text-right">Revenue at Risk</th>
                <th className="py-3 pr-3">Payment Methods</th>
                <th className="py-3 pr-3">AI Confidence</th>
                <th className="py-3 pr-3 text-center">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {detectReport.clusters.map((c) => {
                const d = diagnoses[c.cluster_id]
                const open = openId === c.cluster_id
                return (
                  <Fragment key={c.cluster_id}>
                    <tr
                      onClick={() => setOpenId(open ? null : c.cluster_id)}
                      className={`cursor-pointer transition-colors ${
                        open ? 'bg-blue-600/10' : 'hover:bg-slate-850/60'
                      }`}
                    >
                      <td className="py-3 pr-3">
                        <SeverityBadge severity={c.severity} />
                      </td>
                      <td className="py-3 pr-3 font-semibold text-white">{c.title}</td>
                      <td className="num py-3 pr-3 text-right text-slate-300 font-medium">{c.txn_count}</td>
                      <td className="num py-3 pr-3 text-right font-bold text-rose-400">
                        {inr(c.revenue_at_risk_inr)}
                      </td>
                      <td className="py-3 pr-3 text-[11px] uppercase tracking-wide text-slate-400">
                        {c.payment_methods.join(', ')}
                      </td>
                      <td className="py-3 pr-3">{d && <ConfidenceBar value={d.confidence} />}</td>
                      <td className="py-3 pr-3 text-center text-xs text-slate-500">
                        <span
                          className={`inline-block transition-transform duration-200 ${
                            open ? 'rotate-180 text-blue-400' : ''
                          }`}
                        >
                          ▼
                        </span>
                      </td>
                    </tr>

                    {open && (
                      <tr className="border-b border-slate-800 bg-slate-900">
                        <td colSpan={7} className="p-4">
                          {d ? (
                            <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-950/80 p-4">
                              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                                <div>
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">
                                    Root Cause Analysis
                                  </span>
                                  <span className="ml-2 rounded bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-400">
                                    Source: {d.source.replace('_', ' ')}
                                  </span>
                                </div>
                                <span className="text-xs text-slate-400">
                                  Estimated confidence:{' '}
                                  <b className="num text-white">{(d.confidence * 100).toFixed(0)}%</b>
                                </span>
                              </div>

                              <p className="max-w-4xl text-xs leading-relaxed text-slate-200">
                                {d.root_cause}
                              </p>

                              {d.contributing_factors?.length > 0 && (
                                <div>
                                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                    Contributing Factors
                                  </div>
                                  <div className="flex flex-wrap gap-1.5">
                                    {d.contributing_factors.map((f, i) => (
                                      <span
                                        key={i}
                                        className="rounded-md border border-slate-800 bg-slate-850 px-2.5 py-0.5 text-xs text-slate-300"
                                      >
                                        {f}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {c.evidence?.length > 0 && (
                                <div>
                                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                    Pattern Evidence
                                  </div>
                                  <div className="space-y-1">
                                    {c.evidence.map((e, i) => (
                                      <div key={i} className="flex items-start gap-2 text-xs text-slate-300">
                                        <span className="text-blue-400">→</span>
                                        <span>{e}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <div className="pt-1 text-[10px] font-mono text-slate-500">
                                Sample Transactions: {c.sample_transaction_ids.join(', ')}
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1 p-2">
                              {c.evidence.map((e, i) => (
                                <div key={i} className="text-xs text-slate-400">
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
    </div>
  )
}


