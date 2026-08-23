"""FastAPI application: ingestion + revenue risk detection API."""

from __future__ import annotations

from collections.abc import Callable

from fastapi import FastAPI, HTTPException

from app.data.synthetic_generator import generate_batch
from app.detection.engine import DetectionReport, detect
from app.schemas.transactions import Transaction

app = FastAPI(title="Revenue Recovery Control Tower", version="0.1.0")

_STORE: list[Transaction] = []


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "transactions_in_store": len(_STORE)}


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
    if not _STORE:
        raise HTTPException(status_code=409, detail="no transactions ingested yet; call /ingest first")
    return detect(_STORE)
