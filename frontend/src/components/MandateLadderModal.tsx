import React, { useState } from 'react'
import { inr } from '../api'

interface MandateLadderModalProps {
  onClose: () => void
  initialAmount?: number
  mandateName?: string
}

const LADDER_STEPS = [
  {
    step: 1,
    day: 'Day 1 · 09:00 AM',
    title: 'Salary-Drop Heuristic Auto-Retry',
    description: 'Autonomous retry timed to liquidity window (salary / fund deposit credit cycles).',
    rail: 'UPI AutoPay (Primary Switch)',
    prob: 0.78,
    evUplift: '+₹1,850',
    status: 'OPTIMIZED',
    badgeTone: 'emerald',
    icon: '💰',
    rule: 'Rule SC-04: Liquidity Cycle Timing',
  },
  {
    step: 2,
    day: 'Day 3 · 02:30 PM',
    title: 'Dynamic Acquirer Switch Failover',
    description: 'Auto-switches acquiring rail from primary bank to secondary UPI AutoPay sponsor bank.',
    rail: 'Axis AutoPay Switch (Failover)',
    prob: 0.65,
    evUplift: '+₹1,420',
    status: 'ACTIVE_ROUTING',
    badgeTone: 'blue',
    icon: '⚡',
    rule: 'Rule SC-02: Multi-Bank Switch Failover',
  },
  {
    step: 3,
    day: 'Day 5 · 11:00 AM',
    title: 'Interactive 1-Click WhatsApp Link with Incentive',
    description: 'Dispatches pre-authenticated 1-click Razorpay payment link with 5% dynamic cashback.',
    rail: 'WhatsApp Verified + Razorpay Link',
    prob: 0.82,
    evUplift: '+₹2,100',
    status: 'INCENTIVIZED',
    badgeTone: 'purple',
    icon: '💬',
    rule: 'Rule SC-03: Margin-Bounded Discount Cap',
  },
  {
    step: 4,
    day: 'Day 7 · 04:00 PM',
    title: 'Bilingual 2-Way Voice Call & Account Escalation',
    description: '2-way Voice Bot or human finance escalation before compliance cut-off.',
    rail: 'Voice Call (English/Hinglish) / Desk',
    prob: 0.88,
    evUplift: '+₹2,450',
    status: 'HUMAN_OR_VOICE',
    badgeTone: 'amber',
    icon: '🎙️',
    rule: 'Rule SC-01: Deterministic Stop Guard',
  },
]

export default function MandateLadderModal({
  onClose,
  initialAmount = 2499,
  mandateName = 'Pro Annual Subscription · SaaS Enterprise',
}: MandateLadderModalProps) {
  const [activeStep, setActiveStep] = useState(1)
  const [amount, setAmount] = useState(initialAmount)
  const [simulatedStep, setSimulatedStep] = useState<number | null>(null)

  const currentStepData = LADDER_STEPS[activeStep - 1]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs font-sans">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-[#1C202B] bg-white dark:bg-[#0E1116] p-6 shadow-2xl space-y-5 text-slate-900 dark:text-slate-100 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#1C202B] pb-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold border border-purple-500/20">
              🔄
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                UPI AutoPay Mandate Recovery Ladder Sequencer
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Deterministic 4-step recurring revenue recovery ladder vs naïve 1-day blind retry
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-[#151821] hover:text-white transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Top Summary Banner */}
        <div className="rounded-xl border border-purple-500/30 bg-purple-50/60 dark:bg-[#14171F] p-4 text-xs space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                Target Mandate:
              </span>
              <div className="text-sm font-bold text-slate-900 dark:text-white">{mandateName}</div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Recurring Amount:</span>
              <div className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 num">
                {inr(amount)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px]">
            <div>
              <span className="text-slate-500">Naïve 1-Day Retry:</span>
              <div className="font-bold text-rose-600 dark:text-rose-400">32% Recovery</div>
            </div>
            <div>
              <span className="text-slate-500">RevGuard AI Ladder:</span>
              <div className="font-bold text-emerald-600 dark:text-emerald-400">82% Cumulative</div>
            </div>
            <div>
              <span className="text-slate-500">Net Value Uplift:</span>
              <div className="font-bold text-blue-600 dark:text-blue-400">+₹1,248 / mandate</div>
            </div>
            <div>
              <span className="text-slate-500">Fatigue Protection:</span>
              <div className="font-bold text-purple-600 dark:text-purple-400">Rule SC-01 (100%)</div>
            </div>
          </div>
        </div>

        {/* 4-Step Interactive Ladder Visualizer */}
        <div className="space-y-2.5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Mandate Recovery Progression (Click Step to Inspect)
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            {LADDER_STEPS.map((s) => {
              const selected = activeStep === s.step
              return (
                <button
                  key={s.step}
                  onClick={() => setActiveStep(s.step)}
                  className={`flex flex-col justify-between rounded-xl border p-3 text-left transition-all cursor-pointer ${
                    selected
                      ? 'border-purple-500/60 bg-purple-50/50 dark:bg-purple-950/20 shadow-md ring-1 ring-purple-500/30'
                      : 'border-slate-200 dark:border-[#1C202B] bg-slate-50/70 dark:bg-[#14171F] hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-bold text-purple-600 dark:text-purple-400">Step {s.step}</span>
                    <span className="text-sm">{s.icon}</span>
                  </div>
                  <div className="mt-1 text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                    {s.title.split(' ')[0]} {s.title.split(' ')[1]}
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-slate-500">
                    <span>{s.day.split('·')[0]}</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{(s.prob * 100).toFixed(0)}% P</span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Active Step Deep-Dive Card */}
        <div className="rounded-xl border border-slate-200 dark:border-[#1C202B] bg-slate-50 dark:bg-[#14171F] p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">{currentStepData.icon}</span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Step {currentStepData.step}: {currentStepData.title}
                  </span>
                  <span className="rounded-full bg-purple-500/15 border border-purple-500/30 px-2 py-0.2 text-[10px] font-semibold text-purple-600 dark:text-purple-300">
                    {currentStepData.day}
                  </span>
                </div>
                <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                  {currentStepData.description}
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setSimulatedStep(currentStepData.step)
                setTimeout(() => setSimulatedStep(null), 3000)
              }}
              className="rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-purple-500 transition-colors shadow-sm cursor-pointer shrink-0"
            >
              {simulatedStep === currentStepData.step ? '✓ Executed & Verified' : '⚡ Simulate Step'}
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-200 dark:border-[#242937] text-xs">
            <div>
              <span className="text-[10px] text-slate-500">Execution Rail:</span>
              <div className="font-semibold text-slate-900 dark:text-white truncate">{currentStepData.rail}</div>
            </div>
            <div>
              <span className="text-[10px] text-slate-500">Calibrated Success P:</span>
              <div className="font-bold text-emerald-600 dark:text-emerald-400">
                {(currentStepData.prob * 100).toFixed(0)}% Probability
              </div>
            </div>
            <div>
              <span className="text-[10px] text-slate-500">Enforced Guardrail:</span>
              <div className="font-mono text-[11px] text-blue-600 dark:text-blue-400 truncate">{currentStepData.rule}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
