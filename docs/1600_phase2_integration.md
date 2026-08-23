# Phase 2 — Payment Integration Layer (Simulator-First)

## Goal

Connect the application to payment workflows without coupling any downstream logic to a specific provider API, using a controlled simulator for development and Razorpay test mode for the demo workflow.

## What We Did

- Defined the provider contract (`backend/app/integrations/base.py`): `PaymentProvider` ABC with `execute(ProviderRequest) -> ProviderResponse`, covering `RETRY_PAYMENT` and `SEND_PAYMENT_LINK`, with idempotency keys built into every request.
- Built the controlled simulator (`backend/app/integrations/simulator.py`):
  - Resolves outcomes from ground-truth action probabilities using a seeded RNG.
  - Rejects duplicate idempotency keys (SC-03 duplicate prevention).
  - Supports injected per-transaction failures for graceful-failure demos (FR-17).
- Implemented the Razorpay test-mode client (`backend/app/integrations/razorpay_client.py`):
  - Orders API for retries, Payment Links API for recovery links.
  - Env-gated credentials (`RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET`); fails loudly without them so local dev falls back to the simulator (NFR-05).
  - HTTP failures return typed `ERROR` responses instead of crashing the flow (NFR-03).
- Added the plan runner (`backend/app/evaluation/runner.py`): executes an action plan through any provider, routes non-financial actions (STOP/ESCALATE) around the provider, and records an `AuditEvent` per action (FR-16 groundwork).

## Key Design Decisions

1. **Simulator and Razorpay are interchangeable** behind one interface — the entire detection→strategy→execution pipeline runs offline.
2. **Idempotency keys are formatted `{provider}:{action}:{transaction_id}`**, making duplicates structurally impossible rather than policy-dependent.
3. **Razorpay outcomes await webhooks** — order/link creation is reported as accepted-not-recovered until `payment.captured`/`payment.failed` handling is wired; no fabricated success.
4. **Non-financial actions never touch money movement code** — enforced in the runner.

## Learnings

- **Tests caught a real design gap**: the baseline emits `STOP` actions, which aren't valid provider actions. The first runner version passed everything to the provider and failed pydantic validation. The fix — routing non-financial actions around execution — made the action taxonomy cleaner everywhere else too.
- **Idempotency at the integration boundary is cheaper than anywhere else**: one dict lookup in the simulator now stands in for what would be a database constraint later; the interface won't change when persistence arrives.
- **Failing loudly on missing credentials beats silent simulation**: without it, a demo could quietly "succeed" against nothing.

## How to Run

```bash
PYTHONPATH=backend .venv/bin/python -m pytest backend/tests/test_phase2.py -q
```

## Test Coverage

- Simulator recovers revenue across a baseline plan (seeded).
- Duplicate idempotency key returns `DUPLICATE`, not a second execution.
- Injected failure returns typed failure with `injected_provider_failure` reason — no crash, no retry loop.

## Limitations / Next

- Webhook ingestion for real outcome capture is not wired yet.
- Razorpay retry currently creates an order; capturing the retried payment end-to-end needs the webhook path or manual capture in test mode.
