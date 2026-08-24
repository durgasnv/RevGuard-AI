"""Controlled payment provider simulator.

Resolves outcomes from ground-truth action probabilities using a seeded RNG,
supports injected failures for graceful-failure demos, and rejects duplicate
idempotency keys (SC-03).
"""

from __future__ import annotations

import random
import uuid

from app.integrations.base import (
    PaymentProvider,
    ProviderAction,
    ProviderRequest,
    ProviderResponse,
    ProviderStatus,
)


class PaymentSimulator(PaymentProvider):
    def __init__(self, seed: int = 42, fair: bool = False):
        self._seed = seed
        self._rng = random.Random(seed)
        # fair mode derives draws from (seed, idempotency key) so the same
        # transaction+action resolves identically for every strategy —
        # order-independent comparisons (Phase 7 requirement).
        self._fair = fair
        # transaction ids that always fail when acted upon (failure-injection demo)
        self.injected_failure_ids: set[str] = set()
        self._seen_keys: dict[str, ProviderResponse] = {}

    def name(self) -> str:
        return "simulator"

    def inject_failure(self, transaction_id: str) -> None:
        self.injected_failure_ids.add(transaction_id)

    def execute(self, request: ProviderRequest) -> ProviderResponse:
        if request.idempotency_key in self._seen_keys:
            prev = self._seen_keys[request.idempotency_key]
            return prev.model_copy(
                update={"status": ProviderStatus.DUPLICATE,
                        "reason": "duplicate idempotency key"}
            )

        response = self._resolve(request)
        self._seen_keys[request.idempotency_key] = response
        return response

    def _resolve(self, request: ProviderRequest) -> ProviderResponse:
        txn = request.transaction

        if txn.transaction_id in self.injected_failure_ids:
            return self._respond(request, ProviderStatus.FAILED,
                                 reason="injected_provider_failure")

        prob = txn.gt_action_probabilities.get(request.action.value, 0.0)
        if prob <= 0.0:
            return self._respond(
                request, ProviderStatus.FAILED,
                reason=f"{request.action.value} not viable for {txn.failure_code}",
            )

        if self._fair:
            draw_rng = random.Random(f"{self._seed}:{request.idempotency_key}")
        else:
            draw_rng = self._rng
        if draw_rng.random() < prob:
            return self._respond(request, ProviderStatus.RECOVERED,
                                 recovered_amount_inr=txn.amount_inr)
        return self._respond(request, ProviderStatus.FAILED, reason="payment_attempt_failed")

    @staticmethod
    def _respond(request: ProviderRequest, status: ProviderStatus,
                 **kwargs) -> ProviderResponse:
        return ProviderResponse(
            idempotency_key=request.idempotency_key,
            status=status,
            provider_reference=f"sim_{uuid.uuid4().hex[:10]}",
            raw={"provider": "simulator", "action": request.action.value},
            **kwargs,
        )
