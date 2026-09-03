import React, { useState } from 'react'

interface RbiIncidentModalProps {
  onClose: () => void
  switchName?: string
  latencyMs?: number
  errorRate?: number
}

export default function RbiIncidentModal({
  onClose,
  switchName = 'HDFC Bank Acquiring Switch (Switch-01)',
  latencyMs = 3420,
  errorRate = 28.4,
}: RbiIncidentModalProps) {
  const [copied, setCopied] = useState(false)
  const now = new Date()
  const incidentId = `RBI-INC-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-0921`
  const incidentTime = new Date(now.getTime() - 42 * 60000).toISOString()
  const deadlineTime = new Date(now.getTime() + (6 * 60 - 42) * 60000).toISOString()

  const incidentReportText = `================================================================================
RESERVE BANK OF INDIA (RBI) — PAYMENT DISRUPTION INCIDENT REPORT
Payment Aggregators and Payment Gateways (PAPG) Master Directions
Form INC-01: 6-Hour Mandatory Outage & Degraded Performance Disclosure
================================================================================

1. REPORTING ENTITY DETAILS:
--------------------------------------------------------------------------------
Entity Name: RevGuard AI / Razorpay Ecosystem Partner
Entity Category: Non-Bank Payment Aggregator / Merchant Processing Gateway
Merchant Ref: REV-CORP-IND-2026
Report Date & Time: ${now.toISOString()}
Mandatory Disclosure Deadline: ${deadlineTime} (Within 6 Hours)

2. INCIDENT IDENTIFIERS:
--------------------------------------------------------------------------------
Incident Reference Number: ${incidentId}
Severity Level: P1 - Major Gateway Degradation
Payment Rails Impacted: UPI Collect, UPI Intent, NetBanking Core
Degraded Infrastructure Component: ${switchName}

3. CHRONOLOGY OF EVENTS (UTC / IST):
--------------------------------------------------------------------------------
- ${incidentTime}: Telemetry detected sudden latency spike to ${latencyMs}ms (Threshold: 2,500ms).
- ${new Date(now.getTime() - 40 * 60000).toISOString()}: Switch failure rate crossed 15% (Peak: ${errorRate}%).
- ${new Date(now.getTime() - 38 * 60000).toISOString()}: Deterministic Policy Rule SC-02 triggered.
- ${new Date(now.getTime() - 37 * 60000).toISOString()}: Autonomous failover executed; 100% of live traffic rerouted to secondary Axis Bank Switch (Switch-03).
- ${new Date(now.getTime() - 10 * 60000).toISOString()}: Traffic stabilization achieved; zero dropped carts on checkout.

4. TRANSACTIONAL IMPACT & REVENUE AT RISK:
--------------------------------------------------------------------------------
Total Transactions Sampled: 412
Failed Transactions on Primary Switch: 68
Estimated Revenue at Risk: INR 3,84,000
Transactions Successfully Recovered via Auto-Failover: 61 (89.7% Recovery)
Customer Inconvenience / Fatigue Stops (Rule SC-01): 7 Transactions

5. ROOT CAUSE & TECHNICAL DIAGNOSIS:
--------------------------------------------------------------------------------
Diagnosis: Upstream Core Banking Switch (CBS) database lock and HSM throttling at ${switchName}.
Failure Return Codes: GATEWAY_TIMEOUT, U28 (Customer Bank Down), NETWORK_ERROR.
Security Assessment: No cybersecurity breach, data loss, or unauthorized access detected.

6. CORRECTIVE & MITIGATIVE ACTIONS:
--------------------------------------------------------------------------------
a) Autonomous Dynamic Re-routing under RevGuard Rule SC-02 prevented ₹3.45L in complete cart abandonment.
b) Direct 1-Click WhatsApp & UPI Intent recovery links dispatched to affected shoppers.
c) Primary switch put in cool-off monitoring state until 10 consecutive healthy health checks.

================================================================================
Report Compiled Electronically by RevGuard-AI Autonomous Control Tower
Digital Verification Hash: SHA256:${incidentId.toLowerCase()}-e9b38f2910c7a88
================================================================================`

  function handleCopy() {
    navigator.clipboard.writeText(incidentReportText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleDownload() {
    const blob = new Blob([incidentReportText], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${incidentId}_Incident_Report.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs font-sans">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-[#1C202B] bg-white dark:bg-[#0E1116] p-6 shadow-2xl space-y-4 max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#1C202B] pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/30">
              🏛️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  RBI 6-Hour Disruption Incident Disclosure
                </h3>
                <span className="rounded-full bg-rose-500/15 border border-rose-500/30 px-2 py-0.2 text-[10px] font-bold text-rose-600 dark:text-rose-400">
                  FORM INC-01
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Statutory regulatory compliance reporting under RBI Master Directions for Payment Gateways
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-[#14171F] hover:text-white cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Regulatory SLA Timer & Metric Bar */}
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 flex items-center justify-between text-xs shrink-0">
          <div className="space-y-0.5">
            <div className="font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
              <span>Statutory Window: 6-Hour RBI Disclosure Requirement</span>
            </div>
            <div className="text-[11px] text-rose-600/90 dark:text-rose-400/80">
              Incident Ref: <b className="font-mono">{incidentId}</b> · Remaining: <b className="font-mono">5h 18m</b>
            </div>
          </div>

          <div className="text-right">
            <div className="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300">
              Mitigation Status
            </div>
            <div className="font-bold text-emerald-600 dark:text-emerald-400">
              ✓ Resolved via Rule SC-02
            </div>
          </div>
        </div>

        {/* Formatted Official Report Preview */}
        <div className="flex-1 overflow-y-auto space-y-3">
          <pre className="rounded-xl border border-slate-200 dark:border-[#1C202B] bg-slate-950 p-4 font-mono text-[11px] text-slate-200 leading-relaxed overflow-x-auto select-all whitespace-pre">
            {incidentReportText}
          </pre>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between border-t border-slate-100 dark:border-[#1C202B] pt-3 shrink-0">
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            Export compliant with RBI Circular DPSS.CO.PD.No.112
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="rounded-xl border border-slate-200 dark:border-[#242937] bg-white dark:bg-[#14171F] px-3.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#181C26] transition-all cursor-pointer"
            >
              {copied ? '✓ Copied to Clipboard' : 'Copy Report'}
            </button>

            <button
              onClick={handleDownload}
              className="rounded-xl bg-blue-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-blue-500 transition-colors shadow-sm cursor-pointer flex items-center gap-1.5"
            >
              <span>📥</span>
              <span>Download Report (.txt)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
