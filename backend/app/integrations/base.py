"""Provider-agnostic payment integration interface (FR-11).

All downstream code depends on this interface only, so the simulator and the
Razorpay test-mode client are interchangeable.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from enum import Enum

from pydantic import BaseModel, Field

from app.schemas.transactions import Transaction


class ProviderAction(str, Enum):
    RETRY_PAYMENT = "RETRY_PAYMENT"
    SEND_PAYMENT_LINK = "SEND_PAYMENT_LINK"
    NOTIFY_CUSTOMER = "NOTIFY_CUSTOMER"


class ProviderStatus(str, Enum):
    RECOVERED = "recovered"
    FAILED = "failed"
    ERROR = "error"
    DUPLICATE = "duplicate"


class ProviderRequest(BaseModel):
    idempotency_key: str
    action: ProviderAction
    transaction: Transaction


class ProviderResponse(BaseModel):
    idempotency_key: str
    status: ProviderStatus
    recovered_amount_inr: float = 0.0
    provider_reference: str | None = None
    reason: str = ""
    raw: dict = Field(default_factory=dict)


class PaymentProvider(ABC):
    """Contract implemented by the simulator and the Razorpay test client."""

    @abstractmethod
    def execute(self, request: ProviderRequest) -> ProviderResponse: ...

    @abstractmethod
    def name(self) -> str: ...
