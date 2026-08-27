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
    # biometric failures
    "FACE_MATCH_FAILED": FailureCategory.BIOMETRIC_FAILURE,
    "FINGERPRINT_FAILED": FailureCategory.BIOMETRIC_FAILURE,
    "OTP_EXPIRED": FailureCategory.BIOMETRIC_FAILURE,
    "PIN_BLOCKED": FailureCategory.BIOMETRIC_FAILURE,
    "BIOMETRIC_TIMEOUT": FailureCategory.BIOMETRIC_FAILURE,
    # device/hardware errors
    "CARD_READ_ERROR": FailureCategory.DEVICE_HARDWARE,
    "CHIP_READ_FAILED": FailureCategory.DEVICE_HARDWARE,
    "SWIPE_ERROR": FailureCategory.DEVICE_HARDWARE,
    "NFC_FAILED": FailureCategory.DEVICE_HARDWARE,
    "PRINTER_LOW": FailureCategory.DEVICE_HARDWARE,
    # account restrictions
    "ACCOUNT_FROZEN": FailureCategory.ACCOUNT_RESTRICTION,
    "DEMAT_BLOCKED": FailureCategory.ACCOUNT_RESTRICTION,
    "TRADING_SUSPENDED": FailureCategory.ACCOUNT_RESTRICTION,
    "KYC_PENDING": FailureCategory.ACCOUNT_RESTRICTION,
    "COMPLIANCE_HOLD": FailureCategory.ACCOUNT_RESTRICTION,
    # 3D Secure failures
    "3DS_FAILED": FailureCategory.THREE_DS_AUTHENTICATION,
    "ACS_UNAVAILABLE": FailureCategory.THREE_DS_AUTHENTICATION,
    "CARDHOLDER_CANCELLED_3DS": FailureCategory.THREE_DS_AUTHENTICATION,
    "3DS_TIMEOUT": FailureCategory.THREE_DS_AUTHENTICATION,
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
