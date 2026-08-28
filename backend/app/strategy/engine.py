"""Recovery Strategy Engine (FR-08/FR-09 + Phase 0 §4/§5 rules).

For every failed transaction: estimate per-action probabilities, compute EV,
select the best bounded action, apply stopping and escalation rules, and emit
a ranked queue. Retry is never the default — it must win on EV like anything
else.
"""

from __future__ import annotations

import math

from app.ai.context_builder import build_context
from app.core.policy import HIGH_VALUE_THRESHOLD_INR
from app.detection.engine import DetectionReport, RiskCluster
from app.schemas.transactions import (
    FailureCategory,
    RecoveryAction,
    Transaction,
)
from app.strategy.ev_model import estimate_probability, expected_recovery_value
from app.strategy.schemas import DecisionOutcome, RecoveryOutreach, StrategyDecision, StrategyPlan

CANDIDATE_ACTIONS = [
    RecoveryAction.RETRY_PAYMENT,
    RecoveryAction.SEND_PAYMENT_LINK,
    RecoveryAction.NOTIFY_CUSTOMER,
]

_CLUSTER_INDEX: dict[tuple[str, str], RiskCluster] = {}


def _burst_for(txn: Transaction) -> bool:
    cluster = _CLUSTER_INDEX.get((str(txn.failure_category), txn.failure_code or ""))
    return cluster is not None and any("burst" in e for e in cluster.evidence)


def _confidence(p: float, burst: bool, txn_count_hint: int = 1) -> float:
    """Confidence in the *estimate*: evidence strength × action probability."""
    evidence = 1.0 + 0.04 * min(math.log10(max(txn_count_hint, 1)), 3)
    if burst:
        evidence *= 1.1
    return round(max(0.30, min(0.95, p * evidence)), 3)


def decide(txn: Transaction) -> StrategyDecision:
    """One transaction → one bounded decision."""
    category = txn.failure_category or FailureCategory.BUSINESS_INTEGRATION
    code = txn.failure_code or "UNKNOWN"
    burst = _burst_for(txn)

    base = StrategyDecision(
        transaction_id=txn.transaction_id,
        amount_inr=txn.amount_inr,
        failure_category=category.value,
        failure_code=code,
        action=RecoveryAction.STOP,
        recovery_probability=0.0,
        expected_recovery_value_inr=0.0,
        confidence=0.0,
        reason="",
    )

    # Rule 1 — policy-mandated human review categories.
    if category in (FailureCategory.RISK_RELATED,
                    FailureCategory.BUSINESS_INTEGRATION,
                    FailureCategory.ACCOUNT_RESTRICTION):
        base.action = RecoveryAction.ESCALATE_HUMAN
        base.outcome = DecisionOutcome.ESCALATED
        base.requires_approval = True
        base.reason = (
            "risk-related decline" if category == FailureCategory.RISK_RELATED
            else "account restricted" if category == FailureCategory.ACCOUNT_RESTRICTION
            else "integration/config defect"
        ) + "; automated financial actions prohibited by policy"
        return base

    # Rule 2 — evaluate candidates on expected value.
    best_action, best_p, best_ev = None, 0.0, 0.0
    for action in CANDIDATE_ACTIONS:
        p = estimate_probability(txn, action, burst_detected=burst)
        ev = expected_recovery_value(txn.amount_inr, p, action)
        if p > 0.0 and ev > best_ev:
            best_action, best_p, best_ev = action, p, ev

    if best_action is None:
        # Stopping rule: either nothing viable or everything is negative-EV.
        viable_any = any(
            estimate_probability(txn, a, burst) > 0.0 for a in CANDIDATE_ACTIONS
        )
        base.outcome = DecisionOutcome.STOPPED
        base.action = RecoveryAction.STOP
        base.reason = (
            "negative expected value across all actions — intervention "
            "cost exceeds probable recovery" if viable_any
            else f"no viable recovery path for {category.value}/{code}"
        )
        return base

    base.action = best_action
    base.recovery_probability = best_p
    base.expected_recovery_value_inr = best_ev
    base.confidence = _confidence(best_p, burst)
    base.reason = (
        f"{best_action.value} maximizes EV ₹{best_ev:.0f} "
        f"(p={best_p:.2f}, amount=₹{txn.amount_inr:.0f})"
        + (", burst-adjusted" if burst else "")
    )

    if best_action in (RecoveryAction.SEND_PAYMENT_LINK, RecoveryAction.NOTIFY_CUSTOMER):
        base.outreach = _generate_outreach(txn, best_action)

    # Rule 3 — high-value actions need approval even when automatable.
    if txn.amount_inr >= HIGH_VALUE_THRESHOLD_INR:
        base.outcome = DecisionOutcome.NEEDS_APPROVAL
        base.requires_approval = True

    return base


