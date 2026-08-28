"""Strategy-layer schemas. The strategy estimates and ranks; it never reads
ground truth (gt_*) and never executes anything — the Policy Guard decides
what may run.
"""

from __future__ import annotations

from enum import Enum

from pydantic import BaseModel, Field

from app.schemas.transactions import RecoveryAction


class DecisionOutcome(str, Enum):
    QUEUED = "queued"              # executable, EV-positive, within policy
    NEEDS_APPROVAL = "needs_approval"  # executable but above value threshold
    ESCALATED = "escalated"        # human review required by rule
    STOPPED = "stopped"            # no safe/economic action


class RecoveryOutreach(BaseModel):
    payment_link: str | None = None
    message_en: str | None = None
    message_hi: str | None = None
    channel: str = "whatsapp"


class StrategyDecision(BaseModel):
    transaction_id: str
    amount_inr: float
    failure_category: str
    failure_code: str
    action: RecoveryAction
    recovery_probability: float = Field(ge=0.0, le=1.0)
    expected_recovery_value_inr: float
    confidence: float = Field(ge=0.0, le=1.0)
    reason: str
    requires_approval: bool = False
    outcome: DecisionOutcome = DecisionOutcome.QUEUED
    rank: int | None = None
    outreach: RecoveryOutreach | None = None


class StrategyPlan(BaseModel):
    queue: list[StrategyDecision]          # ranked, EV-positive, automatable
    escalations: list[StrategyDecision]
    stops: list[StrategyDecision]

    @property
    def all_decisions(self) -> list[StrategyDecision]:
        return self.queue + self.escalations + self.stops

    @property
    def total_expected_recovery_inr(self) -> float:
        return round(sum(d.expected_recovery_value_inr for d in self.queue), 2)

