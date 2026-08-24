"""Smoke: strategy plan → policy guard → executor, with a graceful-failure demo."""

from __future__ import annotations

import sys

from app.data.synthetic_generator import generate_batch
from app.detection.engine import detect
from app.execution.executor import ActionExecutor
from app.integrations.simulator import PaymentSimulator
from app.policy.guard import PolicyGuard
from app.strategy.engine import build_plan


def main() -> int:
    txns = generate_batch()
    report = detect(txns)
    plan = build_plan(txns, report)
    by_id = {t.transaction_id: t for t in txns}

    provider = PaymentSimulator(seed=42)
    guard = PolicyGuard()
    executor = ActionExecutor(provider=provider, guard=guard)

    items = [(by_id[d.transaction_id], d.action) for d in plan.queue]

    # FR-17 demo hook: force one permitted action to fail at the provider
    victim = next(d for d in plan.queue if d.action.value == "RETRY_PAYMENT")
    provider.inject_failure(victim.transaction_id)

    result = executor.execute(items, actor="strategy_smoke")

    counts = result.counts_by_outcome
    print(f"items={len(items)}  recovered=₹{result.recovered_inr:,.0f}")
    for k, v in sorted(counts.items()):
        print(f"  {k:<18} {v}")

    print("\npolicy interventions:")
    shown = 0
    for r in result.results:
        if r.policy_verdict != "allowed":
            print(f"  [{r.policy_rule}] {r.transaction_id} {r.action.value}: {r.reason}")
            shown += 1
    if not shown:
        print("  none")

    failed = [r for r in result.results if r.outcome.value == "failed"]
    reasons: dict[str, int] = {}
    for r in failed:
        key = r.reason.split("(")[0].strip()[:40]
        reasons[key] = reasons.get(key, 0) + 1
    print(f"\ngraceful failures ({len(failed)} total, no auto-retry):")
    for reason, n in sorted(reasons.items(), key=lambda kv: -kv[1]):
        print(f"  {n:>3}× {reason}")

    # prove the failed txn cannot be silently re-executed (no uncontrolled loop)
    second = executor.execute(
        [(by_id[victim.transaction_id], victim.action)], actor="retry_attempt")
    print(f"\nre-attempt of failed txn → policy_rule="
          f"{second.results[0].policy_rule}, outcome={second.results[0].outcome.value}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
