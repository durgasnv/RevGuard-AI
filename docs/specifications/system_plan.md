# Revenue Recovery Control Tower — Implementation Plan

## Phase 0 — Product Boundary and Validation ✅ COMPLETE

> Doc: `docs/1400_phase0_scope.md` · Code: `backend/app/core/policy.py`, `backend/app/schemas/transactions.py`

### Goal
Lock the problem and prevent scope creep.

### Tasks
- Finalize payment-revenue leakage as the primary problem.
- Select the first recovery scenario.
- Define supported recovery actions.
- Define non-retryable scenarios.
- Define stopping rules.
- Define human-approval conditions.
- Identify the Razorpay test APIs and signals required.
- Define the evaluation methodology.
- Define the baseline strategy.

### Deliverables
- Final product scope.
- Architecture outline.
- Recovery-policy specification.
- Evaluation specification.
- API integration checklist.

---

## Phase 1 — Data and Simulation Foundation ✅ COMPLETE

> Doc: `docs/1500_phase1_data_foundation.md` · Code: `backend/app/data/synthetic_generator.py`, `backend/app/evaluation/baseline.py` · Tests: `test_phase1.py`

### Goal
Create a realistic environment in which the recovery system can be tested repeatedly.

### Tasks
- Design transaction schema.
- Build synthetic transaction generator.
- Generate realistic success/failure distributions.
- Include payment methods and failure categories.
- Simulate temporal degradation.
- Simulate retry histories.
- Simulate high-value and low-value transactions.
- Generate ground-truth outcomes for evaluation.
- Create baseline recovery behavior.

### Deliverables
- Synthetic dataset generator.
- Initial evaluation dataset.
- Baseline evaluator.
- Data validation scripts.

---

## Phase 2 — Razorpay Integration Layer ✅ COMPLETE

> Doc: `docs/1600_phase2_integration.md` · Code: `backend/app/integrations/` · Tests: `test_phase2.py`

### Goal
Connect the application to Razorpay test-mode workflows without coupling the AI directly to raw payment APIs.

### Tasks
- Configure Razorpay test credentials securely.
- Implement required API clients.
- Implement order/payment workflow required by the demo.
- Implement webhook handling where required.
- Normalize Razorpay responses.
- Build integration error handling.
- Create an integration simulator for development when live test-mode behavior is unavailable.

### Deliverables
- Razorpay integration service.
- Webhook handler.
- Normalized event model.
- Test-mode end-to-end transaction flow.

---

## Phase 3 — Revenue Risk Detection ✅ COMPLETE

> Doc: `docs/1700_phase3_detection.md` · Code: `backend/app/detection/` · Tests: `test_phase3.py`

### Goal
Detect where revenue is slipping away.

### Tasks
- Calculate failure rates.
- Calculate revenue at risk.
- Detect abnormal payment-method behavior.
- Detect repeated failures.
- Detect retry exhaustion.
- Cluster similar failures.
- Rank revenue leakage clusters.
- Generate evidence for each detected issue.

### Deliverables
- Revenue-risk engine.
- Leakage clustering module.
- Revenue-at-risk calculations.
- Detection API.

---

## Phase 4 — AI Diagnosis and Reasoning ✅ COMPLETE

> Doc: `docs/1800_phase4_diagnosis.md` · Code: `backend/app/ai/` · Tests: `test_phase4.py`

### Goal
Turn raw failure patterns into useful merchant-level explanations.

### Tasks
- Define structured AI decision schema.
- Build root-cause reasoning component.
- Provide transaction and operational context.
- Generate evidence-backed diagnoses.
- Add confidence values.
- Validate AI output against schemas.
- Add deterministic fallback when AI output is invalid.

### Deliverables
- Diagnosis agent/component.
- Structured decision schema.
- Root-cause explanation API.
- AI validation/fallback layer.

---

## Phase 5 — Recovery Strategy Engine ✅ COMPLETE

> Doc: `docs/1850_phase5_strategy.md` · Code: `backend/app/strategy/` · Tests: `test_phase5.py`

