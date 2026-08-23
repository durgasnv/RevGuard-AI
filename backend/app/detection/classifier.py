"""Failure classification (FR-04). Maps raw failure codes to categories."""

from __future__ import annotations

from app.core.policy import MAX_AUTO_RETRIES_PER_TXN
from app.schemas.transactions import FailureCategory, Transaction

FAILURE_CODE_CATEGORY: dict[str, FailureCategory] = {
    # transient
    "NETWORK_ERROR": FailureCategory.TRANSIENT,
    "GATEWAY_TIMEOUT": FailureCategory.TRANSIENT,
    "ISSUER_BUSY": FailureCategory.TRANSIENT,
    "SYSTEM_ERROR": FailureCategory.TRANSIENT,
    # customer-related
    "INSUFFICIENT_FUNDS": FailureCategory.CUSTOMER_RELATED,
    "AUTHENTICATION_FAILED": FailureCategory.CUSTOMER_RELATED,
    "CUSTOMER_ABORTED": FailureCategory.CUSTOMER_RELATED,
    # payment-method-related
    "CARD_EXPIRED": FailureCategory.PAYMENT_METHOD_RELATED,
    "INVALID_CARD_DETAILS": FailureCategory.PAYMENT_METHOD_RELATED,
    "UPI_COLLECT_DECLINED": FailureCategory.PAYMENT_METHOD_RELATED,
    "BANK_UNAVAILABLE": FailureCategory.PAYMENT_METHOD_RELATED,
    # risk-related
    "FRAUD_SUSPECTED": FailureCategory.RISK_RELATED,
    "RISK_BLOCKED": FailureCategory.RISK_RELATED,
    "CARD_BLOCKED": FailureCategory.RISK_RELATED,
    # business/integration
    "INVALID_REQUEST": FailureCategory.BUSINESS_INTEGRATION,
    "CONFIG_ERROR": FailureCategory.BUSINESS_INTEGRATION,
    "MERCHANT_ONBOARDING": FailureCategory.BUSINESS_INTEGRATION,
}

# Codes where repeated attempts indicate retry exhaustion rather than the
# nominal category.
EXHAUSTIBLE_CODES = {"GATEWAY_TIMEOUT", "NETWORK_ERROR", "ISSUER_BUSY",
                     "SYSTEM_ERROR", "INSUFFICIENT_FUNDS"}


def classify(txn: Transaction) -> FailureCategory | None:
    """Classify one failed transaction. Never reclassifies risk/business."""
    if txn.status.value != "failed" or not txn.failure_code:
        return None

    category = FAILURE_CODE_CATEGORY.get(txn.failure_code)
    if category in (FailureCategory.RISK_RELATED,
                    FailureCategory.BUSINESS_INTEGRATION):
        return category

    if (txn.retry_count >= MAX_AUTO_RETRIES_PER_TXN
            and txn.failure_code in EXHAUSTIBLE_CODES):
        return FailureCategory.RETRY_EXHAUSTED

    return category or FailureCategory.BUSINESS_INTEGRATION
