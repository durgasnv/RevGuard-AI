"""Root-cause diagnosis agent (FR-06).

Flow per cluster:
  build sanitized context → try LLM (structured JSON) → validate against
  Diagnosis schema → on ANY failure use deterministic heuristic fallback.

The agent can propose actions but never executes them and never bypasses
policy — the Policy Guard owns enforcement (AI-05).
"""

from __future__ import annotations

import json
import logging

from pydantic import ValidationError

from app.ai.context_builder import build_context
from app.ai.heuristics import heuristic_diagnose
from app.ai.llm_client import LLMUnavailable
from app.ai.schemas import ClusterContext, Diagnosis, DiagnosisSource
from app.detection.engine import DetectionReport, RiskCluster
from app.schemas.transactions import Transaction

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a payments revenue-recovery diagnoser for a merchant control tower.
Given one risk cluster's operational context, respond with ONLY a JSON object:
{
  "root_cause": "2-3 sentence evidence-backed explanation",
  "contributing_factors": ["...", "..."],
  "recommended_action": "RETRY_PAYMENT|SEND_PAYMENT_LINK|NOTIFY_CUSTOMER|ESCALATE_HUMAN|STOP",
  "confidence": 0.0-1.0,
  "requires_human": true|false,
  "evidence_refs": ["short evidence strings from the context"]
}
Rules: retry is never the default; risk-related clusters MUST be ESCALATE_HUMAN with
requires_human=true; integration defects cannot be fixed by payment actions."""


def _parse_llm_json(raw: str) -> dict:
    text = raw.strip()
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    start, end = text.find("{"), text.rfind("}")
    if start == -1 or end == -1:
        raise ValueError("no json object in llm output")
    return json.loads(text[start:end + 1])


def diagnose_cluster(
    cluster: RiskCluster,
    transactions: list[Transaction],
    llm=None,
) -> tuple[Diagnosis, ClusterContext]:
    """Returns (diagnosis, context). Never raises for bad LLM output."""
    ctx = build_context(cluster, transactions)

    if llm is not None:
        try:
            raw = llm.complete(SYSTEM_PROMPT, ctx.model_dump_json())
            data = _parse_llm_json(raw)
            data.pop("cluster_id", None)
            diagnosis = Diagnosis(
                cluster_id=ctx.cluster_id,
                source=DiagnosisSource.LLM,
                **data,
            )
            # policy invariants survive even a "valid" LLM answer (AI-05)
            if ("RISK" in ctx.failure_category.upper()) and (
                diagnosis.recommended_action.value != "ESCALATE_HUMAN"
                or not diagnosis.requires_human
            ):
                raise ValueError("llm violated risk-policy invariant")
            return diagnosis, ctx
        except (LLMUnavailable, ValidationError, ValueError, json.JSONDecodeError,
                KeyError, TypeError) as exc:
            logger.warning("llm diagnosis rejected (%s); using fallback", exc)

    return heuristic_diagnose(ctx), ctx


def diagnose_report(
    report: DetectionReport,
    transactions: list[Transaction],
    llm=None,
    top_n: int = 10,
) -> list[Diagnosis]:
    """Diagnose the highest-impact clusters."""
    out: list[Diagnosis] = []
    for cluster in report.clusters[:top_n]:
        diagnosis, _ = diagnose_cluster(cluster, transactions, llm=llm)
        out.append(diagnosis)
    return out
