"""FastAPI application: ingestion + detection + diagnosis + gated execution.

Every pipeline stage writes to the central audit log (FR-16).
Reliability/security: request logging, input caps, HMAC-verified idempotent
webhooks (Phase 11).
"""

from __future__ import annotations

import hashlib
import hmac
import json
import logging
import os
import time

from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware

from app.ai.diagnosis_agent import diagnose_report
from app.ai.llm_client import llm_from_env
from app.ai.schemas import Diagnosis
from app.audit import AuditLog
from app.data.synthetic_generator import generate_batch
from app.detection.engine import DetectionReport, detect
from app.evaluation.engine import evaluate
from app.execution.executor import ActionExecutor, ExecutionReport
from app.ingestion.csv_parser import parse_csv, parse_razorpay_csv
from app.integrations.simulator import PaymentSimulator
from app.notifications.summary import generate_summary
from app.policy.guard import PolicyGuard
from app.schemas.transactions import Transaction
from app.strategy.engine import build_plan
from app.strategy.schemas import StrategyPlan

logger = logging.getLogger("revguard.api")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s")

_CORS_ORIGINS = os.environ.get(
    "REVGUARD_CORS_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173",
).split(",")

app = FastAPI(title="Revenue Recovery Control Tower", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

MAX_BATCH_SIZE = 5_000  # ingestion cap: reject oversized batches (NFR-02)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Structured request/error logging without leaking payloads (NFR-06)."""
    start = time.perf_counter()
    try:
        response = await call_next(request)
    except Exception:
        logger.exception("unhandled error on %s %s",
                         request.method, request.url.path)
        raise
    duration_ms = (time.perf_counter() - start) * 1000
    logger.info("%s %s -> %s (%.0fms)",
                request.method, request.url.path,
                response.status_code, duration_ms)
    return response

_STORE: list[Transaction] = []
_LAST_REPORT: DetectionReport | None = None
_LAST_PLAN: StrategyPlan | None = None
_LAST_EXECUTION: ExecutionReport | None = None
_GUARD = PolicyGuard()
_EXECUTOR = ActionExecutor(provider=PaymentSimulator(seed=42), guard=_GUARD)
AUDIT_LOG = AuditLog()
_SEEN_WEBHOOK_IDS: set[str] = set()  # webhook idempotency (NFR-04)
_SEEN_WEBHOOK_IDS_MAX = 10_000  # cap to prevent unbounded growth


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "transactions_in_store": len(_STORE)}


@app.post("/reset")
def reset() -> dict:
    """Clear demo state (store, plan, execution, guard, audit) for a fresh run."""
    global _STORE, _LAST_REPORT, _LAST_PLAN, _LAST_EXECUTION, _GUARD, _EXECUTOR
    _STORE = []
    _LAST_REPORT = None
    _LAST_PLAN = None
    _LAST_EXECUTION = None
    _GUARD = PolicyGuard()
    _EXECUTOR = ActionExecutor(provider=PaymentSimulator(seed=42), guard=_GUARD)
    AUDIT_LOG.clear()
    _SEEN_WEBHOOK_IDS.clear()
    return {"status": "reset"}


@app.post("/ingest")
def ingest(transactions: list[Transaction]) -> dict:
    """Ingest a normalized batch (FR-01/FR-02). Capped at MAX_BATCH_SIZE."""
    if len(transactions) > MAX_BATCH_SIZE:
        raise HTTPException(status_code=413,
                            detail=f"batch too large; cap is {MAX_BATCH_SIZE}")
    _STORE.extend(transactions)
    AUDIT_LOG.record(
        actor="system", action="ingest_batch",
        reason=f"ingested {len(transactions)} normalized transactions",
        evidence={"batch_size": len(transactions), "store_total": len(_STORE)},
    )
    return {"ingested": len(transactions), "store_total": len(_STORE)}


@app.post("/ingest/synthetic")
def ingest_synthetic(n_total: int = 600, seed: int = 42,
                     profile: str = "standard") -> dict:
    if n_total > MAX_BATCH_SIZE:
        raise HTTPException(status_code=413,
                            detail=f"n_total too large; cap is {MAX_BATCH_SIZE}")
    batch = generate_batch(n_total=n_total, seed=seed, profile=profile)
    _STORE.extend(batch)
    AUDIT_LOG.record(
        actor="system", action="ingest_synthetic_batch",
        reason=f"generated {len(batch)} synthetic transactions",
        evidence={"batch_size": len(batch), "seed": seed, "profile": profile,
                  "store_total": len(_STORE)},
    )
    return {"ingested": len(batch), "store_total": len(_STORE)}


@app.post("/ingest/csv")
async def ingest_csv(request: Request, razorpay: bool = False) -> dict:
    """Ingest a CSV file upload. Pass razorpay=true for Razorpay dashboard exports."""
    body = await request.body()
    try:
        content = body.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="file must be UTF-8 encoded CSV")

    batch = parse_razorpay_csv(content) if razorpay else parse_csv(content)
    if not batch:
        raise HTTPException(status_code=422, detail="no valid transactions found in CSV")
    if len(batch) > MAX_BATCH_SIZE:
        raise HTTPException(status_code=413,
                            detail=f"batch too large ({len(batch)} rows); cap is {MAX_BATCH_SIZE}")

    _STORE.extend(batch)
    AUDIT_LOG.record(
        actor="system", action="ingest_csv",
        reason=f"ingested {len(batch)} transactions from CSV (razorpay={razorpay})",
        evidence={"batch_size": len(batch), "razorpay": razorpay,
                  "store_total": len(_STORE)},
    )
    return {"ingested": len(batch), "store_total": len(_STORE)}


