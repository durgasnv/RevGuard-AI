# Phase 3 — Revenue Risk Detection

## Goal

Detect where revenue is slipping away: cluster failures, estimate revenue at risk, rank leakage by impact, and explain every finding with evidence.

## What We Did

- Built the failure classifier (`backend/app/detection/classifier.py`, FR-04):
  - Maps 15 Razorpay-style failure codes to the six Phase 0 categories.
  - Derives `retry_exhausted` when retry counts cross the policy limit on exhaustible codes.
  - Never reclassifies risk-related or business/integration failures.
- Built the detection engine (`backend/app/detection/engine.py`):
  - Clusters failed transactions by `(category, failure_code)`.
  - Estimates revenue at risk per cluster and expected recoverable value using coarse category-level recovery priors.
  - Detects temporal bursts (≥5 failures within an 8h span) as degradation evidence.
  - Assigns severity via explicit thresholds and ranks clusters by revenue impact.
  - Emits human-readable evidence lines per cluster (FR-05/FR-06 groundwork).
- Exposed the API (`backend/app/main.py`): `POST /ingest`, `POST /ingest/synthetic`, `GET /transactions`, `GET /detect`, `GET /health`.
- Added the smoke script (`backend/scripts/smoke_detection.py`) running generation → detection → baseline execution through the simulator.

## Key Design Decisions

1. **Detection never reads ground truth.** Recovery priors are hardcoded per category (transient 0.55, customer 0.30, retry-exhausted 0.35, risk/business 0). This keeps detection honest — the strategy layer refines estimates later using its own signals.
2. **Clustering by category+code first**, method mix and time windows become *evidence inside* the cluster rather than separate clusters — keeps the cluster list demo-legible.
3. **Zero-prior categories are surfaced explicitly** ("no automated recovery path") so unrecoverable revenue is visible rather than hidden (ER-08 honesty).
4. **Empty-store detection returns HTTP 409** with guidance instead of an empty report that looks like "no risk".

## Learnings

- **Burst detection needs both conditions**: count alone flags healthy noisy days; window alone misses slow leaks. Requiring ≥5 failures within ≤8 hours cleanly isolated the synthetic UPI degradation event.
- **Evidence lines double as test assertions** — asserting burst text exists in the report verifies the detector without duplicating its math.
- **Ranking by revenue (not count) changes the story completely**: the top cluster by volume was auth failures, but fraud-blocked high-value cards dominated by rupee impact. Exactly the prioritization failure mode the problem statement warns about.

## Observed Output (600-txn batch)

- Top cluster: Risk Related / FRAUD_SUSPECTED, ₹12.0L at risk, correctly flagged no-automation.
- UPI NETWORK_ERROR burst: 43 failures in 7.3h (~5.9/h) flagged as temporal burst.
- Retry-exhausted cluster flagged "auto-retry would duplicate work".
- Baseline recovered ₹178k through the simulator with a full audit trail.

## How to Run

```bash
PYTHONPATH=backend .venv/bin/python backend/scripts/smoke_detection.py
PYTHONPATH=backend .venv/bin/python -m pytest backend/tests/test_phase3.py -q
# interactive: uvicorn app.main:app --app-dir backend
```

## Limitations / Next

- Clustering is code-level only; cross-code correlation (e.g., bank outage spanning codes) is deferred.
- Priors are static; the strategy phase introduces value-aware EV ranking.
- No persistence of reports; each `/detect` call recomputes.
