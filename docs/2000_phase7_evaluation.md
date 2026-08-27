# Phase 7 — Outcome and Evaluation Engine

## Goal

Prove that the system creates measurable financial value by running both strategies (deterministic baseline, EV-ranked AI) through the identical policy gate and fair simulator, then reporting metrics, uplift, unnecessary interventions and an honest exception list.

## What We Did

- Built the evaluation engine (`backend/app/evaluation/engine.py`, FR-14/FR-15, ER-02..ER-08):
  - `evaluate(transactions, seed)` orchestrates the full comparison: detect → strategy plan → baseline plan → execute both through identical `PaymentSimulator(seed, fair=True)` + `PolicyGuard()` instances → compute metrics → uplift → exceptions.
  - `StrategyMetrics`: per-strategy revenue at risk, recovered, unrecovered, recovery rate, interventions attempted, intervention rate, blocked-by-policy, escalated/stopped, unnecessary interventions (ground-truth says impossible to recover), prevented interventions (negative-EV stops that gt confirms were hopeless).
  - `UpliftMetrics`: extra recovered INR, rate delta in percentage points, avoided unnecessary interventions, per-attempt efficiency for both strategies.
  - `ExceptionItem`: honest bucketed list of unrecoverable revenue — grouped by failure code and reason, with transaction counts, total amount, and sample IDs.
- Ensured fair comparison mechanics:
  - Both strategies use the **same** `PolicyGuard` instance semantics (fresh guard per strategy in the evaluator, but identical rule configuration).
  - Both strategies use `PaymentSimulator(seed, fair=True)` — the fair mode resolves outcomes from ground-truth probabilities identically regardless of strategy, so no strategy gets lucky.
  - The baseline plans RETRY for every failed transaction (except hard non-retryable codes); the shared guard then filters out retry-limit violations and other policy blocks before execution.
- Added the single-run evaluation script (`backend/scripts/run_evaluation.py`) producing a formatted report with per-strategy metrics, uplift, and exception buckets.
- Added the hardened evaluation script (`backend/scripts/run_hardened_evaluation.py`) for multi-seed × multi-profile runs (Phase 10).

## Key Design Decisions

1. **Same guard, same provider, same seed = fair.** The only variable is strategy selection. This is the minimum viable experiment design that makes uplift claims defensible.
2. **Unnecessary interventions are counted honestly.** An intervention is "unnecessary" when ground truth says its action probability was 0.0 — the strategy spent friction and provider capacity on a hopeless case. The AI strategy achieves zero unnecessary interventions through code-level probability adjustments (Phase 5).
3. **Prevented interventions quantify negative-EV stops.** When the AI strategy stops a transaction that ground truth confirms was unrecoverable, that's a prevented intervention — the baseline would have wasted a provider call on it.
4. **Exception report is bucketed, not a wall of IDs.** Grouping by failure code + reason with sample IDs and total amounts makes the honest "what we didn't recover" list actionable rather than overwhelming.
5. **Evaluation is a stateless function.** `evaluate()` takes transactions and a seed, returns a report. No shared mutable state between runs — multiple calls in tests or scripts are independent.

## Learnings

- **Zero unnecessary interventions is achievable with better priors.** The code-level adjustments for AUTHENTICATION_FAILED and CARD_EXPIRED (near-zero probability for all automated actions) prevent the AI from wasting actions where the baseline would blindly retry.
- **The fair-mode simulator is critical for defensible claims.** Without it, different random draws per strategy could produce lucky/unlucky outcomes. Fair mode resolves from ground truth, so the *only* difference is strategy quality.
- **Intervention rate reveals strategy efficiency.** The baseline attempts an intervention for every failed transaction (100% minus hard-blocked); the AI attempts far fewer but recovers more — higher recovery per attempt is the core efficiency claim.
- **Baseline recovery proves the floor exists.** Even naive retry recovers some revenue through the simulator; the AI's job is to recover *more* by being selective and using the right action per category.

## Observed Output (600-txn batch, seed 42)

- Revenue at risk: ₹26.7L across 271 failed transactions.
- Baseline: recovered ~₹1.61L through blind retry; ~57% intervention rate.
- AI strategy: recovered ~₹1.76L through EV-ranked mixed actions; ~15% intervention rate.
- Uplift: +₹15k extra recovered (+0.57pp recovery rate).
- AI unnecessary interventions: 0; baseline unnecessary interventions: 63.
- AI prevented interventions: transactions stopped because negative-EV, confirmed hopeless by ground truth.
- Exception report: FRAUD_SUSpected (₹12L, correctly escalated), AUTHENTICATION_FAILED (₹3.6L, no viable action), CARD_EXPIRED (₹1.8L, instrument update required).

## How to Run

```bash
PYTHONPATH=backend .venv/bin/python backend/scripts/run_evaluation.py
PYTHONPATH=backend .venv/bin/python -m pytest backend/tests/test_phase7.py -q
```

## Limitations / Next

- Evaluator creates fresh guard/simulator per strategy — no shared mutable state means no cross-contamination, but also means duplicate-prevention is per-strategy (no cross-strategy fairness issue in fresh runs).
- Evaluation runs on synthetic data only; real Razorpay outcome distributions may differ.
- Exception report doesn't yet include time-series or trend analysis of unrecoverable patterns.
