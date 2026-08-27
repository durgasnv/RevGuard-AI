# Phase 11 — Reliability and Security Hardening

## Goal

Make the application behave like a serious fintech prototype: secure inputs, structured logging, idempotent webhooks, input caps, sensitive data leak prevention, graceful provider failures, and deterministic policy enforcement independent of the LLM.

## What We Did

- **Webhook HMAC verification** (`backend/app/main.py`):
  - `POST /webhooks/razorpay` verifies `X-Razorpay-Signature` against `RAZORPAY_WEBHOOK_SECRET` using HMAC-SHA256 when the secret is set; unsigned requests rejected in that mode.
  - Malformed JSON returns HTTP 400; unsupported event types return `{"status": "ignored"}`.
- **Webhook idempotency** (NFR-04):
  - Duplicate event IDs return `{"status": "duplicate"}` so Razorpay stops retrying without double-recording.
  - The `_SEEN_WEBHOOK_IDS` set tracks all processed event IDs; cleared on `/reset`.
- **Input size caps** (NFR-02):
  - `POST /ingest` rejects batches > 5,000 transactions with HTTP 413.
  - `POST /ingest/synthetic` rejects `n_total` > 5,000 with HTTP 413.
- **Structured request/error logging** (NFR-06):
  - HTTP middleware logs method, path, status code, and duration in milliseconds for every request.
  - Unhandled exceptions are logged with full traceback without leaking to the client.
  - No request payloads are logged — prevents sensitive data leakage through logs.
- **Sensitive data leak prevention**:
  - Audit events never carry card numbers, CVVs, or API keys.
  - `.env.example` contains no real secrets (no `sk-` or `rzp_` prefixes).
  - Tests verify no 16-digit card-like sequences appear in audit or state JSON.
- **Graceful provider failure handling** (FR-17):
  - Provider failures are recorded as outcomes, never auto-retried.
  - `AlwaysErrorProvider` test double proves the executor survives total provider outage without crashing.
  - Re-attempting a failed transaction returns `duplicate_prevention` → `blocked_by_policy`.
- **Deterministic policy independence** (NFR-06):
  - The Policy Guard never sees LLM output. Tests verify guard verdicts are deterministic and bounded regardless of diagnosis content.
  - Guard verdicts use named rules (`duplicate_prevention`, `hard_non_retryable`, `retry_limit`, `approval_gate`, `daily_cap`, `non_retryable_category`) — every blocked action is self-explaining.

## Key Design Decisions

1. **HMAC verification is opt-in via env var.** When `RAZORPAY_WEBHOOK_SECRET` is unset, the webhook accepts unsigned requests — this keeps local dev simple while production deployments enforce signature verification.
2. **Idempotency uses event IDs, not content hashes.** Razorpay provides unique event IDs; deduplication on IDs is simpler and handles legitimate retries correctly.
3. **Input caps protect against OOM, not security.** 5,000 is a generous limit for demo batches; real production would need streaming ingestion, but the cap prevents accidental memory exhaustion.
4. **Logging never includes payloads.** The middleware logs metadata (method, path, status, duration) but never request bodies or response content — this is a hard rule for fintech data handling.

## Test Coverage (test_phase11.py)

- `test_webhook_rejects_bad_signature`: bad HMAC returns 401; valid HMAC returns 200.
- `test_webhook_duplicate_events_idempotent`: second event ID returns "duplicate".
- `test_webhook_unsupported_event_ignored`: unknown event types return "ignored".
- `test_webhook_malformed_json`: non-JSON body returns 400.
- `test_ingest_batch_size_cap`: >5k transactions returns 413.
- `test_ingest_synthetic_size_cap`: >5k synthetic returns 413.
- `test_no_card_like_data_in_audit_or_state`: no 16-digit sequences or sensitive tokens in output.
- `test_env_example_has_no_real_secrets`: no `sk-` or `rzp_` in `.env.example`.
- `test_executor_survives_total_provider_outage`: AlwaysErrorProvider doesn't crash the executor.
- `test_guard_verdicts_independent_of_diagnosis_output`: guard verdicts are deterministic and bounded regardless of LLM content.

## How to Run

```bash
PYTHONPATH=backend .venv/bin/python -m pytest backend/tests/test_phase11.py -q
```

## Limitations / Next

- All state is in-memory; persistence (database) would add real durability.
- No rate limiting beyond input caps; production would need request throttling.
- Webhook verification doesn't yet process payment outcomes into recovery tracking — it records audit events but doesn't update transaction state.
- No TLS termination or auth middleware — the FastAPI app relies on a reverse proxy for HTTPS.