### Goal
Determine the best intervention for each recovery opportunity.

### Tasks
- Define recovery actions.
- Estimate recovery probability.
- Estimate expected recovery value.
- Consider transaction value and customer friction.
- Rank interventions.
- Implement stopping conditions.
- Implement escalation rules.
- Ensure retry is not treated as the universal solution.

### Deliverables
- Recovery strategy engine.
- Expected-value model.
- Prioritized recovery queue.
- Escalation logic.

---

## Phase 6 — Policy Guard and Action Executor ✅ COMPLETE

> Doc: `docs/1900_phase6_policy_execution.md` · Code: `backend/app/policy/guard.py`, `backend/app/execution/executor.py` · Tests: `test_phase6.py`

### Goal
Make every financial action bounded, explainable, and safe.

### Tasks
- Implement retry limits.
- Implement transaction-value limits.
- Implement approval gates.
- Prevent duplicate actions.
- Block non-retryable actions.
- Validate every action before execution.
- Connect permitted actions to Razorpay test mode.
- Record policy decisions.
- Implement graceful action failure handling.

### Deliverables
- Policy Guard.
- Action Executor.
- Approval workflow.
- Stopping-rule engine.
- Failure recovery workflow.

---

## Phase 7 — Outcome and Evaluation Engine ✅ COMPLETE

> Doc: `docs/2000_phase7_evaluation.md` · Code: `backend/app/evaluation/engine.py`, `backend/app/evaluation/runner.py` · Tests: `test_phase7.py`

### Goal
Prove that the system creates measurable financial value.

### Tasks
- Capture action outcomes.
- Calculate recovered revenue.
- Calculate unrecovered revenue.
- Calculate recovery rate.
- Calculate intervention rate.
- Track unnecessary/prevented actions.
- Run baseline comparison.
- Run AI strategy comparison.
- Produce evaluation reports.
- Preserve honest exception cases.

### Deliverables
- Evaluation engine.
- Baseline comparison.
- Recovery metrics.
- Batch evaluation report.
- Exception report.

---

## Phase 8 — Merchant Control Tower UI ✅ COMPLETE

> Doc: `docs/2010_phase8_ui.md` · Code: `frontend/src/` · No backend tests (visual component)

### Goal
Make the intelligence understandable and demoable.

### Dashboard Sections

### Executive Overview
- Revenue at risk.
- Expected recoverable revenue.
- Recovered revenue.
- Recovery rate.
- Revenue lost.

### Revenue Leakage
- Leakage clusters.
- Payment-method trends.
- Failure causes.
- Severity.
- Estimated impact.

### Recovery Queue
- Highest-value cases.
- Diagnosis.
- Recommended action.
- Expected recovery.
- Approval status.
- Current state.

### Incident View
- Timeline.
- Related transactions.
- Root cause.
- Revenue impact.
- Recommended intervention.

### Audit Trail
- Trigger.
- Evidence.
- AI decision.
- Policy check.
- Approval.
- Action.
- Outcome.

### Deliverables
- Complete merchant dashboard.
- Charts and metrics.
- Recovery case interface.
- Audit interface.

---

## Phase 9 — End-to-End Integration ✅ COMPLETE

> Doc: `docs/2020_phase9_integration.md` · Code: `backend/app/main.py` · Tests: `test_phase9.py`

### Goal
Make the entire product operate as one coherent system.

### Tasks
- Connect ingestion to detection.
- Connect detection to diagnosis.
- Connect diagnosis to recovery strategy.
- Connect strategy to policy guard.
- Connect policy guard to executor.
- Connect executor to outcome tracking.
- Connect outcomes to dashboard.
- Validate audit events across every stage.
- Test API failure paths.
- Test duplicate-action prevention.

### Deliverables
- End-to-end working application.
- Integrated demo dataset.
- Full audit trail.
- Failure-handling demonstration.

---

## Phase 10 — Evaluation Hardening ✅ COMPLETE

> Doc: `docs/2030_phase10_hardening.md` · Code: `backend/scripts/run_hardened_evaluation.py` · Tests: `test_phase10.py`

