import { Fragment, useEffect, useState, useRef } from 'react'
import { api, inr } from '../api'
import type { B2BInvoice, B2BSummary } from '../types'
import { Card } from '../components/ui'
import UpiQrStandee from '../components/UpiQrStandee'

interface DialogueTurn {
  id: string
  sender: 'ai' | 'customer'
  text: string
  time: string
  actionBadge?: string
}

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
  const [qrInvoice, setQrInvoice] = useState<B2BInvoice | null>(null)

  // B2B 2-Way Voice Bot State
  const [voiceInvoice, setVoiceInvoice] = useState<B2BInvoice | null>(null)
  const [callLang, setCallLang] = useState<'en' | 'hi'>('hi')
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [speechTranscript, setSpeechTranscript] = useState('')
  const [speechError, setSpeechError] = useState<string | null>(null)
  const [dialogueTurns, setDialogueTurns] = useState<DialogueTurn[]>([])
  const [customReply, setCustomReply] = useState('')

  const recognitionRef = useRef<any>(null)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const chatBottomRef = useRef<HTMLDivElement | null>(null)

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

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [dialogueTurns])

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

  // ── Voice Bot Utilities ───────────────────────────────────────────
  function speakText(text: string, lang: 'en' | 'hi' = callLang) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return

    try {
      window.speechSynthesis.cancel()
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume()
      }

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
      utterance.onerror = () => {
        setIsSpeaking(false)
        utteranceRef.current = null
      }

      setTimeout(() => {
        try {
          window.speechSynthesis.speak(utterance)
        } catch {}
      }, 50)
    } catch {
      setIsSpeaking(false)
    }
  }

  function getB2BIntroText(inv: B2BInvoice, lang: 'en' | 'hi') {
    if (lang === 'en') {
      return `Hello! This is Accounts Receivable calling regarding corporate invoice ${inv.invoice_id} for ${inr(inv.amount_inr)} issued to ${inv.client_name}. Would you like to confirm a settlement date or receive an instant 1-click Razorpay link?`
    }
    return `Namaste ji! Main Accounts Desk se AI assistant bol raha hoon invoice ${inv.invoice_id} (${inr(inv.amount_inr)}) ke silsile me for ${inv.client_name}. Kya main aapko WhatsApp pe payment link share kar doon ya Friday ki payment date record kar doon?`
  }

  function startB2BVoiceCall(inv: B2BInvoice, initialLang: 'en' | 'hi' = callLang) {
    setVoiceInvoice(inv)
    setCallLang(initialLang)
    setSpeechTranscript('')
    setSpeechError(null)
    setCustomReply('')
    setIsListening(false)

    const intro = getB2BIntroText(inv, initialLang)
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
    }, 250)
  }

  function toggleListening() {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
      setIsListening(false)
      return
    }

    if (typeof window === 'undefined') return
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

    if (!SpeechRecognition) {
      setSpeechError('Speech recognition is not supported in this browser. Please use the quick response chips or typing below.')
      return
    }

    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel()
        setIsSpeaking(false)
      }

      const recognition = new SpeechRecognition()
      recognitionRef.current = recognition
      recognition.continuous = false
      recognition.interimResults = true
      recognition.lang = callLang === 'hi' ? 'hi-IN' : 'en-IN'

      recognition.onstart = () => {
        setIsListening(true)
        setSpeechError(null)
        setSpeechTranscript('')
      }

      recognition.onresult = (event: any) => {
        let finalTranscript = ''
        let interimTranscript = ''
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript
          } else {
            interimTranscript += event.results[i][0].transcript
          }
        }
        const currentText = finalTranscript || interimTranscript
        setSpeechTranscript(currentText)

        if (finalTranscript) {
          handleCustomerReply(finalTranscript)
        }
      }

      recognition.onerror = (event: any) => {
        if (event.error === 'network') {
          setSpeechError('Cloud speech service unreachable (network/firewall). Click any 1-tap response chip below to continue!')
        } else if (event.error === 'not-allowed') {
          setSpeechError('Microphone permission blocked. Please use the quick response chips below.')
        } else if (event.error !== 'no-speech') {
          setSpeechError(`Microphone note (${event.error}). You can reply via the quick buttons below.`)
        }
        setIsListening(false)
      }

      recognition.onend = () => {
        setIsListening(false)
      }

      recognition.start()
    } catch {
      setSpeechError('Could not access microphone. Please test with the interactive response chips below.')
      setIsListening(false)
    }
  }

  function handleCustomerReply(userText: string) {
    if (!userText.trim() || !voiceInvoice) return

    const userTurn: DialogueTurn = {
      id: `turn-${Date.now()}`,
      sender: 'customer',
      text: userText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    const t = userText.toLowerCase()
    let aiResponse = ''
    let actionBadge = ''

    if (t.includes('friday') || t.includes('kal') || t.includes('promise') || t.includes('tarikh') || t.includes('schedule') || t.includes('hafta') || t.includes('pay kar')) {
      const nextFri = new Date(Date.now() + 4 * 86400000).toISOString().slice(0, 10)
      aiResponse =
        callLang === 'hi'
          ? `Dhanyawad! Maine ${nextFri} ke liye Promise-to-Pay commitment lock kar diya hai. Confirmation SMS and corporate payment link aapke email aur WhatsApp pe bhej diya gaya hai.`
          : `Thank you! I have registered your Promise-to-Pay (PTP) commitment for ${nextFri}. A confirmation notice and corporate payment link have been dispatched to your finance desk.`
      actionBadge = '📅 PTP Commitment Registered & Locked'

      // Auto record PTP in background
      api.b2bSetPtp(voiceInvoice.invoice_id, nextFri, voiceInvoice.amount_inr, 'Registered via B2B 2-Way Voice Bot dialogue')
        .then(() => loadData())
        .catch(console.error)
    } else if (t.includes('link') || t.includes('whatsapp') || t.includes('bhej') || t.includes('send') || t.includes('pay now')) {
      aiResponse =
        callLang === 'hi'
          ? `Bilkul! 1-click Razorpay corporate payment link aapke registered finance contact par dispatch kar diya gaya hai. Aap ise direct UPI ya NetBanking se bina login ke settle kar sakte hain.`
          : `Certainly! A secure 1-click Razorpay corporate payment link has been dispatched to your finance team with 0-redirect settlement.`
      actionBadge = '⚡ 1-Click Corporate Link Dispatched'
    } else if (t.includes('po') || t.includes('copy') || t.includes('validation') || t.includes('query') || t.includes('check')) {
      aiResponse =
        callLang === 'hi'
          ? `Ji, maine PO verification note add kar diya hai. Accounts team PO copy and sign-off sheet 15 minutes me aapko email kar degi.`
          : `Understood. I have logged a PO verification note. Our billing team will email the signed PO copy within 15 minutes.`
      actionBadge = '📋 PO Copy & Billing Note Logged'
    } else {
      aiResponse =
        callLang === 'hi'
          ? `Theek hai, main yeh note finance team ko forward kar raha hoon. Kya aap chahte hain ki main WhatsApp par direct invoice copy aur payment link share kar doon?`
          : `Understood, I will document this for the finance team. Would you like me to dispatch the verified invoice copy and 1-click payment link to your WhatsApp?`
      actionBadge = '📝 Note Appended to Timeline'
    }

    const aiTurn: DialogueTurn = {
      id: `turn-${Date.now() + 1}`,
      sender: 'ai',
      text: aiResponse,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      actionBadge,
    }

    setDialogueTurns((prev) => [...prev, userTurn, aiTurn])
    setSpeechTranscript('')
    setCustomReply('')

    setTimeout(() => {
      speakText(aiResponse, callLang)
    }, 200)
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
          <div className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">Settled via Razorpay B2B</div>
        </Card>

        <Card>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Critical Overdue (&gt;90d)
          </div>
          <div className="num mt-1.5 text-2xl font-bold text-amber-600 dark:text-amber-400">
            {summary ? inr(summary.total_high_risk_inr) : '—'}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">Executive / Legal escalation</div>
        </Card>
      </div>

      {/* 2. Invoices Aging Worklist Card */}
      <Card
        title={`B2B Corporate Invoices Worklist (${filteredInvoices.length})`}
        subtitle="Autonomous dunning, AI voice call bot, and Promise-to-Pay (PTP) tracker"
        right={
          <div className="flex items-center gap-1">
            {['all', '1_30_days', '31_60_days', '61_90_days', '90_plus_days'].map((b) => (
              <button
                key={b}
                onClick={() => setSelectedBucket(b)}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                  selectedBucket === b
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                {b === 'all' ? 'All Buckets' : b.replace('_', '–').replace('_days', 'd')}
              </button>
            ))}
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th className="py-3 pr-3">Invoice / Client</th>
                <th className="py-3 pr-3">Amount</th>
                <th className="py-3 pr-3">Due Date</th>
                <th className="py-3 pr-3">Aging</th>
                <th className="py-3 pr-3">Dunning Stage</th>
                <th className="py-3 pr-3 text-center">PTP Status</th>
                <th className="py-3 pr-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredInvoices.map((inv) => {
                const open = openId === inv.invoice_id
                return (
                  <Fragment key={inv.invoice_id}>
                    <tr
                      onClick={() => setOpenId(open ? null : inv.invoice_id)}
                      className="cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-850/60 transition-colors"
                    >
                      <td className="py-3 pr-3">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>{inv.invoice_id}</span>
                          {inv.status === 'recovered' && (
                            <span className="rounded bg-emerald-500/10 px-1.5 text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                              SETTLED
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">{inv.client_name}</div>
                      </td>
                      <td className="num py-3 pr-3 font-bold text-slate-900 dark:text-white">
                        {inr(inv.amount_inr)}
                      </td>
                      <td className="py-3 pr-3 text-slate-600 dark:text-slate-400">{inv.due_date}</td>
                      <td className="py-3 pr-3">
                        {inv.overdue_days <= 0 ? (
                          <span className="rounded bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:text-emerald-300">
                            Current
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
                            className="rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 shadow-sm cursor-pointer"
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
                                onClick={() => setQrInvoice(inv)}
                                className="rounded-lg border border-purple-500/40 bg-purple-600/10 hover:bg-purple-600/20 px-2 py-1 text-[11px] font-bold text-purple-600 dark:text-purple-300 transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                                title="Dynamic Scannable UPI QR Standee"
                              >
                                <span>⚡</span>
                                <span>UPI QR</span>
                              </button>

                              <button
                                onClick={() => startB2BVoiceCall(inv)}
                                className="rounded-lg border border-purple-500/40 bg-purple-600/15 hover:bg-purple-600/25 px-2.5 py-1 text-[11px] font-bold text-purple-600 dark:text-purple-300 transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                                title="Launch Interactive Bilingual Voice Bot"
                              >
                                <span>📞</span>
                                <span>Voice Bot</span>
                              </button>

                              <button
                                onClick={() => handleChase(inv.invoice_id)}
                                disabled={chasingId === inv.invoice_id}
                                className="rounded bg-blue-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                              >
                                {chasingId === inv.invoice_id ? 'Chasing…' : '⚡ AI Chase'}
                              </button>

                              <button
                                onClick={() => handleRecover(inv.invoice_id)}
                                disabled={recoveredId === inv.invoice_id}
                                className="rounded bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
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
                        <td colSpan={7} className="p-4">
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
                                  <span className="text-blue-500 font-mono text-[10px]">•</span>
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

      {/* 3. Record PTP Modal */}
      {ptpInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Record Promise-to-Pay (PTP)</h3>
                <p className="text-xs text-slate-500">Invoice: {ptpInvoice.invoice_id} ({ptpInvoice.client_name})</p>
              </div>
              <button
                onClick={() => setPtpInvoice(null)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
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
                className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={submitPtp}
                className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 cursor-pointer"
              >
                Save PTP Commitment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Interactive Bilingual B2B Voice Bot Modal */}
      {voiceInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs font-sans">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 dark:border-[#1C202B] bg-white dark:bg-[#0E1116] p-6 shadow-2xl space-y-4 max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#1C202B] pb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600/15 text-purple-600 dark:text-purple-400 font-bold border border-purple-500/30">
                  <span className="text-lg">🎙️</span>
                  {isSpeaking && (
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-500"></span>
                    </span>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      B2B 2-Way Voice Recovery Bot
                    </h3>
                    <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.2 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                      LIVE DIALOGUE
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Corporate dunning for {voiceInvoice.invoice_id} · {voiceInvoice.client_name} ({inr(voiceInvoice.amount_inr)})
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center rounded-lg border border-slate-200 dark:border-[#242937] bg-slate-50 dark:bg-[#14171F] p-0.5 text-xs font-semibold">
                  <button
                    onClick={() => {
                      setCallLang('hi')
                      startB2BVoiceCall(voiceInvoice, 'hi')
                    }}
                    className={`rounded-md px-2 py-1 transition-all cursor-pointer ${
                      callLang === 'hi'
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Hinglish 🇮🇳
                  </button>
                  <button
                    onClick={() => {
                      setCallLang('en')
                      startB2BVoiceCall(voiceInvoice, 'en')
                    }}
                    className={`rounded-md px-2 py-1 transition-all cursor-pointer ${
                      callLang === 'en'
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    English
                  </button>
                </div>

                <button
                  onClick={() => {
                    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                      window.speechSynthesis.cancel()
                    }
                    if (recognitionRef.current) {
                      recognitionRef.current.stop()
                    }
                    setVoiceInvoice(null)
                  }}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-[#151821] hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Live Audio Telemetry Waveform Bar */}
            <div className="rounded-xl border border-slate-200 dark:border-[#1C202B] bg-slate-50 dark:bg-[#14171F] p-3 text-xs flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {isSpeaking ? '🗣️ AI Speaking…' : isListening ? '🎙️ Listening to Client…' : '🟢 Call Connected'}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {callLang === 'hi' ? 'hi-IN (Hinglish)' : 'en-IN (Indian English)'}
                </span>
              </div>

              {/* Dynamic Sound Wave Bars */}
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <span
                    key={i}
                    className={`w-1 rounded-full transition-all duration-150 ${
                      isSpeaking
                        ? 'bg-purple-500 animate-pulse'
                        : isListening
                        ? 'bg-emerald-500 animate-bounce'
                        : 'bg-slate-300 dark:bg-slate-700 h-2'
                    }`}
                    style={{
                      height: isSpeaking || isListening ? `${Math.max(6, (i * 5) % 22 + 8)}px` : '6px',
                      animationDelay: `${i * 80}ms`,
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Multi-Turn Conversation History Stream */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-[200px] max-h-[320px]">
              {dialogueTurns.map((turn) => (
                <div
                  key={turn.id}
                  className={`flex items-start gap-2.5 ${
                    turn.sender === 'customer' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {turn.sender === 'ai' && (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-purple-600/20 text-xs font-bold text-purple-600 dark:text-purple-300">
                      AI
                    </div>
                  )}

                  <div
                    className={`max-w-[82%] rounded-2xl p-3 text-xs leading-relaxed space-y-1.5 shadow-xs ${
                      turn.sender === 'customer'
                        ? 'bg-blue-600 text-white rounded-tr-xs'
                        : 'bg-slate-100 dark:bg-[#14171F] text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-[#242937] rounded-tl-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 text-[10px] opacity-75">
                      <span className="font-bold">
                        {turn.sender === 'customer' ? 'Corporate Client' : 'RevGuard AR Voice Bot'}
                      </span>
                      <span>{turn.time}</span>
                    </div>

                    <div>{turn.text}</div>

                    {turn.actionBadge && (
                      <div className="mt-1 flex items-center gap-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                        <span>✓</span>
                        <span>{turn.actionBadge}</span>
                      </div>
                    )}
                  </div>

                  {turn.sender === 'customer' && (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-xs font-bold text-white">
                      👤
                    </div>
                  )}
                </div>
              ))}
              <div ref={chatBottomRef} />
            </div>

            {/* Interim Speech Transcript Pill */}
            {speechTranscript && (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2 shrink-0">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                <span className="font-mono text-[10px] uppercase font-bold text-emerald-600">Live STT:</span>
                <span>"{speechTranscript}"</span>
              </div>
            )}

            {speechError && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-[11px] text-amber-700 dark:text-amber-300 shrink-0">
                ⚠️ {speechError}
              </div>
            )}

            {/* Quick Presets & Interactive Buttons */}
            <div className="space-y-2 border-t border-slate-100 dark:border-[#1C202B] pt-3 shrink-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Simulated Client Responses (Click or Speak into Mic):
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(callLang === 'hi'
                  ? [
                      'Main Friday ko payment kar dunga',
                      'Haan, payment link WhatsApp pe share kar do',
                      'Invoice check karke bataunga',
                      'PO copy send karo validation ke liye',
                    ]
                  : [
                      'We will settle this invoice next Friday',
                      'Please dispatch the 1-click Razorpay link to WhatsApp',
                      'Payment is processed, please check UTR',
                      'Please resend the signed PO copy for validation',
                    ]
                ).map((phrase, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleCustomerReply(phrase)}
                    className="truncate rounded-xl border border-slate-200 dark:border-[#1C202B] bg-slate-50 dark:bg-[#14171F] px-2.5 py-1.5 text-left text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:border-purple-500/40 hover:bg-purple-50/50 dark:hover:bg-[#181C26] transition-all cursor-pointer"
                  >
                    💬 "{phrase}"
                  </button>
                ))}
              </div>

              {/* Custom Typing Reply & Mic Control */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={toggleListening}
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold shadow-sm transition-all cursor-pointer ${
                    isListening
                      ? 'bg-rose-600 text-white animate-pulse ring-2 ring-rose-500/50'
                      : 'bg-emerald-600 text-white hover:bg-emerald-500'
                  }`}
                  title={isListening ? 'Stop Listening' : 'Speak into Microphone'}
                >
                  {isListening ? '🛑' : '🎙️'}
                </button>

                <input
                  type="text"
                  placeholder={
                    callLang === 'hi'
                      ? 'Type custom reply (e.g. "Main kal pay karunga") and press Enter…'
                      : 'Type custom reply (e.g. "Payment will be cleared on Friday") and press Enter…'
                  }
                  value={customReply}
                  onChange={(e) => setCustomReply(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && customReply.trim()) {
                      handleCustomerReply(customReply)
                    }
                  }}
                  className="flex-1 rounded-xl border border-slate-200 dark:border-[#242937] bg-white dark:bg-[#14171F] px-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-purple-500"
                />

                <button
                  onClick={() => customReply.trim() && handleCustomerReply(customReply)}
                  className="rounded-xl bg-purple-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-purple-500 transition-colors shadow-sm cursor-pointer"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* B2B Dynamic UPI QR Standee Modal */}
      {qrInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">⚡</span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    B2B Dynamic UPI QR Standee
                  </h3>
                  <p className="text-[10px] text-slate-500">
                    Invoice #{qrInvoice.invoice_id} · {qrInvoice.client_name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setQrInvoice(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <UpiQrStandee
              transactionId={qrInvoice.invoice_id}
              amountInr={qrInvoice.amount_inr}
              clientName={qrInvoice.client_name}
              onSettled={() => {
                handleRecover(qrInvoice.invoice_id)
                setTimeout(() => setQrInvoice(null), 1200)
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
