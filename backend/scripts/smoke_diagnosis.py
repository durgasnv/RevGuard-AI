"""Smoke: detect → AI diagnose top clusters (uses fallback when no LLM key)."""

from __future__ import annotations

import sys

from app.ai.diagnosis_agent import diagnose_report
from app.ai.llm_client import llm_from_env
from app.data.synthetic_generator import generate_batch
from app.detection.engine import detect


def main() -> int:
    txns = generate_batch()
    report = detect(txns)
    llm = llm_from_env()
    print(f"llm_active={llm is not None} report={report.report_id}\n")

    for d in diagnose_report(report, txns, llm=llm, top_n=5):
        print(f"[{d.source.value}] {d.recommended_action.value:<17} "
              f"conf={d.confidence:.2f} human={'YES' if d.requires_human else 'no'}")
        print(f"  cluster : {d.cluster_id}")
        print(f"  cause   : {d.root_cause}")
        if d.contributing_factors:
            print(f"  factors : {'; '.join(d.contributing_factors[:3])}")
        print()
    return 0


if __name__ == "__main__":
    sys.exit(main())
