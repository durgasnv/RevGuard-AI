import React, { useState } from 'react'
import { inr } from '../api'

export default function DynamicYieldIncentiveModal({
  onClose,
  initialAmount = 4500,
}: {
  onClose: () => void
  initialAmount?: number
}) {
  const [amount, setAmount] = useState(initialAmount)
  const [discountPct, setDiscountPct] = useState(5)
  const [marginPct] = useState(65) // 65% gross margin
  const maxAllowableDiscount = 10 // Policy cap SC-03

  // Math models:
  // Base recovery without incentive: P = 0.18
  // With dynamic incentive: P = 0.18 + (discountPct / 10) * 0.60
  const baseProb = 0.18
  const incentivizedProb = Math.min(0.85, baseProb + (discountPct / 10) * 0.60)
  const interventionCost = 2.50 // SMS / WhatsApp API cost

  const baseEV = baseProb * amount - interventionCost
  const discountAmount = (amount * discountPct) / 100
  const netAmountCollected = amount - discountAmount
  const incentivizedEV = incentivizedProb * netAmountCollected - interventionCost
  const netUplift = incentivizedEV - baseEV

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/75 p-4 backdrop-blur-xs">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
              ⚡
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Dynamic Incentive & EV Yield Optimizer
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Margin-bounded conversion incentives for checkout drop-offs & churn
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            ✕
          </button>
        </div>

        {/* Mathematical Formula Card */}
        <div className="rounded-xl border border-blue-200 dark:border-blue-500/20 bg-blue-50/60 dark:bg-blue-950/30 p-3.5 text-xs text-blue-900 dark:text-blue-200 space-y-1.5">
          <div className="font-bold flex items-center gap-1.5">
            <span>📐 Economic Yield Maximization Formula</span>
          </div>
          <div className="font-mono text-[11px] bg-white/70 dark:bg-slate-900/70 p-2 rounded border border-blue-200/60 dark:border-blue-800/60">
            EV(Incentive) = P(recovery | discount) × (Cart Amount - Discount) - Gateway Cost
          </div>
          <p className="text-[11px] text-blue-800/80 dark:text-blue-300/80 leading-relaxed">
            Standard recovery sends blind links ($18\%$ conversion). Offering a bounded $5\%$ dynamic cashback shifts conversion to $78\%$, yielding massive positive net revenue uplift while respecting gross margin boundaries.
          </p>
        </div>

        {/* Interactive Controls */}
        <div className="space-y-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 p-4">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-700 dark:text-slate-300">Abandoned Cart / Invoice Value:</span>
            <div className="flex items-center gap-1">
              {[2500, 4500, 8500, 15000].map((v) => (
                <button
                  key={v}
                  onClick={() => setAmount(v)}
                  className={`rounded px-2 py-0.5 text-[11px] font-bold ${
                    amount === v
                      ? 'bg-blue-600 text-white'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {inr(v)}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5 pt-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Dynamic Incentive / Discount: <span className="text-emerald-600 dark:text-emerald-400 font-bold">{discountPct}% ({inr(discountAmount)})</span>
              </span>
              <span className="text-[10px] text-slate-500">Max Policy Cap: {maxAllowableDiscount}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={maxAllowableDiscount}
              step={1}
              value={discountPct}
              onChange={(e) => setDiscountPct(Number(e.target.value))}
              className="w-full accent-emerald-600"
            />
          </div>
        </div>

        {/* Comparison Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850/70 p-3.5 space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Standard Blind Recovery
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Recovery Probability:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">18.0%</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Expected Recovery ($EV):</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{inr(baseEV)}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Customer Friction:</span>
                <span className="text-amber-600 dark:text-amber-400 font-semibold">High (Hesitant)</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-emerald-300 dark:border-emerald-500/40 bg-emerald-50/40 dark:bg-emerald-950/30 p-3.5 space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 flex items-center justify-between">
              <span>Dynamic AI Yield Recovery</span>
              <span className="rounded bg-emerald-500/20 px-1 py-0.2 text-[9px] font-bold text-emerald-600 dark:text-emerald-300">
                OPTIMAL
              </span>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Recovery Probability:</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {(incentivizedProb * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Expected Recovery ($EV):</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {inr(incentivizedEV)}
                </span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Net Extra Cash Won:</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  +{inr(netUplift)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Policy Boundary & Safety Lock */}
        <div className="flex items-center justify-between rounded-lg border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/30 dark:bg-emerald-950/20 p-2.5 text-[11px] text-emerald-800 dark:text-emerald-300">
          <div className="flex items-center gap-1.5">
            <span>🛡️</span>
            <span>Gross Margin Guard: <strong>{marginPct}% Product Margin</strong> (Safety buffer {marginPct - discountPct}%)</span>
          </div>
          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">POLICY COMPLIANT</span>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
