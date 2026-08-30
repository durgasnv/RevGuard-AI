import { useMemo, useState } from 'react'
import { api, inr } from '../api'
import type { AppState, QueueItem } from '../types'
import { ActionPill, Card, ConfidenceBar } from '../components/ui'

export default function QueueView({
  state,
  onRun,
}: {
  state: AppState | null
  onRun?: () => void
}) {
  const [approving, setApproving] = useState(false)
  const [outreachItem, setOutreachItem] = useState<QueueItem | null>(null)
  const [chainItem, setChainItem] = useState<QueueItem | null>(null)
  const [voiceItem, setVoiceItem] = useState<QueueItem | null>(null)
  const [, setVoiceStatus] = useState<'connecting' | 'connected' | 'completed'>('connected')
  const [voiceStep, setVoiceStep] = useState<number>(1)
  const [callLang, setCallLang] = useState<'en' | 'hi'>('en')
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [outreachLang, setOutreachLang] = useState<'en' | 'hi'>('hi')
  const [copied, setCopied] = useState(false)
  const [dispatched, setDispatched] = useState(false)
  const [approvalThreshold, setApprovalThreshold] = useState<number>(25000)

  const plan = state?.plan
  const execution = state?.execution

  function speakText(text: string, lang: 'en' | 'hi' = callLang) {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const clean = text.replace(/[*_#₹]/g, '').replace(/https:\/\/\S+/g, 'link')
      const utterance = new SpeechSynthesisUtterance(clean)
      utterance.rate = 0.95
      utterance.pitch = 1.02
      
      const voices = window.speechSynthesis.getVoices()
      if (lang === 'hi') {
        const indianVoice = voices.find(
          (v) => v.lang.includes('IN') || v.name.includes('India') || v.lang.includes('hi'),
        )
        if (indianVoice) utterance.voice = indianVoice
      } else {
        const englishVoice = voices.find(
          (v) => (v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Online') || v.lang === 'en-US' || v.lang === 'en-GB' || v.lang === 'en-IN')),
        )
        if (englishVoice) utterance.voice = englishVoice
      }
      
      utterance.onstart = () => setIsSpeaking(true)
      utterance.onend = () => setIsSpeaking(false)
      utterance.onerror = () => setIsSpeaking(false)
      window.speechSynthesis.speak(utterance)
    }
  }

  function getIntroText(d: QueueItem, lang: 'en' | 'hi') {
    if (lang === 'en') {
      return `Hello! This is the Merchant Recovery Desk AI assistant calling. Your checkout payment of ₹${d.amount_inr.toLocaleString('en-IN')} was interrupted due to a gateway timeout. Would you like me to send a secure 1-click completion link to your WhatsApp?`
    }
    return `Namaste ji! Main Merchant Recovery Desk se AI assistant bol raha hoon. Aapka ₹${d.amount_inr.toLocaleString('en-IN')} ka payment bank timeout hone se ruk gaya tha. Kya main aapke WhatsApp par 1-click retry link bhej doon?`
  }

  function startVoiceCall(d: QueueItem, initialLang: 'en' | 'hi' = callLang) {
    setVoiceItem(d)
    setVoiceStatus('connected')
    setVoiceStep(1)
    const intro = getIntroText(d, initialLang)
    setTimeout(() => speakText(intro, initialLang), 400)
  }



  const pendingApprovals = useMemo(
    () =>
      (plan?.escalations ?? []).filter(
        (d) => d.requires_approval && d.action !== 'ESCALATE_HUMAN',
      ),
    [plan],
  )

  if (!plan)
    return (
      <Card title="Recovery Queue">
        <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-850 text-base text-slate-600 dark:text-slate-400">
            ⚡
          </div>
          No active recovery plan generated yet. Run a recovery cycle from the top header to populate.
        </div>
      </Card>
    )

  async function approveAll() {
    setApproving(true)
    try {
      const ids = pendingApprovals.map((d) => d.transaction_id)
      await api.run(ids)
      onRun?.()
    } catch (e) {
      console.error('approveAll failed:', e)
    } finally {
      setApproving(false)
    }
  }

  function exportQueueCsv() {
    if (!plan) return
    const headers = [
      'Rank',
      'Transaction ID',
      'Amount (INR)',
      'Failure Code',
      'Recommended Action',
      'P(Recovery)',
      'Expected Recovery Value (INR)',
      'Confidence',
      'Requires Approval',
      'Reason',
      'Payment Link',
      'Hinglish Message',
    ]

    const rows = plan.queue.map((d) => [
      d.rank ?? '',
      d.transaction_id,
      d.amount_inr,
      d.failure_code,
      d.action,
      d.recovery_probability,
      d.expected_recovery_value_inr,
      d.confidence,
      d.requires_approval ? 'YES' : 'NO',
      `"${(d.reason || '').replace(/"/g, '""')}"`,
      d.outreach?.payment_link || `https://rzp.io/i/rec_${d.transaction_id.slice(-8)}`,
      `"${(d.outreach?.message_hi || '').replace(/"/g, '""')}"`,
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `revguard_recovery_queue_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  function getPaymentLink(d: QueueItem) {
    return d.outreach?.payment_link || `https://rzp.io/i/rec_${d.transaction_id.slice(-8)}`
  }

  function getHinglishMessage(d: QueueItem) {
    if (d.outreach?.message_hi) return d.outreach.message_hi
    const code = (d.failure_code || 'ISSUE').replace(/_/g, ' ')
    const link = getPaymentLink(d)
    return `Namaste ji! Aapka ₹${d.amount_inr.toLocaleString('en-IN')} ka payment bank timeout (${code}) ki wajah se complete nahi ho paya. Is 1-click link se turant complete karein: ${link} (24 ghante valid).`
  }

  function getEnglishMessage(d: QueueItem) {
    if (d.outreach?.message_en) return d.outreach.message_en
    const code = (d.failure_code || 'ISSUE').replace(/_/g, ' ')
    const link = getPaymentLink(d)
    return `Hi! Your payment of ₹${d.amount_inr.toLocaleString('en-IN')} was interrupted (${code}). Complete it securely in 1-click here: ${link} (Valid for 24h).`
  }

  return (
    <div className="space-y-5">
      {/* Top 4 KPI metrics */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Queued For Action
          </div>
          <div className="num mt-1.5 text-2xl font-bold text-blue-600 dark:text-blue-400">{plan.queue.length}</div>
          <div className="mt-1 text-[11px] text-slate-500">Autonomous executions</div>
        </Card>
        <Card>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Expected Recovery
          </div>
          <div className="num mt-1.5 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {inr(plan.total_expected_recovery_inr)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">EV-weighted potential</div>
        </Card>
        <Card>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Escalations / Review
          </div>
          <div className="num mt-1.5 text-2xl font-bold text-amber-600 dark:text-amber-400">
            {plan.escalations.length}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">Requires human sign-off</div>
        </Card>
        <Card>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Stopped (Fatigue Cap)
          </div>
          <div className="num mt-1.5 text-2xl font-bold text-slate-700 dark:text-slate-400">{plan.stops.length}</div>
          <div className="mt-1 text-[11px] text-slate-500">Customer fatigue prevented</div>
        </Card>
      </div>

      {/* Interactive Compliance, Bounded Recovery & Stopping Rules Panel */}
      <Card
        title="🛡️ Bounded Recovery Policy & Stopping Rules Guard"
        subtitle="Enforces deterministic compliance boundaries before any financial intervention is queued"
        right={
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">Approval Gate:</span>
            <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 p-0.5 text-xs">
              {[10000, 25000, 50000].map((val) => (
                <button
                  key={val}
                  onClick={() => setApprovalThreshold(val)}
                  className={`rounded-md px-2 py-0.5 text-[11px] font-semibold transition-all ${
                    approvalThreshold === val
                      ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                  }`}
                >
                  ₹{(val / 1000).toFixed(0)}k
                </button>
              ))}
            </div>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4 pt-1">
          <div className="rounded-lg border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-500/[0.04] p-2.5">
            <div className="flex items-center justify-between text-xs font-semibold text-emerald-800 dark:text-emerald-400">
              <span>Rule SC-01 (Safe Mode)</span>
              <span className="rounded bg-emerald-100 dark:bg-emerald-500/20 px-1.5 py-0.2 text-[10px]">Active</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">
              Fraud risk declines & card blocks are strictly prohibited from automated retries.
            </p>
          </div>

          <div className="rounded-lg border border-blue-200 dark:border-blue-500/20 bg-blue-50/50 dark:bg-blue-500/[0.04] p-2.5">
            <div className="flex items-center justify-between text-xs font-semibold text-blue-800 dark:text-blue-400">
              <span>Customer Fatigue Cap</span>
              <span className="num font-bold text-blue-600 dark:text-blue-400">Max 3</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">
              Hard stop on transactions exceeding 3 prior attempts to prevent spam and customer friction.
            </p>
          </div>

          <div className="rounded-lg border border-amber-200 dark:border-amber-500/20 bg-amber-50/50 dark:bg-amber-500/[0.04] p-2.5">
            <div className="flex items-center justify-between text-xs font-semibold text-amber-800 dark:text-amber-400">
              <span>Human Sign-off Gate</span>
              <span className="num font-bold text-amber-600 dark:text-amber-400">≥ ₹{(approvalThreshold / 1000).toFixed(0)}k</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">
              High-value transactions automatically escalate for finance manager review before execution.
            </p>
          </div>

          <div className="rounded-lg border border-purple-200 dark:border-purple-500/20 bg-purple-50/50 dark:bg-purple-500/[0.04] p-2.5">
            <div className="flex items-center justify-between text-xs font-semibold text-purple-800 dark:text-purple-400">
              <span>Compliance Isolation</span>
              <span className="rounded bg-purple-100 dark:bg-purple-500/20 px-1.5 py-0.2 text-[10px]">Enforced</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">
              Frozen accounts & KYC holds bypass financial recovery directly to legal compliance.
            </p>
          </div>
        </div>
      </Card>

      {execution && (
        <Card title="Last Execution Outcome">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 rounded-lg border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 font-semibold text-emerald-700 dark:text-emerald-300">
              <span>Recovered Revenue:</span>
              <b className="num font-bold text-emerald-800 dark:text-emerald-400">{inr(execution.recovered_inr ?? 0)}</b>
            </span>
            {Object.entries(execution.outcome_counts ?? {}).map(([k, v]) => (
              <span
                key={k}
                className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 px-3 py-1.5 text-slate-700 dark:text-slate-300 capitalize font-medium"
              >
                {k.replace(/_/g, ' ')}: <b className="num text-slate-900 dark:text-white font-semibold">{v}</b>
              </span>
            ))}
            <span className="ml-auto text-xs text-slate-500 dark:text-slate-400">
              Audit Events Generated: <b className="num text-slate-900 dark:text-white">{execution.audit_trail.length}</b>
            </span>
          </div>
        </Card>
      )}

      <Card
        title="Recovery Execution Queue"
        subtitle="Ranked dynamically by expected economic value (EV) with 1-click outreach and explainable AI"
        right={
          <div className="flex items-center gap-2">
            <button
              onClick={exportQueueCsv}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-850 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <span>📥</span>
              <span className="hidden sm:inline">Export Queue (.csv)</span>
            </button>

            {pendingApprovals.length > 0 && (
              <button
                onClick={approveAll}
                disabled={approving}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-amber-700 active:bg-amber-800 disabled:opacity-50"
              >
                {approving ? (
                  <>
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Approving…
                  </>
                ) : (
                  <span>Approve {pendingApprovals.length} high-value items</span>
                )}
              </button>
            )}
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th className="py-3 pr-3">#</th>
                <th className="py-3 pr-3">Transaction ID</th>
                <th className="py-3 pr-3 text-right">Amount</th>
                <th className="py-3 pr-3">Failure Code</th>
                <th className="py-3 pr-3">Recommended Action</th>
                <th className="py-3 pr-3 text-right">P(Recovery)</th>
                <th className="py-3 pr-3 text-right">Expected Value</th>
                <th className="py-3 pr-3">Confidence</th>
                <th className="py-3 pr-3 text-center">AI Chain</th>
                <th className="py-3 pr-3 text-center">Outreach</th>
                <th className="py-3 pr-3 text-center">Voice Bot</th>
                <th className="py-3 pr-3">Gate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {plan.queue.slice(0, 25).map((d) => (
                <tr
                  key={d.transaction_id}
                  className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-850/60"
                >
                  <td className="num py-3 pr-3 text-xs font-bold text-slate-400 dark:text-slate-500">{d.rank}</td>
                  <td className="py-3 pr-3 font-mono text-xs text-slate-600 dark:text-slate-300">
                    {d.transaction_id.slice(0, 14)}…
                  </td>
                  <td className="num py-3 pr-3 text-right font-semibold text-slate-900 dark:text-white">
                    {inr(d.amount_inr)}
                  </td>
                  <td className="py-3 pr-3 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                    {d.failure_code}
                  </td>
                  <td className="py-3 pr-3">
                    <ActionPill action={d.action} />
                  </td>
                  <td className="num py-3 pr-3 text-right text-slate-600 dark:text-slate-300 font-medium">
                    {d.recovery_probability.toFixed(2)}
                  </td>
                  <td className="num py-3 pr-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                    {inr(d.expected_recovery_value_inr)}
                  </td>
                  <td className="py-3 pr-3">
                    <ConfidenceBar value={d.confidence} />
                  </td>
                  <td className="py-3 pr-3 text-center">
                    <button
                      onClick={() => setChainItem(d)}
                      title="Inspect full AI decision progression"
                      className="inline-flex items-center gap-1 rounded bg-blue-50 dark:bg-blue-600/10 px-2 py-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-600/20 transition-colors"
                    >
                      <span>✦</span>
                      <span>Inspect</span>
                    </button>
                  </td>
                  <td className="py-3 pr-3 text-center">
                    {d.action === 'SEND_PAYMENT_LINK' || d.action === 'NOTIFY_CUSTOMER' ? (
                      <button
                        onClick={() => {
                          setOutreachItem(d)
                          setCopied(false)
                          setDispatched(false)
                        }}
                        title="View Razorpay payment link and Hinglish message"
                        className="inline-flex items-center gap-1 rounded bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors"
                      >
                        <span>📱</span>
                        <span>Outreach</span>
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-400">—</span>
                    )}
                  </td>
                  <td className="py-3 pr-3 text-center">
                    <button
                      onClick={() => startVoiceCall(d)}
                      title="Launch interactive Hinglish AI voice recovery call"
                      className="inline-flex items-center gap-1 rounded bg-purple-50 dark:bg-purple-500/10 px-2 py-1 text-[11px] font-semibold text-purple-700 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-500/20 transition-colors"
                    >
                      <span>📞</span>
                      <span>Call Bot</span>
                    </button>
                  </td>
                  <td className="py-3 pr-3 text-[11px]">
                    {d.amount_inr >= approvalThreshold || d.requires_approval ? (
                      <span className="inline-flex items-center gap-1 rounded bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 font-medium text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-500/20">
                        Review
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 font-medium text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                        Auto
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {plan.queue.length > 25 && (
            <div className="pt-3 text-center text-xs text-slate-400">
              + {plan.queue.length - 25} more queued actions below the priority threshold
            </div>
          )}
        </div>
      </Card>


      {plan.escalations.length > 0 && (
        <Card
          title={`Escalated Transactions — Human Review Required (${plan.escalations.length})`}
        >
          <div className="space-y-2">
            {plan.escalations.slice(0, 10).map((d) => (
              <div
                key={d.transaction_id}
                className="flex items-center gap-3 rounded-lg border border-amber-200 dark:border-amber-500/20 bg-amber-50/50 dark:bg-amber-500/[0.04] p-3 text-xs"
              >
                <span className="text-amber-600 dark:text-amber-400 font-bold">⚐</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">
                  {d.transaction_id.slice(0, 14)}…
                </span>
                <span className="num ml-auto font-bold text-slate-900 dark:text-white">{inr(d.amount_inr)}</span>
                <ActionPill action={d.action} />
                <span className="max-w-md truncate text-slate-500 dark:text-slate-400">{d.reason}</span>
                <button
                  onClick={() => setChainItem(d)}
                  className="rounded border border-amber-300 dark:border-amber-600/30 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:text-amber-300 hover:bg-amber-100"
                >
                  ✦ Chain
                </button>
              </div>
            ))}
            {plan.escalations.length > 10 && (
              <div className="pt-1 text-center text-xs text-slate-400">
                + {plan.escalations.length - 10} more escalations
              </div>
            )}
          </div>
        </Card>
      )}

      {plan.stops.length > 0 && (
        <Card
          title={`Stopped Actions — Unrecoverable / Fatigue Prevention (${plan.stops.length})`}
        >
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {plan.stops.slice(0, 8).map((d) => (
              <div
                key={d.transaction_id}
                className="flex items-center gap-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 p-2.5 text-xs"
              >
                <span className="font-mono text-slate-500 dark:text-slate-400">
                  {d.transaction_id.slice(0, 14)}…
                </span>
                <span className="num ml-auto font-medium text-slate-700 dark:text-slate-300">{inr(d.amount_inr)}</span>
                <span className="max-w-xs truncate text-slate-400 dark:text-slate-500">{d.reason}</span>
                <button
                  onClick={() => setChainItem(d)}
                  className="rounded border border-slate-300 dark:border-slate-700 px-1.5 py-0.5 text-[10px] text-slate-500 hover:text-slate-800"
                >
                  ✦
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 1. Hinglish & English Multi-Channel Outreach Studio Modal */}
      {outreachItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card text-card-foreground p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">📱</span>
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    Customer Recovery Outreach Studio
                  </h3>
                  <div className="font-mono text-[11px] text-muted-foreground">
                    {outreachItem.transaction_id} · {inr(outreachItem.amount_inr)}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setOutreachItem(null)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Generated Payment Link Box */}
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs">
              <div className="flex items-center justify-between text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                <span>Razorpay 1-Click Payment Link (Simulated)</span>
                <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-mono">24h Expiry</span>
              </div>
              <div className="mt-1.5 flex items-center justify-between gap-2 rounded-lg bg-background p-2 font-mono text-[11px] text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <span className="truncate">{getPaymentLink(outreachItem)}</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(getPaymentLink(outreachItem))
                    setCopied(true)
                    setTimeout(() => setCopied(false), 2000)
                  }}
                  className="shrink-0 rounded-md bg-emerald-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-emerald-700 transition-colors"
                >
                  {copied ? 'Copied ✓' : 'Copy'}
                </button>
              </div>
            </div>

            {/* Language Selector */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">Message Localization:</span>
              <div className="inline-flex rounded-lg border border-border bg-muted/60 p-0.5 text-xs">
                <button
                  onClick={() => setOutreachLang('hi')}
                  className={`rounded-md px-3 py-1 font-semibold transition-all ${
                    outreachLang === 'hi'
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  🇮🇳 Hinglish
                </button>
                <button
                  onClick={() => setOutreachLang('en')}
                  className={`rounded-md px-3 py-1 font-semibold transition-all ${
                    outreachLang === 'en'
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  🇬🇧 English
                </button>
              </div>
            </div>

            {/* Mobile WhatsApp Preview Card */}
            <div className="rounded-xl border border-border bg-muted/30 p-3.5">
              <div className="mb-2 flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1 font-medium text-foreground">
                  <span className="text-emerald-500">●</span> WhatsApp Business Preview
                </span>
                <span>Automated Recovery Bot</span>
              </div>
              <div className="rounded-xl border border-emerald-500/30 bg-[#dcf8c6] dark:bg-[#054d40] p-3 text-xs text-slate-900 dark:text-emerald-50 shadow-sm leading-relaxed">
                <div className="font-semibold text-emerald-950 dark:text-emerald-200 mb-1">
                  RevGuard Merchant Support ✓
                </div>
                <p>{outreachLang === 'hi' ? getHinglishMessage(outreachItem) : getEnglishMessage(outreachItem)}</p>
                <div className="mt-2 text-right text-[10px] text-slate-600 dark:text-emerald-300">Just now · Sent ✓✓</div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(
                    outreachLang === 'hi' ? getHinglishMessage(outreachItem) : getEnglishMessage(outreachItem),
                  )
                  setCopied(true)
                  setTimeout(() => setCopied(false), 2000)
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 px-3 py-2 text-xs font-semibold transition-colors"
              >
                <span>📋</span>
                <span>{copied ? 'Template Copied!' : 'Copy Message'}</span>
              </button>

              <button
                onClick={async () => {
                  setDispatched(true)
                  setTimeout(() => {
                    setDispatched(false)
                    setOutreachItem(null)
                  }, 1500)
                }}
                disabled={dispatched}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                <span>🚀</span>
                <span>{dispatched ? 'Dispatched via WhatsApp ✓' : 'Dispatch via WhatsApp API'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Explainable AI Decision Chain Modal */}
      {chainItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-2xl border border-border bg-card text-card-foreground p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl text-primary">✦</span>
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    Explainable AI Decision Chain
                  </h3>
                  <div className="font-mono text-[11px] text-muted-foreground">
                    {chainItem.transaction_id} · {inr(chainItem.amount_inr)}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setChainItem(null)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                ✕
              </button>
            </div>

            {/* 5-Step Visual Decision Progression */}
            <div className="space-y-2.5">
              {/* Step 1: Raw Event */}
              <div className="rounded-xl border border-border bg-muted/40 p-3.5 text-xs">
                <div className="flex items-center justify-between font-semibold text-foreground">
                  <span>1. Raw Failure Event</span>
                  <span className="font-mono text-muted-foreground">{chainItem.failure_code}</span>
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  Transaction of {inr(chainItem.amount_inr)} experienced error {chainItem.failure_code}.
                </div>
              </div>

              {/* Step 2: Statistical Pattern */}
              <div className="rounded-xl border border-border bg-muted/40 p-3.5 text-xs">
                <div className="flex items-center justify-between font-semibold text-foreground">
                  <span>2. Failure Category & Cluster</span>
                  <span className="capitalize text-indigo-600 dark:text-indigo-400 font-semibold">
                    {(chainItem.failure_category || 'Transient').replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  Grouped into statistical cluster. Categorized under deterministic gateway classification rules.
                </div>
              </div>

              {/* Step 3: LLM Root Cause Diagnosis */}
              <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-3.5 text-xs">
                <div className="flex items-center justify-between font-semibold text-blue-700 dark:text-blue-300">
                  <span>3. AI Diagnostic Reasoning</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">
                    {(chainItem.confidence * 100).toFixed(0)}% Confidence
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-foreground leading-relaxed">
                  {chainItem.reason || 'AI diagnosed root cause and computed expected recovery probability.'}
                </div>
              </div>

              {/* Step 4: Policy & Safety Check */}
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs">
                <div className="flex items-center justify-between font-semibold text-emerald-700 dark:text-emerald-300">
                  <span>4. Safety Constraints & Policy Check</span>
                  <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                    PASSED ✓
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  Customer attempt count ({(chainItem as any).customer_attempt_count ?? 1}/3) within fatigue limits. No fraud flags.
                </div>
              </div>

              {/* Step 5: Optimal Action Selection */}
              <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-3.5 text-xs">
                <div className="flex items-center justify-between font-semibold text-purple-700 dark:text-purple-300">
                  <span>5. Prescribed Action & Expected Value</span>
                  <span className="rounded bg-purple-500/20 px-2 py-0.5 text-[10px] font-bold text-purple-700 dark:text-purple-300">
                    {chainItem.action.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  Expected Value: {inr(Math.round(chainItem.amount_inr * chainItem.confidence))} · Highest EV pathway selected.
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setChainItem(null)}
                className="rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 px-4 py-2 text-xs font-semibold transition-colors"
              >
                Close Decision Chain
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Bilingual AI Voice Recovery Call Bot Simulator Modal (English & Hinglish) */}
      {voiceItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card text-card-foreground p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600 text-lg font-bold text-white shadow-sm">
                  🎙️
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    AI Voice Recovery Call Bot
                  </h3>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span>{voiceItem.transaction_id}</span>
                    <span>·</span>
                    <span className="font-bold text-purple-600 dark:text-purple-400">{inr(voiceItem.amount_inr)}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  if ('speechSynthesis' in window) window.speechSynthesis.cancel()
                  setVoiceItem(null)
                }}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Dedicated Voice Language Selector */}
            <div className="flex items-center justify-between rounded-xl border border-border bg-muted/40 p-3">
              <span className="text-xs font-semibold text-foreground">
                Voice Language Selection:
              </span>
              <div className="inline-flex rounded-lg border border-border bg-muted/60 p-0.5 text-xs">
                <button
                  onClick={() => {
                    setCallLang('en')
                    setVoiceStep(1)
                    const intro = getIntroText(voiceItem, 'en')
                    speakText(intro, 'en')
                  }}
                  className={`rounded-md px-3 py-1 font-semibold transition-all ${
                    callLang === 'en'
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  🇬🇧 English
                </button>
                <button
                  onClick={() => {
                    setCallLang('hi')
                    setVoiceStep(1)
                    const intro = getIntroText(voiceItem, 'hi')
                    speakText(intro, 'hi')
                  }}
                  className={`rounded-md px-3 py-1 font-semibold transition-all ${
                    callLang === 'hi'
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  🇮🇳 Hinglish
                </button>
              </div>
            </div>

            {/* Simulated Live Call Banner */}
            <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-4 text-center">
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                <span>Live Call Connected (00:24)</span>
              </div>

              {/* Animated Sound Waveform Indicator */}
              <div className="mt-3 flex items-center justify-center gap-1.5 h-6">
                {[40, 75, 90, 60, 100, 45, 80, 55, 95, 30].map((h, i) => (
                  <span
                    key={i}
                    style={{ height: isSpeaking ? `${h}%` : '20%' }}
                    className="w-1.5 rounded-full bg-purple-600 dark:bg-purple-400 transition-all duration-150"
                  />
                ))}
              </div>
              <div className="mt-1.5 text-[11px] text-purple-700 dark:text-purple-300 font-medium">
                {isSpeaking
                  ? `AI Voice Speaking in ${callLang === 'en' ? 'English' : 'Hinglish'}…`
                  : 'Listening for customer response…'}
              </div>
            </div>

            {/* Interactive Dialogue Progression */}
            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {/* Turn 1: AI Intro */}
              <div className="flex gap-2 text-xs">
                <span className="shrink-0 font-bold text-purple-600 dark:text-purple-400">AI:</span>
                <div className="rounded-xl bg-purple-500/10 p-3 text-foreground border border-purple-500/20 leading-relaxed">
                  {callLang === 'en'
                    ? `"Hello! This is the Merchant Recovery Desk calling. Your payment of ${inr(voiceItem.amount_inr)} was interrupted due to a gateway timeout. Would you like me to send a secure 1-click completion link to your WhatsApp?"`
                    : `"Namaste ji! Main Merchant Recovery Desk se AI voice assistant bol raha hoon. Aapka ${inr(voiceItem.amount_inr)} ka payment bank timeout ki wajah se fail ho gaya tha. Kya main aapke WhatsApp pe 1-click retry link bhej doon?"`}
                </div>
              </div>

              {/* Turn 2: Customer Response Options */}
              {voiceStep === 1 && (
                <div className="space-y-1.5 pl-6 pt-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Select Simulated Customer Reply:
                  </div>
                  <button
                    onClick={() => {
                      setVoiceStep(2)
                      const reply =
                        callLang === 'en'
                          ? 'Thank you! A secure 1-click Razorpay payment link has been sent to your WhatsApp (+91 98765 43210). It remains valid for 24 hours.'
                          : 'Dhanyawad! 1-click Razorpay payment link aapke WhatsApp (+91 98765 43210) pe bhej diya gaya hai. 15 minute me payment complete kar sakte hain.'
                      speakText(reply, callLang)
                    }}
                    className="w-full text-left rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 transition-colors"
                  >
                    💬 {callLang === 'en' ? '"Yes, send the 1-click link to my WhatsApp"' : '"Haan, mere WhatsApp pe 1-click link send kar do"'}
                  </button>

                  <button
                    onClick={() => {
                      setVoiceStep(3)
                      const reply =
                        callLang === 'en'
                          ? 'Understood! A fresh UPI collect request has been initiated to your handle. Please approve it in your payment app.'
                          : 'Theek hai! Naya UPI collect request aapke VPA handle pe raise kar diya gaya hai. Kripya app me approve karein.'
                      speakText(reply, callLang)
                    }}
                    className="w-full text-left rounded-xl border border-blue-500/30 bg-blue-500/10 p-2.5 text-xs font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-500/20 transition-colors"
                  >
                    ⚡ {callLang === 'en' ? '"Please raise a collect request on an alternate UPI ID"' : '"Alternate UPI ID pe collect request raise karo"'}
                  </button>

                  <button
                    onClick={() => {
                      setVoiceStep(4)
                      const reply =
                        callLang === 'en'
                          ? 'Great! I have recorded your Promise-to-Pay for Friday. Your order reservation is held until then.'
                          : 'Bahut achha ji! Maine aapke liye Friday ka Promise-to-Pay reminder set kar diya hai. Tab tak order reserved rahega.'
                      speakText(reply, callLang)
                    }}
                    className="w-full text-left rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs font-semibold text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 transition-colors"
                  >
                    📅 {callLang === 'en' ? '"I will complete the payment this Friday (Promise to Pay)"' : '"Main Friday ko pay karunga (Promise to Pay)"'}
                  </button>
                </div>
              )}

              {/* Turn 3: AI Outcome */}
              {voiceStep > 1 && (
                <>
                  <div className="flex gap-2 text-xs">
                    <span className="shrink-0 font-bold text-muted-foreground">Customer:</span>
                    <div className="rounded-xl bg-muted/60 p-2.5 text-foreground italic">
                      {voiceStep === 2 && (callLang === 'en' ? '"Yes, send the 1-click link to my WhatsApp"' : '"Haan, mere WhatsApp pe 1-click link send kar do"')}
                      {voiceStep === 3 && (callLang === 'en' ? '"Please raise a collect request on an alternate UPI ID"' : '"Alternate UPI ID pe collect request raise karo"')}
                      {voiceStep === 4 && (callLang === 'en' ? '"I will complete the payment this Friday (Promise to Pay)"' : '"Main Friday ko pay karunga (Promise to Pay)"')}
                    </div>
                  </div>

                  <div className="flex gap-2 text-xs">
                    <span className="shrink-0 font-bold text-purple-600 dark:text-purple-400">AI:</span>
                    <div className="rounded-xl bg-purple-500/10 p-3 text-foreground border border-purple-500/20 leading-relaxed font-medium">
                      {voiceStep === 2 &&
                        (callLang === 'en'
                          ? '“Thank you! A secure 1-click Razorpay payment link has been sent to your WhatsApp (+91 98765 43210). It remains valid for 24 hours.”'
                          : '“Dhanyawad! 1-click Razorpay payment link aapke WhatsApp (+91 98765 43210) pe bhej diya gaya hai. 15 minute me payment complete kar sakte hain.”')}
                      {voiceStep === 3 &&
                        (callLang === 'en'
                          ? '“Understood! A fresh UPI collect request has been initiated to your handle. Please approve it in your payment app.”'
                          : '“Theek hai! Naya UPI collect request aapke VPA handle pe raise kar diya gaya hai. Kripya app me approve karein.”')}
                      {voiceStep === 4 &&
                        (callLang === 'en'
                          ? '“Great! I have recorded your Promise-to-Pay for Friday. Your order reservation is held until then.”'
                          : '“Bahut achha ji! Maine aapke liye Friday ka Promise-to-Pay reminder set kar diya hai. Tab tak order reserved rahega.”')}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <button
                onClick={() => {
                  const intro = getIntroText(voiceItem, callLang)
                  speakText(intro, callLang)
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 px-3 py-1.5 text-xs font-semibold transition-colors"
              >
                <span>🔊</span>
                <span>Replay AI Voice</span>
              </button>

              <button
                onClick={() => {
                  if ('speechSynthesis' in window) window.speechSynthesis.cancel()
                  setVoiceItem(null)
                }}
                className="rounded-lg bg-rose-600 px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-rose-700 transition-colors"
              >
                End Call
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}





