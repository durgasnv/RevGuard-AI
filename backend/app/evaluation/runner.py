"""Execute an action plan through a provider, capturing outcomes + audit."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from app.integrations.base import PaymentProvider, ProviderRequest, ProviderResponse
from app.schemas.transactions import (
    ActionOutcome,
    AuditEvent,
    RecoveryAction,
    Transaction,
)


def _audit(
    actor: str, txn: Transaction, action: RecoveryAction | str,
    reason: str, policy_result: str, outcome: ActionOutcome | None,
    evidence: dict,
) -> AuditEvent:
    return AuditEvent(
        event_id=f"aud_{uuid.uuid4().hex[:10]}",
        timestamp=datetime.now(timezone.utc),
        actor=actor,
        action=str(getattr(action, "value", action)),
        reason=reason,
        evidence=evidence,
        policy_result=policy_result,
        outcome=outcome,
    )


def _map_status(response: ProviderResponse) -> ActionOutcome:
    from app.integrations.base import ProviderStatus

    mapping = {
        ProviderStatus.RECOVERED: ActionOutcome.RECOVERED,
        ProviderStatus.FAILED: ActionOutcome.FAILED,
        ProviderStatus.ERROR: ActionOutcome.FAILED,
        ProviderStatus.DUPLICATE: ActionOutcome.BLOCKED_BY_POLICY,
    }
    return mapping[response.status]


def run_plan(
    plan: list[tuple[Transaction, RecoveryAction]],
    provider: PaymentProvider,
    actor: str = "strategy",
) -> tuple[list[tuple[Transaction, RecoveryAction, ProviderResponse]], list[AuditEvent]]:
    """Run every planned action once; returns outcomes and the audit trail."""
    results: list[tuple[Transaction, RecoveryAction, ProviderResponse]] = []
    audit: list[AuditEvent] = []

    for txn, action in plan:
        request = ProviderRequest(
            idempotency_key=f"{provider.name()}:{action.value}:{txn.transaction_id}",
            action=action,  # type: ignore[arg-type]
            transaction=txn,
        )
        response = provider.execute(request)
        results.append((txn, action, response))
        audit.append(_audit(
            actor=actor, txn=txn, action=action,
            reason=response.reason or response.status.value,
            policy_result="blocked" if response.status.value == "duplicate" else "allowed",
            outcome=_map_status(response) if action is not RecoveryAction.STOP else ActionOutcome.STOPPED,
            evidence={
                "transaction_id": txn.transaction_id,
                "amount_inr": txn.amount_inr,
                "failure_code": txn.failure_code,
                "provider_reference": response.provider_reference,
            },
        ))

    return results, audit
