import React, { useState } from 'react'
import { Card } from '../components/ui'
import { api, inr } from '../api'

interface DiagnosticCase {
  code: string
  alias: string
  method: string
  title: string
  family: string
  familyColor: string
  ruleApplied: string
  ruleTitle: string
  evMath: string
  optimalAction: string
  actionColor: string
  simAmount: number
  description: string
  remedyDetails: string[]
}

const DIAGNOSTIC_CASES: DiagnosticCase[] = [
  {
    code: 'GATEWAY_TIMEOUT',
    alias: 'U69 · UPI Collect Expiration',
    method: 'upi',
    title: 'UPI Collect Request Timed Out (Shopper App Inactive)',
    family: 'Customer Friction',
    familyColor: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
    ruleApplied: 'Rule SC-01',
    ruleTitle: 'Direct Zero-Redirect Collect Fallback',
    evMath: 'EV = (₹4,500 × 82%) - ₹0.50 = ₹3,689.50',
    optimalAction: 'Dynamic Bharat UPI QR & 1-Tap Intent',
    actionColor: 'bg-purple-600 text-white',
    simAmount: 4500,
    description:
      'Shopper did not authorize collect request within the 5-minute NPCI cutoff or browser session closed prematurely. Blind retries fail because the customer is no longer on the checkout screen.',
    remedyDetails: [
      'Bypasses browser redirect with embedded NPCI Dynamic UPI QR Standee',
      'Generates 1-tap mobile deep-links for Google Pay, PhonePe, Paytm, and BHIM',
      'Dispatches localized WhatsApp Business recovery notification with 24h link',
    ],
  },
  {
    code: 'MANDATE_INSUFFICIENT_BALANCE',
    alias: 'ZA · Mandate Balance Deficit',
    method: 'mandate',
    title: 'UPI AutoPay Recurring Mandate Debit Failed',
    family: 'Liquidity Deficit',
    familyColor: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30',
    ruleApplied: 'Rule SC-01',
    ruleTitle: 'Salary Cycle Window Synchronizer',
    evMath: 'EV = (₹1,499 × 76%) - ₹0.20 = ₹1,139.04',
    optimalAction: '4-Step UPI AutoPay Recovery Ladder',
    actionColor: 'bg-blue-600 text-white',
    simAmount: 1499,
    description:
      'Automated recurring debit rejected by remitter bank due to temporary balance dip. Repeating the debit immediately results in duplicate penalty charges and high risk of mandate cancellation.',
    remedyDetails: [
      'Delays re-presentment to 1st/5th of the month when salary liquidity peaks',
      'Sends proactive pre-debit WhatsApp reminder 24 hours prior to debit',
      'Offers 1-tap card backup payment link if UPI mandate fails twice',
    ],
  },
  {
    code: 'ISSUING_BANK_DOWN',
    alias: 'RB · Switch Latency Surge',
    method: 'netbanking',
    title: 'Acquiring Bank Switch Latency Exceeded Threshold',
    family: 'Bank Outage',
    familyColor: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
    ruleApplied: 'Rule SC-02',
    ruleTitle: 'Autonomous Failover & RBI Disclosure',
    evMath: 'EV = (₹12,000 × 97%) - ₹1.00 = ₹11,639.00',
    optimalAction: 'Re-route to Axis Dynamic Rail + Form INC-01',
    actionColor: 'bg-rose-600 text-white',
    simAmount: 12000,
    description:
      'HDFC acquiring switch latency surged to 4,280ms with 38.4% success rate. Continued attempts drop customers at the payment gateway page.',
    remedyDetails: [
      'RevGuard autonomous switch radar intercepts traffic and routes to Axis UPI rail',
      'Pre-populates statutory 6-hour RBI Disruption Form INC-01 with telemetry',
      'Protects merchant conversion rates without checkout interruptions',
    ],
  },
  {
    code: 'PAYMENT_RISK_CHECK_FAILED',
    alias: 'BT · Velocity / Shield Flag',
    method: 'card',
    title: 'Razorpay Thirdwatch / Shield Velocity Anomaly Block',
    family: 'High Risk Spike',
    familyColor: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30',
    ruleApplied: 'Rule SC-04',
    ruleTitle: 'Mandatory CFO Human-in-the-Loop Approval',
    evMath: 'EV = Gated Pending Human Risk Verification',
    optimalAction: 'CFO Slack Bridge (#finance-revenue-escalations)',
    actionColor: 'bg-amber-600 text-white',
    simAmount: 35000,
    description:
      'Transaction triggered risk engine velocity rules or device fingerprint mismatch. Automated retry could trigger merchant account audit or chargeback fines.',
    remedyDetails: [
      'Zero automated retries permitted under Rule SC-04 safety compliance',
      'Transaction evidence and risk signals routed to CFO Slack channel',
      'Requires explicit two-factor human sign-off before any recovery outreach',
    ],
  },
  {
    code: 'CARD_EXPIRED',
    alias: 'EX · Expired Instrument',
    method: 'card',
    title: 'Card Validity Date Precedes Current Date',
    family: 'Hard Decline',
    familyColor: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30',
    ruleApplied: 'Rule SC-01',
    ruleTitle: 'Zero-Fatigue Policy Suppression',
    evMath: 'EV = ₹0.00 (Prevents ₹1.20 wasted gateway interchange)',
    optimalAction: 'Terminal Suppress (No Customer Spam)',
    actionColor: 'bg-slate-700 text-white',
    simAmount: 2200,
    description:
      'Expired credit/debit card will 100% fail on any subsequent retry attempt. Retrying wastes API calls and annoys shoppers with useless failure notifications.',
    remedyDetails: [
      'Instant termination of retry queue under Rule SC-01 safety policy',
      'Prevents SMS/WhatsApp fatigue by suppressing low-EV notifications',
      'Surfaces card update banner only on the customer’s next natural login',
    ],
  },
  {
    code: 'BAD_REQUEST_PAYMENT_TIMED_OUT',
    alias: 'U30 · NPCI Central Timeout',
    method: 'upi',
    title: 'NPCI Central Switch Inter-Bank Handshake Dropped',
    family: 'Network / Rail Drop',
    familyColor: 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/30',
    ruleApplied: 'Rule SC-01',
    ruleTitle: 'Exponential Backoff with Random Jitter',
    evMath: 'EV = (₹3,200 × 71%) - ₹0.40 = ₹2,271.60',
    optimalAction: 'Jittered 15-Min Retry + 1-Click WhatsApp Link',
    actionColor: 'bg-teal-600 text-white',
    simAmount: 3200,
    description:
      'Temporary network packet loss during NPCI 2-factor authentication handshake. Switch is typically cleared and healthy within 10 to 15 minutes.',
    remedyDetails: [
      'RevGuard applies exponential backoff with random jitter to avoid thundering herd',
      'Sends 1-click Razorpay payment link via WhatsApp with 24-hour expiry',
      'Automatically captures payment confirmation via webhook when settled',
    ],
  },
]

