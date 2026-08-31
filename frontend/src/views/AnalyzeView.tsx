import { useState } from 'react'
import { api, inr, pct } from '../api'
import type { AnalyzeReport } from '../types'
import { Card, ConfidenceBar, SeverityBadge, AttachmentCard, Alert, AlertTitle, AlertDescription } from '../components/ui'

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

        {/* File Dropzone & Attachment Card */}
        <div className="mt-5 space-y-3">
          {!file ? (
            <label className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-6 text-center hover:border-blue-500 hover:bg-blue-50/20 dark:hover:border-blue-500/40 transition-all cursor-pointer">
              <span className="text-3xl mb-2">📁</span>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Click to browse or drag & drop payment failure logs
              </span>
              <span className="text-[11px] text-slate-400 mt-1">
                Supports Razorpay CSV, Generic CSV, or Excel (.xlsx) up to 25MB
              </span>
              <input
                type="file"
                accept={ACCEPT_MAP[format]}
                onChange={(e) => {
                  setFile(e.target.files?.[0] ?? null)
                  setError(null)
                }}
                className="hidden"
              />
            </label>
          ) : (
            <div className="space-y-3">
              <AttachmentCard
                file={{
                  name: file.name,
                  size: file.size,
                  type: file.type,
                  status: report ? 'analyzed' : busy ? 'uploading' : 'ready',
                }}
                onRemove={() => {
                  setFile(null)
                  setReport(null)
                }}
              />

              <div className="flex justify-end">
                <button
                  onClick={handleAnalyze}
                  disabled={busy}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-600/25 transition-all disabled:opacity-40"
                >
                  {busy ? (
                    <>
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      <span>Analyzing Pattern Recognition…</span>
                    </>
                  ) : (
                    <>
                      <span>🔍</span>
                      <span>Run Isolated Leakage Audit</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Audit Ingestion Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
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



