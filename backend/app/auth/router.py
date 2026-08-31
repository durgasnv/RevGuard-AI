"""Authentication endpoints for Google OAuth, passwordless login, and demo personas."""

from __future__ import annotations

import uuid
from fastapi import APIRouter, Header, HTTPException

from app.auth.models import AuthResponse, GoogleAuthRequest, LoginRequest, User, UserRole
from app.auth.service import (
    DEMO_PERSONAS,
    create_token,
    parse_google_credential,
    verify_token,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/demo-personas")
def get_demo_personas() -> dict:
    """Return available demo personas for 1-click instant login."""
    return {
        "personas": [
            {
                "key": key,
                "name": u.name,
                "role": u.role.value,
                "email": u.email,
                "company": u.company,
                "avatar_url": u.avatar_url,
            }
            for key, u in DEMO_PERSONAS.items()
        ]
    }


@router.post("/login", response_model=AuthResponse)
def login(req: LoginRequest) -> AuthResponse:
    """Passwordless 1-click login or persona switch."""
    if req.persona and req.persona in DEMO_PERSONAS:
        user = DEMO_PERSONAS[req.persona]
    else:
        # Create or retrieve user from email
        name_part = req.email.split("@")[0].replace(".", " ").title()
        user = User(
            id=f"usr_{uuid.uuid4().hex[:8]}",
            name=name_part if name_part else "Merchant Finance User",
            email=req.email,
            role=UserRole.FINANCE_LEAD,
            avatar_url=None,
            company="Razorpay Enterprise Merchant",
        )

    token = create_token(user)
    return AuthResponse(token=token, user=user)


@router.post("/google", response_model=AuthResponse)
def google_auth(req: GoogleAuthRequest) -> AuthResponse:
    """Google OAuth2 sign-in handler."""
    email = req.email
    name = req.name
    avatar_url = req.avatar_url

    if req.credential:
        payload = parse_google_credential(req.credential)
        if payload:
            email = payload.get("email", email)
            name = payload.get("name", name)
            avatar_url = payload.get("picture", avatar_url)

    if not email:
        email = "google.user@razorpay-merchant.io"
    if not name:
        name = email.split("@")[0].title()

    user = User(
        id=f"usr_goog_{uuid.uuid4().hex[:8]}",
        name=name,
        email=email,
        role=UserRole.CFO if "cfo" in email.lower() else UserRole.FINANCE_LEAD,
        avatar_url=avatar_url,
        company="Google Authenticated Merchant",
    )

    token = create_token(user)
    return AuthResponse(token=token, user=user)


@router.get("/me", response_model=User)
def get_current_user(authorization: str | None = Header(default=None)) -> User:
    """Retrieve the currently authenticated user profile."""
    if not authorization:
        # Default fallback to active CFO persona for smooth demo experience
        return DEMO_PERSONAS["cfo"]

    token = authorization.replace("Bearer ", "").strip()
    user = verify_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired authentication token")

    return user


@router.post("/logout")
def logout() -> dict:
    """Logout endpoint."""
    return {"status": "logged_out"}
