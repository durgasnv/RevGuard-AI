"""Authentication service: Token signing, verification, and Google OAuth parsing."""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import time
from typing import Optional

from app.auth.models import User, UserRole

AUTH_SECRET = os.environ.get("REVGUARD_AUTH_SECRET", "revguard_jwt_super_secret_signing_key_2026")

DEMO_PERSONAS: dict[str, User] = {
    "cfo": User(
        id="usr_cfo_01",
        name="Priya Sharma",
        email="priya.sharma@merchant.io",
        role=UserRole.CFO,
        avatar_url="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
        company="Razorpay Enterprise Merchant",
        permissions=["view_dashboard", "run_recovery", "approve_escalations", "voice_bot", "b2b_manage", "cfo_signoff", "export_cert"],
    ),
    "finance_lead": User(
        id="usr_fin_02",
        name="Rahul Verma",
        email="rahul.verma@merchant.io",
        role=UserRole.FINANCE_LEAD,
        avatar_url="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
        company="Razorpay Enterprise Merchant",
        permissions=["view_dashboard", "run_recovery", "approve_escalations", "voice_bot", "b2b_manage"],
    ),
    "risk_officer": User(
        id="usr_risk_03",
        name="Ananya Iyer",
        email="ananya.iyer@merchant.io",
        role=UserRole.RISK_OFFICER,
        avatar_url="https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80",
        company="Razorpay Enterprise Merchant",
        permissions=["view_dashboard", "policy_audit", "fraud_isolation", "compliance_review"],
    ),
}


def _b64encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("utf-8").rstrip("=")


def _b64decode(s: str) -> bytes:
    padding = 4 - (len(s) % 4)
    if padding != 4:
        s += "=" * padding
    return base64.urlsafe_b64decode(s.encode("utf-8"))


def create_token(user: User, expires_in_seconds: int = 86400 * 7) -> str:
    """Generate a signed cryptographic JWT session token."""
    header = {"alg": "HS256", "typ": "JWT"}
    payload = {
        "sub": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role.value,
        "avatar_url": user.avatar_url,
        "company": user.company,
        "permissions": user.permissions,
        "iat": int(time.time()),
        "exp": int(time.time()) + expires_in_seconds,
    }

    header_b64 = _b64encode(json.dumps(header).encode("utf-8"))
    payload_b64 = _b64encode(json.dumps(payload).encode("utf-8"))
    signature = hmac.new(
        AUTH_SECRET.encode("utf-8"),
        f"{header_b64}.{payload_b64}".encode("utf-8"),
        hashlib.sha256,
    ).digest()
    sig_b64 = _b64encode(signature)

    return f"{header_b64}.{payload_b64}.{sig_b64}"


def verify_token(token: str) -> Optional[User]:
    """Verify signed JWT token and return authenticated User object."""
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None

        header_b64, payload_b64, sig_b64 = parts
        expected_sig = hmac.new(
            AUTH_SECRET.encode("utf-8"),
            f"{header_b64}.{payload_b64}".encode("utf-8"),
            hashlib.sha256,
        ).digest()

        if not hmac.compare_digest(_b64encode(expected_sig), sig_b64):
            return None

        payload = json.loads(_b64decode(payload_b64).decode("utf-8"))
        if payload.get("exp", 0) < time.time():
            return None

        return User(
            id=payload["sub"],
            name=payload.get("name", "Merchant User"),
            email=payload.get("email", "merchant@razorpay.io"),
            role=UserRole(payload.get("role", "finance_lead")),
            avatar_url=payload.get("avatar_url"),
            company=payload.get("company", "Razorpay Merchant Partner"),
            permissions=payload.get("permissions", []),
        )
    except Exception:
        return None


def parse_google_credential(credential: str) -> Optional[dict]:
    """Safely decode unverified Google JWT token payload."""
    try:
        parts = credential.split(".")
        if len(parts) >= 2:
            payload = json.loads(_b64decode(parts[1]).decode("utf-8"))
            return payload
    except Exception:
        pass
    return None