### Goal
Ensure the claims made by the product are defensible.

### Tasks
- Run multiple synthetic batches.
- Test different failure distributions.
- Test payment-method degradation.
- Test high-value failures.
- Test repeated failures.
- Test mixed recoverable/unrecoverable cases.
- Compare against baseline.
- Record limitations.
- Verify that metrics cannot be cherry-picked.

### Deliverables
- Reproducible evaluation pipeline.
- Final metrics.
- Limitations and exception list.
- Evidence for the final pitch.

---

## Phase 11 — Reliability and Security Hardening ✅ COMPLETE

> Doc: `docs/2040_phase11_reliability.md` · Code: `backend/app/main.py` (webhook, logging, caps) · Tests: `test_phase11.py`

### Goal
Make the application behave like a serious fintech prototype.

### Tasks
- Secure environment variables.
- Validate API inputs.
- Add request/error logging.
- Prevent duplicate execution.
- Add idempotency where appropriate.
- Handle webhook retries.
- Add database constraints.
- Remove sensitive data from logs.
- Test service failure scenarios.
- Add deterministic policy enforcement independent of the LLM.

### Deliverables
- Hardened backend.
- Secure configuration.
- Failure-tested workflows.
- Production-minded README.

---

## Phase 12 — Demo and Submission Readiness ⬜ NOT STARTED

> This phase is not a build phase — it is packaging and submission preparation.

### Goal
Turn the working system into a compelling proof of value.

### Demo Story

1. Open merchant dashboard.
2. Show a sudden revenue leakage incident.
3. Open the incident.
4. Show correlated payment failures.
5. Show AI root-cause diagnosis.
6. Show revenue-at-risk calculation.
7. Show prioritized recovery opportunities.
8. Show one bounded recovery action.
9. Demonstrate a failure and stopping rule.
10. Show recovered revenue.
11. Show baseline vs AI results.
12. Open the audit trail.
13. Explain why the system is different from a generic AI chatbot.

### Final Deliverables
- Working application.
- Public repository.
- Architecture diagram.
- Evaluation report.
- Setup instructions.
- Demo dataset.
- Test-mode integration demonstration.
- Short demo video/presentation.
- Limitations and future-work section.

## Phase 13 — Scope-Control Rules

The team must follow these rules throughout development:

1. Do not add new recovery scenarios until the primary scenario works end to end.
2. Do not add more agents merely to make the architecture look complex.
3. Keep deterministic financial policy outside the LLM.
4. Every AI-generated action must map to a bounded tool/action.
5. Every money-related action must be auditable.
6. Every claimed metric must come from reproducible evaluation.
7. Do not optimize the UI before the recovery engine works.
8. Do not depend entirely on live external data for evaluation.
9. Do not store unnecessary sensitive payment information.
10. Prefer one deeply implemented workflow over many shallow features.

## Final Architecture Target

```text
                 ┌──────────────────────┐
                 │ Razorpay / Synthetic │
                 │      Event Sources   │
                 └──────────┬───────────┘
                            ↓
                 ┌──────────────────────┐
                 │   Event Ingestion    │
                 └──────────┬───────────┘
                            ↓
                 ┌──────────────────────┐
                 │ Revenue Risk Engine  │
                 └──────────┬───────────┘
                            ↓
                 ┌──────────────────────┐
                 │ Failure Correlation  │
                 └──────────┬───────────┘
                            ↓
                 ┌──────────────────────┐
                 │   AI Diagnosis       │
                 └──────────┬───────────┘
                            ↓
                 ┌──────────────────────┐
                 │ Recovery Strategy    │
                 └──────────┬───────────┘
                            ↓
                 ┌──────────────────────┐
                 │    Policy Guard      │
                 └───────┬───────┬──────┘
                         ↓       ↓
                    Execute   Escalate
                         ↓       ↓
                 ┌──────────────────────┐
                 │ Outcome Measurement  │
                 └──────────┬───────────┘
                            ↓
                 ┌──────────────────────┐
                 │ Merchant Control     │
                 │       Tower          │
                 └──────────────────────┘
```
