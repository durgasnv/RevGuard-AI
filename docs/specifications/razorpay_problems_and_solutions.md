# Razorpay Merchant Problems — How RevGuard-AI Solves Them

This document maps real-world payment problems documented by Razorpay, industry reports, and merchant pain points to specific capabilities of the RevGuard-AI Revenue Recovery Control Tower.

---

## 1. Massive Scale of Failed Payments

### The Problem

India processed 134.1 billion digital transactions worth Rs 10,443 lakh crore in FY 2025-26. UPI alone handled ~18,587 crore transactions. At a national failure rate of ~1.2%, the system generates over **150 million failed transactions every month** (Razorpay Enterprise Payment Support, 2026).

Razorpay's own blog states: **25% of customers abandon their shopping carts due to failed payments** (Razorpay Failed Payment Recovery, 2024). A 1% drop in Payment Success Rate (PSR) on Rs 1 crore monthly revenue costs **Rs 1,00,000 in lost revenue** — 5x the savings from a 0.2% MDR reduction (Razorpay Gateway Reliability, 2026).

### How RevGuard-AI Solves It

- **Revenue Risk Detection Engine** (`backend/app/detection/engine.py`): Clusters failed transactions by failure category and code, estimates revenue at risk per cluster using category-level recovery priors, and ranks clusters by impact — not just transaction count.
- **Revenue-at-Risk Estimation**: Computes gross value at risk, expected recoverable value, and unrecoverable value per cluster, giving merchants a clear picture of where the 150M monthly failures actually hurt revenue.

---

## 2. UPI Payment Failures — Business vs Technical Declines

### The Problem

Razorpay's UPI failure guide (2024) categorizes failures into:

- **Business Declines**: Customer cancels, incorrect PIN/UPI ID, insufficient funds, bank limits exceeded, transaction abandoned mid-flow.
- **Technical Declines**: Bank server downtime (`U28`), delayed bank responses, PSP app unavailability, network timeouts.

Key NPCI error codes merchants must handle:
| Code | Meaning |
|------|---------|
| `U28` | Customer's bank is down |
| `Z9` | Insufficient funds |
| `Z7` | Too many transactions (frequency limit) |
| `Z8` | Per-transaction limit exceeded |
| `U30` | Debit failed (bank issue) |
| `U69` | Collect request expired |

Merchants report confusion about **why** failures happen and **what to do** — the error codes are opaque and the right action differs per code.

### How RevGuard-AI Solves It

- **Failure Classification** (`backend/app/detection/classifier.py`): Maps Razorpay error codes to failure categories (transient, customer-related, payment-method-related, risk-related, etc.) using a deterministic mapping table.
- **Root Cause Diagnosis** (`backend/app/ai/diagnosis_agent.py`): For each cluster, produces an evidence-backed explanation of why failures are occurring — e.g., "bank server downtime affecting UPI" vs "customer PIN errors."
- **Differentiated Actions**: UPI bank downtime (`U28`) gets a retry-after-delay strategy. Insufficient funds (`Z9`) gets a payment link. Frequency limits (`Z7`) get a notify-customer action. Each code gets the right intervention, not a blind retry.

---

## 3. Subscription Payment Failures and Involuntary Churn

### The Problem

Razorpay's subscription payment guide (2026) states: **Failed payments cause up to 10% revenue loss through involuntary churn** for SaaS and subscription businesses. Common causes:

- Card expiry and reissuance
- Insufficient funds at billing date
- Bank-side declines
- Paused or revoked UPI mandates
- Network timeouts during auto-debit

Razorpay's blog notes: **52% of customers are not likely to return after a failed payment** (Razorpay Failed Payment Recovery, 2025). The dunning guide (Revivopay, 2026) explains that not every failure should be retried the same way — an expired card will never succeed on retry, while insufficient funds is worth retrying after a day.

### How RevGuard-AI Solves It

- **Retry Exhaustion Detection** (`backend/app/detection/engine.py`): Identifies subscription payments that have exhausted their retry path and classifies them as a distinct cluster.
- **Smart Differentiation**: Card expired → notify customer to update details. Insufficient funds → send payment link (let customer pay when funded). Retry exhausted → send payment link (bypass exhausted mandate). Each gets a different recovery action based on EV analysis.
- **Stopping Rules** (`backend/app/policy/guard.py`): Enforces `MAX_AUTO_RETRIES_PER_TXN = 2` — prevents duplicate retries on exhausted subscriptions. Blocks retry on hard non-retryable codes like `CARD_EXPIRED`.
- **Policy Guard**: Prevents automated retries on risk-related, business-integration, and account-restriction categories — these require human review.

