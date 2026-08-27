# RevGuard-AI — Bug & Improvement Audit Report

Generated: Thu Aug 27 2026

---

## Bugs

| Severity | File | Issue |
|----------|------|-------|
| **HIGH** | `backend/app/main.py:127` | Hardcoded `"profile"` string instead of `profile` variable in audit evidence |
| **HIGH** | `backend/app/policy/guard.py:97-99` | Operator precedence ambiguity in non-retryable category check — intent unclear, fragile if `RETRYABLE_CATEGORIES` expands |
| **HIGH** | `backend/app/main.py` + `strategy/engine.py` | Race conditions on global mutable state (`_STORE`, `_GUARD`, `_CLUSTER_INDEX`) — no locking, unsafe in concurrent requests |
| **HIGH** | `backend/app/strategy/engine.py:30,129-154` | `_CLUSTER_INDEX` module-level dict used as thread-unsafe side channel between functions |
| **MEDIUM** | `backend/app/main.py:275` | `/run` endpoint uses stale detection report (no freshness check like `/diagnose` has) |
| **MEDIUM** | `backend/app/main.py:76,383` | `_SEEN_WEBHOOK_IDS` grows unboundedly — memory leak |
| **MEDIUM** | `backend/app/main.py:69` | `_STORE` list grows unboundedly — memory leak |
| **MEDIUM** | `backend/app/notifications/summary.py:98` | Category breakdown includes ALL transactions, not just failures (successful txns land in "uncategorized") |
| **MEDIUM** | `frontend/src/views/LeakageView.jsx:14-22` | `api_diagnose()` bypasses centralized `api` module, has no `.catch()` error handling |
| **MEDIUM** | `frontend/src/App.jsx:32` | `loadDemo` has `try/finally` but no `catch` — UI gets stuck in loading state on failure |
| **LOW** | `backend/app/ingestion/csv_parser.py:123,170` | Malformed CSV rows silently skipped with no logging |
| **LOW** | `backend/app/ingestion/csv_parser.py:65` | Unparseable timestamps silently become `datetime.now()` |
| **LOW** | `backend/app/main.py:87-96` | Inconsistent `global` vs `globals()` usage for `_GUARD`/`_EXECUTOR` reset |
| **LOW** | `backend/app/ai/diagnosis_agent.py:43-46` | Fragile markdown code-fence stripping — `split("```")[1]` can grab wrong segment |

### Bug Details

#### HIGH — Hardcoded `"profile"` in audit evidence
`backend/app/main.py:127` — In the `/ingest/synthetic` endpoint, the evidence dict uses `"profile": "profile"` (a string literal) instead of `"profile": profile` (the parameter variable). The audit log always records `profile: "profile"` instead of the actual profile name (e.g., `"standard"`, `"upi_degradation_heavy"`).

#### HIGH — Operator precedence in policy guard
`backend/app/policy/guard.py:97-99` — The condition mixes `and`/`or` without parentheses:
```python
if category and category.value not in RETRYABLE_CATEGORIES \
        or category in (FailureCategory.RISK_RELATED,
                        FailureCategory.BUSINESS_INTEGRATION):
```
Due to precedence, this evaluates as `(A and B) or C`. While currently safe by coincidence, the intent is unclear and would break silently if `RETRYABLE_CATEGORIES` were expanded.

#### HIGH — Race conditions on global mutable state
Multiple module-level globals (`_STORE`, `_LAST_REPORT`, `_LAST_PLAN`, `_LAST_EXECUTION`, `_GUARD`, `_EXECUTOR`, `_SEEN_WEBHOOK_IDS`, `_CLUSTER_INDEX`) are read/written by request handlers with no locking. Concurrent requests can cause `RuntimeError` or data corruption.

#### HIGH — Thread-unsafe `_CLUSTER_INDEX` side channel
`backend/app/strategy/engine.py:30,129-154` — `_CLUSTER_INDEX` is set at start of `build_plan()`, used by `decide()` during the same call, and cleared at end. Concurrent calls to `build_plan()` will overwrite each other's cluster lookups.

#### MEDIUM — Stale detection report in `/run`
`backend/app/main.py:275` — `/run` uses `_LAST_REPORT = _LAST_REPORT or detect(_STORE)` without checking freshness. `/diagnose` checks `report.transactions_analyzed != len(_STORE)` but `/run` does not.

#### MEDIUM — `_SEEN_WEBHOOK_IDS` memory leak
`backend/app/main.py:76,383` — Set grows unboundedly, only cleared on explicit `/reset`. No TTL, size cap, or periodic cleanup.

#### MEDIUM — `_STORE` memory leak
`backend/app/main.py:69` — List accumulates all ingested transactions with no eviction, pagination, or size limit beyond per-batch `MAX_BATCH_SIZE`.

#### MEDIUM — Summary includes non-failed transactions
`backend/app/notifications/summary.py:98` — `_count_by_category(txns)` classifies ALL transactions. Successful ones get `classify()` returning `None`, landing in "uncategorized" and inflating that bucket.

#### MEDIUM — LeakageView bypasses centralized API client
`frontend/src/views/LeakageView.jsx:14-22` — `api_diagnose()` uses raw `fetch()` instead of the `api` module. No `.catch()` handler means network errors cause unhandled promise rejections.

#### MEDIUM — loadDemo missing catch block
`frontend/src/App.jsx:32-43` — `try/finally` without `catch`. If any API call fails, the user sees the button stuck disabled with no error message.

