import { useState } from 'react'
import { api, inr, pct } from '../api'
import type { AnalyzeReport } from '../types'
import { Card, ConfidenceBar, SeverityBadge } from '../components/ui'

type UploadFormat = 'razorpay_csv' | 'generic_csv' | 'excel'

const FORMAT_OPTIONS: { value: UploadFormat; label: string; desc: string }[] = [
  {
    value: 'razorpay_csv',
    label: 'Razorpay CSV',
    desc: 'Export from Razorpay Dashboard → Payments',
  },
  { value: 'generic_csv', label: 'Generic CSV', desc: 'Columns matching Transaction fields' },
  { value: 'excel', label: 'Excel (.xlsx)', desc: 'Sheet with a header row of field names' },
]

const ACCEPT_MAP: Record<UploadFormat, string> = {
  razorpay_csv: '.csv',
  generic_csv: '.csv',
  excel: '.xlsx',
}

export default function AnalyzeView() {
  const [format, setFormat] = useState<UploadFormat>('razorpay_csv')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [report, setReport] = useState<AnalyzeReport | null>(null)

  async function handleAnalyze() {
    if (!file) {
      setError('Please choose a file to upload.')
      return
    }
    setBusy(true)
    setError(null)
    setReport(null)
    try {
      const result = await api.analyze(file, format)
      setReport(result)
    } catch (e) {
      setError(String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card title="Upload & Analyze">
        <p className="mb-4 max-w-2xl text-sm leading-relaxed text-slate-500">
          Drop a payments file to get an isolated analysis — revenue at risk, leakage clusters,
          AI root-cause diagnosis and a proactive notification summary. This does not touch the
          demo store or the live recovery queue.
        </p>
        <div className="flex flex-wrap gap-2">
          {FORMAT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFormat(opt.value)}
              className={`flex-1 rounded-xl border p-3 text-left text-xs transition-colors ${
                format === opt.value
                  ? 'border-blue-500/50 bg-blue-500/10'
                  : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
              }`}
            >
              <div className="font-semibold text-slate-200">{opt.label}</div>
              <div className="mt-0.5 text-[11px] text-slate-500">{opt.desc}</div>
            </button>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-3">
          <input
            type="file"
            accept={ACCEPT_MAP[format]}
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null)
              setError(null)
            }}
            className="block w-full max-w-md text-sm text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-800 file:px-3 file:py-2 file:text-xs file:font-medium file:text-slate-300 hover:file:bg-slate-700"
          />
          <button
            onClick={handleAnalyze}
            disabled={busy || !file}
            className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-40"
          >
            {busy ? 'Analyzing…' : 'Analyze'}
          </button>
        </div>
        {file && <div className="mt-2 text-[11px] text-slate-600">Selected: {file.name}</div>}
      </Card>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {report && (
        <>
          {/* Upload summary */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Card>
              <div className="text-[11px] uppercase tracking-wider text-slate-500">Transactions</div>
              <div className="num mt-1 text-xl font-semibold text-slate-100">
                {report.upload.total_transactions}
              </div>
            </Card>
            <Card>
              <div className="text-[11px] uppercase tracking-wider text-slate-500">Success Rate</div>
              <div className="num mt-1 text-xl font-semibold text-emerald-300">
                {pct(report.upload.success_rate_pct / 100)}
              </div>
            </Card>
            <Card>
              <div className="text-[11px] uppercase tracking-wider text-slate-500">Total Amount</div>
              <div className="num mt-1 text-xl font-semibold text-blue-300">
                {inr(report.upload.total_amount_inr)}
              </div>
            </Card>
            <Card>
              <div className="text-[11px] uppercase tracking-wider text-slate-500">Revenue Lost</div>
              <div className="num mt-1 text-xl font-semibold text-red-300">
                {inr(report.upload.lost_amount_inr)}
              </div>
            </Card>
          </div>

          {/* Failure category breakdown */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card title="Failures by Category">
              {Object.entries(report.upload.by_category).length === 0 ? (
                <div className="py-6 text-center text-sm text-slate-500">No failed transactions</div>
              ) : (
                <div className="space-y-2">
                  {Object.entries(report.upload.by_category).map(([cat, count]) => (
                    <div key={cat} className="flex items-center gap-2 text-xs">
                      <span className="w-40 truncate capitalize text-slate-400">
                        {cat.replace(/_/g, ' ')}
                      </span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-700">
                        <div
                          className="h-full bg-amber-400"
                          style={{
                            width: `${(count / report.upload.failed) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="num w-8 text-right text-slate-300">{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
            <Card title="Failures by Payment Method">
              {Object.entries(report.upload.by_method).length === 0 ? (
                <div className="py-6 text-center text-sm text-slate-500">No data</div>
              ) : (
                <div className="space-y-2">
                  {Object.entries(report.upload.by_method).map(([method, count]) => (
                    <div key={method} className="flex items-center gap-2 text-xs">
                      <span className="w-24 capitalize text-slate-400">
                        {method.replace(/_/g, ' ')}
                      </span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-700">
                        <div
                          className="h-full bg-blue-400"
                          style={{
                            width: `${(count / report.upload.total_transactions) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="num w-8 text-right text-slate-300">{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Detection clusters */}
          <Card
            title={`Leakage Clusters — ${report.detection.clusters.length} ranked by impact`}
          >
            {report.detection.clusters.length === 0 ? (
              <div className="py-6 text-center text-sm text-slate-500">
                No leakage clusters detected — looks healthy
              </div>
            ) : (
              <div className="space-y-1.5">
                {report.detection.clusters.slice(0, 10).map((c) => {
                  const diag = report.diagnoses.find((d) => d.cluster_id === c.cluster_id)
                  return (
                    <div
                      key={c.cluster_id}
                      className="rounded-lg border border-slate-800/70 bg-slate-900/60 p-3"
                    >
                      <div className="flex flex-wrap items-center gap-3 text-xs">
                        <SeverityBadge severity={c.severity} />
                        <span className="font-medium text-slate-200">{c.title}</span>
                        <span className="num text-slate-500">{c.txn_count} txns</span>
                        <span className="num font-semibold text-red-300">
                          {inr(c.revenue_at_risk_inr)}
                        </span>
                        {diag && (
                          <span className="ml-auto">
                            <ConfidenceBar value={diag.confidence} />
                          </span>
                        )}
                      </div>
                      {diag && (
                        <p className="mt-2 text-xs leading-relaxed text-slate-400">
                          {diag.root_cause}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  )
}