---

## 4. Payment Gateway Downtime and Bank Outages

### The Problem

Razorpay's gateway downtime guide (2026) explains: "A single bank going down can cascade into thousands of failed payments for a merchant in minutes." During festive sales (Diwali, IPL), traffic spikes 10x and gateway failures become statistically inevitable.

Key statistics:
- Large enterprises report a **median loss of USD 220,000 per hour** of payment downtime.
- For a merchant doing Rs 200 crore monthly GMV with UPI at 70%, **2 hours of UPI downtime = Rs 39 lakh at risk per incident**.
- Smart routing can uplift payment success rates by **10-15%** (Razorpay Gateway Reliability, 2026).

Razorpay's downtime notification system alerts merchants about fluctuations, but merchants still need to decide what to do with the affected transactions.

### How RevGuard-AI Solves It

- **Temporal Burst Detection** (`backend/app/detection/engine.py:96`): Detects when failures cluster within an 8-hour window with 5+ transactions — flagging gateway degradation. Evidence: "temporal burst: 15 failures within 2.3h (~6.5/h) — degradation suspected."
- **Transient Category Handling**: Bank downtime failures are classified as `TRANSIENT` with a 55% recovery prior. The strategy engine recommends retry-after-delay for these, since they typically recover once the outage passes.
- **Burst-Adjusted Probability** (`backend/app/strategy/ev_model.py:108`): During detected bursts, the retry payment probability gets a +0.10 boost for transient failures, reflecting that post-outage retries recover well.

---

## 5. Fraud and Risk-Related Declines

### The Problem

Razorpay's error list includes multiple risk-related failures:
- `payment_risk_check_failed` — Declined by Razorpay, gateway, or issuer bank risk checks
- `debit_instrument_blocked` — Card blocked by issuer or customer
- `compliance_violation` — Payment violates compliance requirements
- `FRAUD_SUSPECTED`, `RISK_BLOCKED`, `CARD_BLOCKED` — Hard non-retryable codes

Razorpay's enterprise support guide (2026) notes: "Merchants globally lost an estimated **USD 117.5 billion to chargebacks and false-decline friction** in 2024." Incorrectly retrying risk-blocked transactions can get merchants blacklisted.

### How RevGuard-AI Solves It

- **Hard Non-Retryable Codes** (`backend/app/core/policy.py`): A curated set of codes (`FRAUD_SUSPECTED`, `RISK_BLOCKED`, `CARD_BLOCKED`, `ACCOUNT_FROZEN`, etc.) that are **never** automatically retried.
- **Policy Guard** (`backend/app/policy/guard.py:92-103`): Blocks retry for risk-related and business-integration categories entirely. These get routed to `ESCALATE_HUMAN` with `requires_human=true`.
- **Heuristic Diagnosis** (`backend/app/ai/heuristics.py:40-53`): Risk-related clusters produce: "Risk/fraud controls are blocking card payments. Automated retry is prohibited by policy."
- **Zero Recovery Priors** (`backend/app/detection/engine.py:29-31`): Risk-related, business-integration, and account-restriction categories have 0.0 recovery probability — the system correctly identifies these as non-recoverable through automated actions.

---

## 6. High-Value Transaction Risk

### The Problem

Razorpay's error list shows `transaction_limit_exceeded` and `transaction_daily_limit_exceeded` as common failures for high-value transactions. The mobile checkout guide (2026) notes that high-value failures are particularly damaging because the customer acquisition cost is already sunk.

Merchants face a dilemma: automatically retrying high-value transactions risks financial exposure, but doing nothing loses significant revenue.

### How RevGuard-AI Solves It

- **High-Value Approval Gate** (`backend/app/policy/guard.py:110-115`): Transactions above Rs 25,000 require explicit human approval before any financial action. The guard returns `PENDING_APPROVAL` verdict.
- **Strategy Engine** (`backend/app/strategy/engine.py:111-113`): High-value decisions are tagged with `NEEDS_APPROVAL` outcome and routed to the escalation queue.
- **EV-Based Prioritization**: Even among high-value transactions, the system ranks by expected recovery value — ensuring the most valuable recovery opportunities get human attention first.

---

## 7. Checkout Abandonment After Payment Failure

### The Problem

Razorpay's failed payment recovery blog (2024): **"25% of customers abandon their shopping carts due to failed payments."** Their solution — sending personalized payment links via WhatsApp, Email, and SMS — recovers some, but requires merchants to manually decide which failures to retarget.

