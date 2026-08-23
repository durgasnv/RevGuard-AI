import json

from app.ai.context_builder import build_context
from app.ai.diagnosis_agent import diagnose_cluster, diagnose_report
from app.ai.llm_client import LLMUnavailable
from app.detection.engine import detect
from app.data.synthetic_generator import generate_batch


class FakeLLM:
    """Scriptable LLM double."""

    def __init__(self, payload: str):
        self.payload = payload

    def complete(self, system: str, user: str) -> str:
        return self.payload


def _setup():
    txns = generate_batch(n_total=400)
    report = detect(txns)
    return report.clusters[0], txns, report


def test_context_builder_strips_ground_truth():
    cluster, txns, _ = _setup()
    ctx = build_context(cluster, txns).model_dump()
    assert not any(k.startswith("gt_") for k in ctx)
    assert "sample_failure_evidence" in ctx and ctx["txn_count"] == cluster.txn_count


def test_heuristic_fallback_covers_every_cluster():
    _, txns, report = _setup()
    diagnoses = diagnose_report(report, txns, llm=None, top_n=100)
    assert len(diagnoses) == len(report.clusters)
    for d in diagnoses:
        assert 0.30 <= d.confidence <= 0.95
        assert d.root_cause and d.evidence_refs


def test_risk_clusters_always_escalate():
    from app.schemas.transactions import FailureCategory

    _, txns, report = _setup()
    risk = [c for c in report.clusters if c.failure_category is FailureCategory.RISK_RELATED]
    assert risk
    for c in risk:
        d, _ = diagnose_cluster(c, txns)
        assert d.recommended_action.value == "ESCALATE_HUMAN"
        assert d.requires_human


def test_garbage_llm_output_triggers_fallback():
    cluster, txns, _ = _setup()
    d, _ = diagnose_cluster(cluster, txns, llm=FakeLLM("sorry I cannot help"))
    assert d.source.value == "heuristic_fallback"


def test_valid_llm_output_is_used():
    from app.schemas.transactions import FailureCategory

    txns = generate_batch(n_total=400)
    report = detect(txns)
    cluster = next(c for c in report.clusters
                   if c.failure_category is FailureCategory.TRANSIENT)
    payload = json.dumps({
        "root_cause": "Issuer-side gateway timeouts clustered in a short window.",
        "contributing_factors": ["burst pattern", "single method concentration"],
        "recommended_action": "RETRY_PAYMENT",
        "confidence": 0.7,
        "requires_human": False,
        "evidence_refs": ["43 failures in 7h"],
    })
    d, _ = diagnose_cluster(cluster, txns, llm=FakeLLM(payload))
    assert d.source.value == "llm"
    assert 0.0 <= d.confidence <= 1.0


def test_llm_policy_violation_on_risk_cluster_is_overridden():
    from app.schemas.transactions import FailureCategory

    txns = generate_batch(n_total=400)
    report = detect(txns)
    risk = next(c for c in report.clusters
                if c.failure_category is FailureCategory.RISK_RELATED)
    bad_llm = FakeLLM(json.dumps({
        "root_cause": "Probably fine to auto-retry these blocked payments quickly.",
        "contributing_factors": [],
        "recommended_action": "RETRY_PAYMENT",
        "confidence": 0.9,
        "requires_human": False,
        "evidence_refs": [],
    }))
    d, _ = diagnose_cluster(risk, txns, llm=bad_llm)
    assert d.source.value == "heuristic_fallback"


def test_unavailable_llm_raises_cleanly():
    import os
    saved = os.environ.pop("OPENAI_API_KEY", None)
    try:
        from app.ai.llm_client import OpenAICompatClient
        try:
            OpenAICompatClient()
            raised = False
        except LLMUnavailable:
            raised = True
        assert raised
    finally:
        if saved:
            os.environ["OPENAI_API_KEY"] = saved
