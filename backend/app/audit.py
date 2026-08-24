"""Central audit log spanning every pipeline stage (FR-16).

Execution already writes its own trail; this log additionally captures
ingestion, detection, diagnosis and planning events so the full decision
history of a run is queryable from one place.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from app.schemas.transactions import ActionOutcome, AuditEvent


class AuditLog:
    def __init__(self) -> None:
        self._events: list[AuditEvent] = []

    def record(
        self,
        actor: str,
        action: str,
        reason: str,
        evidence: dict | None = None,
        policy_result: str = "allowed",
        outcome: ActionOutcome | str | None = None,
    ) -> AuditEvent:
        event = AuditEvent(
            event_id=f"aud_{uuid.uuid4().hex[:10]}",
            timestamp=datetime.now(timezone.utc),
            actor=actor,
            action=action,
            reason=reason,
            evidence=evidence or {},
            policy_result=policy_result,
            outcome=(
                ActionOutcome(outcome)
                if isinstance(outcome, str) else outcome
            ),
        )
        self._events.append(event)
        return event

    def extend(self, events: list[AuditEvent]) -> None:
        self._events.extend(events)

    def dump(self) -> list[AuditEvent]:
        return list(self._events)

    @property
    def count(self) -> int:
        return len(self._events)

    def clear(self) -> None:
        self._events.clear()
