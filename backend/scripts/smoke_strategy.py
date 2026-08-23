"""Smoke: detect → strategy plan. Prints ranked queue and decision mix."""

from __future__ import annotations

import sys
from collections import Counter

from app.data.synthetic_generator import generate_batch
from app.detection.engine import detect
from app.evaluation.baseline import baseline_plan
from app.strategy.engine import build_plan


def main() -> int:
    txns = generate_batch()
    report = detect(txns)
    plan = build_plan(txns, report)

    failed = sum(1 for t in txns if t.status.value == "failed")
    print(f"failed={failed}  queued={len(plan.queue)}  "
          f"escalations/approvals={len(plan.escalations)}  stops={len(plan.stops)}")
    print(f"expected recovery (queued EV sum): ₹{plan.total_expected_recovery_inr:,.0f}\n")

    print("action mix (strategy vs baseline):")
    strat_actions = Counter(d.action.value for d in plan.all_decisions)
    base_actions = Counter(a.value for _, a in baseline_plan(txns))
    for action in ["RETRY_PAYMENT", "SEND_PAYMENT_LINK", "NOTIFY_CUSTOMER",
                   "ESCALATE_HUMAN", "STOP"]:
        print(f"  {action:<17} strategy={strat_actions.get(action, 0):<4} "
              f"baseline={base_actions.get(action, 0)}")

    print("\ntop 5 queue by expected recovery value:")
    for d in plan.queue[:5]:
        print(f"  #{d.rank} {d.action.value:<17} ₹{d.amount_inr:>9,.0f} "
              f"p={d.recovery_probability:.2f} EV=₹{d.expected_recovery_value_inr:>8,.0f} "
              f"[{d.failure_code}]")
    return 0


if __name__ == "__main__":
    sys.exit(main())
