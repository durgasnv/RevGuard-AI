"""Builds sanitized operational context for the AI (AI-01).

Hard rule: ground-truth fields never leave the evaluation layer.
"""

from __future__ import annotations

from app.ai.schemas import ClusterContext
from app.detection.classifier import classify
from app.detection.engine import RiskCluster
from app.core.policy import HIGH_VALUE_THRESHOLD_INR
from app.schemas.transactions import Transaction


def _share(counter: dict[str, int], total: int) -> dict[str, float]:
    return {k: round(n / total, 3) for k, n in counter.items()} if total else {}


def build_context(cluster: RiskCluster, all_transactions: list[Transaction]) -> ClusterContext:
    members = [
        t for t in all_transactions
        if t.status.value == "failed"
        and t.failure_code in cluster.failure_codes
        and (classify(t) or t.failure_category) is cluster.failure_category
    ]

    methods: dict[str, int] = {}
    retries = 0
    high_value = 0
    for t in members:
        methods[t.payment_method] = methods.get(t.payment_method, 0) + 1
        retries += t.retry_count
        if t.amount_inr >= HIGH_VALUE_THRESHOLD_INR:
            high_value += 1

    window_hours = None
    if cluster.window_start and cluster.window_end:
        window_hours = round(
            (cluster.window_end - cluster.window_start).total_seconds() / 3600, 2
        )

    burst = window_hours is not None and cluster.txn_count >= 5 and window_hours <= 8.0

    sample_evidence = [
        f"{t.transaction_id}: {t.failure_code} ₹{t.amount_inr:.0f} "
        f"via {t.payment_method} (retries={t.retry_count})"
        for t in sorted(members, key=lambda x: -x.amount_inr)[:5]
    ]

    return ClusterContext(
        cluster_id=cluster.cluster_id,
        title=cluster.title,
        failure_category=cluster.failure_category.value,
        failure_codes=list(cluster.failure_codes),
        txn_count=cluster.txn_count,
        revenue_at_risk_inr=cluster.revenue_at_risk_inr,
        expected_recoverable_inr=cluster.expected_recoverable_inr,
        payment_method_share=_share(methods, len(members)),
        window_hours=window_hours,
        burst_detected=burst,
        avg_retry_count=round(retries / len(members), 2) if members else 0.0,
        high_value_count=high_value,
        sample_failure_evidence=sample_evidence,
    )