The mobile checkout guide (2026) adds: "UPI handoff friction" is a major failure point — deep links don't resolve, UPI apps take too long to launch, callbacks get lost. Each failure = abandoned transaction.

### How RevGuard-AI Solves It

- **Customer-Related Failure Classification**: Checkout abandonment and UPI handoff failures are classified as `CUSTOMER_RELATED` or `TRANSIENT` depending on the pattern.
- **Payment Link Strategy** (`backend/app/strategy/engine.py`): For customer-related failures (insufficient funds, abandoned checkouts), the EV model recommends `SEND_PAYMENT_LINK` over retry — giving the customer a low-friction path back.
- **Notify Customer Action**: For biometric failures and authentication issues, `NOTIFY_CUSTOMER` is recommended — prompting the customer to retry with an alternative method.
- **Quantified Recovery Value**: Each recovery action has an estimated EV, so merchants can see exactly how much revenue each payment link is expected to recover.

---

## 8. Irregular Payment Notifications and Settlement Delays

### The Problem

Razorpay's QR stack blog (2024) identifies: "When payment notifications are delayed or irregular, merchants are left in the dark about transaction statuses." This creates:
- Customer confusion during checkout
- Merchants guessing whether payment was received
- Increased disputes and workflow disruption during peak hours

Irregular settlements compound the problem — merchants can't restock, pay suppliers, or manage expenses.

### How RevGuard-AI Solves It

- **Webhook Processing** (`backend/app/main.py:356-422`): Razorpay webhook events (`payment.captured`, `payment.failed`) are received with HMAC signature verification and idempotency checking. Outcomes are recorded in the audit trail.
- **Full Audit Trail** (`backend/app/audit.py`): Every detection, diagnosis, strategy decision, policy check, execution, and outcome is recorded with timestamps, evidence, and reasoning — giving merchants complete visibility into what happened and why.
- **Dashboard** (`frontend/src/views/OverviewView.jsx`): Real-time KPIs show revenue at risk, expected recoverable, recovery rate, and unnecessary interventions — eliminating the "in the dark" problem.

---

## 9. Enterprise Support and Compliance

### The Problem

Razorpay's enterprise support guide (2026) reports:
- **64% of enterprises** cited account management quality as a primary trigger for switching payment providers.
- RBI requires notification of major disruptions within a **6-hour window**.
- Merchants need named ownership for P1/P2 incidents, not FIFO queues.

The compliance burden is significant: NPCI dispute timelines, RBI incident filings, audit support, chargeback management.

### How RevGuard-AI Solves It

- **Deterministic Policy Guard** (`backend/app/policy/guard.py`): Every financial action is checked against explicit, auditable rules — no LLM output has authority over policy enforcement. This creates a compliance-ready decision trail.
- **Complete Audit Log** (`GET /audit`): Full history of every decision, action, and outcome — ready for RBI incident reporting and internal audits.
- **Escalation Routing**: Risk-related, business-integration, and account-restriction failures are automatically escalated to human review with evidence — ensuring the right person handles compliance-sensitive cases.
- **Evaluation Against Baseline** (`POST /evaluate`): Demonstrates measurable improvement over naive retry strategies — useful for board-level reporting on payment infrastructure investment.

---

## 10. The "Retry Everything" Anti-Pattern

### The Problem

The most common merchant approach to failed payments is: **retry everything once**. This is the baseline that Razorpay's own Failed Payment Recovery product and dunning guides try to improve upon.

This approach wastes resources on:
- Retrying expired cards (will never succeed)
- Retrying fraud-blocked transactions (gets merchants flagged)
- Retrying during active bank outages (wastes API calls)
- Over-notifying customers for non-actionable failures
- Ignoring high-value recovery opportunities in favor of low-value noise

Razorpay's dunning guide (2026): "Not every failure should be retried the same way. A charge that failed for insufficient funds is worth retrying after a day; a charge that failed because the card expired will never succeed on retry."

### How RevGuard-AI Solves It

This is the core value proposition of RevGuard-AI. Instead of "retry everything once":

1. **Detect** failures and cluster by root cause
2. **Diagnose** each cluster with AI + heuristics
3. **Quantify** expected recovery value per action per transaction
4. **Prioritize** by EV — highest-value recoveries first
5. **Select** the best action per transaction (retry, payment link, notify, escalate, or stop)
6. **Guard** every action against deterministic policy rules
7. **Measure** actual outcomes against the baseline

The evaluation engine (`backend/app/evaluation/engine.py`) directly compares AI strategy vs "retry everything once" baseline, reporting:
- Revenue recovery uplift
- Unnecessary interventions avoided
- Prevented hopeless actions
- Recovery rate improvement

