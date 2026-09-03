import React, { useState } from 'react'
import { Card } from '../components/ui'
import { inr } from '../api'

const POLICIES = [
  {
    code: 'Rule SC-01',
    name: 'Deterministic Attempt Cap & Customer Fatigue Guard',
    tag: 'MANDATORY SAFETY',
    tagTone: 'rose',
    summary: 'Hard stop at 3 retry attempts, 08:00-21:00 contact window, and CFO approval gate for transactions >= ₹25,000.',
    details: [
      'Maximum 3 total automated recovery interventions per failed transaction.',
      'Reaching attempt #3 triggers an immutable STOP outcome to prevent customer annoyance.',
      'Restricts automated SMS/voice outreach to business hours (08:00 to 21:00 IST).',
      'Transactions >= ₹25,000 require human sign-off via Slack Bridge before link dispatch.',
    ],
    enforcedAt: 'PolicyGuard.validate_action()',
  },
  {
    code: 'Rule SC-02',
    name: 'Multi-Bank Acquiring Switch Latency Failover',
    tag: 'HIGH-AVAILABILITY',
    tagTone: 'blue',
    summary: 'Autonomous traffic re-routing when acquiring switch latency exceeds 2,500ms or failure rate crosses 15%.',
    details: [
      'Continuously samples telemetry on HDFC, ICICI, Axis, and SBI acquiring rails.',
      'Auto-diverts checkout traffic away from degraded switches without shopper intervention.',
      'Protects ~₹3.84L in checkout drop-offs per outage event with zero cart loss.',
      'Restores primary switch routing once health telemetry normalizes for 10 consecutive cycles.',
    ],
    enforcedAt: 'BankSwitchHealthRadar / RoutingEngine',
  },
  {
    code: 'Rule SC-03',
    name: 'Margin-Bounded Yield Discount & Incentive Cap',
    tag: 'ECONOMIC OPTIMIZATION',
    tagTone: 'purple',
    summary: 'Dynamic cashback and conversion incentives bounded strictly by merchant gross margin constraints.',
    details: [
      'Mathematical yield model: EV = P(recovery | discount) * (Amount - Discount) - Cost.',
      'Hard cap: Dynamic discount cannot exceed 10% or reduce merchant gross margin below 50%.',
      'Boosts abandoned checkout recovery rate from 18% to 78% with positive net contribution margin.',
      'Prevents loss-making margin erosion on price-sensitive consumer segments.',
    ],
    enforcedAt: 'DynamicYieldOptimizer / StrategyEngine',
  },
  {
    code: 'Rule SC-04',
    name: 'UPI AutoPay Liquidity-Cycle Mandate Timing',
    tag: 'RECURRING RECOVERY',
    tagTone: 'emerald',
    summary: 'Aligns mandate retries with consumer salary credit and liquidity windows (1st-5th of month, 09:00 AM).',
    details: [
      'Avoids burning mandate retries immediately following an INSUFFICIENT_FUNDS decline.',
      'Times retry execution to salary deposit credit cycles (typically 1st through 5th of month).',
      'Improves recurring mandate recovery from 32% (blind retry) to 82% (heuristic timing).',
      'Sequences through 4 escalation steps: salary timing -> switch failover -> 1-click link -> Voice Bot.',
    ],
    enforcedAt: 'MandateLadderSequencer / B2BEngine',
  },
]

