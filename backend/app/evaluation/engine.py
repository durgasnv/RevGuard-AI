"""Outcome and Evaluation Engine (FR-14/FR-15, ER-02..08).

Runs two strategies (deterministic baseline, EV-ranked AI strategy) through
the identical policy gate and fair simulator, then reports metrics, uplift,
unnecessary interventions and an honest exception list.
"""

from __future__ import annotations

import uuid
from collections import defaultdict
from datetime import datetime, timezone

from pydantic import BaseModel, Field

from app.detection.engine import detect
from app.evaluation.baseline import baseline_plan
from app.execution.executor import ActionExecutor, ExecutionReport
from app.integrations.simulator import PaymentSimulator
from app.policy.guard import PolicyGuard
from app.schemas.transactions import Transaction
from app.strategy.engine import build_plan


class StrategyMetrics(BaseModel):
    name: str
    revenue_at_risk_inr: float
    recovered_inr: float
    unrecovered_inr: float
    recovery_rate: float                 # recovered / revenue at risk
    interventions_attempted: int
    intervention_rate: float             # attempted / eligible failed txns
    blocked_by_policy: int
    escalated_or_stopped: int
    unnecessary_interventions: int = 0   # attempts ground truth says could never pay (ER-07)
    prevented_interventions: int = 0     # negative-EV stops that gt confirms were hopeless


class UpliftMetrics(BaseModel):
    extra_recovered_inr: float
    rate_delta: float                    # percentage points
    avoided_unnecessary_interventions: int
    baseline_recovered_per_attempt: float
    ai_recovered_per_attempt: float


class ExceptionItem(BaseModel):
    failure_code: str
    reason: str
    txn_count: int
    amount_inr: float
    sample_ids: list[str] = Field(default_factory=list)


class EvaluationReport(BaseModel):
    report_id: str
    generated_at: datetime
    dataset_size: int
    seed: int
    failed_count: int
    revenue_at_risk_inr: float
    baseline: StrategyMetrics
    ai_strategy: StrategyMetrics
    uplift: UpliftMetrics
    exceptions: list[ExceptionItem]


def _metrics(name: str, report: ExecutionReport,
             transactions: list[Transaction]) -> StrategyMetrics:
    by_id = {t.transaction_id: t for t in transactions}
    failed = [t for t in transactions if t.status.value == "failed"]
    risk = sum(t.amount_inr for t in failed)

    recovered = report.recovered_inr
    attempted = sum(
        1 for r in report.results
        if r.outcome.value in ("recovered", "failed")
    )
    blocked = sum(1 for r in report.results if r.policy_rule == "duplicate_prevention")
    # duplicate blocks only occur on re-runs; fresh runs have none

    unnecessary = 0
    for r in report.results:
        if r.outcome.value not in ("recovered", "failed"):
            continue
        txn = by_id[r.transaction_id]
        probs = txn.gt_action_probabilities
        if probs.get(r.action.value, 0.0) <= 0.0:
            unnecessary += 1  # money/friction spent where recovery was impossible

    escalated_stopped = sum(
        1 for r in report.results if r.outcome.value in ("escalated", "stopped")
    )

    return StrategyMetrics(
        name=name,
        revenue_at_risk_inr=round(risk, 2),
        recovered_inr=round(recovered, 2),
        unrecovered_inr=round(risk - recovered, 2),
        recovery_rate=round(recovered / risk, 4) if risk else 0.0,
        interventions_attempted=attempted,
        intervention_rate=round(attempted / len(failed), 4) if failed else 0.0,
        blocked_by_policy=blocked,
        escalated_or_stopped=escalated_stopped,
        unnecessary_interventions=unnecessary,
    )


def _prevented_count(report: ExecutionReport, transactions: list[Transaction]) -> int:
    """Negative-EV stops the ground truth confirms were hopeless."""
    by_id = {t.transaction_id: t for t in transactions}
    return sum(
        1 for r in report.results
        if r.outcome.value == "stopped"
        and not by_id[r.transaction_id].gt_recoverable
    )


