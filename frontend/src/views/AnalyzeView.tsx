import { useState } from 'react'
import { api, inr, pct } from '../api'
import type { AnalyzeReport } from '../types'
import { Card, ConfidenceBar, SeverityBadge } from '../components/ui'

type UploadFormat = 'razorpay_csv' | 'generic_csv' | 'excel'

const FORMAT_OPTIONS: { value: UploadFormat; label: string; desc: string; icon: string }[] = [
  {
    value: 'razorpay_csv',
    label: 'Razorpay CSV',
    desc: 'Export from Razorpay Dashboard → Payments',
    icon: '💳',
  },
  {
    value: 'generic_csv',
    label: 'Generic CSV',
    desc: 'Columns matching standard payment fields',
    icon: '📄',
  },
  {
    value: 'excel',
    label: 'Excel (.xlsx)',
    desc: 'Spreadsheet with header row of fields',
    icon: '📊',
  },
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
    <div className="space-y-6">
      <Card
        title="Upload & Instant Leakage Audit"
        subtitle="Analyze arbitrary transaction exports without modifying the demo environment"
      >
        <p className="mb-5 max-w-2xl text-xs leading-relaxed text-slate-600 dark:text-slate-400">
          Upload your payment failure logs to run RevGuard pattern recognition algorithms in
          isolation. You will receive an immediate breakdown of revenue at risk, leakage clusters,
          and diagnostic root causes.
        </p>

        {/* Format Selector */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {FORMAT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFormat(opt.value)}
              className={`rounded-xl border p-3.5 text-left transition-colors ${
                format === opt.value
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-600/10'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850/60 hover:border-slate-300 dark:hover:border-slate-750 hover:bg-slate-100 dark:hover:bg-slate-850'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm">{opt.icon}</span>
                <span className="text-xs font-semibold text-slate-900 dark:text-white">{opt.label}</span>
              </div>
              <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{opt.desc}</div>
            </button>
          ))}
        </div>

        {/* File Input & Action Row */}
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex-1">
            <input
              type="file"
              accept={ACCEPT_MAP[format]}
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null)
                setError(null)
              }}
              className="block w-full text-xs text-slate-500 dark:text-slate-400 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-100 dark:file:bg-slate-800 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-slate-800 dark:file:text-white hover:file:bg-slate-200 dark:hover:file:bg-slate-700 file:cursor-pointer"
            />
          </div>

          <button
            onClick={handleAnalyze}
            disabled={busy || !file}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 active:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? (
              <>
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Analyzing Dataset…
              </>
            ) : (
              <span>Analyze File</span>
            )}
          </button>
        </div>

        {file && (
          <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span>Selected dataset:</span>
            <span className="font-mono text-slate-900 dark:text-slate-300 font-semibold">{file.name}</span>
            <span className="text-slate-400 dark:text-slate-500">({(file.size / 1024).toFixed(1)} KB)</span>
          </div>
        )}
      </Card>

      {error && (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      {report && (
        <>
          {/* Upload summary */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Card>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Total Transactions
              </div>
              <div className="num mt-1.5 text-2xl font-bold text-slate-900 dark:text-white">
                {report.upload.total_transactions.toLocaleString()}
              </div>
            </Card>
            <Card>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Success Rate
              </div>
              <div className="num mt-1.5 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {pct(report.upload.success_rate_pct / 100)}
              </div>
            </Card>
            <Card>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Total Volume
              </div>
              <div className="num mt-1.5 text-2xl font-bold text-blue-600 dark:text-blue-400">
                {inr(report.upload.total_amount_inr)}
              </div>
            </Card>
            <Card>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Revenue Lost
              </div>
              <div className="num mt-1.5 text-2xl font-bold text-rose-600 dark:text-rose-400">
                {inr(report.upload.lost_amount_inr)}
              </div>
            </Card>
          </div>

          {/* Failure category breakdown */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card title="Failures by Category">
              {Object.entries(report.upload.by_category).length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No failed transactions in dataset
                </div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(report.upload.by_category).map(([cat, count]) => (
                    <div key={cat} className="flex items-center gap-3 text-xs">
                      <span className="w-44 truncate capitalize font-medium text-slate-700 dark:text-slate-300">
                        {cat.replace(/_/g, ' ')}
                      </span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className="h-full rounded-full bg-amber-500"
                          style={{
                            width: `${(count / report.upload.failed) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="num w-12 text-right font-bold text-slate-900 dark:text-slate-200">{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card title="Failures by Payment Method">
              {Object.entries(report.upload.by_method).length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">No method data</div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(report.upload.by_method).map(([method, count]) => (
                    <div key={method} className="flex items-center gap-3 text-xs">
                      <span className="w-32 capitalize font-medium text-slate-700 dark:text-slate-300">
                        {method.replace(/_/g, ' ')}
                      </span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className="h-full rounded-full bg-blue-500"
                          style={{
                            width: `${(count / report.upload.total_transactions) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="num w-12 text-right font-bold text-slate-900 dark:text-slate-200">{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Detection clusters */}
          <Card
            title={`Detected Leakage Clusters (${report.detection.clusters.length})`}
            subtitle="Ranked by impact with automated AI diagnostics"
          >
            {report.detection.clusters.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                ✓ No critical leakage clusters detected in this dataset.
              </div>
            ) : (
              <div className="space-y-2">
                {report.detection.clusters.slice(0, 10).map((c) => {
                  const diag = report.diagnoses.find((d) => d.cluster_id === c.cluster_id)
                  return (
                    <div
                      key={c.cluster_id}
                      className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 p-3.5"
                    >
                      <div className="flex flex-wrap items-center gap-3 text-xs">
                        <SeverityBadge severity={c.severity} />
                        <span className="font-semibold text-slate-900 dark:text-white">{c.title}</span>
                        <span className="num text-slate-500 dark:text-slate-400">{c.txn_count} txns</span>
                        <span className="num font-bold text-rose-600 dark:text-rose-400">
                          {inr(c.revenue_at_risk_inr)}
                        </span>
                        {diag && (
                          <span className="ml-auto">
                            <ConfidenceBar value={diag.confidence} />
                          </span>
                        )}
                      </div>
                      {diag && (
                        <p className="mt-2 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
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



