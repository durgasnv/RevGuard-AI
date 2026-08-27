# Phase 9 — End-to-End Integration

## Goal

Make the entire product operate as one coherent system: every pipeline stage connected, every action audited, every failure path exercised, and duplicate prevention proven.

## What We Did

- Connected all stages in `POST /run` (`backend/app/main.py`):
  - detect → diagnose → build_plan → optional approvals → gated execution → audit trail extension.
  - The `/run` endpoint calls diagnosis internally and cross-checks diagnoses against strategy decisions, annotating reasons with concurrence/divergence.
- Wired the central audit log (`backend/app/audit.py`, FR-16) to every stage:
  - `system` actor on ingestion, `risk_engine` on detection, `diagnosis_agent` on diagnosis, `strategy_engine` on plan building, `merchant` on approvals, `strategy_api` on execution.
  - `evaluation_engine` actor on baseline comparison runs.
  - `razorpay_webhook` actor on webhook events.
- Added `GET /state` endpoint returning plan + execution + guard status for the dashboard.
- Added `POST /reset` clearing all mutable state (store, plan, execution, guard, audit, webhook IDs).
- Added `POST /evaluate` running the full baseline-vs-AI comparison on the current store.
- Added `GET /audit` returning the complete audit event list with count.
- Added `GET /transactions?status=` for filtered transaction queries.
- Added `POST /reset` to clear everything for fresh demo runs.
- Added `GET /health` for boot detection by the frontend.

## Key Design Decisions

1. **Single `/run` endpoint orchestrates the full pipeline.** The frontend doesn't need to know the stage sequence — one POST triggers detect, diagnose, plan, and execute.
2. **Audit is append-only and spans every actor.** The audit log is the single source of truth for what happened and why; the `/audit` endpoint exposes it all.
3. **`/state` is a dashboard snapshot.** One GET returns everything the UI needs after a run — no multiple parallel fetches for different pipeline stages.
4. **Reset is complete.** Every piece of mutable state is cleared, including the guard's daily counter, executed idempotency keys, and webhook dedup set.

## Learnings

- **Integration tests caught actor gaps.** The test `test_full_pipeline_flow` verifies that the audit trail contains events from all six actors — missing any actor means a stage is not properly audited.
- **Diagnosis→strategy cross-check works in practice.** The test `test_diagnosis_strategy_cross_check_in_reasons` verifies that at least one decision reason contains "concurs" or "diverges" — proving the two systems actually communicate.
- **Duplicate prevention is the strongest end-to-end invariant.** Running `/run` twice and verifying the second run produces all `blocked_by_policy` outcomes with zero recovery is the definitive proof that idempotency works.
- **The 409 conflict on empty store prevents confusing empty results.** Detecting before ingesting returns a clear error instead of an empty report that looks like "no risk."

## Test Coverage (test_phase9.py)

- `test_full_pipeline_flow`: detect → diagnose → run → state → audit span.
- `test_diagnosis_strategy_cross_check_in_reasons`: concurrence/divergence in reasons.
- `test_duplicate_actions_prevented_on_second_run`: idempotency on re-run.
- `test_escalation_execution_path_does_not_crash`: escalations execute without error.
- `test_evaluate_after_run_reports_comparison`: evaluation works post-run.
- `test_detect_before_ingest_conflicts`: 409 on empty store.
- `test_reset_clears_everything`: full state reset verification.

## How to Run

```bash
PYTHONPATH=backend .venv/bin/python -m pytest backend/tests/test_phase9.py -q
```

## Limitations / Next

- All state is in-memory; server restart loses everything.
- No concurrent request handling — the shared `_STORE`, `_LAST_PLAN` globals are not thread-safe.
- Webhook-driven outcome capture on the Razorpay path is not wired end-to-end.
