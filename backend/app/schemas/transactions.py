"""Common transaction/event schema. FR-02 normalization target."""

from __future__ import annotations

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class FailureCategory(str, Enum):
    TRANSIENT = "transient"
    CUSTOMER_RELATED = "customer_related"
    PAYMENT_METHOD_RELATED = "payment_method_related"
    RETRY_EXHAUSTED = "retry_exhausted"
    RISK_RELATED = "risk_related"
    BUSINESS_INTEGRATION = "business_integration"


class TxnStatus(str, Enum):
    SUCCESS = "success"
    FAILED = "failed"
    PENDING = "pending"


class Transaction(BaseModel):
    transaction_id: str
    amount_inr: float = Field(gt=0)
    currency: str = "INR"
    payment_method: str  # upi | card | netbanking | wallet
    status: TxnStatus
    failure_code: str | None = None
    failure_category: FailureCategory | None = None
    timestamp: datetime
    retry_count: int = 0
    customer_reference: str | None = None
    subscription_reference: str | None = None

    # Ground truth for evaluation only — never visible to strategy agents.
    gt_action_probabilities: dict[str, float] = Field(default_factory=dict)
    gt_best_action: str | None = None
    gt_recoverable: bool = False


class RecoveryAction(str, Enum):
    RETRY_PAYMENT = "RETRY_PAYMENT"
    SEND_PAYMENT_LINK = "SEND_PAYMENT_LINK"
    NOTIFY_CUSTOMER = "NOTIFY_CUSTOMER"
    ESCALATE_HUMAN = "ESCALATE_HUMAN"
    STOP = "STOP"


class ActionOutcome(str, Enum):
    RECOVERED = "recovered"
    FAILED = "failed"
    BLOCKED_BY_POLICY = "blocked_by_policy"
    STOPPED = "stopped"
    ESCALATED = "escalated"


class AuditEvent(BaseModel):
    event_id: str
    timestamp: datetime
    actor: str  # e.g. "baseline_strategy", "policy_guard", "simulator"
    action: str
    reason: str
    evidence: dict = Field(default_factory=dict)
    policy_result: str = "allowed"  # allowed | blocked | escalated
    outcome: ActionOutcome | None = None
