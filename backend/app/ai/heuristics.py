"""Deterministic heuristic diagnoser.

Serves two roles:
1. Default diagnoser when no LLM is configured.
2. Mandatory fallback when LLM output is invalid/unavailable (AI-06).

Rules encode the Phase 0 recovery policy; confidence scales with evidence
strength (volume, burst, method concentration). Never reads ground truth.
"""

from __future__ import annotations

import math

from app.ai.schemas import ClusterContext, Diagnosis, DiagnosisSource
from app.schemas.transactions import FailureCategory, RecoveryAction


def _evidence_confidence(ctx: ClusterContext) -> float:
    """Volume/burst-driven confidence multiplier in [0.85, 1.15]."""
    volume = 1.0 + 0.05 * min(math.log10(max(ctx.txn_count, 1)), 3)
    burst = 1.1 if ctx.burst_detected else 1.0
    concentration = (
        1.05 if ctx.payment_method_share
        and max(ctx.payment_method_share.values()) >= 0.9 else 1.0
    )
    return volume * burst * concentration


def _clamp(v: float) -> float:
    return round(max(0.30, min(0.95, v)), 3)


def heuristic_diagnose(ctx: ClusterContext) -> Diagnosis:
    category = FailureCategory(ctx.failure_category)
    code = ctx.failure_codes[0] if ctx.failure_codes else "UNKNOWN"
    ev = _evidence_confidence(ctx)
    factors: list[str] = [f"failure code {code}", f"{ctx.txn_count} affected transactions"]

    if category == FailureCategory.RISK_RELATED:
        return Diagnosis(
            cluster_id=ctx.cluster_id,
            root_cause=(f"Risk/fraud controls are blocking card payments "
                        f"(₹{ctx.revenue_at_risk_inr:,.0f} exposure; "
                        f"{ctx.high_value_count} high-value transactions). "
                        f"Automated retry is prohibited by policy."),
            contributing_factors=factors + ["policy-mandated human review"],
            recommended_action=RecoveryAction.ESCALATE_HUMAN,
            confidence=_clamp(0.90 * ev),
            requires_human=True,
            evidence_refs=ctx.sample_failure_evidence,
            source=DiagnosisSource.HEURISTIC_FALLBACK,
        )

    if category == FailureCategory.BUSINESS_INTEGRATION:
        return Diagnosis(
            cluster_id=ctx.cluster_id,
            root_cause=("Integration or configuration defect on the merchant side; "
                        "payment actions cannot fix a request-construction problem."),
            contributing_factors=factors + ["non-payment failure surface"],
            recommended_action=RecoveryAction.ESCALATE_HUMAN,
            confidence=_clamp(0.85),
            requires_human=True,
            evidence_refs=ctx.sample_failure_evidence,
            source=DiagnosisSource.HEURISTIC_FALLBACK,
        )

    if category == FailureCategory.ACCOUNT_RESTRICTION:
        return Diagnosis(
            cluster_id=ctx.cluster_id,
            root_cause=(f"Account-level restriction (code {code}) blocking transactions; "
                        "regulatory/compliance issue that no automated payment action "
                        "can resolve."),
            contributing_factors=factors + ["account-level block", "compliance review needed"],
            recommended_action=RecoveryAction.ESCALATE_HUMAN,
            confidence=_clamp(0.90),
            requires_human=True,
            evidence_refs=ctx.sample_failure_evidence,
            source=DiagnosisSource.HEURISTIC_FALLBACK,
        )

    if category == FailureCategory.BIOMETRIC_FAILURE:
        return Diagnosis(
            cluster_id=ctx.cluster_id,
            root_cause=(f"Biometric authentication step failed ({code}); "
                        "customer must re-authenticate using an alternative method "
                        "(fingerprint, OTP, or PIN)."),
            contributing_factors=factors + ["biometric auth required", "alternative method available"],
            recommended_action=RecoveryAction.NOTIFY_CUSTOMER,
            confidence=_clamp(0.70 * ev),
            requires_human=False,
            evidence_refs=ctx.sample_failure_evidence,
            source=DiagnosisSource.HEURISTIC_FALLBACK,
        )

    if category == FailureCategory.DEVICE_HARDWARE:
        return Diagnosis(
            cluster_id=ctx.cluster_id,
            root_cause=(f"Terminal/device hardware error ({code}); payment instrument "
                        "is valid but the reader failed. Retry on a different terminal "
                        "or route via QR code."),
            contributing_factors=factors + ["terminal-side issue", "instrument valid"],
            recommended_action=RecoveryAction.RETRY_PAYMENT,
            confidence=_clamp(0.60 * ev),
            requires_human=False,
            evidence_refs=ctx.sample_failure_evidence,
            source=DiagnosisSource.HEURISTIC_FALLBACK,
        )

    if category == FailureCategory.THREE_DS_AUTHENTICATION:
        return Diagnosis(
            cluster_id=ctx.cluster_id,
            root_cause=(f"3D Secure authentication failed ({code}); customer's bank "
                        "ACS was unavailable or the customer cancelled the 3DS prompt. "
                        "Retry after a short delay or send a payment link."),
            contributing_factors=factors + ["3DS step failure", "bank ACS dependent"],
            recommended_action=RecoveryAction.RETRY_PAYMENT,
            confidence=_clamp(0.55 * ev),
            requires_human=False,
            evidence_refs=ctx.sample_failure_evidence,
            source=DiagnosisSource.HEURISTIC_FALLBACK,
        )

    if category == FailureCategory.RETRY_EXHAUSTED:
        return Diagnosis(
            cluster_id=ctx.cluster_id,
            root_cause=(f"Automatic retry path exhausted (avg retries="
                        f"{ctx.avg_retry_count}); further auto-retries would be "
                        f"duplicates. Customer-initiated payment link bypasses "
                        f"the exhausted subscription mandate."),
            contributing_factors=factors + ["subscription mandates involved"],
            recommended_action=RecoveryAction.SEND_PAYMENT_LINK,
            confidence=_clamp(0.65 * ev),
            requires_human=False,
            evidence_refs=ctx.sample_failure_evidence,
            source=DiagnosisSource.HEURISTIC_FALLBACK,
        )

    if category == FailureCategory.TRANSIENT:
        if ctx.burst_detected:
            cause = (f"Gateway/network degradation window of ~{ctx.window_hours}h "
                     f"affecting {'/'.join(list(ctx.payment_method_share)[:2])}; "
                     f"failures clustered in time indicate an upstream outage, "
                     f"not customer issues.")
            action = RecoveryAction.RETRY_PAYMENT
            base = 0.80
        else:
            cause = ("Sporadic gateway/issuer timeouts with no temporal pattern; "
                     "single delayed retry is low-friction and historically effective.")
            action = RecoveryAction.RETRY_PAYMENT
            base = 0.60
        return Diagnosis(
            cluster_id=ctx.cluster_id,
            root_cause=cause,
            contributing_factors=factors + ["retryable category per policy"],
            recommended_action=action,
            confidence=_clamp(base * ev),
            requires_human=False,
            evidence_refs=ctx.sample_failure_evidence,
            source=DiagnosisSource.HEURISTIC_FALLBACK,
        )

    if category == FailureCategory.CUSTOMER_RELATED:
        if code == "INSUFFICIENT_FUNDS":
            return Diagnosis(
                cluster_id=ctx.cluster_id,
                root_cause=("Customer cash-flow timing issue rather than payment "
                            "method failure; immediate retry wastes attempts while "
                            "a payment link lets the customer pay when funded."),
                contributing_factors=factors + ["salary-cycle timing common for this code"],
                recommended_action=RecoveryAction.SEND_PAYMENT_LINK,
                confidence=_clamp(0.60 * ev),
                requires_human=False,
                evidence_refs=ctx.sample_failure_evidence,
                source=DiagnosisSource.HEURISTIC_FALLBACK,
            )
        # repeated auth failures / aborted checkouts
        return Diagnosis(
            cluster_id=ctx.cluster_id,
            root_cause=("Repeated authentication failures suggest a customer-side "
                        "blocker (OTP delivery, credentials, or abandoned attempt); "
                        "automated retries historically fail here and add friction."),
            contributing_factors=factors + ["same-customer repeat pattern"],
            recommended_action=RecoveryAction.NOTIFY_CUSTOMER,
            confidence=_clamp(0.55 * ev),
            requires_human=False,
            evidence_refs=ctx.sample_failure_evidence,
            source=DiagnosisSource.HEURISTIC_FALLBACK,
        )

    # PAYMENT_METHOD_RELATED
    if code == "CARD_EXPIRED":
        return Diagnosis(
            cluster_id=ctx.cluster_id,
            root_cause="Saved instruments have expired; only the customer can update details.",
            contributing_factors=factors + ["instrument lifecycle"],
            recommended_action=RecoveryAction.NOTIFY_CUSTOMER,
            confidence=_clamp(0.70),
            requires_human=False,
            evidence_refs=ctx.sample_failure_evidence,
            source=DiagnosisSource.HEURISTIC_FALLBACK,
        )
    if code == "BANK_UNAVAILABLE":
        return Diagnosis(
            cluster_id=ctx.cluster_id,
            root_cause="Issuer bank outage on a specific method; retry after the outage window.",
            contributing_factors=factors + ["issuer-side availability"],
            recommended_action=RecoveryAction.RETRY_PAYMENT,
            confidence=_clamp(0.60 * ev),
            requires_human=False,
            evidence_refs=ctx.sample_failure_evidence,
            source=DiagnosisSource.HEURISTIC_FALLBACK,
        )
    return Diagnosis(
        cluster_id=ctx.cluster_id,
        root_cause=("Collect/approval request not completed by customer on this method; "
                    "an alternate-method payment link reduces dependency on the "
                    "failing rail."),
        contributing_factors=factors,
        recommended_action=RecoveryAction.SEND_PAYMENT_LINK,
        confidence=_clamp(0.55 * ev),
        requires_human=False,
        evidence_refs=ctx.sample_failure_evidence,
        source=DiagnosisSource.HEURISTIC_FALLBACK,
    )