def _generate_outreach(txn: Transaction, action: RecoveryAction) -> RecoveryOutreach:
    import hashlib
    h = hashlib.md5(txn.transaction_id.encode()).hexdigest()[:8]
    link = f"https://rzp.io/i/rec_{h}"
    amt_fmt = f"₹{txn.amount_inr:,.0f}"
    clean_code = (txn.failure_code or "TEMPORARY_ISSUE").replace("_", " ").title()

    if action == RecoveryAction.SEND_PAYMENT_LINK:
        msg_en = (
            f"Hi! Your payment of {amt_fmt} was interrupted ({clean_code}). "
            f"Complete it in 1-click here: {link} (Valid for 24 hours)."
        )
        msg_hi = (
            f"Namaste ji! Aapka {amt_fmt} ka payment bank issue ({clean_code}) ki wajah se complete nahi ho paya. "
            f"Is 1-click link se turant payment complete karein: {link} (24 ghante valid)."
        )
    else:
        msg_en = (
            f"Action Required: Your payment attempt of {amt_fmt} requires attention ({clean_code}). "
            f"Please update your details or re-authenticate here: {link}"
        )
        msg_hi = (
            f"Zaroori Soochna: Aapke {amt_fmt} ke payment attempt me update ki zaroorat hai ({clean_code}). "
            f"Kripya is link se verify ya details update karein: {link}"
        )

    return RecoveryOutreach(
        payment_link=link,
        message_en=msg_en,
        message_hi=msg_hi,
        channel="whatsapp",
    )



def build_plan(
    transactions: list[Transaction],
    report: DetectionReport | None = None,
    diagnoses: dict[str, object] | None = None,
) -> StrategyPlan:
    """Full-batch plan with a queue ranked by expected recovery value.

    `diagnoses` maps cluster_id → Diagnosis; when supplied, each decision is
    cross-checked against the AI diagnosis for its cluster and the reason
    records agreement or divergence (diagnosis→strategy connection).
    """
    global _CLUSTER_INDEX
    _CLUSTER_INDEX = {
        (c.failure_category.value, c.failure_codes[0] if c.failure_codes else ""): c
        for c in (report.clusters if report else [])
    }

    decisions = [
        decide(t) for t in transactions if t.status.value == "failed"
    ]

    if diagnoses:
        _annotate_with_diagnoses(decisions, diagnoses)

    queued = [d for d in decisions
              if d.outcome is DecisionOutcome.QUEUED]
    needs_approval = [d for d in decisions
                      if d.outcome is DecisionOutcome.NEEDS_APPROVAL]
    escalations = [d for d in decisions if d.outcome is DecisionOutcome.ESCALATED]
    stops = [d for d in decisions if d.outcome is DecisionOutcome.STOPPED]

    queued.sort(key=lambda d: d.expected_recovery_value_inr, reverse=True)
    needs_approval.sort(key=lambda d: d.expected_recovery_value_inr, reverse=True)
    for i, d in enumerate(queued, 1):
        d.rank = i

    _CLUSTER_INDEX = {}
    return StrategyPlan(
        queue=queued,
        escalations=escalations + needs_approval,
        stops=stops,
    )


def _annotate_with_diagnoses(decisions: list[StrategyDecision],
                             diagnoses: dict[str, object]) -> None:
    """Append diagnosis concurrence/divergence notes to decision reasons."""
    for key, cluster in _CLUSTER_INDEX.items():
        diag = diagnoses.get(cluster.cluster_id)
        if diag is None:
            continue
        recommended = getattr(diag, "recommended_action", None)
        source = getattr(getattr(diag, "source", None), "value", "unknown")
        for d in decisions:
            if (d.failure_category, d.failure_code) != key:
                continue
            if recommended is None:
                continue
            if d.action == recommended:
                d.reason += f" · {source} diagnosis concurs"
            elif d.action in (RecoveryAction.RETRY_PAYMENT,
                              RecoveryAction.SEND_PAYMENT_LINK,
                              RecoveryAction.NOTIFY_CUSTOMER):
                d.reason += (f" · diverges from {source} diagnosis "
                             f"({recommended.value}); EV ranking governs")