#### LOW — Silent CSV row skipping
`backend/app/ingestion/csv_parser.py:123-124,170-171` — `except (KeyError, ValueError, TypeError): continue` silently drops malformed rows with no logging or counter.

#### LOW — Timestamp fallback to now
`backend/app/ingestion/csv_parser.py:65` — `_parse_timestamp` returns `datetime.now(timezone.utc)` for unparseable timestamps, potentially placing transactions in wrong time windows.

#### LOW — Inconsistent global state reset pattern
`backend/app/main.py:87-96` — `global` statement lists some variables, but `_GUARD`/`_EXECUTOR` are reassigned via `globals()` instead. Works but fragile and confusing.

#### LOW — Fragile LLM JSON parsing
`backend/app/ai/diagnosis_agent.py:43-46` — `text.split("```")[1]` grabs the wrong segment if backticks appear in unexpected positions. Fallback `find("{")`/`rfind("}")` can also match stray braces in strings.

---

## Improvements

| Priority | Area | Issue |
|----------|------|-------|
| **High** | `backend/app/ai/llm_client.py:37` | Sync `httpx.post()` blocks the async event loop — should use `httpx.AsyncClient` |
| **High** | `backend/app/integrations/razorpay_client.py:35` | Same — sync `httpx.Client` in async FastAPI context |
| **Medium** | `backend/app/strategy/engine.py:165` | Redundant inner import of `RecoveryAction` (already imported at module level) |
| **Medium** | `backend/app/core/policy.py:5` | `MIN_AI_CONFIDENCE` defined but never used anywhere |
| **Medium** | `backend/app/evaluation/engine.py` | `by_id` dict rebuilt 4 times from same list (lines 70, 111, 122, 164) |
| **Medium** | `backend/app/execution/executor.py` + `evaluation/runner.py` | Duplicated `_audit()` function — should be in shared utility |
| **Medium** | `backend/app/integrations/base.py` | `ProviderAction` enum duplicates `RecoveryAction` — should be unified |
| **Medium** | Frontend (all views) | Zero tests, no linting/formatting config |
| **Medium** | `frontend/src/views/OverviewView.jsx:16` | Raw `fetch()` instead of using `api` module |
| **Medium** | `backend/app/main.py:43-48` | CORS allows `allow_methods=["*"]` and `allow_headers=["*"]` — overly permissive |
| **Low** | Backend root | No `pyproject.toml` — missing `python_requires>=3.10` |
| **Low** | `backend/requirements.txt` | `openpyxl` used but not listed as a dependency |
| **Low** | `frontend/package.json` | React 18 / Vite 5 / Tailwind 3 all 1+ major versions behind |
| **Low** | Multiple files | `is` used for enum comparisons (33 occurrences) — should use `==` per Python spec |

### Improvement Details

#### High — Sync HTTP clients block async event loop
Both `OpenAICompatClient` (llm_client.py:37) and `RazorpayTestClient` (razorpay_client.py:35) use synchronous `httpx` calls inside async FastAPI endpoint handlers. This blocks the event loop and degrades throughput. Should migrate to `httpx.AsyncClient` with `await`.

#### Medium — Dead code and unused constants
- `MIN_AI_CONFIDENCE` in `core/policy.py` is never referenced.
- Redundant `RecoveryAction` import inside `_annotate_with_diagnoses` (strategy/engine.py:165).
- `evaluation/runner.py` is only used by tests/smoke scripts, never in production code paths.

#### Medium — DRY violations
- `_audit()` helper is duplicated between `executor.py` and `runner.py` with near-identical logic.
- `by_id = {t.transaction_id: t for t in transactions}` is rebuilt 4 times in `evaluation/engine.py` from the same list.
- `ProviderAction` enum in `integrations/base.py` duplicates a subset of `RecoveryAction`, requiring `# type: ignore` suppressions.

#### Medium — Missing tests
- No tests for `/ingest/csv` or `/ingest/excel` endpoints.
- No tests for `/summary` endpoint or `weekly_digest.py` script.
- Zero frontend tests — no test files, no test framework configured.
- No unit tests for `_parse_llm_json` edge cases.
- No tests for Razorpay client failure modes.

#### Medium — Frontend quality gaps
- Entire frontend is untyped JavaScript (.jsx) with no TypeScript.
- No ESLint or Prettier configuration.
- Several views make raw `fetch()` calls bypassing the centralized `api` module.
- `loadDemo` and `approveAll` are recreated every render (should use `useCallback`).

#### Low — Dependency and configuration issues
- No `pyproject.toml` or `setup.py` — missing `python_requires>=3.10`.
- `openpyxl` imported at runtime but not in `requirements.txt`.
- React 18.3.1, Vite 5.3.4, Tailwind 3.4.6 are all 1+ major versions behind current.
- No `eslint`, `prettier`, or `ruff` configured for either frontend or backend.
- CORS origins hardcoded to localhost — no env var support for deployment.
- Ports hardcoded in 3 separate files (`vite.config.js`, `run.sh`, `main.py`).
- `logging.basicConfig()` called at module level instead of by the application entrypoint.

#### Low — Enum comparison style
33 occurrences of `is` used for enum comparisons across the codebase. While CPython caches enum singletons, the Python spec says `is` tests identity, not equality. Should use `==` for portability and correctness.
