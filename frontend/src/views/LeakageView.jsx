import { Fragment, useEffect, useState } from 'react'
import { api, inr } from '../api'
import { Card, ConfidenceBar, SeverityBadge } from '../components/ui'

export default function LeakageView({ detectReport }) {
  const [diagnoses, setDiagnoses] = useState({})
  const [openId, setOpenId] = useState(null)

  useEffect(() => {
    api.diagnose(100)
      .then((d) => {
        const map = {}
        for (const diag of d.diagnoses) map[diag.cluster_id] = diag
        setDiagnoses(map)
      })
      .catch((e) => console.error('diagnose failed:', e))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!detectReport) return null

  return (
    <Card title={`Revenue Leakage — ${detectReport.clusters.length} clusters ranked by impact`}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-500">
              <th className="py-2 pr-3">Severity</th>
              <th className="py-2 pr-3">Cluster</th>
              <th className="py-2 pr-3 text-right">Txns</th>
              <th className="py-2 pr-3 text-right">Revenue at Risk</th>
              <th className="py-2 pr-3">Methods</th>
              <th className="py-2 pr-3">AI Diagnosis</th>
            </tr>
          </thead>
          <tbody>
            {detectReport.clusters.map((c) => {
              const d = diagnoses[c.cluster_id]
              const open = openId === c.cluster_id
              return (
                <Fragment key={c.cluster_id}>
                  <tr
                    onClick={() => setOpenId(open ? null : c.cluster_id)}
                    className="cursor-pointer border-b border-slate-800/60 hover:bg-slate-800/30">
                    <td className="py-2.5 pr-3"><SeverityBadge severity={c.severity} /></td>
                    <td className="py-2.5 pr-3 font-medium text-slate-200">{c.title}</td>
                    <td className="num py-2.5 pr-3 text-right text-slate-400">{c.txn_count}</td>
                    <td className="num py-2.5 pr-3 text-right font-semibold text-red-300">{inr(c.revenue_at_risk_inr)}</td>
                    <td className="py-2.5 pr-3 text-[11px] uppercase text-slate-500">{c.payment_methods.join(', ')}</td>
                    <td className="py-2.5 pr-3">{d && <ConfidenceBar value={d.confidence} />}</td>
                  </tr>
                  {open && (
                    <tr className="border-b border-slate-800/60 bg-slate-900/80">
                      <td colSpan={6} className="p-4">
                        {d ? (
                          <div className="space-y-3">
                            <div>
                              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                Root cause · source: {d.source.replace('_', ' ')}
                              </div>
                              <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-300">{d.root_cause}</p>
                            </div>
                            {d.contributing_factors?.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {d.contributing_factors.map((f, i) => (
                                  <span key={i} className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] text-slate-400">{f}</span>
                                ))}
                              </div>
                            )}
                            <div className="space-y-1">
                              {c.evidence.map((e, i) => (
                                <div key={i} className="text-xs text-slate-400">— {e}</div>
                              ))}
                            </div>
                            <div className="text-[11px] text-slate-600">sample: {c.sample_transaction_ids.join(', ')}</div>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {c.evidence.map((e, i) => <div key={i} className="text-xs text-slate-400">— {e}</div>)}
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
  )
}
