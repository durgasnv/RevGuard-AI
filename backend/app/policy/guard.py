"""Policy Guard — deterministic financial-safety enforcement (FR-10, SC-02..06).

Every consequential action passes through here before execution. The guard is
pure Python: LLM output has no authority over these checks (NFR-06).
"""

from __future__ import annotations

from collections.abc import Callable
from datetime import datetime, timezone
from enum import Enum

from pydantic import BaseModel, Field

from app.core.policy import (
    HARD_NON_RETRYABLE_CODES,
    HIGH_VALUE_THRESHOLD_INR,
    MAX_ACTIONS_PER_DAY,
    MAX_AUTO_RETRIES_PER_TXN,
    RETRYABLE_CATEGORIES,
)
from app.schemas.transactions import (
    FailureCategory,
    RecoveryAction,
    Transaction,
)


class Verdict(str, Enum):
    ALLOWED = "allowed"
    BLOCKED = "blocked"
    PENDING_APPROVAL = "pending_approval"
    NON_FINANCIAL = "non_financial"


class PolicyVerdict(BaseModel):
    verdict: Verdict
    reason: str
    rule: str  # which check produced the verdict


FINANCIAL_ACTIONS = {RecoveryAction.RETRY_PAYMENT, RecoveryAction.SEND_PAYMENT_LINK,
                     RecoveryAction.NOTIFY_CUSTOMER}


class PolicyGuard:
    """Stateful guard: duplicate keys, daily caps and approvals live here."""

    def __init__(self, daily_cap: int = MAX_ACTIONS_PER_DAY,
                 high_value_threshold: float = HIGH_VALUE_THRESHOLD_INR,
                 now: Callable[[], datetime] | None = None):
        self._daily_cap = daily_cap
        self._threshold = high_value_threshold
        self._executed_keys: set[str] = set()
        self._approvals: dict[str, str] = {}  # txn_id -> approver
        self._action_log: list[tuple[datetime, str]] = []
        self._now = now or (lambda: datetime.now(timezone.utc))

    # ---- state mutators -------------------------------------------------
    def register_execution(self, idempotency_key: str) -> None:
        self._executed_keys.add(idempotency_key)
        self._action_log.append((self._now(), idempotency_key))

    def approve(self, transaction_id: str, approver: str) -> None:
        self._approvals[transaction_id] = approver

    @property
    def actions_today(self) -> int:
        today = self._now().date()
        return sum(1 for ts, _ in self._action_log if ts.date() == today)

    def is_approved(self, transaction_id: str) -> bool:
        return transaction_id in self._approvals

    # ---- the gate --------------------------------------------------------
    def check(self, txn: Transaction, action: RecoveryAction,
              idempotency_key: str) -> PolicyVerdict:
        if action not in FINANCIAL_ACTIONS:
            return PolicyVerdict(
            verdict=Verdict.NON_FINANCIAL,
            reason=f"{action.value} requires no financial execution",
            rule="non_financial")

        if idempotency_key in self._executed_keys:
            return PolicyVerdict(
                verdict=Verdict.BLOCKED,
                reason="duplicate action prevented (idempotency key seen)",
                rule="duplicate_prevention")

        if action is RecoveryAction.RETRY_PAYMENT:
            category = txn.failure_category
            if txn.failure_code in HARD_NON_RETRYABLE_CODES:
                return PolicyVerdict(
                    verdict=Verdict.BLOCKED,
                    reason=f"code {txn.failure_code} is hard non-retryable",
                    rule="hard_non_retryable")
            if category and category.value not in RETRYABLE_CATEGORIES \
                    or category in (FailureCategory.RISK_RELATED,
                                    FailureCategory.BUSINESS_INTEGRATION):
                return PolicyVerdict(
                    verdict=Verdict.BLOCKED,
                    reason=f"category {category} is non-retryable",
                    rule="non_retryable_category")
            if txn.retry_count >= MAX_AUTO_RETRIES_PER_TXN:
                return PolicyVerdict(
                    verdict=Verdict.BLOCKED,
                    reason=f"retry limit reached ({txn.retry_count} attempts)",
                    rule="retry_limit")

        if txn.amount_inr >= self._threshold and not self.is_approved(txn.transaction_id):
            return PolicyVerdict(
                verdict=Verdict.PENDING_APPROVAL,
                reason=(f"amount ₹{txn.amount_inr:.0f} ≥ ₹{self._threshold:.0f}; "
                        f"human approval required"),
                rule="approval_gate")

        if self.actions_today >= self._daily_cap:
            return PolicyVerdict(
                verdict=Verdict.BLOCKED,
                reason=f"daily action cap reached ({self._daily_cap})",
                rule="daily_cap")

        return PolicyVerdict(
            verdict=Verdict.ALLOWED, reason="all policy checks passed", rule="pass")
