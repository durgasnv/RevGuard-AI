"""Revenue risk detection engine (FR-03/05/06/07).

Clusters failed transactions, estimates revenue at risk with category-level
recovery priors (never ground truth), ranks clusters by impact and emits
evidence-backed explanations.
"""

from __future__ import annotations

import uuid
from collections import Counter
from datetime import datetime, timezone

from pydantic import BaseModel, Field

from app.detection.classifier import classify
from app.schemas.transactions import FailureCategory, Transaction, TxnStatus

# Detection-time recovery priors per category. Deliberately coarse; the
# strategy layer refines these. Ground truth is never read here.
RECOVERY_PRIOR: dict[FailureCategory, float] = {
    FailureCategory.TRANSIENT: 0.55,
    FailureCategory.CUSTOMER_RELATED: 0.30,
    FailureCategory.PAYMENT_METHOD_RELATED: 0.30,
    FailureCategory.RETRY_EXHAUSTED: 0.35,
    FailureCategory.BIOMETRIC_FAILURE: 0.15,
    FailureCategory.DEVICE_HARDWARE: 0.40,
    FailureCategory.THREE_DS_AUTHENTICATION: 0.35,
    FailureCategory.RISK_RELATED: 0.0,
    FailureCategory.BUSINESS_INTEGRATION: 0.0,
    FailureCategory.ACCOUNT_RESTRICTION: 0.0,
}

BURST_WINDOW_HOURS = 8
SEVERITY_RULES = [  # (min_revenue_at_risk_inr, min_txn_count)
    (100_000.0, 20),
    (25_000.0, 5),
]


class RiskCluster(BaseModel):
    cluster_id: str
    title: str
    failure_category: FailureCategory
    payment_methods: list[str]
    failure_codes: list[str]
    txn_count: int
    revenue_at_risk_inr: float
    expected_recoverable_inr: float
    window_start: datetime | None = None
    window_end: datetime | None = None
    severity: str  # high | medium | low
    evidence: list[str] = Field(default_factory=list)
    sample_transaction_ids: list[str]


class DetectionReport(BaseModel):
    report_id: str
    generated_at: datetime
    transactions_analyzed: int
    failed_count: int
    revenue_at_risk_inr: float
    expected_recoverable_inr: float
    unrecoverable_inr: float
    clusters: list[RiskCluster]


def _severity(revenue_at_risk: float, txn_count: int) -> str:
    for min_rev, min_count in SEVERITY_RULES:
        if revenue_at_risk >= min_rev or txn_count >= min_count:
            return "high" if (revenue_at_risk >= min_rev * 2 or txn_count >= min_count * 3) else "medium"
    return "low"


def detect(transactions: list[Transaction]) -> DetectionReport:
    now = datetime.now(timezone.utc)
    failed = [t for t in transactions if t.status == TxnStatus.FAILED]

    grouped: dict[tuple, list[Transaction]] = {}
    for t in failed:
        category = classify(t) or FailureCategory.BUSINESS_INTEGRATION
        grouped.setdefault((category, t.failure_code), []).append(t)

    clusters: list[RiskCluster] = []
    for (category, code), txns in grouped.items():
        txns.sort(key=lambda t: t.timestamp)
        revenue_at_risk = sum(t.amount_inr for t in txns)
        prior = RECOVERY_PRIOR.get(category, 0.0)
        expected = round(sum(t.amount_inr for t in txns) * prior, 2)

        methods = Counter(t.payment_method for t in txns)
        span_hours = (
            (txns[-1].timestamp - txns[0].timestamp).total_seconds() / 3600
            if len(txns) > 1 else 0.0
        )
        burst = span_hours <= BURST_WINDOW_HOURS and len(txns) >= 5

        evidence = [
            f"{len(txns)} failures with code {code} "
            f"(₹{revenue_at_risk:,.0f} at risk)",
            f"payment method mix: "
            f"{', '.join(f'{m}={n}' for m, n in methods.most_common())}",
        ]
        if burst:
            rate_per_hour = len(txns) / max(span_hours, 0.5)
            evidence.append(
                f"temporal burst: {len(txns)} failures within "
                f"{span_hours:.1f}h (~{rate_per_hour:.1f}/h) — degradation suspected"
            )
        if category == FailureCategory.RETRY_EXHAUSTED:
            evidence.append(
                "retry paths exhausted (retry_count ≥ policy limit); "
                "auto-retry would duplicate work"
            )
        if prior == 0.0:
            evidence.append("no automated recovery path — operational fix or human review")

        clusters.append(RiskCluster(
            cluster_id=f"rc_{uuid.uuid4().hex[:10]}",
            title=f"{category.value.replace('_', ' ').title()} — {code}",
            failure_category=category,
            payment_methods=[m for m, _ in methods.most_common()],
            failure_codes=[code],
            txn_count=len(txns),
            revenue_at_risk_inr=revenue_at_risk,
            expected_recoverable_inr=expected,
            window_start=txns[0].timestamp if txns else None,
            window_end=txns[-1].timestamp if txns else None,
            severity=_severity(revenue_at_risk, len(txns)),
            evidence=evidence,
            sample_transaction_ids=[t.transaction_id for t in txns[:5]],
        ))

    clusters.sort(key=lambda c: c.revenue_at_risk_inr, reverse=True)

    total_at_risk = sum(c.revenue_at_risk_inr for c in clusters)
    return DetectionReport(
        report_id=f"rep_{uuid.uuid4().hex[:10]}",
        generated_at=now,
        transactions_analyzed=len(transactions),
        failed_count=len(failed),
        revenue_at_risk_inr=round(total_at_risk, 2),
        expected_recoverable_inr=round(sum(c.expected_recoverable_inr for c in clusters), 2),
        unrecoverable_inr=round(total_at_risk - sum(c.expected_recoverable_inr for c in clusters), 2),
        clusters=clusters,
    )