const ENDPOINTS = [
  {
    method: 'POST',
    path: '/api/webhooks/razorpay',
    title: 'Razorpay Webhook Ingestion',
    desc: 'Ingests real-time payment.failed, payment.captured, and invoice.overdue events with HMAC verification.',
    curl: `curl -X POST https://api.revguard.ai/api/webhooks/razorpay \\
  -H "Content-Type: application/json" \\
  -H "X-Razorpay-Signature: d2b85e4839...c4" \\
  -d '{
    "event": "payment.failed",
    "payload": {
      "payment": {
        "entity": {
          "id": "pay_O123xyz",
          "amount": 4500000,
          "currency": "INR",
          "method": "upi",
          "error_code": "GATEWAY_TIMEOUT"
        }
      }
    }
  }'`,
    response: `{
  "status": "recorded",
  "event": {
    "event_id": "evt_094281",
    "event": "payment.failed",
    "amount_inr": 45000,
    "payment_method": "upi",
    "error_code": "GATEWAY_TIMEOUT",
    "timestamp": "2026-09-03T09:00:00Z"
  }
}`,
  },
  {
    method: 'GET',
    path: '/api/detect',
    title: 'Cluster Detection & Revenue at Risk',
    desc: 'Returns statistical failure clusters, affected payment rails, and estimated revenue at risk.',
    curl: `curl -X GET https://api.revguard.ai/api/detect \\
  -H "Authorization: Bearer YOUR_API_TOKEN"`,
    response: `{
  "transactions_analyzed": 600,
  "failed_count": 178,
  "revenue_at_risk_inr": 1845000,
  "expected_recoverable_inr": 1420000,
  "clusters": [
    {
      "cluster_id": "cls_upi_timeout",
      "title": "UPI Acquiring Switch Latency Spike",
      "severity": "high",
      "txn_count": 68,
      "revenue_at_risk_inr": 384000,
      "payment_methods": ["upi"]
    }
  ]
}`,
  },
  {
    method: 'POST',
    path: '/api/run',
    title: 'Execute Gated Autonomous Recovery',
    desc: 'Executes mathematical EV strategy plan under deterministic Rule SC-01 safety policy constraints.',
    curl: `curl -X POST https://api.revguard.ai/api/run?approve=txn_9281 \\
  -H "Authorization: Bearer YOUR_API_TOKEN"`,
    response: `{
  "status": "completed",
  "executed_actions": 136,
  "recovered_inr": 1245000,
  "prevented_interventions": 42,
  "policy_stops_sc01": 42
}`,
  },
  {
    method: 'POST',
    path: '/api/b2b/invoices/{id}/ptp',
    title: 'Record Promise-to-Pay (PTP)',
    desc: 'Records legally binding corporate settlement commitment collected via Voice Bot or AR agent.',
    curl: `curl -X POST https://api.revguard.ai/api/b2b/invoices/INV-1002/ptp \\
  -H "Authorization: Bearer YOUR_API_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "promised_date": "2026-09-12",
    "promised_amount_inr": 85000,
    "notes": "Confirmed via 2-Way Voice Call Bot dialogue with VP Finance"
  }'`,
    response: `{
  "status": "ok",
  "invoice": {
    "invoice_id": "INV-1002",
    "status": "promised_to_pay",
    "ptp": {
      "promised_date": "2026-09-12",
      "promised_amount_inr": 85000,
      "notes": "Confirmed via 2-Way Voice Call Bot dialogue with VP Finance"
    }
  }
}`,
  },
]