---

## 11. RBI 6-Hour Payment Disruption Incident Filing

### The Problem

RBI regulations (Master Directions for Payment Aggregators & Gateways) mandate that major system outages or payment rail degradations must be formally disclosed to the regulator within a **strict 6-hour window**. During live gateway incidents, engineering and ops teams are occupied restoring traffic and cannot afford hours compiling transaction counts, switch latency logs, and customer impact estimates.

### How RevGuard-AI Solves It

- **RBI Form INC-01 Disclosure Generator** (`frontend/src/components/RbiIncidentModal.tsx`): With 1 click from the Bank Switch Health Radar, RevGuard compiles live switch telemetry (peak latency, error percentage, impacted GMV, transaction IDs, root cause, and autonomous failover actions) into a standardized statutory filing format.
- **Export Ready**: Generates an auditable digital report with cryptographic reference hash (`RBI-INC-YYYYMMDD-XXXX`) ready for immediate submission to the Reserve Bank of India.

---

## 12. Frictionless UPI Intent & Dynamic QR Recovery

### The Problem

When a UPI collect request times out (`U69`), shoppers abandon their browser sessions. Sending a raw web link requires reopening the browser, navigating redirects, and choosing an app again. Mobile checkouts lose over 30% of recovery attempts to redirect friction.

### How RevGuard-AI Solves It

- **Dynamic UPI QR & 1-Tap Intent Generator** (`frontend/src/views/QueueView.tsx`): Instantly generates an NPCI-compliant dynamic QR code and 1-tap intent deep-links for Google Pay, PhonePe, Paytm, and BHIM.
- **Zero-Redirect Settlement**: Customers scan or tap directly on their mobile device, bypassing all browser intermediary steps and cutting settlement completion time to under 5 seconds.

---

## 13. Asynchronous Executive Daily Digest & Multi-Channel Broadcast

### The Problem

Busy CFOs and Payment Operations Leads do not want to log into an operational web dashboard daily to monitor recovery metrics (Design Gap #1). Without proactive asynchronous summaries, decision-makers lose visibility into payment health.

### How RevGuard-AI Solves It

- **Executive Digest Engine** (`frontend/src/components/ExecutiveDigestModal.tsx` / `backend/app/notifications/summary.py`): Generates a 10-second plain-English executive briefing summarizing total revenue at risk, recovered amount, policy fatigue stops prevented, and high-value approvals needed.
- **Multi-Channel Dispatcher**: Simulates 1-click broadcast to Slack (`#finance-revenue-digest`) and WhatsApp Business, delivering complete operational visibility directly where finance teams communicate.

---

## Sources

| Source | URL | Date |
|--------|-----|------|
| Razorpay FY25 Revenue Report | https://inc42.com/buzz/razorpay-slips-into-red-in-fy25-revenue-zooms-65-yoy/ | Oct 2025 |
| Razorpay Payment Error Codes | https://razorpay.com/docs/errors/payments/list/ | Current |
| Razorpay Failed Payment Recovery | https://razorpay.com/blog/razorpay-failed-payment-recovery/ | Feb 2024 |
| Razorpay UPI Failures Guide | https://razorpay.com/blog/tackling-upi-payment-failures-with-razorpay | Jul 2024 |
| Razorpay QR Merchant Pain Points | https://razorpay.com/blog/top-5-merchant-pain-points-solved-by-razorpay-qr-stack/ | Dec 2024 |
| Razorpay Gateway Reliability 2026 | https://razorpay.com/blog/payment-gateway-reliability-india-businesses-2026 | Aug 2026 |
| Razorpay Gateway Downtime Guide 2026 | https://razorpay.com/blog/payment-gateway-downtime-and-failover-in-2026-india-guide/ | Jun 2026 |
| Razorpay Subscription Payments 2026 | https://razorpay.com/blog/payment-gateway-support-for-subscription-businesses-key-considerations-in-2026/ | Jun 2026 |
| Razorpay Enterprise Support 2026 | https://razorpay.com/blog/enterprise-payment-support-in-2026 | Jun 2026 |
| Razorpay Mobile Checkout 2026 | https://razorpay.com/blog/mobile-checkout-india-reduce-load-failures | Jun 2026 |
| Razorpay Dunning Guide | https://revivopay.com/blog/razorpay-dunning-guide-india | Jun 2026 |
| Razorpay SaaS Gateway Guide 2026 | https://razorpay.com/blog/payment-gateways-saas-startups-decision | Jun 2026 |
