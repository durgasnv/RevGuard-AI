"""Authentication models and schemas for RevGuard-AI."""

from __future__ import annotations

from enum import Enum
from typing import Optional
from pydantic import BaseModel, EmailStr, Field


class UserRole(str, Enum):
    CFO = "cfo"
    FINANCE_LEAD = "finance_lead"
    RISK_OFFICER = "risk_officer"
    MERCHANT_ADMIN = "merchant_admin"


class User(BaseModel):
    id: str
    name: str
    email: str
    role: UserRole = UserRole.FINANCE_LEAD
    avatar_url: Optional[str] = None
    company: str = "Razorpay Merchant Partner"
    permissions: list[str] = Field(
        default_factory=lambda: ["view_dashboard", "run_recovery", "approve_escalations", "voice_bot", "b2b_manage"]
    )


class LoginRequest(BaseModel):
    email: str
    persona: Optional[str] = None


class GoogleAuthRequest(BaseModel):
    credential: Optional[str] = None  # Google ID token (JWT)
    client_id: Optional[str] = None
    email: Optional[str] = None
    name: Optional[str] = None
    avatar_url: Optional[str] = None


class AuthResponse(BaseModel):
    token: str
    token_type: str = "bearer"
    user: User
