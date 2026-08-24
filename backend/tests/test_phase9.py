"""End-to-end API flow tests (Phase 9): every stage connected + audited."""

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


def test_full_pipeline_flow(seeded):
    r = seeded.get("/detect")
    assert r.status_code == 200
    clusters = len(r.json()["clusters"])

    r = seeded.get("/diagnose?top_n=5")
    assert r.status_code == 200 and r.json()["diagnoses"]

    r = seeded.post("/run")
    assert r.status_code == 200
    body = r.json()
    assert body["plan"]["queued"] > 0
    assert body["execution"]["recovered_inr"] > 0

    r = seeded.get("/state")
    assert r.json()["plan"] is not None

    # audit must span all stages, not just execution
    r = seeded.get("/audit")
    actors = {e["actor"] for e in r.json()["events"]}
    assert {"system", "risk_engine", "diagnosis_agent",
            "strategy_engine", "strategy_api"} <= actors


def test_diagnosis_strategy_cross_check_in_reasons(seeded):
    seeded.get("/detect")
    seeded.post("/run")
    plan = seeded.get("/state").json()["plan"]
    reasons = " ".join(d["reason"] for d in plan["queue"])
    assert ("concurs" in reasons) or ("diverges" in reasons)


def test_duplicate_actions_prevented_on_second_run(seeded):
    first = seeded.post("/run").json()
    queued = first["plan"]["queued"]
    assert queued > 0

    second = seeded.post("/run").json()
    blocked = second["execution"]["outcome_counts"].get("blocked_by_policy", 0)
    assert blocked == second["plan"]["queued"]
    assert second["execution"].get("recovered_inr", 0) == 0  # nothing re-executed


def test_escalation_execution_path_does_not_crash(seeded):
    r = seeded.post("/run?execute_escalations=true")
    assert r.status_code == 200
    outcomes = r.json()["execution"]["outcome_counts"]
    assert outcomes.get("escalated", 0) > 0  # non-financial escalations recorded


def test_evaluate_after_run_reports_comparison(seeded):
    seeded.post("/run")
    r = seeded.post("/evaluate")
    assert r.status_code == 200
    body = r.json()
    assert body["uplift"]["extra_recovered_inr"] >= 0
    assert any(e["failure_code"] == "FRAUD_SUSPECTED" for e in body["exceptions"])

    # evaluation itself is audited
    events = seeded.get("/audit").json()["events"]
    assert any(e["actor"] == "evaluation_engine" for e in events)


def test_detect_before_ingest_conflicts(client):
    client.post("/reset")
    for path in ("/detect", "/diagnose"):
        assert client.get(path).status_code == 409
    for path in ("/run", "/evaluate"):
        assert client.post(path).status_code == 409


def test_reset_clears_everything(seeded):
    seeded.post("/run")
    r = seeded.post("/reset")
    assert r.status_code == 200
    assert seeded.get("/health").json()["transactions_in_store"] == 0
    assert seeded.get("/audit").json()["count"] == 0
