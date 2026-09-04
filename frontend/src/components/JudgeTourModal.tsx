import React, { useState } from 'react'

interface JudgeTourModalProps {
  onClose: () => void
  onNavigateTab: (tab: any) => void
  onTriggerAction?: (action: string) => void
}

interface TourStep {
  id: string
  number: number
  title: string
  subtitle: string
  icon: string
  badge: string
  tab: string
  summary: string
  keyInnovations: string[]
  actionLabel: string
  actionTrigger?: string
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'ingest',
    number: 1,
    title: 'Real-Time Webhook Ingestion & Deduplication',
    subtitle: 'High-throughput Razorpay event stream with HMAC-SHA256 verification',
    icon: '⚡',
    badge: 'Foundation',
    tab: 'overview',
    summary:
      'RevGuard ingests live payment.failed and invoice.overdue events, normalizes 30+ disparate bank failure codes, and prevents replay attacks using a deterministic seen-window.',
    keyInnovations: [
      'HMAC-SHA256 cryptographic signature validation',
      'Zero PCI-DSS storage: PAN/CVV never persisted',
      'Instant failure categorization across Card, UPI, NetBanking, and Mandates',
    ],
    actionLabel: 'Jump to Overview Dashboard →',
  },
  {
    id: 'clusters',
    number: 2,
    title: 'Explainable AI Root-Cause Clustering',
    subtitle: 'Group failures by statistical causality, not raw error codes',
    icon: '🔬',
    badge: 'AI Diagnostics',
    tab: 'clusters',
    summary:
      'Instead of blind retries, RevGuard uses heuristic clustering + LLM reasoning to diagnose why transactions failed: Bank Switch Outages, Customer Friction, Liquidity Drops, or Hard Declines.',
    keyInnovations: [
      'Taxonomy of 4 actionable failure families',
      'Quantified Expected Recovery Value (EV = Recoverable Amount × Probability - Cost)',
      'Deterministic confidence scoring with audit trail',
    ],
    actionLabel: 'Explore Failure Clusters →',
  },
  {
    id: 'radar',
    number: 3,
    title: 'Switch Health Radar & Statutory RBI Form INC-01',
    subtitle: 'Autonomous traffic re-routing and 6-hour regulatory compliance',
    icon: '🚦',
    badge: 'Compliance & Infra',
    tab: 'overview',
    summary:
      'Monitors real-time switch latency (HDFC, ICICI, Axis, SBI). When latency spikes to 4,280ms under Rule SC-02, it auto re-routes traffic to Axis and generates the mandatory RBI 6-hour Form INC-01 filing in 1 click.',
    keyInnovations: [
      'Rule SC-02: Zero-touch failover protecting ₹3.84L in GMV',
      'Statutory Form INC-01 export with SHA-256 verification hash',
      '24-Hour NPCI core banking maintenance awareness',
    ],
    actionLabel: 'View Switch Radar & Outage Demo →',
  },
  {
    id: 'queue',
    number: 4,
    title: 'Recovery Execution Queue & Deterministic Safety',
    subtitle: 'Guaranteed compliance with Rule SC-01 fatigue stops',
    icon: '🛡️',
    badge: 'Policy Engine',
    tab: 'queue',
    summary:
      'Every action is ranked strictly by expected value and gated by hard policy rules: max 3 attempts, 08:00–21:00 contact windows, and CFO sign-off for amounts over ₹25,000.',
    keyInnovations: [
      'Rule SC-01: Zero customer spam, stopping 42 futile retries',
      'CFO Slack Bridge (#finance-revenue-escalations) with 1-click approvals',
      'Dynamic Yield Incentive optimizer bounded by Rule SC-03 gross margin',
    ],
    actionLabel: 'Open Recovery Queue →',
  },
  {
    id: 'soundbox',
    number: 5,
    title: 'Dynamic Bharat UPI QR & POS Audio Soundbox',
    subtitle: 'Frictionless zero-redirect collect with audio feedback',
    icon: '📱',
    badge: 'Fintech UX',
    tab: 'queue',
    actionTrigger: 'open_upi_qr',
    summary:
      'Eliminates U69 collect timeout drop-offs. Generates a 100% scannable high-density UPI QR standee, 1-tap GPay/PhonePe/Paytm deep-links, and realistic Soundbox audio chime on settlement.',
    keyInnovations: [
      'Real scannable NPCI dynamic QR code with live session laser',
      'Web Audio POS speaker chime (784Hz → 1046Hz) + Voice announcement',
      'Bypasses mobile checkout redirects for instant settlement',
    ],
    actionLabel: 'Test Bharat UPI Soundbox Standee →',
  },
  {
    id: 'voice_b2b',
    number: 6,
    title: 'Bilingual 2-Way AI Voice Recovery Bot',
    subtitle: 'Real-time conversational voice agent for B2C & B2B AR aging',
    icon: '📞',
    badge: 'Voice AI',
    tab: 'b2b',
    summary:
      'Interactive English & Hinglish voice chaser using real browser Speech Recognition and Speech Synthesis. Understands customer intent and automatically records legally binding Promise-to-Pay (PTP) commitments.',
    keyInnovations: [
      'Multi-turn conversational state machine with PO validation',
      'Automatic PTP commitment recording into corporate AR books',
      'Covers B2B 1-30, 31-60, 61-90, and 90+ day aging buckets',
    ],
    actionLabel: 'Launch B2B Voice & AR Aging →',
  },
]

