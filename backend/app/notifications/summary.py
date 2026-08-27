"""Proactive notification summary generator (Issue 1).

Produces a structured daily/periodic summary from the current store and
detection report — intended for Slack, email, or dashboard digest widgets.
"""

from __future__ import annotations

from datetime import datetime, timezone
from collections import Counter

from app.schemas.transactions import FailureCategory, Transaction, TxnStatus
from app.detection.classifier import classify
from app.core.policy import HARD_NON_RETRYABLE_CODES


def _count_by_method(txns: list[Transaction]) -> dict[str, int]:
    counter: Counter[str] = Counter()
    for t in txns:
        counter[t.payment_method] += 1
    return dict(counter.most_common())


def _count_by_category(txns: list[Transaction]) -> dict[str, int]:
    counter: Counter[str] = Counter()
    for t in txns:
        if t.status != TxnStatus.FAILED:
            continue
        cat = classify(t)
        counter[cat.value if cat else "uncategorized"] += 1
    return dict(counter.most_common())


def _count_by_status(txns: list[Transaction]) -> dict[str, int]:
    counter: Counter[str] = Counter()
    for t in txns:
        counter[t.status.value] += 1
    return dict(counter)


def generate_summary(
    txns: list[Transaction],
    *,
    period_label: str = "current",
) -> dict:
    """Generate a structured summary dict suitable for notifications.

    Returns a dict with keys: period, totals, breakdowns, top_issues, alerts.
    """
    total_count = len(txns)
    failed = [t for t in txns if t.status == TxnStatus.FAILED]
    succeeded = [t for t in txns if t.status == TxnStatus.SUCCESS]
    total_amount = sum(t.amount_inr for t in txns)
    lost_amount = sum(t.amount_inr for t in failed)

    # Hard non-retryable failures (fraud, expired card, etc.)
    blocked = [t for t in failed if t.failure_code in HARD_NON_RETRYABLE_CODES]

    # Top failure codes
    code_counter: Counter[str] = Counter()
    for t in failed:
        if t.failure_code:
            code_counter[t.failure_code] += 1
    top_codes = [{"code": code, "count": count}
                 for code, count in code_counter.most_common(5)]

    # Categories needing attention (policy-blocked or zero recovery)
    zero_recovery_cats = {
        FailureCategory.RISK_RELATED,
        FailureCategory.BUSINESS_INTEGRATION,
        FailureCategory.ACCOUNT_RESTRICTION,
    }
    attention_needed = [
        cat.value for cat in zero_recovery_cats
        if any(classify(t) == cat for t in failed)
    ]

    alerts: list[str] = []
    if blocked:
        alerts.append(f"{len(blocked)} hard-blocked failures (fraud / expired / restricted)")
    if attention_needed:
        alerts.append(f"Policy-blocked categories active: {', '.join(attention_needed)}")
    if lost_amount > total_amount * 0.5:
        alerts.append(f"Loss ratio high: ₹{lost_amount:,.0f} lost out of ₹{total_amount:,.0f} total")

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "period": period_label,
        "totals": {
            "transactions": total_count,
            "succeeded": len(succeeded),
            "failed": len(failed),
            "success_rate_pct": round(100 * len(succeeded) / total_count, 1) if total_count else 0,
            "total_amount_inr": round(total_amount, 2),
            "lost_amount_inr": round(lost_amount, 2),
        },
        "breakdowns": {
            "by_status": _count_by_status(txns),
            "by_method": _count_by_method(txns),
            "by_category": _count_by_category(txns),
        },
        "top_issues": top_codes,
        "alerts": alerts,
    }
