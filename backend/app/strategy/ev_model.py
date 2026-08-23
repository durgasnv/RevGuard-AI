"""Expected-value model and recovery-probability estimation (Phase 0 §6).

All estimates derive from category/code context and operational signals.
Ground truth is never consulted here.
"""

from __future__ import annotations

from app.core.policy import (
    FRICTION_COST_INR,
    INTERVENTION_COST_FLAT_INR,
    MAX_AUTO_RETRIES_PER_TXN,
)
from app.schemas.transactions import FailureCategory, RecoveryAction, Transaction

# Category/action priors refined per failure code where evidence exists.
BASE_PROBABILITY: dict[FailureCategory, dict[RecoveryAction, float]] = {
    FailureCategory.TRANSIENT: {
        RecoveryAction.RETRY_PAYMENT: 0.55,
        RecoveryAction.SEND_PAYMENT_LINK: 0.30,
        RecoveryAction.NOTIFY_CUSTOMER: 0.20,
    },
    FailureCategory.CUSTOMER_RELATED: {
        RecoveryAction.RETRY_PAYMENT: 0.10,
        RecoveryAction.SEND_PAYMENT_LINK: 0.35,
        RecoveryAction.NOTIFY_CUSTOMER: 0.25,
    },
    FailureCategory.PAYMENT_METHOD_RELATED: {
        RecoveryAction.RETRY_PAYMENT: 0.40,
        RecoveryAction.SEND_PAYMENT_LINK: 0.30,
        RecoveryAction.NOTIFY_CUSTOMER: 0.20,
    },
    FailureCategory.RETRY_EXHAUSTED: {
        RecoveryAction.RETRY_PAYMENT: 0.0,
        RecoveryAction.SEND_PAYMENT_LINK: 0.40,
        RecoveryAction.NOTIFY_CUSTOMER: 0.25,
    },
    # policy-mandated zeros — never automated
    FailureCategory.RISK_RELATED: {},
    FailureCategory.BUSINESS_INTEGRATION: {},
}

CODE_ADJUSTMENTS: dict[str, dict[RecoveryAction, float]] = {
    "INSUFFICIENT_FUNDS": {  # immediate retry rarely fixes cash-flow timing
        RecoveryAction.RETRY_PAYMENT: -0.05,
        RecoveryAction.SEND_PAYMENT_LINK: 0.0,
    },
    "AUTHENTICATION_FAILED": {  # customer-side blocker; retries add friction
        RecoveryAction.RETRY_PAYMENT: -0.07,
        RecoveryAction.NOTIFY_CUSTOMER: 0.0,
    },
    "BANK_UNAVAILABLE": {
        RecoveryAction.RETRY_PAYMENT: +0.05,
    },
    "CARD_EXPIRED": {  # only a customer-updated instrument recovers this
        RecoveryAction.RETRY_PAYMENT: -0.4,
        RecoveryAction.SEND_PAYMENT_LINK: -0.15,
    },
    "UPI_COLLECT_DECLINED": {
        RecoveryAction.SEND_PAYMENT_LINK: 0.0,
        RecoveryAction.RETRY_PAYMENT: -0.15,
    },
}


def estimate_probability(
    txn: Transaction,
    action: RecoveryAction,
    burst_detected: bool = False,
) -> float:
    """Estimated P(recovery | action) from context only."""
    if txn.failure_category in (FailureCategory.RISK_RELATED,
                                FailureCategory.BUSINESS_INTEGRATION):
        return 0.0
    if action is RecoveryAction.RETRY_PAYMENT and (
        txn.retry_count >= MAX_AUTO_RETRIES_PER_TXN
    ):
        return 0.0  # stopping condition: retry path exhausted

    table = BASE_PROBABILITY.get(txn.failure_category, {})
    p = table.get(action, 0.0)
    p += CODE_ADJUSTMENTS.get(txn.failure_code, {}).get(action, 0.0)

    if burst_detected and action is RecoveryAction.RETRY_PAYMENT \
            and txn.failure_category is FailureCategory.TRANSIENT:
        p += 0.10  # outage windows recover well once they pass

    return round(max(0.0, min(1.0, p)), 3)


def expected_recovery_value(amount_inr: float, probability: float,
                            action: RecoveryAction) -> float:
    """EV = p×amount − flat intervention cost − action friction cost."""
    friction = FRICTION_COST_INR.get(action.value, 5.0)
    return round(probability * amount_inr
                 - INTERVENTION_COST_FLAT_INR - friction, 2)
