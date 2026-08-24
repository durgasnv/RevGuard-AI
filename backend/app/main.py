"""FastAPI application: ingestion + detection + diagnosis + gated execution.

Every pipeline stage writes to the central audit log (FR-16).
"""

from __future__ import annotations

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.ai.diagnosis_agent import diagnose_report
from app.ai.llm_client import llm_from_env
from app.ai.schemas import Diagnosis
from app.audit import AuditLog
from app.data.synthetic_generator import generate_batch
from app.detection.engine import DetectionReport, detect
from app.evaluation.engine import evaluate
from app.execution.executor import ActionExecutor, ExecutionReport
from app.integrations.simulator import PaymentSimulator
from app.policy.guard import PolicyGuard
from app.schemas.transactions import Transaction
from app.strategy.engine import build_plan
from app.strategy.schemas import StrategyPlan

app = FastAPI(title="Revenue Recovery Control Tower", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_STORE: list[Transaction] = []
_LAST_REPORT: DetectionReport | None = None
_LAST_PLAN: StrategyPlan | None = None
_LAST_EXECUTION: ExecutionReport | None = None
_GUARD = PolicyGuard()
_EXECUTOR = ActionExecutor(provider=PaymentSimulator(seed=42), guard=_GUARD)
AUDIT_LOG = AuditLog()


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "transactions_in_store": len(_STORE)}


@app.post("/reset")
def reset() -> dict:
    """Clear demo state (store, plan, execution, guard, audit) for a fresh run."""
    global _STORE, _LAST_REPORT, _LAST_PLAN, _LAST_EXECUTION
    _STORE = []
    _LAST_REPORT = None
    _LAST_PLAN = None
    _LAST_EXECUTION = None
    globals()["_GUARD"] = PolicyGuard()
    globals()["_EXECUTOR"] = ActionExecutor(
        provider=PaymentSimulator(seed=42), guard=globals()["_GUARD"])
    AUDIT_LOG.clear()
    return {"status": "reset"}


@app.post("/ingest")
def ingest(transactions: list[Transaction]) -> dict:
    """Ingest a normalized batch (FR-01/FR-02)."""
    _STORE.extend(transactions)
    AUDIT_LOG.record(
        actor="system", action="ingest_batch",
        reason=f"ingested {len(transactions)} normalized transactions",
        evidence={"batch_size": len(transactions), "store_total": len(_STORE)},
    )
    return {"ingested": len(transactions), "store_total": len(_STORE)}


@app.post("/ingest/synthetic")
def ingest_synthetic(n_total: int = 600, seed: int = 42) -> dict:
    batch = generate_batch(n_total=n_total, seed=seed)
    _STORE.extend(batch)
    AUDIT_LOG.record(
        actor="system", action="ingest_synthetic_batch",
        reason=f"generated {len(batch)} synthetic transactions",
        evidence={"batch_size": len(batch), "seed": seed,
                  "store_total": len(_STORE)},
    )
    return {"ingested": len(batch), "store_total": len(_STORE)}


@app.get("/transactions")
def transactions(status: str | None = None) -> list[Transaction]:
    if status:
        return [t for t in _STORE if t.status.value == status]
    return _STORE


@app.get("/detect", response_model=DetectionReport)
def run_detection() -> DetectionReport:
    global _LAST_REPORT
    if not _STORE:
        raise HTTPException(status_code=409,
                            detail="no transactions ingested yet; call /ingest first")
    _LAST_REPORT = detect(_STORE)
    AUDIT_LOG.record(
        actor="risk_engine", action="detection_report",
        reason=f"{_LAST_REPORT.failed_count} failures clustered into "
               f"{len(_LAST_REPORT.clusters)} leakage groups",
        evidence={
            "report_id": _LAST_REPORT.report_id,
            "revenue_at_risk_inr": _LAST_REPORT.revenue_at_risk_inr,
            "expected_recoverable_inr": _LAST_REPORT.expected_recoverable_inr,
            "clusters": len(_LAST_REPORT.clusters),
        },
    )
    return _LAST_REPORT


@app.get("/diagnose")
def diagnose(top_n: int = 10) -> dict:
    """AI root-cause diagnoses for the highest-impact clusters (FR-06)."""
    global _LAST_REPORT
    if not _STORE:
        raise HTTPException(status_code=409,
                            detail="no transactions ingested yet; call /ingest first")
    report = _LAST_REPORT or detect(_STORE)
    if report.transactions_analyzed != len(_STORE):
        report = detect(_STORE)
        _LAST_REPORT = report
    llm = llm_from_env()
    diagnoses = diagnose_report(report, _STORE, llm=llm, top_n=top_n)

    for d in diagnoses:
        cluster = next((c for c in report.clusters if c.cluster_id == d.cluster_id),
                       None)
        AUDIT_LOG.record(
            actor="diagnosis_agent", action="root_cause_diagnosis",
            reason=d.root_cause[:160],
            evidence={
                "cluster_id": d.cluster_id,
                "cluster_title": cluster.title if cluster else d.cluster_id,
                "recommended_action": d.recommended_action.value,
                "confidence": d.confidence,
                "source": d.source.value,
                "llm_active": llm is not None,
            },
        )
    return {
        "report_id": report.report_id,
        "llm_active": llm is not None,
        "diagnoses": [d.model_dump(mode="json") for d in diagnoses],
    }


