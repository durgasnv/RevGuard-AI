import React, { useState } from 'react'
import { Card } from '../components/ui'

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
