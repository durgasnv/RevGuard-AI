"""Razorpay test-mode client (Phase 0 checklist §9).

Implements the same interface as the simulator. Requires test-mode keys via
env vars; without keys it degrades loudly so local dev falls back to the
simulator (NFR-05). No real-money paths exist in this client.
"""

from __future__ import annotations

import os

import httpx

from app.integrations.base import (
    PaymentProvider,
    ProviderAction,
    ProviderRequest,
    ProviderResponse,
    ProviderStatus,
)

BASE_URL = "https://api.razorpay.com/v1"
TIMEOUT_S = 10.0


class RazorpayTestClient(PaymentProvider):
    def __init__(self, key_id: str | None = None, key_secret: str | None = None):
        self._key_id = key_id or os.getenv("RAZORPAY_KEY_ID", "")
        self._key_secret = key_secret or os.getenv("RAZORPAY_KEY_SECRET", "")
        if not (self._key_id and self._key_secret):
            raise RuntimeError(
                "RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET not set; "
                "use PaymentSimulator for local development."
            )
        self._http = httpx.Client(
            auth=(self._key_id, self._key_secret), timeout=TIMEOUT_S
        )

    def name(self) -> str:
        return "razorpay_test"

    def execute(self, request: ProviderRequest) -> ProviderResponse:
        try:
            if request.action is ProviderAction.RETRY_PAYMENT:
                return self._retry(request)
            return self._payment_link(request)
        except httpx.HTTPError as exc:  # NFR-03: API failures must not crash flow
            return ProviderResponse(
                idempotency_key=request.idempotency_key,
                status=ProviderStatus.ERROR,
                reason=f"razorpay_unreachable: {exc}",
                raw={"provider": "razorpay_test"},
            )

    def _retry(self, request: ProviderRequest) -> ProviderResponse:
        txn = request.transaction
        resp = self._http.post(
            "/orders",
            json={
                "amount": int(txn.amount_inr * 100),
                "currency": txn.currency,
                "receipt": request.idempotency_key,
                "notes": {"source_txn": txn.transaction_id},
            },
        )
        resp.raise_for_status()
        order = resp.json()
        # Capturing the retry outcome happens through webhooks; until wired,
        # report the bounded action as accepted-not-recovered.
        return ProviderResponse(
            idempotency_key=request.idempotency_key,
            status=ProviderStatus.FAILED,
            reason="retry_order_created_awaiting_webhook",
            provider_reference=order.get("id"),
            raw=order,
        )

    def _payment_link(self, request: ProviderRequest) -> ProviderResponse:
        txn = request.transaction
        resp = self._http.post(
            "/payment_links",
            json={
                "amount": int(txn.amount_inr * 100),
                "currency": txn.currency,
                "reference_id": request.idempotency_key,
                "description": f"Recovery link for {txn.transaction_id}",
            },
        )
        resp.raise_for_status()
        link = resp.json()
        return ProviderResponse(
            idempotency_key=request.idempotency_key,
            status=ProviderStatus.FAILED,
            reason="payment_link_created_awaiting_webhook",
            provider_reference=link.get("id"),
            raw=link,
        )