@app.post("/ingest/excel")
async def ingest_excel(request: Request) -> dict:
    """Ingest an Excel (.xlsx) file upload. Converts to CSV internally."""
    try:
        import openpyxl  # noqa: WPS433 — lazy import
    except ImportError:
        raise HTTPException(status_code=501,
                            detail="openpyxl not installed; pip install openpyxl")

    body = await request.body()
    import io
    wb = openpyxl.load_workbook(io.BytesIO(body), read_only=True, data_only=True)
    ws = wb.active
    if ws is None:
        raise HTTPException(status_code=422, detail="Excel file has no active sheet")

    rows = list(ws.iter_rows(values_only=True))
    if len(rows) < 2:
        raise HTTPException(status_code=422, detail="Excel file has no data rows")

    # First row is header
    header = [str(h).strip() if h else f"col_{i}" for i, h in enumerate(rows[0])]
    csv_lines = [",".join(header)]
    for row in rows[1:]:
        cells = [str(c).strip() if c is not None else "" for c in row]
        csv_lines.append(",".join(cells))

    csv_content = "\n".join(csv_lines)
    batch = parse_csv(csv_content)
    if not batch:
        raise HTTPException(status_code=422, detail="no valid transactions found in Excel")

    if len(batch) > MAX_BATCH_SIZE:
        raise HTTPException(status_code=413,
                            detail=f"batch too large ({len(batch)} rows); cap is {MAX_BATCH_SIZE}")

    _STORE.extend(batch)
    AUDIT_LOG.record(
        actor="system", action="ingest_excel",
        reason=f"ingested {len(batch)} transactions from Excel",
        evidence={"batch_size": len(batch), "store_total": len(_STORE)},
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


@app.post("/webhooks/razorpay")
async def razorpay_webhook(request: Request,
                           x_razorpay_signature: str | None = Header(None)) -> dict:
    """Receive Razorpay payment events with HMAC verification + idempotency.

    - Signature (X-Razorpay-Signature) verified against RAZORPAY_WEBHOOK_SECRET
      when set; unsigned requests rejected in that mode.
    - Duplicate event ids return {"status": "duplicate"} so the provider stops
      retrying without double-recording outcomes (NFR-04).
    - Only outcome recording happens here; recovery actions are never taken
      from webhooks directly (guard still owns all state changes).
    """
    body = await request.body()
    secret = os.getenv("RAZORPAY_WEBHOOK_SECRET", "")
    if secret:
        expected = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
        if not x_razorpay_signature or not hmac.compare_digest(
                expected, x_razorpay_signature):
            raise HTTPException(status_code=401,
                                detail="invalid webhook signature")

    try:
        event = json.loads(body)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="malformed JSON payload")

    event_type = event.get("event", "")
    event_id = str(event.get("id") or hashlib.sha256(body).hexdigest()[:16])

    if event_id in _SEEN_WEBHOOK_IDS:
        AUDIT_LOG.record(
            actor="razorpay_webhook", action="duplicate_event_ignored",
            reason=f"event {event_id} already processed",
            evidence={"event_id": event_id},
            policy_result="blocked",
        )
        return {"status": "duplicate"}
    if len(_SEEN_WEBHOOK_IDS) >= _SEEN_WEBHOOK_IDS_MAX:
        _SEEN_WEBHOOK_IDS.clear()
    _SEEN_WEBHOOK_IDS.add(event_id)

    entity = ((event.get("payload") or {}).get("payment") or {}).get("entity") or {}
    source_txn = (entity.get("notes") or {}).get("source_txn")

    if event_type == "payment.captured":
        AUDIT_LOG.record(
            actor="razorpay_webhook", action="provider_outcome",
            reason="payment captured by provider",
            evidence={"event_id": event_id, "source_txn": source_txn,
                      "amount_inr": entity.get("amount", 0) / 100.0},
            outcome="recovered",
        )
        return {"status": "recorded"}
    if event_type == "payment.failed":
        AUDIT_LOG.record(
            actor="razorpay_webhook", action="provider_outcome",
            reason="payment failed at provider",
            evidence={"event_id": event_id, "source_txn": source_txn},
            outcome="failed",
        )
        return {"status": "recorded"}

    AUDIT_LOG.record(
        actor="razorpay_webhook", action="unhandled_event_ignored",
        reason=f"ignored unsupported webhook type: {event_type}",
        evidence={"event_id": event_id, "event_type": event_type},
        policy_result="blocked",
    )
    return {"status": "ignored"}


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


@app.post("/summary")
def run_summary(period: str = "current") -> dict:
    """Proactive notification summary over the current transaction store."""
    if not _STORE:
        raise HTTPException(status_code=409,
                            detail="no transactions ingested yet; call /ingest first")
    summary = generate_summary(_STORE, period_label=period)
    AUDIT_LOG.record(
        actor="notification_engine", action="summary_generated",
        reason=f"summary produced for period={period} over {len(_STORE)} txns",
        evidence={"period": period, "alerts": summary["alerts"]},
    )
    return summary


if __name__ == "__main__":
    import uvicorn

    host = os.environ.get("REVGUARD_HOST", "0.0.0.0")
    port = int(os.environ.get("REVGUARD_PORT", "8000"))
    uvicorn.run("app.main:app", host=host, port=port, reload=True)
