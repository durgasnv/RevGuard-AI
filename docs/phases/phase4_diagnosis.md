# Phase 4 — AI Diagnosis and Reasoning

## Goal

Turn raw failure patterns into merchant-level explanations: evidence-backed root causes with confidence, structured outputs only, and a deterministic fallback whenever the LLM is unavailable or wrong.

## What We Did

- Defined the strict decision schema (`backend/app/ai/schemas.py`):
  - `Diagnosis`: root cause, contributing factors, recommended action, confidence (clamped 0–1), `requires_human`, evidence refs, and source tag (`llm` | `heuristic_fallback`).
  - Recommended actions are validator-restricted to the bounded Phase 0 action set — the schema itself rejects out-of-policy actions (AI-02).
  - `ClusterContext`: the sanitized operational context handed to the AI.
- Built the context builder (`backend/app/ai/context_builder.py`): method share, burst flag, retry stats, high-value count, top-amount sample evidence. Ground-truth fields are structurally excluded from this layer (AI-01).
- Added an LLM abstraction (`backend/app/ai/llm_client.py`): any OpenAI-compatible endpoint via `OPENAI_API_KEY`/`OPENAI_BASE_URL`/`OPENAI_MODEL`; JSON response mode; typed `LLMUnavailable` on any failure. No key → local dev runs fully without an LLM (NFR-05).
- Implemented rule-based diagnoser (`backend/app/ai/heuristics.py`) encoding Phase 0 policy as diagnosis rules:
  - risk/business clusters → escalate with human required;
  - transient bursts → gateway degradation narrative + delayed retry;
  - retry-exhausted → payment link (auto-retry would duplicate);
  - insufficient funds → link over immediate retry;
  - repeated auth failures → notify customer, not retry.
  Confidence scales with volume (log), burst detection, and method concentration.
- Built the agent (`backend/app/ai/diagnosis_agent.py`) with a hard pipeline:
  context → LLM JSON → parse → schema validate → policy-invariant check → **any failure falls back to heuristics** (AI-06). The invariant check re-verifies that risk-related clusters are escalated even when the LLM returns otherwise-valid output (AI-05).
- Exposed `GET /diagnose?top_n=` returning diagnoses for the highest-impact clusters plus whether an LLM is active.

## Key Design Decisions

1. **The LLM proposes, it never disposes.** The agent has no execution capability and cannot weaken policy — invariants are re-checked post-validation.
2. **Fallback is a first-class citizen**, not an error path: identical `Diagnosis` shape regardless of source, so downstream phases don't branch on provenance except for audit labeling.
3. **Confidence is computed, not vibes**: heuristic confidence derives from measurable evidence strength; LLM confidence is clamped but preserved for comparison later.
4. **Prompt demands JSON-only** with the exact field set; parsing tolerates markdown fences and surrounding text before validation rejects garbage.

## Learnings

- **The best test of AI safety plumbing is a well-formed wrong answer.** A test fed the agent valid JSON recommending auto-retry on fraud-blocked payments. Schema validation passed; the policy-invariant check caught it. This validated the two-layer design — schema checks structure, invariants check policy — neither alone would suffice.
- **Test doubles beat mock libraries** for LLM testing: a 5-line `FakeLLM` returning scripted strings covered garbage output, valid output, and policy-violating output with zero dependencies.
- **Heuristics first was the right build order**: writing rules forced precise per-category narratives, which then became the quality bar the LLM prompt describes. If no key is configured, the product still demos end to end.
- **Sanitize at the boundary, not in the prompt**: excluding ground truth by constructing a separate context model is robust; prompt-level "don't use these fields" would be theater.

## Observed Output (600-txn batch, fallback mode)

| Cluster | Action | Conf | Human |
|---|---|---|---|
| Fraud-blocked cards (₹12.0L) | ESCALATE_HUMAN | 0.95 | yes |
| Repeated auth failures (n=57) | NOTIFY_CUSTOMER | 0.60 | no |
| Subscription retries exhausted (n=31) | SEND_PAYMENT_LINK | 0.70 | no |
| UPI network burst (~7.3h) | RETRY_PAYMENT | 0.95 | no |
| Insufficient funds (n=39) | SEND_PAYMENT_LINK | 0.65 | no |

## How to Run

```bash
PYTHONPATH=backend .venv/bin/python backend/scripts/smoke_diagnosis.py
PYTHONPATH=backend .venv/bin/python -m pytest backend/tests/test_phase4.py -q
# with an LLM: OPENAI_API_KEY=... OPENAI_MODEL=gpt-4o-mini uvicorn app.main:app --app-dir backend
```

## Limitations / Next

- Diagnoses are not yet persisted or audited end-to-end (audit wiring lands with execution).
- One diagnosis per cluster; per-transaction nuance within clusters is deferred.
- LangGraph orchestration deferred until multi-step agent flows exist (Phase 5+); current single-step design slots into a graph node cleanly (NFR-04).