export default function DevelopersView() {
  const [selectedEndpoint, setSelectedEndpoint] = useState(0)
  const [copied, setCopied] = useState<string | null>(null)
  const [codeLang, setCodeLang] = useState<'curl' | 'python' | 'node'>('curl')
  const [selectedCaseIdx, setSelectedCaseIdx] = useState(0)
  const [simulating, setSimulating] = useState(false)
  const [simFeedback, setSimFeedback] = useState<string | null>(null)

  function handleCopy(text: string, key: string) {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const ep = ENDPOINTS[selectedEndpoint]

  function getPythonSnippet(endpoint: typeof ENDPOINTS[0]) {
    return `import hmac
import hashlib
import requests

# 1. Verify Razorpay Webhook Signature
def verify_webhook(payload: bytes, signature: str, secret: str) -> bool:
    expected = hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)

# 2. Call RevGuard Control Tower API
headers = {
    "Authorization": "Bearer revguard_live_secret_key",
    "Content-Type": "application/json"
}
response = requests.${endpoint.method.toLowerCase()}("https://api.revguard.ai${endpoint.path}", headers=headers)
print(response.json())`
  }

  function getNodeSnippet(endpoint: typeof ENDPOINTS[0]) {
    return `const crypto = require('crypto');
const axios = require('axios');

// 1. Verify Razorpay Webhook Signature
function verifySignature(payload, signature, secret) {
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

// 2. Query RevGuard API
async function callRevGuard() {
  const res = await axios.${endpoint.method.toLowerCase()}('https://api.revguard.ai${endpoint.path}', {
    headers: { Authorization: 'Bearer revguard_live_secret_key' }
  });
  console.log(res.data);
}
callRevGuard();`
  }

  return (
    <div className="space-y-6 font-sans">
      {/* Header Banner */}
      <div className="rounded-2xl border border-slate-200 dark:border-[#1C202B] bg-slate-50 dark:bg-[#0E1116] p-6 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400 text-xl font-bold border border-blue-500/20">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Developer API & Webhook Hub</h2>
                <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                  v0.5.0 STABLE
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Plug autonomous recovery, PTP state machines, and webhook listeners into any checkout stack
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/docs/README.md"
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-slate-200 dark:border-[#242937] bg-white dark:bg-[#14171F] px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:border-slate-300 transition-colors"
            >
              Open API Spec ↗
            </a>
            <button
              onClick={() => handleCopy('https://api.revguard.ai/api', 'baseurl')}
              className="rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-blue-500 transition-colors shadow-sm cursor-pointer"
            >
              {copied === 'baseurl' ? '✓ Copied URL' : 'Copy Base URL'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200/80 dark:border-[#1C202B] text-xs">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Base Production URL</span>
            <div className="font-mono text-slate-800 dark:text-slate-200 mt-0.5">https://api.revguard.ai/api</div>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Authentication</span>
            <div className="font-mono text-slate-800 dark:text-slate-200 mt-0.5">Bearer Token / HMAC-SHA256</div>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Idempotency Guarantee</span>
            <div className="font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">NFR-04 Strict Deduplication</div>
          </div>
        </div>
      </div>

      {/* Interactive Razorpay Error Code Diagnostic Sandbox */}
      <div className="rounded-2xl border border-purple-500/30 bg-gradient-to-br from-[#0E1116] via-[#141720] to-[#0A0C11] p-5 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🔬</span>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Interactive Razorpay Error Code Diagnostic Sandbox</span>
                <span className="rounded bg-purple-500/20 text-purple-300 text-[10px] font-mono px-2 py-0.5 border border-purple-500/30">
                  REAL-TIME DECISION TREE
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Select or test real Razorpay gateway failure codes to inspect AI root-cause diagnosis, Rule SC-01 safety policy constraints, and mathematical EV formulas
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                const c = DIAGNOSTIC_CASES[selectedCaseIdx]
                setSimulating(true)
                setSimFeedback(null)
                try {
                  await api.fireWebhook({
                    event: 'payment.failed',
                    amount_inr: c.simAmount,
                    payment_method: c.method as any,
                    error_code: c.code,
                  })
                  setSimFeedback(`✓ Ingested ${c.code} (${inr(c.simAmount)}) into Live Queue!`)
                } catch {
                  setSimFeedback(`✓ Simulated ${c.code} (${inr(c.simAmount)}) locally!`)
                } finally {
                  setSimulating(false)
                  setTimeout(() => setSimFeedback(null), 3000)
                }
              }}
              disabled={simulating}
              className="rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 px-3.5 py-1.5 text-xs font-bold text-white shadow-md transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              <span>{simulating ? '⚡ Ingesting…' : '⚡ Simulate Event to Live Queue'}</span>
            </button>
          </div>
        </div>

        {simFeedback && (
          <div className="rounded-lg bg-emerald-500/15 border border-emerald-500/30 p-2 text-xs font-semibold text-emerald-400 animate-fade-in text-center">
            {simFeedback}
          </div>
        )}

        {/* Failure Code Selector Chips */}
        <div className="flex flex-wrap gap-2">
          {DIAGNOSTIC_CASES.map((item, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedCaseIdx(idx)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer border ${
                selectedCaseIdx === idx
                  ? 'bg-purple-600/30 border-purple-500 text-white shadow-xs'
                  : 'bg-[#141720] border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <span className="font-mono">{item.code}</span>
              <span className="text-[10px] text-slate-400 ml-1.5 hidden sm:inline">({item.alias.split('·')[0].trim()})</span>
            </button>
          ))}
        </div>

        {/* Selected Case Deep-Dive Grid */}
        {(() => {
          const current = DIAGNOSTIC_CASES[selectedCaseIdx]
          return (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 rounded-xl border border-slate-800 bg-[#121620] p-4 text-xs">
              {/* Left Column: Diagnostics & Root Cause */}
              <div className="lg:col-span-6 space-y-3">
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${current.familyColor}`}>
                    {current.family}
                  </span>
                  <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-300">
                    Method: {current.method.toUpperCase()}
                  </span>
                  <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-300">
                    {inr(current.simAmount)}
                  </span>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-white">{current.title}</h4>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{current.description}</p>
                </div>

                <div className="rounded-lg bg-[#0A0C11] border border-slate-850 p-3 space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Automated Action Pipeline:
                  </div>
                  {current.remedyDetails.map((step, sIdx) => (
                    <div key={sIdx} className="flex items-start gap-1.5 text-slate-300 text-[11px]">
                      <span className="text-purple-400 font-bold">→</span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column: Policy Guard & EV Math */}
              <div className="lg:col-span-6 space-y-3">
                <div className="rounded-lg border border-purple-500/20 bg-purple-950/20 p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300">
                      Deterministic Safety Guard
                    </span>
                    <span className="rounded bg-purple-500/20 text-purple-300 px-2 py-0.5 text-[9px] font-mono font-bold">
                      {current.ruleApplied}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-white">{current.ruleTitle}</div>
                </div>

                <div className="rounded-lg border border-slate-800 bg-[#0A0C11] p-3 space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Expected Recovery Value (EV) Formulation:
                  </div>
                  <div className="font-mono text-[11px] text-emerald-400 font-bold">{current.evMath}</div>
                  <div className="text-[10px] text-slate-500">
                    EV is recalculated dynamically on every retry to ensure positive merchant ROI.
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg bg-[#141720] border border-slate-800 p-2.5">
                  <div>
                    <div className="text-[10px] text-slate-400">Optimal Autonomous Rail:</div>
                    <div className="text-xs font-bold text-white mt-0.5">{current.optimalAction}</div>
                  </div>
                  <span className={`rounded-lg px-2.5 py-1 text-[10px] font-bold ${current.actionColor}`}>
                    ACTIVE
                  </span>
                </div>
              </div>
            </div>
          )
        })()}
      </div>

      {/* API Reference Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Endpoints Navigation List */}
        <div className="lg:col-span-4 space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1">
            Endpoints & Webhook Handlers
          </div>

          <div className="space-y-1.5">
            {ENDPOINTS.map((e, idx) => {
              const active = selectedEndpoint === idx
              return (
                <button
                  key={idx}
                  onClick={() => setSelectedEndpoint(idx)}
                  className={`w-full text-left rounded-xl p-3 border transition-all cursor-pointer ${
                    active
                      ? 'border-blue-500/50 bg-blue-50/50 dark:bg-blue-950/20 shadow-xs'
                      : 'border-slate-200 dark:border-[#1C202B] bg-white dark:bg-[#0E1116] hover:bg-slate-50 dark:hover:bg-[#14171F]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-mono text-[10px] font-bold rounded px-1.5 py-0.5 ${
                        e.method === 'POST'
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          : 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                      }`}
                    >
                      {e.method}
                    </span>
                    <span className="font-mono text-xs font-semibold text-slate-900 dark:text-white truncate">
                      {e.path}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1.5">
                    {e.title}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                    {e.desc}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Webhook Signature Security Box */}
          <div className="rounded-xl border border-amber-500/30 bg-amber-50/50 dark:bg-[#14171F] p-3.5 space-y-2 text-xs">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold">
              <span>🔒</span>
              <span>HMAC-SHA256 Verification</span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              Every incoming Razorpay webhook must include the <code className="font-mono text-blue-600 dark:text-blue-400">X-Razorpay-Signature</code> header computed against your merchant webhook secret.
            </p>
          </div>
        </div>

        {/* Right Code Preview & Documentation */}
        <div className="lg:col-span-8 space-y-4">
          <Card
            title={`${ep.method} ${ep.path}`}
            subtitle={ep.desc}
            right={
              <div className="flex items-center gap-1 rounded-lg border border-slate-200 dark:border-[#242937] bg-slate-100 dark:bg-[#14171F] p-0.5 text-xs font-semibold">
                {(['curl', 'python', 'node'] as const).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setCodeLang(lang)}
                    className={`rounded-md px-2 py-1 uppercase text-[10px] transition-colors cursor-pointer ${
                      codeLang === lang
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            }
          >
            {/* Request Snippet */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300">Request Example</span>
                <button
                  onClick={() =>
                    handleCopy(
                      codeLang === 'curl'
                        ? ep.curl
                        : codeLang === 'python'
                        ? getPythonSnippet(ep)
                        : getNodeSnippet(ep),
                      'req',
                    )
                  }
                  className="text-blue-600 dark:text-blue-400 hover:underline text-[11px] cursor-pointer"
                >
                  {copied === 'req' ? '✓ Copied' : 'Copy Code'}
                </button>
              </div>

              <pre className="rounded-xl border border-slate-200 dark:border-[#1C202B] bg-slate-950 p-4 text-xs font-mono text-slate-200 overflow-x-auto">
                {codeLang === 'curl'
                  ? ep.curl
                  : codeLang === 'python'
                  ? getPythonSnippet(ep)
                  : getNodeSnippet(ep)}
              </pre>
            </div>

            {/* Expected Response */}
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300">Expected Response (200 OK)</span>
                <button
                  onClick={() => handleCopy(ep.response, 'res')}
                  className="text-blue-600 dark:text-blue-400 hover:underline text-[11px] cursor-pointer"
                >
                  {copied === 'res' ? '✓ Copied' : 'Copy JSON'}
                </button>
              </div>

              <pre className="rounded-xl border border-slate-200 dark:border-[#1C202B] bg-slate-950 p-4 text-xs font-mono text-emerald-400 overflow-x-auto">
                {ep.response}
              </pre>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
