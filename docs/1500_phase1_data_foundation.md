# Phase 1 — Data and Simulation Foundation

## Goal

A reproducible environment in which recovery strategies can be tested repeatedly and compared honestly against a baseline.

## What We Did

- Defined the common transaction schema (`backend/app/schemas/transactions.py`): FR-02 normalization target with `FailureCategory`, `TxnStatus`, `RecoveryAction`, `ActionOutcome`, `AuditEvent` models.
- Centralized policy constants (`backend/app/core/policy.py`): retry limits, high-value threshold, friction costs, hard non-retryable codes.
- Built the seeded synthetic generator (`backend/app/data/synthetic_generator.py`) producing 600-record batches across 8 leakage scenarios plus ~58% background successes.
- Implemented the deterministic baseline strategy (`backend/app/evaluation/baseline.py`): retry every failed transaction once unless the failure code is hard non-retryable.
- Added a validation script (`backend/scripts/validate_data.py`) enforcing ER-01 minimum size, six-category coverage, ID uniqueness and ground-truth consistency.

## Scenario Design

| Scenario | Category | Ground-truth recoverable by |
|---|---|---|
| UPI degradation burst (8h window) | transient | RETRY_PAYMENT (~0.55–0.75) |
| Insufficient funds | customer_related | SEND_PAYMENT_LINK (~0.28–0.45) |
| Subscription retry exhaustion | retry_exhausted | SEND_PAYMENT_LINK (~0.32–0.50) |
| Repeated customer auth failures | customer_related | not recoverable (honest) |
| High-value fraud blocks | risk_related | not automatable |
| One-off transient failures | transient | RETRY_PAYMENT (~0.40–0.60) |
| Payment-method degradation | payment_method_related | link/retry depending on code |
| Integration/config errors | business_integration | operational fix only |

Amount bands weighted toward low ticket sizes with a high-value tail (₹99–₹80k).

## Key Design Decisions

1. **Namespaced ground truth** — evaluation fields are prefixed `gt_*` so strategy/diagnosis components are structurally prevented from peeking while evaluation stays exact.
2. **Per-action probability ground truth** (`gt_action_probabilities`) rather than a single recoverable flag — enables fair per-action outcome resolution.
3. **Seed 42 everywhere** — identical datasets across strategies make uplift claims defensible (ER-06).
4. **Validation as a first-class script**, not an afterthought.

## Learnings

- **Validation-first paid off immediately**: the first generated batch was missing `payment_method_related` entirely (a budget arithmetic gap). The validator caught it before any downstream component was built on incomplete data — exactly what ER coverage checks exist for.
- **WSL `/mnt/c` is hostile to Python tooling**: creating a venv on the Windows-mounted filesystem made pip installs time out repeatedly. Moving the venv to the native Linux filesystem fixed it. Project code stays on `/mnt/c`; only the interpreter lives outside.
- **Pydantic schemas early** prevented ad-hoc dicts from leaking into every module and gave free validation at ingestion boundaries.
- **Baseline naivety is a feature**: deliberately ignoring amounts, clustering and friction makes it a clean lower bound for later uplift claims.

## Observed Batch (600 txns, seed 42)

- 271 failures spanning all six categories; ₹26.7L revenue at risk; 171 transactions ground-truth recoverable via some bounded action.

## How to Run

```bash
python3 -m venv .venv && .venv/bin/pip install -r backend/requirements.txt
PYTHONPATH=backend .venv/bin/python backend/scripts/validate_data.py
PYTHONPATH=backend .venv/bin/python -m pytest backend/tests/test_phase1.py -q
```

## Limitations / Next

- In-memory storage only; persistence arrives in the hardening phase.
- Single burst window; richer temporal seasonality deferred.
- Ground truth currently models single-action viability only.
