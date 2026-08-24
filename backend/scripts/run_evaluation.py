"""Batch evaluation report: baseline vs AI strategy (ER-02..ER-08)."""

from __future__ import annotations

import sys

from app.data.synthetic_generator import generate_batch
from app.evaluation.engine import evaluate


def main() -> int:
    txns = generate_batch(n_total=600, seed=42)
    r = evaluate(txns, seed=42)

    print(f"evaluation {r.report_id}  dataset={r.dataset_size} seed={r.seed} "
          f"failed={r.failed_count}")
    print(f"revenue at risk: ₹{r.revenue_at_risk_inr:,.0f}\n")

    for m in [r.baseline, r.ai_strategy]:
        print(f"[{m.name}]")
        print(f"  recovered            ₹{m.recovered_inr:>12,.0f}")
        print(f"  unrecovered          ₹{m.unrecovered_inr:>12,.0f}")
        print(f"  recovery rate        {m.recovery_rate*100:>11.2f}%")
        print(f"  attempts             {m.interventions_attempted:>12} "
              f"(rate {m.intervention_rate*100:.1f}% of failed)")
        print(f"  unnecessary attempts {m.unnecessary_interventions:>12}")
        print(f"  prevented (neg-EV)   {m.prevented_interventions:>12}")
        print()

    u = r.uplift
    print("[uplift ai vs baseline]")
    print(f"  extra recovered      ₹{u.extra_recovered_inr:>12,.0f}")
    print(f"  recovery-rate delta  {u.rate_delta:>11.2f} pp")
    print(f"  avoided waste        {u.avoided_unnecessary_interventions:>12} interventions")
    print(f"  ₹ per attempt        baseline={u.baseline_recovered_per_attempt} "
          f"ai={u.ai_recovered_per_attempt}")

    print(f"\n[exceptions — honest unrecoverable list] ({len(r.exceptions)} buckets)")
    for e in r.exceptions[:8]:
        print(f"  {e.txn_count:>3}× {e.failure_code:<22} ₹{e.amount_inr:>10,.0f}  "
              f"{e.reason[:60]}")
    total_exc_amt = sum(e.amount_inr for e in r.exceptions)
    print(f"  → total unrecovered across exceptions: ₹{total_exc_amt:,.0f}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
