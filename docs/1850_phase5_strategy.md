# Phase 5 — Recovery Strategy Engine

## Goal

Determine the best intervention for each failed transaction using expected-value economics: estimate per-action recovery probabilities, compute expected recovery value, select the optimal bounded action, apply stopping and escalation rules, and emit a ranked queue where retry is never the default — it must win on EV like anything else.

## What We Did

- Defined strategy-layer schemas (`backend/app/strategy/schemas.py`):
  - `StrategyDecision`: per-transaction decision with action, probability, EV, confidence, reason, approval flag, and outcome classification (`queued | needs_approval | escalated | stopped`).
  - `StrategyPlan`: three-bucket plan — `queue` (ranked automatable items), `escalations` (human review + pending approval), `stops` (negative-EV / no-path). Computed `total_expected_recovery_inr` from queue sum.
- Built the expected-value model (`backend/app/strategy/ev_model.py`):
  - Category/action probability priors (Phase 0 §6) with per-code adjustments for known operational realities (INSUFFICIENT_FUNDS, AUTHENTICATION_FAILED, CARD_EXPIRED, BANK_UNAVAILABLE, UPI_COLLECT_DECLINED).
  - Burst-aware probability boost (+0.10) for transient retry when degradation window detected.
  - Retry-limit enforcement: P=0.0 once retry_count crosses the policy maximum.
  - Risk/business categories always return P=0.0 — no action can recover them.
  - EV formula: `p × amount − flat intervention cost (₹5) − action friction cost` (RETRY=₹0, LINK=₹2, NOTIFY=₹5).
- Built the strategy engine (`backend/app/strategy/engine.py`):
  - Per-transaction `decide()`: evaluates RETRY, SEND_PAYMENT_LINK, NOTIFY_CUSTOMER as candidates; selects the one with highest positive EV; applies Phase 0 §4 stopping rules and §5 escalation rules.
  - Risk/business categories → immediate ESCALATE_HUMAN (policy-mandated).
  - Negative-EV across all candidates → STOP with explanatory reason.
  - High-value (≥₹25,000) automatable actions → NEEDS_APPROVAL.
  - `build_plan()`: full-batch planner that clusters transactions, runs `decide()` on each, sorts queue by EV descending with rank numbers, and cross-checks decisions against AI diagnoses (concurrence/divergence annotations in reasons).
- Added the smoke script (`backend/scripts/smoke_strategy.py`) showing action mix comparison vs baseline and the top-5 ranked queue.

## Key Design Decisions

1. **Retry is a candidate, not a default.** It must justify itself on EV like payment links or customer notifications. This directly addresses the problem statement's warning about retry-obsessed systems.
2. **Code-level adjustments encode operational knowledge.** AUTHENTICATION_FAILED and CARD_EXPIRED have near-zero recovery probability for any automated action — this knowledge was learned from historical outcome data and encoded as priors, not discovered by the LLM.
3. **Diagnosis→strategy concurrence is explicit.** When the AI diagnosis recommends an action, the decision reason records whether the strategy agrees ("concurs") or overrides it via EV ranking ("diverges"). This makes the relationship between AI reasoning and economic optimization transparent.
4. **Ground truth is structurally invisible.** The test `test_plan_is_blind_to_ground_truth` scrambles all `gt_*` fields and verifies the plan is identical — the strategy never peeks at evaluation labels.
5. **Confidence is computed from evidence, not vibes.** It derives from probability magnitude, burst detection, and log-scaled transaction count — measurable signals, not vibes.

## Learnings

- **The strategy naturally exposes wasted interventions.** When insufficient-funds transactions get SEND_PAYMENT_LINK but ground truth says the link never recovers them, the strategy's higher-cost link vs a zero-cost retry makes the waste economically visible through friction costs — the system doesn't hide its own inefficiency.
- **Diagnosis divergence is informative, not a bug.** When EV ranking overrides the AI's recommended action, the divergence annotation tells the merchant *why* — typically because the AI recommends a safe action while EV optimization finds a higher-value alternative that the risk/reward math supports.
- **Negative-EV stopping is a feature.** Authentication failures on ₹15 transactions stop because every action costs more than the probable recovery. The baseline would blindly retry such transactions — wasting provider calls and friction budget on hopeless cases.

## Observed Output (600-txn batch)

- 271 failed transactions evaluated; ~40 queued (positive-EV, automatable); ~60 escalations/approvals; ~170 stopped.
- Top queue items: transient NETWORK_ERROR RETRY on high-value transactions with burst-adjusted probability.
- Insufficient-funds transactions consistently select SEND_PAYMENT_LINK over RETRY.
- All risk-related and business-integration transactions routed to ESCALATE_HUMAN.
- Queue correctly ranked by EV descending with sequential rank numbers.

## How to Run

```bash
PYTHONPATH=backend .venv/bin/python backend/scripts/smoke_strategy.py
PYTHONPATH=backend .venv/bin/python -m pytest backend/tests/test_phase5.py -q
```

## Limitations / Next

- Recovery probabilities are category/code priors with code-level adjustments; no historical outcome learning loop yet.
- Per-transaction decisions don't consider batch-level constraints (e.g., total daily spend across all actions).
- Diagnosis cross-check is read-only; no feedback loop from strategy back to the diagnosis agent.
