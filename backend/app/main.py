"""FastAPI application: ingestion + detection + diagnosis + gated execution."""

from __future__ import annotations

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.ai.diagnosis_agent import diagnose_report
from app.ai.llm_client import llm_from_env
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


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "transactions_in_store": len(_STORE)}


@app.post("/reset")
def reset() -> dict:
    """Clear demo state (store, plan, execution, guard) for a fresh run."""
    global _STORE, _LAST_REPORT, _LAST_PLAN, _LAST_EXECUTION
    _STORE = []
    _LAST_REPORT = None
    _LAST_PLAN = None
    _LAST_EXECUTION = None
    globals()["_GUARD"] = PolicyGuard()
    globals()["_EXECUTOR"] = ActionExecutor(
        provider=PaymentSimulator(seed=42), guard=globals()["_GUARD"])
    return {"status": "reset"}


@app.post("/ingest")
def ingest(transactions: list[Transaction]) -> dict:
    """Ingest a normalized batch (FR-01/FR-02)."""
    _STORE.extend(transactions)
    return {"ingested": len(transactions), "store_total": len(_STORE)}


@app.post("/ingest/synthetic")
def ingest_synthetic(n_total: int = 600, seed: int = 42) -> dict:
    batch = generate_batch(n_total=n_total, seed=seed)
    _STORE.extend(batch)
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
    return _LAST_REPORT


@app.get("/diagnose")
def diagnose(top_n: int = 10) -> dict:
    """AI root-cause diagnoses for the highest-impact clusters (FR-06)."""
    if not _STORE:
        raise HTTPException(status_code=409,
                            detail="no transactions ingested yet; call /ingest first")
    report = _LAST_REPORT or detect(_STORE)
    if report.transactions_analyzed != len(_STORE):
        report = detect(_STORE)
        _LAST_REPORT = report
    diagnoses = diagnose_report(report, _STORE, llm=llm_from_env(), top_n=top_n)
    return {
        "report_id": report.report_id,
        "llm_active": llm_from_env() is not None,
        "diagnoses": [d.model_dump() for d in diagnoses],
    }


@app.post("/run")
def run_recovery(approve: list[str] | None = None,
                 execute_escalations: bool = False) -> dict:
    """Strategy plan → policy gate → bounded execution (FR-10/FR-11)."""
    global _LAST_REPORT, _LAST_PLAN, _LAST_EXECUTION
    if not _STORE:
        raise HTTPException(status_code=409,
                            detail="no transactions ingested yet; call /ingest first")
    _LAST_REPORT = detect(_STORE)
    _LAST_PLAN = build_plan(_STORE, _LAST_REPORT)

    for txn_id in approve or []:
        _GUARD.approve(txn_id, approver="api_merchant")

    by_id = {t.transaction_id: t for t in _STORE}
    items = [(by_id[d.transaction_id], d.action) for d in _LAST_PLAN.queue]
    if execute_escalations:
        items += [(by_id[d.transaction_id], d.action)
                  for d in _LAST_PLAN.escalations]

    _LAST_EXECUTION = _EXECUTOR.execute(items, actor="strategy_api")
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
    return {
        "has_report": _LAST_REPORT is not None,
        "plan": _LAST_PLAN.model_dump() if _LAST_PLAN else None,
        "execution": (
            _LAST_EXECUTION.model_dump()
            if _LAST_EXECUTION else None
        ),
        "guard": {"actions_today": _GUARD.actions_today},
    }


@app.post("/evaluate")
def run_evaluation(seed: int = 42) -> dict:
    """Baseline vs AI strategy comparison on the current store (FR-15)."""
    if not _STORE:
        raise HTTPException(status_code=409,
                            detail="no transactions ingested yet; call /ingest first")
    result = evaluate(list(_STORE), seed=seed)
    return result.model_dump(mode="json")
