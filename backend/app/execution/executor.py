"""Action Executor — executes only what the Policy Guard allows (FR-11/FR-13).

Every action produces exactly one outcome and one audit event. Failed
executions are recorded, never auto-retried here: the stopping-rule lives in
the plan + guard, so no uncontrolled retry loop can form (FR-17).
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from pydantic import BaseModel

from app.integrations.base import (
    PaymentProvider,
    ProviderRequest,
    ProviderResponse,
    ProviderStatus,
)
from app.policy.guard import PolicyGuard, Verdict
from app.schemas.transactions import (
    ActionOutcome,
    AuditEvent,
    RecoveryAction,
    Transaction,
)


class ActionResult(BaseModel):
    transaction_id: str
    action: RecoveryAction
    policy_rule: str
    policy_verdict: str
    outcome: ActionOutcome
    recovered_amount_inr: float = 0.0
    reason: str


class ExecutionReport(BaseModel):
    results: list[ActionResult]
    audit_trail: list[AuditEvent]

    @property
    def recovered_inr(self) -> float:
        return round(sum(r.recovered_amount_inr for r in self.results), 2)

    @property
    def counts_by_outcome(self) -> dict[str, int]:
        counts: dict[str, int] = {}
        for r in self.results:
            counts[r.outcome.value] = counts.get(r.outcome.value, 0) + 1
        return counts


def _audit(actor: str, txn: Transaction, action: RecoveryAction,
           reason: str, verdict: Verdict, outcome: ActionOutcome | None,
           extra_evidence: dict) -> AuditEvent:
    return AuditEvent(
        event_id=f"aud_{uuid.uuid4().hex[:10]}",
        timestamp=datetime.now(timezone.utc),
        actor=actor,
        action=action.value,
        reason=reason,
        evidence={
            "transaction_id": txn.transaction_id,
            "amount_inr": txn.amount_inr,
            "failure_code": txn.failure_code,
            **extra_evidence,
        },
        policy_result=verdict.value,
        outcome=outcome,
    )


_VERDICT_TO_OUTCOME = {
    Verdict.BLOCKED: ActionOutcome.BLOCKED_BY_POLICY,
    Verdict.PENDING_APPROVAL: ActionOutcome.BLOCKED_BY_POLICY,
    Verdict.NON_FINANCIAL: None,  # resolved by action semantics
}

_STATUS_TO_OUTCOME = {
    ProviderStatus.RECOVERED: ActionOutcome.RECOVERED,
    ProviderStatus.FAILED: ActionOutcome.FAILED,
    ProviderStatus.ERROR: ActionOutcome.FAILED,
}


class ActionExecutor:
    def __init__(self, provider: PaymentProvider, guard: PolicyGuard | None = None):
        self.provider = provider
        self.guard = guard or PolicyGuard()

    def execute(
        self,
        items: list[tuple[Transaction, RecoveryAction]],
        actor: str = "strategy",
    ) -> ExecutionReport:
        results: list[ActionResult] = []
        audit: list[AuditEvent] = []

        for txn, action in items:
            key = f"{self.provider.name()}:{action.value}:{txn.transaction_id}"
            verdict = self.guard.check(txn, action, key)

            if verdict.verdict is not Verdict.ALLOWED:
                outcome = _VERDICT_TO_OUTCOME[verdict.verdict]
                if outcome is None:  # non-financial: STOP/ESCALATE semantics
                    outcome = (ActionOutcome.STOPPED
                               if action is RecoveryAction.STOP
                               else ActionOutcome.ESCALATED)
                results.append(ActionResult(
                    transaction_id=txn.transaction_id, action=action,
                    policy_rule=verdict.rule, policy_verdict=verdict.verdict.value,
                    outcome=outcome, reason=verdict.reason))
                audit.append(_audit(actor, txn, action, verdict.reason,
                                    verdict.verdict, outcome, {}))
                continue

            # permitted → execute once; failures are terminal for this run
            response = self.provider.execute(
                ProviderRequest(idempotency_key=key, action=action,  # type: ignore[arg-type]
                                transaction=txn))
            self.guard.register_execution(key)
            outcome = _STATUS_TO_OUTCOME.get(response.status, ActionOutcome.FAILED)
            results.append(ActionResult(
                transaction_id=txn.transaction_id, action=action,
                policy_rule="pass", policy_verdict="allowed",
                outcome=outcome,
                recovered_amount_inr=response.recovered_amount_inr
                if response.status is ProviderStatus.RECOVERED else 0.0,
                reason=response.reason or response.status.value))
            audit.append(_audit(actor, txn, action,
                                response.reason or response.status.value,
                                verdict.verdict, outcome,
                                {"provider_reference": response.provider_reference}))

        return ExecutionReport(results=results, audit_trail=audit)