export default function ResourcesView() {
  const [activePolicy, setActivePolicy] = useState(0)
  const [downloading, setDownloading] = useState(false)

  async function handleDownloadAuditPack() {
    try {
      setDownloading(true)
      const res = await fetch('/api/audit')
      const data = await res.json()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `revguard_compliance_audit_pack_${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('Failed to download audit pack:', e)
    } finally {
      setDownloading(false)
    }
  }

  const p = POLICIES[activePolicy]

  return (
    <div className="space-y-6 font-sans">
      {/* Header Banner */}
      <div className="rounded-2xl border border-slate-200 dark:border-[#1C202B] bg-slate-50 dark:bg-[#0E1116] p-6 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-600/10 text-purple-600 dark:text-purple-400 text-xl font-bold border border-purple-500/20">
              📚
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Policies, Specifications & Resources</h2>
                <span className="rounded-full bg-purple-500/15 border border-purple-500/30 px-2.5 py-0.5 text-[10px] font-bold text-purple-600 dark:text-purple-400">
                  STANDARD V2.0
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Official rule definitions, mathematical recovery models, and compliance artifacts
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadAuditPack}
              disabled={downloading}
              className="rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-blue-500 transition-colors shadow-sm cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              <span>{downloading ? 'Preparing Pack…' : '📥 Download Compliance Pack (JSON)'}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-200/80 dark:border-[#1C202B] text-xs">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Active Policy Rules</span>
            <div className="font-bold text-slate-900 dark:text-white mt-0.5">4 Core Deterministic Rules</div>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Evaluation Method</span>
            <div className="font-bold text-slate-900 dark:text-white mt-0.5">Counterfactual A/B Uplift</div>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Optimization Metric</span>
            <div className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">Expected Value ($EV)</div>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Release Version</span>
            <div className="font-bold text-purple-600 dark:text-purple-400 mt-0.5">v0.5.0 Production</div>
          </div>
        </div>
      </div>

      {/* Policy Rules Directory Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Policies List */}
        <div className="lg:col-span-4 space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1">
            Deterministic Policy Rules
          </div>

          <div className="space-y-2">
            {POLICIES.map((item, idx) => {
              const selected = activePolicy === idx
              return (
                <button
                  key={idx}
                  onClick={() => setActivePolicy(idx)}
                  className={`w-full text-left rounded-xl p-3 border transition-all cursor-pointer ${
                    selected
                      ? 'border-purple-500/50 bg-purple-50/50 dark:bg-purple-950/20 shadow-xs ring-1 ring-purple-500/20'
                      : 'border-slate-200 dark:border-[#1C202B] bg-white dark:bg-[#0E1116] hover:bg-slate-50 dark:hover:bg-[#14171F]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-purple-600 dark:text-purple-400">
                      {item.code}
                    </span>
                    <span
                      className={`text-[9px] font-bold uppercase tracking-wider rounded px-1.5 py-0.2 ${
                        item.tagTone === 'rose'
                          ? 'bg-rose-500/15 text-rose-600'
                          : item.tagTone === 'blue'
                          ? 'bg-blue-500/15 text-blue-600'
                          : item.tagTone === 'emerald'
                          ? 'bg-emerald-500/15 text-emerald-600'
                          : 'bg-purple-500/15 text-purple-600'
                      }`}
                    >
                      {item.tag}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white mt-1.5">
                    {item.name}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 leading-snug">
                    {item.summary}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Right Policy Deep Dive Card */}
        <div className="lg:col-span-8 space-y-4">
          <Card
            title={`${p.code}: ${p.name}`}
            subtitle={p.summary}
            right={
              <span className="font-mono text-[10px] text-slate-500 bg-slate-100 dark:bg-[#14171F] px-2 py-1 rounded border border-slate-200 dark:border-[#242937]">
                Enforced in: {p.enforcedAt}
              </span>
            }
          >
            <div className="space-y-4 text-xs">
              <div className="space-y-2">
                <div className="font-bold text-slate-900 dark:text-white text-xs">
                  Operational Clauses & Enforcement Criteria:
                </div>
                <div className="space-y-2">
                  {p.details.map((clause, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2.5 rounded-xl border border-slate-200 dark:border-[#1C202B] bg-slate-50 dark:bg-[#14171F] p-3 text-slate-700 dark:text-slate-300"
                    >
                      <span className="text-purple-600 dark:text-purple-400 font-bold shrink-0">{idx + 1}.</span>
                      <span className="leading-relaxed">{clause}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Economic & Mathematical Foundation */}
              <div className="rounded-xl border border-blue-500/20 bg-blue-50/50 dark:bg-[#14171F] p-4 space-y-2">
                <div className="font-bold text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                  <span>📐</span>
                  <span>Mathematical Guarantee</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  Unlike traditional retry engines that blindly re-invoke failing gateways, RevGuard AI guarantees that each intervention produces positive marginal Expected Value while bounding customer contact frequency strictly under SC-01.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
