"""Recovery policy constants. Single source of truth — deterministic, LLM-independent."""

MAX_AUTO_RETRIES_PER_TXN = 2
HIGH_VALUE_THRESHOLD_INR = 25_000.0
MAX_ACTIONS_PER_DAY = 500

INTERVENTION_COST_FLAT_INR = 5.0
FRICTION_COST_INR = {
    "RETRY_PAYMENT": 0.0,
    "SEND_PAYMENT_LINK": 2.0,
    "NOTIFY_CUSTOMER": 5.0,
}

# Failure codes that may never be retried automatically.
HARD_NON_RETRYABLE_CODES = {
    "FRAUD_SUSPECTED",
    "RISK_BLOCKED",
    "CARD_BLOCKED",
    "INVALID_REQUEST",
    "CONFIG_ERROR",
    "MERCHANT_ONBOARDING",
    "AUTHENTICATION_FAILED",
    "CARD_EXPIRED",
    "INVALID_CARD_DETAILS",
    # biometric — customer must re-authenticate manually
    "FACE_MATCH_FAILED",
    "FINGERPRINT_FAILED",
    "PIN_BLOCKED",
    # account restrictions — regulatory/compliance issue
    "ACCOUNT_FROZEN",
    "DEMAT_BLOCKED",
    "TRADING_SUSPENDED",
    "COMPLIANCE_HOLD",
}

RETRYABLE_CATEGORIES = {
    "transient", "customer_related", "payment_method_related",
    "device_hardware", "3ds_authentication",
}
