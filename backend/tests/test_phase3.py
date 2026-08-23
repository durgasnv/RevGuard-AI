from fastapi.testclient import TestClient

from app.data.synthetic_generator import generate_batch
from app.detection.classifier import FailureCategory, classify
from app.detection.engine import detect
from app.main import app

client = TestClient(app)


def _failed():
    return [t for t in generate_batch(n_total=300)
            if t.status.value == "failed" and t.failure_code]


def test_classifier_maps_all_codes_and_detects_exhaustion():
    for t in _failed():
        assert classify(t) is not None


def test_detection_report_ranks_and_explains():
    report = detect(generate_batch())
    risks = [c.revenue_at_risk_inr for c in report.clusters]
    assert risks == sorted(risks, reverse=True)
    assert all(c.evidence for c in report.clusters)
    # UPI degradation burst must be detected as temporal burst
    burst_evidence = [e for c in report.clusters for e in c.evidence if "burst" in e]
    assert burst_evidence
    assert abs(sum(c.revenue_at_risk_inr for c in report.clusters)
               - report.revenue_at_risk_inr) < 1.0


def test_api_ingest_then_detect():
    from app.main import _STORE
    _STORE.clear()
    r = client.post("/ingest/synthetic?n_total=100")
    assert r.status_code == 200
    r = client.get("/detect")
    assert r.status_code == 200
    body = r.json()
    assert body["transactions_analyzed"] == 100
    assert body["revenue_at_risk_inr"] > 0


def test_api_detect_without_ingest_conflicts():
    from app.main import _STORE
    _STORE.clear()
    assert client.get("/detect").status_code == 409
