"""Tests for authentication router, JWT tokens, and persona management."""

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_get_demo_personas():
    res = client.get("/auth/demo-personas")
    assert res.status_code == 200
    data = res.json()
    assert "personas" in data
    assert len(data["personas"]) >= 3
    keys = [p["key"] for p in data["personas"]]
    assert "cfo" in keys
    assert "finance_lead" in keys
    assert "risk_officer" in keys


def test_login_with_persona():
    res = client.post("/auth/login", json={"email": "", "persona": "cfo"})
    assert res.status_code == 200
    data = res.json()
    assert "token" in data
    assert data["user"]["name"] == "Priya Sharma"
    assert data["user"]["role"] == "cfo"


def test_login_with_email():
    res = client.post("/auth/login", json={"email": "sarah.connor@cyberdyne.io"})
    assert res.status_code == 200
    data = res.json()
    assert "token" in data
    assert data["user"]["email"] == "sarah.connor@cyberdyne.io"
    assert data["user"]["role"] == "finance_lead"


def test_google_auth():
    payload = {
        "email": "alex.turner@arctic-merchants.com",
        "name": "Alex Turner",
        "avatar_url": "https://example.com/alex.jpg",
    }
    res = client.post("/auth/google", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "token" in data
    assert data["user"]["email"] == "alex.turner@arctic-merchants.com"
    assert data["user"]["name"] == "Alex Turner"


def test_get_me_with_valid_token():
    # 1. Login to get token
    login_res = client.post("/auth/login", json={"email": "", "persona": "risk_officer"})
    token = login_res.json()["token"]

    # 2. Call /auth/me with Bearer token
    me_res = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    user_data = me_res.json()
    assert user_data["name"] == "Ananya Iyer"
    assert user_data["role"] == "risk_officer"


def test_get_me_with_invalid_token():
    res = client.get("/auth/me", headers={"Authorization": "Bearer invalid.fake.token"})
    assert res.status_code == 401


def test_logout():
    res = client.post("/auth/logout")
    assert res.status_code == 200
    assert res.json()["status"] == "logged_out"