export default function JudgeTourModal({
  onClose,
  onNavigateTab,
  onTriggerAction,
}: JudgeTourModalProps) {
  const [activeStep, setActiveStep] = useState(0)
  const current = TOUR_STEPS[activeStep]

  function handleStepNavigate() {
    onNavigateTab(current.tab)
    if (current.actionTrigger && onTriggerAction) {
      onTriggerAction(current.actionTrigger)
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm animate-fade-in font-sans">
      <div className="w-full max-w-2xl rounded-2xl border border-purple-500/30 bg-[#0E1116] p-6 text-white shadow-2xl shadow-purple-950/50 space-y-5">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-600 text-lg shadow-md">
              🎯
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>RevGuard-AI — 2-Minute Judge Walkthrough</span>
                <span className="rounded bg-purple-500/20 text-purple-300 text-[10px] font-mono px-2 py-0.5 border border-purple-500/30">
                  Step {activeStep + 1} of {TOUR_STEPS.length}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                A guided showcase of key architectural innovations solving real Razorpay failure problems
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Step Navigation Pill Bar */}
        <div className="grid grid-cols-6 gap-1.5 rounded-xl bg-[#141720] p-1.5 border border-slate-800">
          {TOUR_STEPS.map((step, idx) => (
            <button
              key={step.id}
              onClick={() => setActiveStep(idx)}
              className={`rounded-lg py-1.5 px-2 text-center transition-all cursor-pointer ${
                activeStep === idx
                  ? 'bg-purple-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 font-medium'
              }`}
            >
              <div className="text-xs">{step.icon}</div>
              <div className="text-[9px] truncate mt-0.5">{step.title.split(' ')[0]}</div>
            </button>
          ))}
        </div>

        {/* Current Step Content Box */}
        <div className="rounded-xl border border-slate-800 bg-[#121620] p-4.5 space-y-3.5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-bold px-2 py-0.5 border border-indigo-500/30 uppercase tracking-wider">
                {current.badge}
              </span>
              <h4 className="text-base font-bold text-white mt-1.5">{current.title}</h4>
              <div className="text-xs text-purple-300 font-medium">{current.subtitle}</div>
            </div>
            <div className="text-3xl">{current.icon}</div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">{current.summary}</p>

          <div className="rounded-lg bg-[#0A0C11] border border-slate-850 p-3 space-y-1.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Key Technical Deliverables:
            </div>
            {current.keyInnovations.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs text-slate-200">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Navigation & Jump Action */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveStep((prev) => Math.max(0, prev - 1))}
              disabled={activeStep === 0}
              className="rounded-lg border border-slate-750 bg-slate-850 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
            >
              ← Previous
            </button>
            <button
              onClick={() => setActiveStep((prev) => Math.min(TOUR_STEPS.length - 1, prev + 1))}
              disabled={activeStep === TOUR_STEPS.length - 1}
              className="rounded-lg border border-slate-750 bg-slate-850 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
            >
              Next →
            </button>
          </div>

          <button
            onClick={handleStepNavigate}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 px-4 py-2 text-xs font-bold text-white shadow-md shadow-purple-950/40 transition-all cursor-pointer"
          >
            <span>{current.actionLabel}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
