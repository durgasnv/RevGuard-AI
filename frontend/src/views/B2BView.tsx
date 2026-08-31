import { Fragment, useEffect, useState } from 'react'
import { api, inr } from '../api'
import type { B2BInvoice, B2BSummary } from '../types'
import { Card } from '../components/ui'

export default function B2BView() {
  const [invoices, setInvoices] = useState<B2BInvoice[]>([])
  const [summary, setSummary] = useState<B2BSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedBucket, setSelectedBucket] = useState<string>('all')
  const [openId, setOpenId] = useState<string | null>(null)
  const [ptpInvoice, setPtpInvoice] = useState<B2BInvoice | null>(null)
  const [ptpDate, setPtpDate] = useState('')
  const [ptpAmount, setPtpAmount] = useState<number>(0)
  const [ptpNotes, setPtpNotes] = useState('')
  const [chasingId, setChasingId] = useState<string | null>(null)
  const [recoveredId, setRecoveredId] = useState<string | null>(null)

  async function loadData() {
    try {
      setLoading(true)
      const res = await api.b2bInvoices()
      setInvoices(res.invoices)
      setSummary(res.summary)
    } catch (e) {
      console.error('Failed to load B2B invoices:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  async function submitPtp() {
    if (!ptpInvoice || !ptpDate) return
    try {
      await api.b2bSetPtp(ptpInvoice.invoice_id, ptpDate, ptpAmount || ptpInvoice.amount_inr, ptpNotes)
      setPtpInvoice(null)
      await loadData()
    } catch (e) {
      console.error('submitPtp failed:', e)
    }
  }

  async function handleChase(invoiceId: string) {
    try {
      setChasingId(invoiceId)
      await api.b2bChase(invoiceId)
      await loadData()
    } catch (e) {
      console.error('handleChase failed:', e)
    } finally {
      setChasingId(null)
    }
  }

  async function handleRecover(invoiceId: string) {
    try {
      setRecoveredId(invoiceId)
      await api.b2bRecover(invoiceId)
      await loadData()
    } catch (e) {
      console.error('handleRecover failed:', e)
    } finally {
      setRecoveredId(null)
    }
  }

  const filteredInvoices = invoices.filter((inv) => {
    if (selectedBucket === 'all') return true
    return inv.aging_bucket === selectedBucket
  })

  function getBucketBadge(bucket: string) {
    switch (bucket) {
      case '1_30_days':
        return (
          <span className="rounded bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">
            1–30 Days
          </span>
        )
      case '31_60_days':
        return (
          <span className="rounded bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
            31–60 Days
          </span>
        )
      case '61_90_days':
        return (
          <span className="rounded bg-orange-50 dark:bg-orange-500/10 px-2 py-0.5 text-[10px] font-semibold text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-500/20">
            61–90 Days
          </span>
        )
      case '90_plus_days':
        return (
          <span className="rounded bg-rose-50 dark:bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20">
            90+ Days (Critical)
          </span>
        )
      default:
        return null
    }
  }

  function getDunningBadge(stage: string) {
    switch (stage) {
      case 'gentle_nudge':
        return <span className="text-slate-600 dark:text-slate-400 text-xs">💬 1. Gentle Nudge</span>
      case 'invoice_link':
        return <span className="text-blue-600 dark:text-blue-400 font-medium text-xs">🔗 2. 1-Click Link</span>
      case 'finance_director':
        return <span className="text-amber-600 dark:text-amber-400 font-semibold text-xs">⚠️ 3. CFO Escalation</span>
      case 'legal_notice':
        return <span className="text-rose-600 dark:text-rose-400 font-bold text-xs">⚖️ 4. Formal Demand</span>
      default:
        return null
    }
  }

  return (
    <div className="space-y-5">
      {/* 1. B2B Summary KPI Grid */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Total Overdue Receivables
          </div>
          <div className="num mt-1.5 text-2xl font-bold text-rose-600 dark:text-rose-400">
            {summary ? inr(summary.total_overdue_inr) : '—'}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">{summary?.total_invoices ?? 0} active corporate invoices</div>
        </Card>

        <Card>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Promise-to-Pay (PTP) Committed
          </div>
          <div className="num mt-1.5 text-2xl font-bold text-blue-600 dark:text-blue-400">
            {summary ? inr(summary.total_ptp_committed_inr) : '—'}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">Committed payment schedule</div>
        </Card>

        <Card>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Recovered B2B Revenue
          </div>
          <div className="num mt-1.5 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {summary ? inr(summary.total_recovered_inr) : '—'}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">Settled through AI Chaser</div>
        </Card>

        <Card>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            High-Risk Exposure (90+ Days)
          </div>
          <div className="num mt-1.5 text-2xl font-bold text-amber-600 dark:text-amber-400">
            {summary ? inr(summary.total_high_risk_inr) : '—'}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">Requires executive escalation</div>
        </Card>
      </div>

      {/* 2. UPI AutoPay & Mandate Smart Retry Sequencer Banner */}
      <Card
        title="🔄 UPI AutoPay & Recurring Mandate Smart Retry Sequencer"
        subtitle="Synchronizes retries with customer liquidity & salary cycles rather than blind daily retries"
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 pt-1">
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 p-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white">
              <span>Stage 1: Transient Backoff</span>
              <span className="font-mono text-[10px] text-slate-500">T + 2h</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">
              Immediate ping to check acquiring bank switch latency. Prevents false subscription churn.
            </p>
            <div className="mt-2 text-[10px] font-semibold text-blue-600 dark:text-blue-400">Historical Recovery: 38%</div>
          </div>

          <div className="rounded-lg border border-indigo-200 dark:border-indigo-500/20 bg-indigo-50/50 dark:bg-indigo-500/[0.04] p-3">
            <div className="flex items-center justify-between text-xs font-bold text-indigo-900 dark:text-indigo-300">
              <span>Stage 2: Liquidity Synchronizer</span>
              <span className="font-mono text-[10px] text-indigo-600 dark:text-indigo-400">T + 24h (9:00 AM)</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">
              Fires at 9:00 AM post-salary credit window. High balance availability window.
            </p>
            <div className="mt-2 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">Historical Recovery: 78%</div>
          </div>

          <div className="rounded-lg border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-500/[0.04] p-3">
            <div className="flex items-center justify-between text-xs font-bold text-emerald-900 dark:text-emerald-300">
              <span>Stage 3: 1-Click Alternate Link</span>
              <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400">T + 72h</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">
              Dispatches 1-click fallback link before mandate hard-cancellation.
            </p>
            <div className="mt-2 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">Churn Avoided: 89%</div>
          </div>
        </div>
      </Card>

      {/* 3. B2B Aging Invoices Worklist */}
      <Card
        title="B2B Receivables & Promise-to-Pay (PTP) Ledger"
        subtitle="Autonomous dunning chaser and commitment tracking for corporate clients"
        right={
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'all', label: 'All Invoices' },
              { id: '1_30_days', label: '1–30d' },
              { id: '31_60_days', label: '31–60d' },
              { id: '61_90_days', label: '61–90d' },
              { id: '90_plus_days', label: '90+d' },
            ].map((b) => (
              <button
                key={b.id}
                onClick={() => setSelectedBucket(b.id)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                  selectedBucket === b.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th className="py-3 pr-3">Invoice ID</th>
                <th className="py-3 pr-3">Client Name</th>
                <th className="py-3 pr-3 text-right">Amount</th>
                <th className="py-3 pr-3">Aging Bucket</th>
                <th className="py-3 pr-3">Status</th>
                <th className="py-3 pr-3">Dunning Stage</th>
                <th className="py-3 pr-3 text-center">Promise-to-Pay</th>
                <th className="py-3 pr-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {filteredInvoices.map((inv) => {
                const open = openId === inv.invoice_id
                return (
                  <Fragment key={inv.invoice_id}>
                    <tr
                      onClick={() => setOpenId(open ? null : inv.invoice_id)}
                      className={`cursor-pointer transition-colors ${
                        open ? 'bg-blue-50/50 dark:bg-blue-600/10' : 'hover:bg-slate-50 dark:hover:bg-slate-850/60'
                      }`}
                    >
                      <td className="py-3 pr-3 font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {inv.invoice_id}
                      </td>
                      <td className="py-3 pr-3">
                        <div className="font-semibold text-slate-900 dark:text-white">{inv.client_name}</div>
                        <div className="text-[11px] text-slate-500">{inv.client_contact} · {inv.client_email}</div>
                      </td>
                      <td className="num py-3 pr-3 text-right font-bold text-slate-900 dark:text-white">
                        {inr(inv.amount_inr)}
                      </td>
                      <td className="py-3 pr-3">{getBucketBadge(inv.aging_bucket)}</td>
                      <td className="py-3 pr-3">
                        {inv.status === 'recovered' ? (
                          <span className="rounded bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                            ✓ Settled
                          </span>
                        ) : inv.status === 'promised_to_pay' ? (
                          <span className="rounded bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">
                            📅 PTP Committed
                          </span>
                        ) : (
                          <span className="rounded bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-500/20">
                            {inv.overdue_days}d Overdue
                          </span>
                        )}
                      </td>
                      <td className="py-3 pr-3">{getDunningBadge(inv.dunning_stage)}</td>
                      <td className="py-3 pr-3 text-center">
                        {inv.ptp ? (
                          <div className="text-[11px]">
                            <span className="font-semibold text-blue-600 dark:text-blue-400">{inv.ptp.promised_date}</span>
                          </div>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setPtpInvoice(inv)
                              setPtpDate(new Date(Date.now() + 4 * 86400000).toISOString().slice(0, 10))
                              setPtpAmount(inv.amount_inr)
                              setPtpNotes('')
                            }}
                            className="rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 shadow-sm"
                          >
                            + Record PTP
                          </button>
                        )}
                      </td>
                      <td className="py-3 pr-3 text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          {inv.status !== 'recovered' && (
                            <>
                              <button
                                onClick={() => handleChase(inv.invoice_id)}
                                disabled={chasingId === inv.invoice_id}
                                className="rounded bg-blue-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                              >
                                {chasingId === inv.invoice_id ? 'Chasing…' : '⚡ AI Chase'}
                              </button>

                              <button
                                onClick={() => handleRecover(inv.invoice_id)}
                                disabled={recoveredId === inv.invoice_id}
                                className="rounded bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                              >
                                {recoveredId === inv.invoice_id ? 'Settling…' : '✓ Settle'}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>

                    {open && (
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900">
                        <td colSpan={8} className="p-4">
                          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 shadow-sm space-y-3 text-xs">
                            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                              <span className="font-bold text-slate-900 dark:text-white">
                                Timeline & Dunning Audit Trail — {inv.invoice_id}
                              </span>
                              <span className="font-mono text-slate-500">Corporate Link: {inv.payment_link}</span>
                            </div>

                            {inv.ptp && (
                              <div className="rounded border border-blue-200 dark:border-blue-500/20 bg-blue-50/50 dark:bg-blue-500/[0.04] p-2.5">
                                <div className="font-bold text-blue-900 dark:text-blue-300">
                                  Promise-to-Pay Commitment Registered:
                                </div>
                                <div className="mt-0.5 text-slate-600 dark:text-slate-400">
                                  Promised settlement of {inr(inv.ptp.promised_amount_inr)} on <b>{inv.ptp.promised_date}</b>. Note: "{inv.ptp.notes}"
                                </div>
                              </div>
                            )}

                            <div className="space-y-1.5 pt-1">
                              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Chronological Activity Trail:
                              </div>
                              {inv.timeline.map((item, idx) => (
                                <div key={idx} className="flex items-start gap-2 text-slate-600 dark:text-slate-300">
                                  <span className="text-blue-500">●</span>
                                  <span>{item}</span>
                                </div>
                              ))}
                            </div>
                          </div>
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

      {/* Record Promise-to-Pay (PTP) Modal */}
      {ptpInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">📅</span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Record Promise-to-Pay (PTP)
                  </h3>
                  <div className="font-mono text-[11px] text-slate-500">
                    {ptpInvoice.invoice_id} · {ptpInvoice.client_name}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setPtpInvoice(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Promised Settlement Date:
                </label>
                <input
                  type="date"
                  value={ptpDate}
                  onChange={(e) => setPtpDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-slate-900 dark:text-white focus:outline-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Promised Amount (INR):
                </label>
                <input
                  type="number"
                  value={ptpAmount}
                  onChange={(e) => setPtpAmount(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-slate-900 dark:text-white focus:outline-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Commitment Note & Verification:
                </label>
                <textarea
                  rows={3}
                  value={ptpNotes}
                  onChange={(e) => setPtpNotes(e.target.value)}
                  placeholder="e.g. Finance manager confirmed payment scheduled post invoice validation."
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-slate-900 dark:text-white focus:outline-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setPtpInvoice(null)}
                className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={submitPtp}
                className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
              >
                Save PTP Commitment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