@app.post("/run")
def run_recovery(approve: list[str] | None = None,
                 execute_escalations: bool = False) -> dict:
    """Strategy plan → policy gate → bounded execution (FR-10/FR-11)."""
    global _LAST_REPORT, _LAST_PLAN, _LAST_EXECUTION
    if not _STORE:
        raise HTTPException(status_code=409,
                            detail="no transactions ingested yet; call /ingest first")
    _LAST_REPORT = _LAST_REPORT or detect(_STORE)

    # diagnosis→strategy connection: cross-check EV ranking against AI diagnoses
    diag_payload = diagnose(top_n=min(len(_LAST_REPORT.clusters), 100))
    diagnoses = {d["cluster_id"]: Diagnosis(**d)
                 for d in diag_payload["diagnoses"]}

    _LAST_PLAN = build_plan(_STORE, _LAST_REPORT, diagnoses=diagnoses)
    AUDIT_LOG.record(
        actor="strategy_engine", action="plan_built",
        reason=f"{len(_LAST_PLAN.queue)} queued · {len(_LAST_PLAN.escalations)} "
               f"escalations · {len(_LAST_PLAN.stops)} stopped by EV/policy rules",
        evidence={
            "queued": len(_LAST_PLAN.queue),
            "escalations": len(_LAST_PLAN.escalations),
            "stops": len(_LAST_PLAN.stops),
            "expected_recovery_inr": _LAST_PLAN.total_expected_recovery_inr,
        },
    )

    for txn_id in approve or []:
        _GUARD.approve(txn_id, approver="api_merchant")
        AUDIT_LOG.record(
            actor="merchant", action="approve_transaction",
            reason=f"human approval recorded for {txn_id}",
            evidence={"transaction_id": txn_id},
        )

    by_id = {t.transaction_id: t for t in _STORE}
    items = [(by_id[d.transaction_id], d.action) for d in _LAST_PLAN.queue]
    if execute_escalations:
        items += [(by_id[d.transaction_id], d.action)
                  for d in _LAST_PLAN.escalations]

    _LAST_EXECUTION = _EXECUTOR.execute(items, actor="strategy_api")
    AUDIT_LOG.extend(_LAST_EXECUTION.audit_trail)
    return {
        "plan": {
            "queued": len(_LAST_PLAN.queue),
            "escalations": len(_LAST_PLAN.escalations),
            "stops": len(_LAST_PLAN.stops),
            "expected_recovery_inr": _LAST_PLAN.total_expected_recovery_inr,
        },
        "execution": {
            "recovered_inr": _LAST_EXECUTION.recovered_inr,
            "outcome_counts": _LAST_EXECUTION.counts_by_outcome,
            "audit_events": len(_LAST_EXECUTION.audit_trail),
        },
    }


@app.get("/state")
def state() -> dict:
    """Everything the dashboard needs after a /run: plan + execution + audit."""
    plan_data = _LAST_PLAN.model_dump() if _LAST_PLAN else None
    if plan_data:  # include computed properties omitted by model_dump()
        plan_data["total_expected_recovery_inr"] = _LAST_PLAN.total_expected_recovery_inr

    execution_data = None
    if _LAST_EXECUTION:
        execution_data = {
            **_LAST_EXECUTION.model_dump(),
            "recovered_inr": _LAST_EXECUTION.recovered_inr,
            "outcome_counts": _LAST_EXECUTION.counts_by_outcome,
        }

    return {
        "has_report": _LAST_REPORT is not None,
        "plan": plan_data,
        "execution": execution_data,
        "guard": {"actions_today": _GUARD.actions_today},
    }


@app.get("/audit")
def audit_trail() -> dict:
    """Full decision/action history across every stage (FR-16)."""
    return {"events": [e.model_dump(mode="json") for e in AUDIT_LOG.dump()],
            "count": AUDIT_LOG.count}


@app.post("/evaluate")
def run_evaluation(seed: int = 42) -> dict:
    """Baseline vs AI strategy comparison on the current store (FR-15)."""
    if not _STORE:
        raise HTTPException(status_code=409,
                            detail="no transactions ingested yet; call /ingest first")
    result = evaluate(list(_STORE), seed=seed)
    AUDIT_LOG.record(
        actor="evaluation_engine", action="baseline_comparison",
        reason=(f"AI recovered ₹{result.ai_strategy.recovered_inr:,.0f} vs "
                f"baseline ₹{result.baseline.recovered_inr:,.0f}"),
        evidence={
            "uplift_inr": result.uplift.extra_recovered_inr,
            "rate_delta_pp": result.uplift.rate_delta,
            "ai_unnecessary": result.ai_strategy.unnecessary_interventions,
            "exceptions": len(result.exceptions),
        },
    )
    return result.model_dump(mode="json")
