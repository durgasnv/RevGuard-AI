"""Structured AI decision schema (AI-02/AI-03/AI-04).

Every AI output must validate against Diagnosis; anything else is rejected
and the deterministic fallback takes over (AI-06).
"""

from __future__ import annotations

from enum import Enum

from pydantic import BaseModel, Field, field_validator

from app.schemas.transactions import RecoveryAction


class DiagnosisSource(str, Enum):
    LLM = "llm"
    HEURISTIC_FALLBACK = "heuristic_fallback"


ALLOWED_ACTIONS = {
    RecoveryAction.RETRY_PAYMENT,
    RecoveryAction.SEND_PAYMENT_LINK,
    RecoveryAction.NOTIFY_CUSTOMER,
    RecoveryAction.ESCALATE_HUMAN,
    RecoveryAction.STOP,
}


class Diagnosis(BaseModel):
    cluster_id: str
    root_cause: str = Field(min_length=10)
    contributing_factors: list[str] = Field(default_factory=list)
    recommended_action: RecoveryAction
    confidence: float = Field(ge=0.0, le=1.0)
    requires_human: bool
    evidence_refs: list[str] = Field(default_factory=list)
    source: DiagnosisSource

    @field_validator("recommended_action")
    @classmethod
    def action_in_bounded_set(cls, v: RecoveryAction) -> RecoveryAction:
        if v not in ALLOWED_ACTIONS:
            raise ValueError(f"action {v} outside bounded set")
        return v

    @field_validator("confidence")
    @classmethod
    def clamp_confidence(cls, v: float) -> float:
        return round(max(0.0, min(1.0, v)), 3)


class ClusterContext(BaseModel):
    """Sanitized operational context handed to the AI. No ground truth."""

    cluster_id: str
    title: str
    failure_category: str
    failure_codes: list[str]
    txn_count: int
    revenue_at_risk_inr: float
    expected_recoverable_inr: float
    payment_method_share: dict[str, float]
    window_hours: float | None
    burst_detected: bool
    avg_retry_count: float
    high_value_count: int  # txns above policy threshold
    sample_failure_evidence: list[str]
