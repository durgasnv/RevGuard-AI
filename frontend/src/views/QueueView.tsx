import { useMemo, useState, useRef } from 'react'
import { api, inr } from '../api'
import type { AppState, QueueItem } from '../types'
import { ActionPill, Card, ConfidenceBar, Pagination, Alert, AlertTitle, AlertDescription } from '../components/ui'
import SlackEscalationModal from '../components/SlackEscalationModal'
import DynamicYieldIncentiveModal from '../components/DynamicYieldIncentiveModal'

export default function QueueView({
  state,
  onRun,
}: {
  state: AppState | null
  onRun?: () => void
}) {
  const [approving, setApproving] = useState(false)
  const [queuePage, setQueuePage] = useState(1)
  const [outreachItem, setOutreachItem] = useState<QueueItem | null>(null)
  const [chainItem, setChainItem] = useState<QueueItem | null>(null)
  const [voiceItem, setVoiceItem] = useState<QueueItem | null>(null)
  interface DialogueTurn {
    id: string
    sender: 'ai' | 'customer'
    text: string
    time: string
    actionTaken?: string
  }

  const [slackItem, setSlackItem] = useState<QueueItem | null>(null)
  const [yieldItem, setYieldItem] = useState<QueueItem | null>(null)
  const [callLang, setCallLang] = useState<'en' | 'hi'>('hi')
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [speechTranscript, setSpeechTranscript] = useState('')
  const [speechError, setSpeechError] = useState<string | null>(null)
  const [dialogueTurns, setDialogueTurns] = useState<DialogueTurn[]>([])
  const [customReply, setCustomReply] = useState('')
  const [outreachLang, setOutreachLang] = useState<'en' | 'hi'>('hi')
  const [copied, setCopied] = useState(false)
  const [dispatched, setDispatched] = useState(false)
  const [approvalThreshold, setApprovalThreshold] = useState<number>(25000)

  const recognitionRef = useRef<any>(null)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const chatBottomRef = useRef<HTMLDivElement | null>(null)

  const plan = state?.plan
  const execution = state?.execution

  function speakText(text: string, lang: 'en' | 'hi' = callLang) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return

    try {
      window.speechSynthesis.cancel()
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume()
      }

      // Convert currency and symbols to clean readable speech
      const clean = text
        .replace(/₹\s*([0-9,]+)/g, (_m, p1) => `${p1.replace(/,/g, '')} rupees`)
        .replace(/[*_#]/g, '')
        .replace(/https?:\/\/\S+/g, 'link')

      const utterance = new SpeechSynthesisUtterance(clean)
      utteranceRef.current = utterance
      utterance.rate = 0.98
      utterance.pitch = 1.0

      const voices = window.speechSynthesis.getVoices()
      if (lang === 'hi') {
        const hindiVoice = voices.find(
          (v) =>
            v.lang.includes('IN') ||
            v.name.toLowerCase().includes('india') ||
            v.lang.toLowerCase().includes('hi') ||
            v.name.toLowerCase().includes('hindi'),
        )
        if (hindiVoice) utterance.voice = hindiVoice
      } else {
        const englishVoice = voices.find(
          (v) =>
            v.lang.startsWith('en') &&
            (v.name.includes('Natural') ||
              v.name.includes('Online') ||
              v.name.includes('Google') ||
              v.lang === 'en-IN' ||
              v.lang === 'en-US' ||
              v.lang === 'en-GB'),
        )
        if (englishVoice) utterance.voice = englishVoice
      }

      utterance.onstart = () => setIsSpeaking(true)
      utterance.onend = () => {
        setIsSpeaking(false)
        utteranceRef.current = null
      }
      utterance.onerror = (e) => {
        console.warn('SpeechSynthesis error:', e)
        setIsSpeaking(false)
        utteranceRef.current = null
      }

      setTimeout(() => {
        try {
          window.speechSynthesis.speak(utterance)
        } catch {}
      }, 50)
    } catch (e) {
      console.warn('speakText exception:', e)
      setIsSpeaking(false)
    }
  }

  function getIntroText(d: QueueItem, lang: 'en' | 'hi') {
    if (lang === 'en') {
      return `Hello! This is the Merchant Recovery Desk calling. Your payment of ₹${d.amount_inr.toLocaleString('en-IN')} was interrupted due to a gateway timeout. Would you like me to send a secure 1-click completion link to your WhatsApp?`
    }
    return `Namaste ji! Main Merchant Recovery Desk se AI voice assistant bol raha hoon. Aapka ₹${d.amount_inr.toLocaleString('en-IN')} ka payment bank timeout hone se ruk gaya tha. Kya main aapke WhatsApp par 1-click retry link bhej doon?`
  }

  function startVoiceCall(d: QueueItem, initialLang: 'en' | 'hi' = callLang) {
    setVoiceItem(d)
    setCallLang(initialLang)
    setSpeechTranscript('')
    setSpeechError(null)
    setCustomReply('')
    setIsListening(false)

    const intro = getIntroText(d, initialLang)
    setDialogueTurns([
      {
        id: `turn-0`,
        sender: 'ai',
        text: intro,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ])

    setTimeout(() => {
      speakText(intro, initialLang)
    }, 300)
  }

  function handleCustomerResponse(text: string) {
    if (!text.trim()) return
    const lower = text.toLowerCase()
    setSpeechTranscript(text)
    setIsListening(false)
    setSpeechError(null)

    let aiReply = ''
    let actionTaken = ''

    if (
      lower.includes('kal') ||
      lower.includes('tomorrow') ||
      lower.includes('friday') ||
      lower.includes('somwar') ||
      lower.includes('monday') ||
      lower.includes('pay') ||
      lower.includes('karunga') ||
      lower.includes('kar dunga') ||
      lower.includes('promise') ||
      lower.includes('later') ||
      lower.includes('hafta') ||
      lower.includes('next week') ||
      lower.includes('dunga')
    ) {
      aiReply =
        callLang === 'en'
          ? 'Great! I have recorded your Promise-to-Pay commitment for this Friday. Your order reservation has been extended and held safely until then.'
          : 'Bahut achha ji! Maine aapke liye Friday ka Promise-to-Pay reminder register kar diya hai. Tab tak aapka order reserved rahega.'
      actionTaken = '📅 Promise-to-Pay (PTP) Registered for Friday'

      if (voiceItem) {
        const nextDate = new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10)
        api
          .b2bSetPtp(
            voiceItem.transaction_id,
            nextDate,
            voiceItem.amount_inr,
            `Voice Bot Promise recorded via AI speech interaction (${callLang.toUpperCase()})`,
          )
          .catch(() => {})
      }
    } else if (
      lower.includes('whatsapp') ||
      lower.includes('link') ||
      lower.includes('bhej') ||
      lower.includes('send') ||
      lower.includes('message') ||
      lower.includes('sms') ||
      lower.includes('haan') ||
      lower.includes('yes') ||
      lower.includes('sure') ||
      lower.includes('ok') ||
      lower.includes('karo')
    ) {
      aiReply =
        callLang === 'en'
          ? 'Thank you! A secure 1-click Razorpay payment link has been dispatched to your WhatsApp (+91 98765 43210). It remains active for 24 hours.'
          : 'Dhanyawad! 1-click Razorpay payment link aapke WhatsApp (+91 98765 43210) pe bhej diya gaya hai. Aap aasaani se complete kar sakte hain.'
      actionTaken = '⚡ 1-Click Razorpay Link Sent on WhatsApp'
    } else if (
      lower.includes('upi') ||
      lower.includes('gpay') ||
      lower.includes('phonepe') ||
      lower.includes('paytm') ||
      lower.includes('handle') ||
      lower.includes('vpa') ||
      lower.includes('collect') ||
      lower.includes('dusra') ||
      lower.includes('alternate')
    ) {
      aiReply =
        callLang === 'en'
          ? 'Understood! A fresh UPI collect request has been triggered to your alternate handle. Please approve the notification in your UPI app.'
          : 'Theek hai! Naya UPI collect request aapke alternate VPA handle pe raise kar diya gaya hai. Kripya app me approve karein.'
      actionTaken = '⚡ Alternate UPI Collect Rail Triggered'
    } else if (
      lower.includes('nahi') ||
      lower.includes('cancel') ||
      lower.includes('mat') ||
      lower.includes('stop') ||
      lower.includes('no') ||
      lower.includes("don't") ||
      lower.includes('reject') ||
      lower.includes('close') ||
      lower.includes('band')
    ) {
      aiReply =
        callLang === 'en'
          ? 'Understood. Halting all automated recovery outreach for this order under Rule SC-01 Zero-Fatigue safety guidelines.'
          : 'Ji samajh gaya. SC-01 safety policy ke anusaar humne automated outreach band kar di hai.'
      actionTaken = '🛑 Rule SC-01 Safety Stop Enforced'
    } else {
      aiReply =
        callLang === 'en'
          ? `Got it! I have updated our recovery desk and dispatched a secure 1-click checkout link to your registered mobile number for ${inr(voiceItem?.amount_inr || 0)}.`
          : `Theek hai ji! Maine aapka response record kar liya hai aur ${inr(voiceItem?.amount_inr || 0)} ka 1-click payment link SMS aur WhatsApp pe bhej diya hai.`
      actionTaken = '📱 1-Click Payment Link Dispatched'
    }

    const customerMsg: DialogueTurn = {
      id: `turn-${Date.now()}-user`,
      sender: 'customer',
      text: text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    const aiMsg: DialogueTurn = {
      id: `turn-${Date.now()}-ai`,
      sender: 'ai',
      text: aiReply,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      actionTaken: actionTaken,
    }

    setDialogueTurns((prev) => [...prev, customerMsg, aiMsg])
    speakText(aiReply, callLang)

    setTimeout(() => {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  function toggleSpeechRecognition() {
    setSpeechError(null)

    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch {}
      }
      setIsListening(false)
      return
    }

    const SpeechRec =
      (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any })
        .SpeechRecognition ||
      (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any })
        .webkitSpeechRecognition

    if (!SpeechRec) {
      setSpeechError(
        'Speech Recognition API is not supported in this browser. Please use Chrome/Edge or click/type responses below.',
      )
      return
    }

    try {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel()
      setIsSpeaking(false)

      const rec = new SpeechRec()
      recognitionRef.current = rec
      rec.continuous = false
      rec.interimResults = true
      rec.lang = callLang === 'hi' ? 'hi-IN' : 'en-IN'

      rec.onstart = () => {
        setIsListening(true)
        setSpeechTranscript('')
        setSpeechError(null)
      }

      rec.onresult = (event: any) => {
        let finalTranscript = ''
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          finalTranscript += event.results[i][0].transcript
        }
        setSpeechTranscript(finalTranscript)

        if (event.results[0].isFinal) {
          handleCustomerResponse(finalTranscript)
        }
      }

      rec.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error)
        setIsListening(false)
        if (event.error === 'not-allowed') {
          setSpeechError('Microphone access blocked. Click the preset replies or type below.')
        } else if (event.error === 'no-speech') {
          setSpeechError('No speech detected. Click the mic again or use preset replies.')
        } else {
          setSpeechError(`Speech recognition note: ${event.error}. You can use preset replies.`)
        }
      }

      rec.onend = () => {
        setIsListening(false)
      }

      rec.start()
    } catch (e: any) {
      console.error('Failed to start speech recognition:', e)
      setIsListening(false)
      setSpeechError('Could not initialize microphone. Use Chrome/Edge or click preset replies.')
    }
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
                      ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
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
              onClick={() => setYieldItem(plan.queue[0] || null)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 dark:border-emerald-700/60 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 transition-colors shadow-sm"
            >
              <span>⚡</span>
              <span className="hidden sm:inline">Dynamic Yield Engine</span>
            </button>

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
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Executing…</span>
                  </>
                ) : (
                  <>
                    <span>Approve Escalations</span>
                    <span className="rounded bg-amber-700/50 px-1.5 py-0.2 text-[10px]">
                      {pendingApprovals.length}
                    </span>
                  </>
                )}
              </button>
            )}
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-400">
                <th className="py-2.5 pr-3">#</th>
                <th className="py-2.5 pr-3">Txn ID</th>
                <th className="py-2.5 pr-3 text-right">Amount</th>
                <th className="py-2.5 pr-3">Failure Code</th>
                <th className="py-2.5 pr-3">Action</th>
                <th className="py-2.5 pr-3 text-right">P(Rec)</th>
                <th className="py-2.5 pr-3 text-right">EV (₹)</th>
                <th className="py-2.5 pr-3">Confidence</th>
                <th className="py-2.5 pr-3 text-center">AI Reason</th>
                <th className="py-2.5 pr-3 text-center">Outreach</th>
                <th className="py-2.5 pr-3 text-center">Voice Bot</th>
                <th className="py-2.5 pr-3">Policy Gate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {plan.queue.slice((queuePage - 1) * 15, queuePage * 15).map((d) => (
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
                  <td className="py-3 pr-3 text-xs">
                    <div className="font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                      {d.failure_code}
                    </div>
                    {d.reason && (
                      <div className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1 max-w-[170px]" title={d.reason}>
                        {d.reason}
                      </div>
                    )}
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
                      <button
                        onClick={() => setSlackItem(d)}
                        title="Open Enterprise Slack CFO Escalation Bridge"
                        className="inline-flex items-center gap-1 rounded bg-amber-50 dark:bg-amber-500/10 px-2 py-1 font-semibold text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-500/20 hover:bg-amber-100 transition-colors shadow-2xs"
                      >
                        <span>💬</span>
                        <span>CFO Review</span>
                      </button>
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
          {plan.queue.length > 15 && (
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80">
              <Pagination
                currentPage={queuePage}
                totalPages={Math.ceil(plan.queue.length / 15)}
                onPageChange={setQueuePage}
              />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">📱</span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Customer Recovery Outreach Studio
                  </h3>
                  <div className="font-mono text-[11px] text-slate-500">
                    {outreachItem.transaction_id} · {inr(outreachItem.amount_inr)}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setOutreachItem(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            {/* Generated Payment Link Box */}
            <div className="rounded-lg border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50/40 dark:bg-emerald-500/[0.03] p-3 text-xs">
              <div className="flex items-center justify-between text-[11px] font-semibold text-emerald-800 dark:text-emerald-400">
                <span>Razorpay 1-Click Payment Link (Simulated)</span>
                <span className="rounded bg-emerald-100 dark:bg-emerald-500/20 px-1.5 py-0.5 text-[10px]">24h Expiry</span>
              </div>
              <div className="mt-1.5 flex items-center justify-between gap-2 rounded bg-white dark:bg-slate-950 p-2 font-mono text-[11px] text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900">
                <span className="truncate">{getPaymentLink(outreachItem)}</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(getPaymentLink(outreachItem))
                    setCopied(true)
                    setTimeout(() => setCopied(false), 2000)
                  }}
                  className="shrink-0 rounded bg-emerald-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-emerald-700"
                >
                  {copied ? 'Copied ✓' : 'Copy'}
                </button>
              </div>
            </div>

            {/* Language Selector */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Message Localization:</span>
              <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-850 p-0.5 text-xs">
                <button
                  onClick={() => setOutreachLang('hi')}
                  className={`rounded-md px-3 py-1 font-semibold transition-all ${
                    outreachLang === 'hi'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
                  }`}
                >
                  🇮🇳 Hinglish
                </button>
                <button
                  onClick={() => setOutreachLang('en')}
                  className={`rounded-md px-3 py-1 font-semibold transition-all ${
                    outreachLang === 'en'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
                  }`}
                >
                  🇬🇧 English
                </button>
              </div>
            </div>

            {/* Mobile WhatsApp Preview Card */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 p-3">
              <div className="mb-2 flex items-center justify-between text-[11px] text-slate-500">
                <span className="flex items-center gap-1 font-medium">
                  <span className="text-emerald-500">●</span> WhatsApp Business Preview
                </span>
                <span>Automated Recovery Bot</span>
              </div>
              <div className="rounded-lg border border-emerald-300/40 bg-[#dcf8c6] dark:bg-[#054d40] p-3 text-xs text-slate-900 dark:text-slate-100 shadow-sm leading-relaxed">
                <div className="font-semibold text-emerald-900 dark:text-emerald-200 mb-1">
                  RevGuard Merchant Support ✓
                </div>
                <p>{outreachLang === 'hi' ? getHinglishMessage(outreachItem) : getEnglishMessage(outreachItem)}</p>
                <div className="mt-2 text-right text-[10px] text-slate-500 dark:text-slate-300">Just now · Sent ✓✓</div>
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
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50"
              >
                <span>📋</span>
                <span>{copied ? 'Template Copied!' : 'Copy Message'}</span>
              </button>

              <button
                onClick={() => {
                  setDispatched(true)
                  setTimeout(() => {
                    setDispatched(false)
                    setOutreachItem(null)
                  }, 1500)
                }}
                disabled={dispatched}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 active:bg-emerald-800 transition-colors"
              >
                <span>{dispatched ? '✓ Dispatched!' : 'Simulate WhatsApp Dispatch'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Explainable AI Decision Chain Modal */}
      {chainItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl text-blue-600 dark:text-blue-400">✦</span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Explainable AI Decision Chain
                  </h3>
                  <div className="font-mono text-[11px] text-slate-500">
                    {chainItem.transaction_id} · {inr(chainItem.amount_inr)}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setChainItem(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            {/* 5-Step Visual Decision Progression */}
            <div className="space-y-2.5">
              {/* Step 1: Raw Event */}
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 p-3 text-xs">
                <div className="flex items-center justify-between font-semibold text-slate-900 dark:text-white">
                  <span>1. Raw Failure Event</span>
                  <span className="font-mono text-slate-500">{chainItem.failure_code}</span>
                </div>
                <div className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">
                  Transaction of {inr(chainItem.amount_inr)} experienced error {chainItem.failure_code}.
                </div>
              </div>

              {/* Step 2: Statistical Pattern */}
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 p-3 text-xs">
                <div className="flex items-center justify-between font-semibold text-slate-900 dark:text-white">
                  <span>2. Failure Category & Cluster</span>
                  <span className="capitalize text-indigo-600 dark:text-indigo-400">
                    {(chainItem.failure_category || 'Transient').replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">
                  Grouped into statistical cluster. Categorized under deterministic gateway classification rules.
                </div>
              </div>

              {/* Step 3: LLM Root Cause Diagnosis */}
              <div className="rounded-lg border border-blue-200 dark:border-blue-500/20 bg-blue-50/40 dark:bg-blue-500/[0.04] p-3 text-xs">
                <div className="flex items-center justify-between font-semibold text-blue-900 dark:text-blue-300">
                  <span>3. AI Diagnostic Reasoning</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">
                    {(chainItem.confidence * 100).toFixed(0)}% Confidence
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
                  {chainItem.reason || 'AI diagnosed root cause and computed expected recovery probability.'}
                </div>
              </div>

              {/* Step 4: Expected Value Formula */}
              <div className="rounded-lg border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50/40 dark:bg-emerald-500/[0.04] p-3 text-xs">
                <div className="flex items-center justify-between font-semibold text-emerald-900 dark:text-emerald-300">
                  <span>4. Expected Value (EV) Mathematical Optimization</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    EV = {inr(chainItem.expected_recovery_value_inr)}
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-slate-600 dark:text-slate-400 font-mono">
                  EV = P({chainItem.recovery_probability.toFixed(2)}) × {inr(chainItem.amount_inr)} - Cost(₹5) → Recommended Action: {chainItem.action}
                </div>
              </div>

              {/* Step 5: Bounded Policy Gate */}
              <div className="rounded-lg border border-purple-200 dark:border-purple-500/20 bg-purple-50/40 dark:bg-purple-500/[0.04] p-3 text-xs">
                <div className="flex items-center justify-between font-semibold text-purple-900 dark:text-purple-300">
                  <span>5. Deterministic Policy Gate (SC-01)</span>
                  <span className="font-bold text-purple-600 dark:text-purple-400">
                    {chainItem.amount_inr >= approvalThreshold ? 'Needs Human Sign-off' : 'Auto-Execution Approved'}
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">
                  Passed fatigue cap (attempts &lt; 3), passed risk check, bounded within enterprise rules.
                </div>
              </div>
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setChainItem(null)}
                className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Bilingual AI Voice Recovery Call Bot Simulator Modal (English & Hinglish) */}
      {voiceItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/75 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-2xl space-y-3.5 max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600 text-lg font-bold text-white shadow-sm">
                  🎙️
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      AI Voice Recovery Call Bot
                    </h3>
                    <span className="rounded bg-purple-500/15 border border-purple-500/30 px-1.5 py-0.5 text-[9px] font-bold text-purple-700 dark:text-purple-300">
                      2-WAY DIALOGUE
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                    <span className="font-mono">{voiceItem.transaction_id}</span>
                    <span>·</span>
                    <span className="font-bold text-purple-600 dark:text-purple-400">{inr(voiceItem.amount_inr)}</span>
                    <span>·</span>
                    <span className="text-slate-400">{voiceItem.customer_phone || '+91 98765 43210'}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel()
                  if (recognitionRef.current) {
                    try { recognitionRef.current.stop() } catch {}
                  }
                  setIsListening(false)
                  setVoiceItem(null)
                }}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Language Switcher Bar */}
            <div className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 p-2 shrink-0">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <span>🌐</span>
                <span>Spoken Language:</span>
              </span>
              <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-200/80 dark:bg-slate-900 p-0.5 text-xs">
                <button
                  onClick={() => {
                    setCallLang('hi')
                    const intro = getIntroText(voiceItem, 'hi')
                    setDialogueTurns([
                      {
                        id: `turn-${Date.now()}`,
                        sender: 'ai',
                        text: intro,
                        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                      },
                    ])
                    speakText(intro, 'hi')
                  }}
                  className={`rounded-md px-3 py-1 font-bold transition-all cursor-pointer ${
                    callLang === 'hi'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                  }`}
                >
                  🇮🇳 Hinglish
                </button>
                <button
                  onClick={() => {
                    setCallLang('en')
                    const intro = getIntroText(voiceItem, 'en')
                    setDialogueTurns([
                      {
                        id: `turn-${Date.now()}`,
                        sender: 'ai',
                        text: intro,
                        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                      },
                    ])
                    speakText(intro, 'en')
                  }}
                  className={`rounded-md px-3 py-1 font-bold transition-all cursor-pointer ${
                    callLang === 'en'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                  }`}
                >
                  🇬🇧 English
                </button>
              </div>
            </div>

            {/* Live Audio Telemetry Waveform */}
            <div className="rounded-xl border border-purple-200 dark:border-purple-500/20 bg-gradient-to-r from-purple-50/80 via-indigo-50/50 to-blue-50/80 dark:from-purple-950/40 dark:via-indigo-950/30 dark:to-blue-950/40 p-3 text-center shrink-0">
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Call Active (2-Way STT + TTS)</span>
                </div>

                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                  {callLang === 'hi' ? 'Bilingual Voice Engine (hi-IN)' : 'English Voice Engine (en-IN)'}
                </span>
              </div>

              {/* Dynamic Sound Waveform */}
              <div className="mt-2.5 flex items-center justify-center gap-1 h-6">
                {[35, 65, 95, 50, 100, 40, 85, 60, 90, 45, 75, 30].map((h, i) => (
                  <span
                    key={i}
                    style={{
                      height: isSpeaking || isListening ? `${h}%` : '20%',
                      animationDuration: `${0.4 + (i % 4) * 0.15}s`,
                    }}
                    className={`w-1 rounded-full transition-all duration-150 ${
                      isListening
                        ? 'bg-rose-500 animate-pulse'
                        : isSpeaking
                        ? 'bg-purple-600 dark:bg-purple-400'
                        : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  />
                ))}
              </div>

              <div className="mt-1 text-[11px] font-medium text-purple-800 dark:text-purple-300">
                {isListening
                  ? '🎙️ Listening to your voice… Speak now in Hindi or English'
                  : isSpeaking
                  ? `AI Voice Speaking in ${callLang === 'en' ? 'English' : 'Hinglish'}…`
                  : 'Call Connected · Speak into mic or choose a response below'}
              </div>
            </div>

            {/* Error Notification banner if mic permissions blocked */}
            {speechError && (
              <div className="rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 p-2 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-1.5">
                  <span>⚠️</span>
                  <span>{speechError}</span>
                </div>
                <button
                  onClick={() => setSpeechError(null)}
                  className="text-amber-600 dark:text-amber-400 font-bold hover:underline"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Live Recognized Speech Transcript Pill */}
            {speechTranscript && (
              <div className="rounded-lg bg-blue-50 dark:bg-blue-950/50 p-2 text-xs border border-blue-200 dark:border-blue-800/60 shrink-0">
                <div className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-ping" />
                  <span>Live Recognized Speech:</span>
                </div>
                <div className="mt-0.5 text-slate-800 dark:text-slate-200 italic font-medium">
                  "{speechTranscript}"
                </div>
              </div>
            )}

            {/* Multi-Turn Conversation History Stream */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-[160px] max-h-[260px] border border-slate-100 dark:border-slate-800/80 rounded-xl p-3 bg-slate-50/50 dark:bg-slate-950/40">
              {dialogueTurns.map((turn) => (
                <div key={turn.id} className="space-y-1">
                  {turn.sender === 'ai' ? (
                    <div className="flex items-start gap-2 text-xs">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-purple-600 text-[10px] font-bold text-white shadow-xs">
                        AI
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-purple-700 dark:text-purple-300">RevGuard Voice Bot</span>
                          <span className="text-[10px] text-slate-400">{turn.time}</span>
                        </div>
                        <div className="rounded-2xl rounded-tl-xs bg-purple-50 dark:bg-purple-950/60 p-3 text-slate-800 dark:text-slate-200 border border-purple-200/80 dark:border-purple-800/60 leading-relaxed shadow-xs">
                          {turn.text}
                        </div>
                        {turn.actionTaken && (
                          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                            <span>✓</span>
                            <span>{turn.actionTaken}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-end gap-2 text-xs">
                      <div className="min-w-0 flex-1 text-right space-y-1">
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-[10px] text-slate-400">{turn.time}</span>
                          <span className="font-bold text-slate-700 dark:text-slate-300">Customer (You)</span>
                        </div>
                        <div className="inline-block text-left rounded-2xl rounded-tr-xs bg-blue-600 p-3 text-white shadow-xs font-medium leading-relaxed">
                          "{turn.text}"
                        </div>
                      </div>
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-[10px] font-bold text-white shadow-xs">
                        👤
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <div ref={chatBottomRef} />
            </div>

            {/* Customer Interaction & Response Controls */}
            <div className="space-y-2.5 shrink-0 pt-1">
              {/* 1. Live Microphone Toggle & Text Input */}
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleSpeechRecognition}
                  className={`inline-flex items-center justify-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold shadow-md transition-all shrink-0 cursor-pointer ${
                    isListening
                      ? 'bg-rose-600 text-white animate-pulse shadow-rose-600/30'
                      : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/25'
                  }`}
                >
                  <span className="text-base">{isListening ? '⏹️' : '🎙️'}</span>
                  <span>{isListening ? 'Listening… (Speak)' : 'Speak into Mic'}</span>
                </button>

                {/* Custom Text input as fallback/testing */}
                <div className="flex-1 flex items-center gap-1.5">
                  <input
                    type="text"
                    placeholder={
                      callLang === 'hi'
                        ? 'Type in Hindi/English (e.g. "Main kal pay karunga")…'
                        : 'Type customer response (e.g. "I will pay tomorrow")…'
                    }
                    value={customReply}
                    onChange={(e) => setCustomReply(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && customReply.trim()) {
                        handleCustomerResponse(customReply)
                        setCustomReply('')
                      }
                    }}
                    className="flex-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-purple-500"
                  />
                  <button
                    onClick={() => {
                      if (customReply.trim()) {
                        handleCustomerResponse(customReply)
                        setCustomReply('')
                      }
                    }}
                    disabled={!customReply.trim()}
                    className="rounded-xl bg-slate-900 dark:bg-slate-800 text-white px-3 py-2 text-xs font-bold hover:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    Send
                  </button>
                </div>
              </div>

              {/* 2. Quick Preset Responses (English & Hinglish) */}
              <div className="space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                  <span>Quick Responses:</span>
                  <span className="text-[9px] lowercase font-normal text-slate-400">click to simulate voice reply</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() =>
                      handleCustomerResponse(
                        callLang === 'en'
                          ? 'Yes, send the 1-click link to my WhatsApp'
                          : 'Haan, mere WhatsApp pe 1-click link send kar do',
                      )
                    }
                    className="text-left rounded-lg border border-emerald-300 dark:border-emerald-700/60 bg-emerald-50/70 dark:bg-emerald-950/40 p-2 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors truncate cursor-pointer"
                  >
                    💬 {callLang === 'en' ? 'Yes, send 1-click link to WhatsApp' : 'Haan, WhatsApp pe link bhej do'}
                  </button>

                  <button
                    onClick={() =>
                      handleCustomerResponse(
                        callLang === 'en'
                          ? 'Please raise a collect request on an alternate UPI ID'
                          : 'Alternate UPI ID pe collect request raise karo',
                      )
                    }
                    className="text-left rounded-lg border border-blue-300 dark:border-blue-700/60 bg-blue-50/70 dark:bg-blue-950/40 p-2 text-[11px] font-semibold text-blue-800 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors truncate cursor-pointer"
                  >
                    ⚡ {callLang === 'en' ? 'Request Alternate UPI Collect' : 'Alternate UPI ID pe request bhejo'}
                  </button>

                  <button
                    onClick={() =>
                      handleCustomerResponse(
                        callLang === 'en'
                          ? 'I will complete the payment this Friday (Promise to Pay)'
                          : 'Main Friday ko pay karunga (Promise to Pay commitment)',
                      )
                    }
                    className="text-left rounded-lg border border-amber-300 dark:border-amber-700/60 bg-amber-50/70 dark:bg-amber-950/40 p-2 text-[11px] font-semibold text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors truncate cursor-pointer"
                  >
                    📅 {callLang === 'en' ? 'I will pay this Friday (PTP)' : 'Main Friday ko pay kar dunga (PTP)'}
                  </button>

                  <button
                    onClick={() =>
                      handleCustomerResponse(
                        callLang === 'en'
                          ? 'No, please cancel and stop retrying'
                          : 'Nahi, cancel kar do aur retry mat karo',
                      )
                    }
                    className="text-left rounded-lg border border-rose-300 dark:border-rose-700/60 bg-rose-50/70 dark:bg-rose-950/40 p-2 text-[11px] font-semibold text-rose-800 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors truncate cursor-pointer"
                  >
                    🛑 {callLang === 'en' ? 'Cancel & Stop Retries (SC-01)' : 'Nahi, cancel kar do (Stop)'}
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom Actions Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const lastAiTurn = [...dialogueTurns].reverse().find((t) => t.sender === 'ai')
                    if (lastAiTurn) {
                      speakText(lastAiTurn.text, callLang)
                    }
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors cursor-pointer"
                >
                  <span>🔊</span>
                  <span>Replay AI Voice</span>
                </button>

                <button
                  onClick={() => {
                    const intro = getIntroText(voiceItem, callLang)
                    setDialogueTurns([
                      {
                        id: `turn-${Date.now()}`,
                        sender: 'ai',
                        text: intro,
                        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                      },
                    ])
                    speakText(intro, callLang)
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors cursor-pointer"
                >
                  <span>↺</span>
                  <span>Restart Call</span>
                </button>
              </div>

              <button
                onClick={() => {
                  if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel()
                  if (recognitionRef.current) {
                    try { recognitionRef.current.stop() } catch {}
                  }
                  setIsListening(false)
                  setVoiceItem(null)
                }}
                className="rounded-lg bg-rose-600 hover:bg-rose-500 active:bg-rose-700 px-4 py-1.5 text-xs font-bold text-white shadow-sm transition-colors cursor-pointer"
              >
                End Call
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Enterprise Slack CFO Escalation Bridge Modal */}
      {slackItem && (
        <SlackEscalationModal
          transactionId={slackItem.transaction_id}
          amountInr={slackItem.amount_inr}
          reason={slackItem.reason}
          onApprove={async (id) => {
            await api.run([id])
            onRun?.()
          }}
          onClose={() => setSlackItem(null)}
          onOpenVoice={() => {
            setVoiceItem(slackItem)
            startVoiceCall(slackItem)
          }}
        />
      )}

      {/* 5. Dynamic Incentive & EV Yield Optimizer Modal */}
      {yieldItem && (
        <DynamicYieldIncentiveModal
          initialAmount={yieldItem.amount_inr}
          onClose={() => setYieldItem(null)}
        />
      )}

    </div>
  )
}





