# Phase 6 — Policy Guard and Action Execution

## Goal

Make every financial action bounded, explainable and safe: nothing moves money without passing deterministic checks, every attempt is audited exactly once, and failures degrade gracefully instead of spawning retry loops.

## What We Did

- Built the Policy Guard (`backend/app/policy/guard.py`) — a stateful, deterministic gate evaluating ordered checks before any execution:
  1. **Duplicate prevention** — idempotency keys (`{provider}:{action}:{txn_id}`) already executed are blocked (SC-03).
  2. **Hard non-retryable codes** — fraud/risk blocks, expired cards, integration defects can never be auto-retried (SC-06).
  3. **Non-retryable categories** — risk-related and business/integration categories reject retry actions outright.
  4. **Retry limits** — retries blocked once `retry_count` reaches the policy maximum.
  5. **Approval gate** — transactions ≥ ₹25,000 require recorded human approval before any financial action (SC-05).
  6. **Daily action cap** — configurable global cap with date-aware reset (injectable clock for testing).
  The guard returns typed verdicts (`allowed | blocked | pending_approval | non_financial`) with the rule that produced them, so every decision is self-explaining.
- Added an approval workflow ledger: `guard.approve(txn_id, approver)` records who approved; re-checks then pass the gate.
- Built the Action Executor (`backend/app/execution/executor.py`):
  - Executes only guard-approved items through the provider interface (simulator active, Razorpay test-mode interchangeable).
  - Produces exactly one outcome and one audit event per item — including blocked and escalated paths.
  - Failed executions are terminal for the run; there is no code path that re-attempts automatically (FR-17).
- Extended the provider contract with `NOTIFY_CUSTOMER`: the simulator resolves it from ground-truth probabilities ("customer responded and paid"), the Razorpay client treats comms as out-of-band in test mode.
- Added `POST /run` API endpoint: detect → strategy plan → optional approvals → gated execution, returning plan summary + execution outcome counts + audit size.

## Key Design Decisions

1. **Ordered checks fail fast** with named rules — audit events carry `policy_rule`, making "why was this blocked?" answerable without log archaeology.
2. **The guard owns mutable safety state** (executed keys, approvals, daily counters); the executor stays stateless apart from provider calls. This separation means Phase 7's evaluator can run baseline vs AI through the *same* gate for fair comparison.
3. **Failures are terminal per run by construction**: registration happens after execution regardless of outcome, so even a crashed payment can't be silently retried inside the same cycle.
4. **NOTIFY as a provider action, not a side channel**: customer communications have real recovery probability and friction cost; modelling them inside the provider contract keeps outcome attribution honest.

## Learnings

- **Pydantic models don't take positional args**: `PolicyVerdict(Verdict.BLOCKED, "...", "rule")` exploded at runtime across nine call sites. Keyword-only construction caught all of them at once — small schemas pay for themselves immediately.
- **Strategy optimism surfaced naturally**: the smoke run showed 63 wasted links/notifies on auth-failure/expired-card transactions where recovery is impossible (strategy priors say ~0.2–0.35, reality says 0). Rather than hiding this, Phase 7 will quantify it under "unnecessary interventions" — a system that only shows flattering numbers isn't trustworthy.
- **Injected failures are demo gold**: one `provider.inject_failure(txn_id)` line produces the complete FR-17 story — failed outcome recorded, audit entry written, duplicate re-attempt blocked at the policy layer.
- **The /tmp venv evaporates between sessions** (WSL tmp cleanup). Rebuilding takes minutes; a committed setup script would make this someone else's problem.

## Observed Run (600-txn batch, 222 queued items)

- ₹216,735 recovered through the guarded pipeline; 81 recovered / 141 failed outcomes.
- Graceful failure mix: 77 direct payment failures, 63 not-viable-for-code responses, 1 injected failure.
- Re-attempting a failed transaction returns `duplicate_prevention` → `blocked_by_policy`.

## How to Run

```bash
PYTHONPATH=backend .venv/bin/python backend/scripts/smoke_policy.py
PYTHONPATH=backend .venv/bin/python -m pytest backend/tests/test_phase6.py -q
# API: POST /run?approve=txn_x&approve=txn_y  (then GET /detect, GET /diagnose)
```

## Limitations / Next

- Approvals live in memory; persistence arrives with the hardening phase.
- One execution pass per run — no scheduled delayed retries yet (transient recovery assumes immediate retry).
- Webhook-driven outcome capture still pending on the Razorpay path.
