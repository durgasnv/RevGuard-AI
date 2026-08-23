"""End-to-end smoke: generate → ingest → detect, print the control-tower report."""

from __future__ import annotations

import sys

from app.data.synthetic_generator import generate_batch
from app.detection.engine import detect
from app.evaluation.baseline import baseline_plan
from app.evaluation.runner import run_plan
from app.integrations.simulator import PaymentSimulator


def main() -> int:
    txns = generate_batch()
    report = detect(txns)

    print(f"report={report.report_id} analyzed={report.transactions_analyzed} "
          f"failed={report.failed_count}")
    print(f"revenue_at_risk=₹{report.revenue_at_risk_inr:,.0f}  "
          f"expected_recoverable=₹{report.expected_recoverable_inr:,.0f}  "
          f"unrecoverable=₹{report.unrecoverable_inr:,.0f}\n")

    for c in report.clusters[:6]:
        print(f"[{c.severity.upper():<6}] {c.title:<42} "
              f"n={c.txn_count:<3} risk=₹{c.revenue_at_risk_inr:>10,.0f}")
        for line in c.evidence:
            print(f"         - {line}")

    # prove the loop reaches execution through the simulator
    provider = PaymentSimulator()
    results, audit = run_plan(baseline_plan(txns), provider, actor="baseline_smoke")
    recovered = sum(r.recovered_amount_inr for _, _, r in results)
    print(f"\nbaseline via simulator: actions={len(audit)} "
          f"recovered=₹{recovered:,.0f} audit_events={len(audit)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
