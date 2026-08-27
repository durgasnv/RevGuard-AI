# Phase 0 — Product Boundary, Recovery Policy, and Evaluation Specification

Status: LOCKED for the first build cycle. Changes require explicit revision of this document.

## 1. Final Product Scope (First Cycle)

**Primary problem:** Payment-related revenue leakage for merchants.

**Primary recovery scenario:** Recovering failed payments that are economically and operationally recoverable, using bounded actions, with full auditability.

**In scope:**
- Synthetic batch ingestion + Razorpay test-mode events.
- Revenue-at-risk detection and clustering.
- Failure classification into six categories.
- Expected-value-based recovery prioritization.
- Bounded execution through a payment provider interface (simulator first, Razorpay test mode second).
- Deterministic policy guard outside any LLM.
- Outcome capture, recovery measurement, baseline comparison.
- Merchant-facing dashboard (later phase).

**Out of scope:**
- Real-money transactions.
- Checkout abandonment / cart recovery flows.
- Subscription lifecycle management beyond failed-payment recovery.
- Dispute/chargeback workflows.
- Any action not in the supported action list below.

## 2. Supported Failure Categories

| Category | Example codes | Retryable? |
|---|---|---|
| `transient` | NETWORK_ERROR, GATEWAY_TIMEOUT, ISSUER_BUSY, SYSTEM_ERROR | Yes |
| `customer_related` | INSUFFICIENT_FUNDS, AUTHENTICATION_FAILED, CUSTOMER_ABORTED | Conditional |
| `payment_method_related` | CARD_EXPIRED, INVALID_CARD_DETAILS, UPI_COLLECT_DECLINED, BANK_UNAVAILABLE | Conditional |
| `retry_exhausted` | Derived: retry_count >= policy limit | No (auto-retry) |
| `risk_related` | FRAUD_SUSPECTED, RISK_BLOCKED, CARD_BLOCKED | Never automated |
| `business_integration` | INVALID_REQUEST, CONFIG_ERROR, MERCHANT_ONBOARDING | No — operational fix |

## 3. Supported Recovery Actions (Bounded Set)

1. `RETRY_PAYMENT` — one provider-mediated retry after a delay. Max 1 per transaction per case window (on top of retries already recorded at detection time).
2. `SEND_PAYMENT_LINK` — generate a payment link for the customer (simulated/test-mode).
3. `NOTIFY_CUSTOMER` — merchant-approved recovery communication.
4. `ESCALATE_HUMAN` — route to human review queue.
5. `STOP` — close the case with no further financial action.

Retry is never the default action; it is only selected when category is retryable AND expected value justifies it.

## 4. Stopping Rules

A case stops when ANY of:
- Failure category is non-retryable and no non-retry action is viable.
- `retry_count >= MAX_AUTO_RETRIES_PER_TXN` (default 2 historical) and an automated retry was already attempted by this system.
- The same action idempotency key already exists (duplicate prevention).
- Transaction recovered or refunded/cancelled.
- Daily global action cap reached (`MAX_ACTIONS_PER_DAY`, default 500).
- Risk-related category detected → immediate stop of automated actions.

## 5. Human Approval Conditions

Escalation to human approval is required when ANY of:
- Amount >= `HIGH_VALUE_THRESHOLD_INR` (default ₹25,000).
- Category is `risk_related`.
- Action would exceed daily caps.
- AI confidence < `MIN_AI_CONFIDENCE` (default 0.55) on a high-value action.
- Simulator/provider returns an unexpected error twice for the same case.

## 6. Economic Decision Model

```
expected_recovery_value
  = recovery_probability × amount_in_inr
    − intervention_cost_flat (default ₹5)
    − friction_cost (RETRY=₹0, LINK=₹2, NOTIFY=₹5)
```

Interventions are ranked by expected_recovery_value descending; negative-EV interventions are never executed automatically.

## 7. Baseline Strategy (For Comparison)

Deterministic baseline: **retry every failed transaction exactly once, immediately, regardless of amount, unless failure code is in a hard non-retryable list.**

This is deliberately naive: no clustering, no EV ranking, no friction cost, no delay logic.

## 8. Evaluation Specification

- Dataset: ≥ 500 synthetic transactions with embedded ground truth (`gt_recoverable`, `gt_recoverable_by_action`, `gt_recovery_probability`).
- Metrics reported:
  - Total revenue at risk (failed, unrecovered at detection).
  - Revenue recovered (per strategy).
  - Recovery rate = recovered / revenue_at_risk.
  - Uplift vs baseline (recovered and rate).
  - Unnecessary/prevented interventions count.
  - Escalation rate.
  - Exception/unrecoverable list (honest reporting).
- Reproducibility: seeded RNG (`SEED=42` default); identical dataset across strategies.

## 9. Razorpay Test API Checklist

| Capability | API | Phase |
|---|---|---|
| Create order for retry | Orders API | 2 |
| Fetch payment status | Payments API | 2 |
| Generate recovery link | Payment Links API | 2 |
| Capture outcomes | Webhooks (payment.captured / payment.failed) | 2+ |
| Credentials | Env vars `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET`, test mode only | 2 |

Simulator implements the same interface so all downstream code is provider-agnostic.

## 10. Architecture Outline

FastAPI backend, modular engines (`detection`, `strategy`, `policy`, `execution`, `evaluation`) communicating through typed schemas; LangGraph orchestration arrives in the AI diagnosis phase; React dashboard later. Every consequential step writes an `AuditEvent`.
