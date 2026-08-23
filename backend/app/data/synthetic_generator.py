"""Synthetic transaction generator with embedded ground truth.

Produces a reproducible batch covering every leakage scenario defined in the
Phase 0 spec. Ground-truth fields are prefixed gt_ and must never be exposed
to strategy/diagnosis components.
"""

from __future__ import annotations

import random
import uuid
from datetime import datetime, timedelta, timezone

from app.schemas.transactions import FailureCategory, Transaction, TxnStatus

SEED = 42

PAYMENT_METHODS = ["upi", "card", "netbanking", "wallet"]

# amount bands used to create realistic value spread
AMOUNT_BANDS = [
    (99, 500, 0.30),
    (500, 2_000, 0.35),
    (2_000, 10_000, 0.25),
    (10_000, 80_000, 0.10),
]


def _amount(rng: random.Random) -> float:
    roll = rng.random()
    cumulative = 0.0
    for lo, hi, weight in AMOUNT_BANDS:
        cumulative += weight
        if roll <= cumulative:
            return round(rng.uniform(lo, hi), 2)
    return round(rng.uniform(500, 5_000), 2)


def _ts(base: datetime, hours_back: int, rng: random.Random) -> datetime:
    return base - timedelta(hours=rng.uniform(0, hours_back))


def _txn(
    rng: random.Random,
    base_time: datetime,
    status: TxnStatus,
    method: str | None = None,
    failure_code: str | None = None,
    category: FailureCategory | None = None,
    retry_count: int = 0,
    subscription: str | None = None,
    customer_reference: str | None = None,
    gt_action_probabilities: dict[str, float] | None = None,
    hours_back: int = 168,
) -> Transaction:
    probs = gt_action_probabilities or {}
    best = max(probs, key=probs.get) if probs else None
    return Transaction(
        transaction_id=f"txn_{uuid.UUID(int=rng.getrandbits(128)).hex[:12]}",
        amount_inr=_amount(rng),
        payment_method=method or rng.choice(PAYMENT_METHODS),
        status=status,
        failure_code=failure_code,
        failure_category=category,
        timestamp=_ts(base_time, hours_back, rng),
        retry_count=retry_count,
        customer_reference=customer_reference or f"cust_{rng.randint(1000, 9999)}",
        subscription_reference=subscription,
        gt_action_probabilities=probs,
        gt_best_action=best,
        gt_recoverable=bool(probs),
    )


def generate_batch(n_total: int = 600, seed: int = SEED) -> list[Transaction]:
    """Generate n_total transactions across all Phase 0 scenarios."""
    rng = random.Random(seed)
    base_time = datetime.now(timezone.utc)
    txns: list[Transaction] = []

    # --- Background successes (~58%) ---
    for _ in range(int(n_total * 0.58)):
        txns.append(_txn(rng, base_time, TxnStatus.SUCCESS))

    failed_target = n_total - len(txns)

    # Scenario budgets as fractions of failed volume
    budgets = {
        "upi_burst": int(failed_target * 0.18),
        "insufficient_funds": int(failed_target * 0.16),
        "sub_retry_exhausted": int(failed_target * 0.13),
        "auth_repeat": int(failed_target * 0.09),
        "high_value_risk": int(failed_target * 0.07),
        "one_off_transient": int(failed_target * 0.19),
        "integration": int(failed_target * 0.07),
        "method_degradation": int(failed_target * 0.11),
    }

    burst_start = base_time - timedelta(hours=30)
    burst_end = base_time - timedelta(hours=22)

    for _ in range(budgets["upi_burst"]):
        ts = burst_start + timedelta(hours=rng.uniform(0, 8))
        t = _txn(
            rng, base_time, TxnStatus.FAILED, method="upi",
            failure_code="NETWORK_ERROR", category=FailureCategory.TRANSIENT,
            gt_action_probabilities={"RETRY_PAYMENT": round(rng.uniform(0.55, 0.75), 3)},
        )
        t.timestamp = ts
        txns.append(t)

    for _ in range(budgets["insufficient_funds"]):
        t = _txn(
            rng, base_time, TxnStatus.FAILED,
            failure_code="INSUFFICIENT_FUNDS", category=FailureCategory.CUSTOMER_RELATED,
            gt_action_probabilities={
                "RETRY_PAYMENT": round(rng.uniform(0.05, 0.15), 3),
                "SEND_PAYMENT_LINK": round(rng.uniform(0.28, 0.45), 3),
            },
        )
        txns.append(t)

    for _ in range(budgets["sub_retry_exhausted"]):
        t = _txn(
            rng, base_time, TxnStatus.FAILED,
            failure_code="GATEWAY_TIMEOUT", category=FailureCategory.RETRY_EXHAUSTED,
            retry_count=rng.randint(2, 4),
            subscription=f"sub_{rng.randint(100, 999)}",
            gt_action_probabilities={"SEND_PAYMENT_LINK": round(rng.uniform(0.32, 0.50), 3)},
        )
        txns.append(t)

    for _ in range(budgets["auth_repeat"]):
        cust = f"cust_{rng.randint(1000, 9999)}"
        attempts = rng.randint(2, 4)  # same customer hammering retries
        for i in range(attempts):
            t = _txn(
                rng, base_time, TxnStatus.FAILED,
                failure_code="AUTHENTICATION_FAILED",
                category=FailureCategory.CUSTOMER_RELATED,
                retry_count=i,
                customer_reference=cust,
                gt_action_probabilities={},
            )
            txns.append(t)

    for _ in range(budgets["high_value_risk"]):
        t = _txn(
            rng, base_time, TxnStatus.FAILED, method="card",
            failure_code="FRAUD_SUSPECTED", category=FailureCategory.RISK_RELATED,
            gt_action_probabilities={},
        )
        t.amount_inr = round(rng.uniform(25_000, 120_000), 2)
        txns.append(t)

    for _ in range(budgets["one_off_transient"]):
        code = rng.choice(["GATEWAY_TIMEOUT", "ISSUER_BUSY", "SYSTEM_ERROR"])
        t = _txn(
            rng, base_time, TxnStatus.FAILED,
            failure_code=code, category=FailureCategory.TRANSIENT,
            gt_action_probabilities={"RETRY_PAYMENT": round(rng.uniform(0.40, 0.60), 3)},
        )
        txns.append(t)

    for _ in range(budgets["method_degradation"]):
        code = rng.choice(["UPI_COLLECT_DECLINED", "BANK_UNAVAILABLE", "CARD_EXPIRED"])
        probs = {
            "UPI_COLLECT_DECLINED": {"SEND_PAYMENT_LINK": round(rng.uniform(0.25, 0.40), 3)},
            "BANK_UNAVAILABLE": {"RETRY_PAYMENT": round(rng.uniform(0.35, 0.55), 3)},
            # expired cards are only recoverable once the customer updates details
            "CARD_EXPIRED": {},
        }[code]
        t = _txn(
            rng, base_time, TxnStatus.FAILED,
            failure_code=code, category=FailureCategory.PAYMENT_METHOD_RELATED,
            gt_action_probabilities=probs,
        )
        txns.append(t)

    for _ in range(budgets["integration"]):
        t = _txn(
            rng, base_time, TxnStatus.FAILED,
            failure_code=rng.choice(["INVALID_REQUEST", "CONFIG_ERROR"]),
            category=FailureCategory.BUSINESS_INTEGRATION,
            gt_action_probabilities={},
        )
        txns.append(t)

    rng.shuffle(txns)
    return txns[:n_total]