def _exceptions(transactions: list[Transaction],
                strategy_report: ExecutionReport) -> list[ExceptionItem]:
    """Honest list of revenue we did NOT recover and why (ER-08)."""
    by_id = {t.transaction_id: t for t in transactions}
    outcome_by_txn = {r.transaction_id: r for r in strategy_report.results}

    buckets: dict[tuple[str, str], dict] = defaultdict(
        lambda: {"n": 0, "amt": 0.0, "ids": []})
    for t in transactions:
        if t.status.value != "failed":
            continue
        r = outcome_by_txn.get(t.transaction_id)
        if r is None:
            continue
        if r.outcome.value == "recovered":
            continue
        if r.outcome.value == "failed" and "not viable" not in r.reason \
                and "injected" not in r.reason:
            # attempted honestly but payment failed anyway
            key = (t.failure_code or "?", "attempt_failed_despite_intervention")
        elif r.outcome.value in ("escalated",):
            key = (t.failure_code or "?", f"escalated: {r.reason[:60]}")
        elif r.outcome.value == "stopped":
            key = (t.failure_code or "?", f"stopped: {r.reason[:60]}")
        else:
            key = (t.failure_code or "?", f"blocked/failed: {r.reason[:50]}")
        b = buckets[key]
        b["n"] += 1
        b["amt"] += t.amount_inr
        if len(b["ids"]) < 3:
            b["ids"].append(t.transaction_id)

    items = [
        ExceptionItem(failure_code=code, reason=reason, txn_count=b["n"],
                      amount_inr=round(b["amt"], 2), sample_ids=b["ids"])
        for (code, reason), b in sorted(buckets.items(),
                                        key=lambda kv: -kv[1]["amt"])
    ]
    return items


def evaluate(transactions: list[Transaction], seed: int = 42) -> EvaluationReport:
    """Full comparison run. Same guard rules, same fair provider for both."""
    report_detection = detect(transactions)
    plan = build_plan(transactions, report_detection)
    by_id = {t.transaction_id: t for t in transactions}

    ai_items = [(by_id[d.transaction_id], d.action) for d in plan.all_decisions]
    base_items = baseline_plan(transactions)

    ai_run = ActionExecutor(
        provider=PaymentSimulator(seed=seed, fair=True),
        guard=PolicyGuard(),
    ).execute(ai_items, actor="ai_strategy")
    base_run = ActionExecutor(
        provider=PaymentSimulator(seed=seed, fair=True),
        guard=PolicyGuard(),
    ).execute(base_items, actor="baseline")

    base_m = _metrics("baseline", base_run, transactions)
    ai_m = _metrics("ai_strategy", ai_run, transactions)
    ai_m.prevented_interventions = _prevented_count(ai_run, transactions)

    def per_attempt(m: StrategyMetrics) -> float:
        return round(m.recovered_inr / m.interventions_attempted, 2) \
            if m.interventions_attempted else 0.0

    uplift = UpliftMetrics(
        extra_recovered_inr=round(ai_m.recovered_inr - base_m.recovered_inr, 2),
        rate_delta=round((ai_m.recovery_rate - base_m.recovery_rate) * 100, 3),
        avoided_unnecessary_interventions=max(
            0, base_m.unnecessary_interventions - ai_m.unnecessary_interventions),
        baseline_recovered_per_attempt=per_attempt(base_m),
        ai_recovered_per_attempt=per_attempt(ai_m),
    )

    return EvaluationReport(
        report_id=f"eval_{uuid.uuid4().hex[:10]}",
        generated_at=datetime.now(timezone.utc),
        dataset_size=len(transactions),
        seed=seed,
        failed_count=sum(1 for t in transactions if t.status.value == "failed"),
        revenue_at_risk_inr=base_m.revenue_at_risk_inr,
        baseline=base_m,
        ai_strategy=ai_m,
        uplift=uplift,
        exceptions=_exceptions(transactions, ai_run),
    )
