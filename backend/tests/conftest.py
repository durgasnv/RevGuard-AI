"""Shared fixtures for all test phases."""

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture()
def client():
    return TestClient(app)


@pytest.fixture()
def seeded(client):
    client.post("/reset")
    client.post("/ingest/synthetic?n_total=300")
    return client
