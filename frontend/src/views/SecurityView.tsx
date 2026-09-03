import React from 'react'
import { Card } from '../components/ui'

export default function SecurityView() {
  return (
    <div className="space-y-6 font-sans">
      {/* Header Banner */}
      <div className="rounded-2xl border border-slate-200 dark:border-[#1C202B] bg-slate-50 dark:bg-[#0E1116] p-6 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 text-xl font-bold border border-emerald-500/20">
              🛡️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Security, Safety & Compliance Center</h2>
                <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                  ENTERPRISE CERTIFIED
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Deterministic execution guardrails, PCI-DSS compliance, zero PAN storage, and HMAC integrity
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              SC-01 Enforced
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-200/80 dark:border-[#1C202B] text-xs">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Card Data Retention</span>
            <div className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">0% (Out-of-Scope)</div>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Retry Cap Limit</span>
            <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">Max 3 Attempts (Hard Stop)</div>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Contact Hour Policy</span>
            <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">08:00 AM – 09:00 PM IST</div>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Audit Trail State</span>
            <div className="font-bold text-blue-600 dark:text-blue-400 mt-0.5">Append-Only Immutable</div>
          </div>
        </div>
      </div>

      {/* 4 Pillars of Security & Governance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pillar 1: Deterministic Safety Rule SC-01 */}
        <Card
          title="Deterministic Safety Engine (Rule SC-01)"
          subtitle="Non-negotiable policy boundaries governing autonomous agents"
        >
          <div className="space-y-3 text-xs">
            <div className="rounded-xl border border-slate-200 dark:border-[#1C202B] bg-slate-50 dark:bg-[#14171F] p-3.5 space-y-1.5">
              <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                <span className="flex items-center gap-1.5">
                  <span className="text-emerald-500">✓</span> Zero Customer Fatigue Guard
                </span>
                <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400">HARD LIMIT</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                Autonomous agents are strictly blocked from retrying a failed transaction more than 3 times. Reaching attempt #3 triggers an immediate, permanent policy stop.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-[#1C202B] bg-slate-50 dark:bg-[#14171F] p-3.5 space-y-1.5">
              <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                <span className="flex items-center gap-1.5">
                  <span className="text-emerald-500">✓</span> High-Value Policy Gate (CFO Sign-off)
                </span>
                <span className="font-mono text-[10px] text-amber-500">THRESHOLD: ₹25,000</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                Any recovery action on transactions &ge; ₹25,000 requires explicit human approval via the in-app Slack Bridge before recovery links or retries are dispatched.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-[#1C202B] bg-slate-50 dark:bg-[#14171F] p-3.5 space-y-1.5">
              <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                <span className="flex items-center gap-1.5">
                  <span className="text-emerald-500">✓</span> Contact Hours & Do-Not-Disturb (DND)
                </span>
                <span className="font-mono text-[10px] text-blue-500">08:00 – 21:00</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                Voice calls and WhatsApp links are withheld between 9:00 PM and 8:00 AM IST to guarantee consumer protection and preserve merchant brand reputation.
              </p>
            </div>
          </div>
        </Card>

        {/* Pillar 2: Zero PCI-DSS Card Exposure & Privacy */}
        <Card
          title="PCI-DSS Scoping & Zero Card Storage"
          subtitle="Complete avoidance of sensitive payment cardholder data"
        >
          <div className="space-y-3 text-xs">
            <div className="rounded-xl border border-slate-200 dark:border-[#1C202B] bg-slate-50 dark:bg-[#14171F] p-3.5 space-y-1.5">
              <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                <span>Zero Cardholder Data Storage</span>
                <span className="rounded bg-emerald-500/15 text-emerald-600 px-1.5 py-0.2 text-[10px]">TEST VERIFIED</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                RevGuard never processes or stores 16-digit PANs, CVV codes, or card expiry data. Verified by automated tests (<code className="font-mono text-blue-500">test_no_card_like_data_in_audit_or_state</code>).
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-[#1C202B] bg-slate-50 dark:bg-[#14171F] p-3.5 space-y-1.5">
              <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                <span>Cryptographic HMAC-SHA256 Signatures</span>
                <span className="rounded bg-blue-500/15 text-blue-600 px-1.5 py-0.2 text-[10px]">WEBHOOK INTEGRITY</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                All incoming webhook requests from Razorpay are verified using constant-time HMAC-SHA256 signature comparison. Replay attacks are blocked via an in-memory idempotency cache (<code className="font-mono text-blue-500">_SEEN_WEBHOOK_IDS</code>).
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-[#1C202B] bg-slate-50 dark:bg-[#14171F] p-3.5 space-y-1.5">
              <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                <span>Role-Based Access Control (RBAC)</span>
                <span className="rounded bg-purple-500/15 text-purple-600 px-1.5 py-0.2 text-[10px]">4 PERSONAS</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                Access is restricted across 4 operational personas: Chief Financial Officer (CFO), Head of Payments, Operations Lead, and AR Account Manager.
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Compliance Evidence & Verification Checklist */}
      <Card
        title="Compliance & Audit Trail Integrity"
        subtitle="Verifiable cryptographic proof of compliance across every autonomous recovery action"
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="rounded-xl border border-slate-200 dark:border-[#1C202B] bg-slate-50 dark:bg-[#14171F] p-4 space-y-2">
            <div className="text-xl">📋</div>
            <div className="font-bold text-slate-900 dark:text-white">Consequential Audit Log</div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Every diagnostic evaluation, probability estimate, policy gate validation, and outreach event is appended with UTC timestamps and evidence dictionaries.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-[#1C202B] bg-slate-50 dark:bg-[#14171F] p-4 space-y-2">
            <div className="text-xl">⚖️</div>
            <div className="font-bold text-slate-900 dark:text-white">Deterministic Override Authority</div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Human operators retain full veto capability. Any automated recovery action can be blocked, paused, or redirected with one click.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-[#1C202B] bg-slate-50 dark:bg-[#14171F] p-4 space-y-2">
            <div className="text-xl">🔐</div>
            <div className="font-bold text-slate-900 dark:text-white">API Authentication</div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              JWT Bearer tokens authenticate API calls with scoped claims. Secrets are strictly managed via environment variables and never committed to source.
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}
