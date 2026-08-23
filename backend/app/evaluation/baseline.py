"""Deterministic baseline strategy (Phase 0 spec §7).

Baseline: retry every failed transaction exactly once, immediately,
regardless of amount, unless the failure code is hard non-retryable.
No clustering, no EV ranking, no friction modelling.
"""

from __future__ import annotations

from app.core.policy import HARD_NON_RETRYABLE_CODES
from app.schemas.transactions import RecoveryAction, Transaction


def baseline_select(txn: Transaction) -> RecoveryAction:
    """Return the action the baseline takes for one failed transaction."""
    if txn.failure_code in HARD_NON_RETRYABLE_CODES:
        return RecoveryAction.STOP
    return RecoveryAction.RETRY_PAYMENT


def baseline_plan(transactions: list[Transaction]) -> list[tuple[Transaction, RecoveryAction]]:
    """All actions the baseline would take across a batch."""
    return [
        (t, baseline_select(t))
        for t in transactions
        if t.status.value == "failed"
    ]
