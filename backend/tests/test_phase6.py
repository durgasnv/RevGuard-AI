from datetime import datetime, timedelta, timezone

import pytest

from app.execution.executor import ActionExecutor
from app.integrations.base import ProviderAction, ProviderRequest
from app.integrations.simulator import PaymentSimulator
from app.policy.guard import PolicyGuard, Verdict
from app.schemas.transactions import (
    FailureCategory,
    RecoveryAction,
    Transaction,
    TxnStatus,
)


def _txn(**kw) -> Transaction:
    defaults = dict(
        transaction_id="txn_t1", amount_inr=500.0, payment_method="upi",
        status=TxnStatus.FAILED, failure_code="NETWORK_ERROR",
        failure_category=FailureCategory.TRANSIENT,
        timestamp=datetime.now(timezone.utc), retry_count=0,
        customer_reference="cust_1",
    )
    defaults.update(kw)
    return Transaction(**defaults)


def test_retry_limit_blocks_when_exhausted():
    guard = PolicyGuard()
    v = guard.check(_txn(retry_count=3), RecoveryAction.RETRY_PAYMENT, "k1")
    assert v.verdict is Verdict.BLOCKED and v.rule == "retry_limit"


def test_hard_non_retryable_code_blocked():
    guard = PolicyGuard()
    v = guard.check(
        _txn(failure_code="FRAUD_SUSPECTED",
             failure_category=FailureCategory.RISK_RELATED),
        RecoveryAction.RETRY_PAYMENT, "k2")
    assert v.rule == "hard_non_retryable"


def test_high_value_requires_approval_then_passes():
    guard = PolicyGuard()
    txn = _txn(transaction_id="txn_hv", amount_inr=50_000.0)
    key = "sim:RETRY_PAYMENT:txn_hv"
    blocked = guard.check(txn, RecoveryAction.RETRY_PAYMENT, key)
    assert blocked.verdict is Verdict.PENDING_APPROVAL

    guard.approve("txn_hv", approver="merchant_ops")
    allowed = guard.check(txn, RecoveryAction.RETRY_PAYMENT, key)
    assert allowed.verdict is Verdict.ALLOWED


def test_duplicate_action_prevented():
    guard = PolicyGuard()
    guard.register_execution("sim:RETRY_PAYMENT:txn_d")
    v = guard.check(_txn(transaction_id="txn_d"),
                    RecoveryAction.RETRY_PAYMENT, "sim:RETRY_PAYMENT:txn_d")
    assert v.rule == "duplicate_prevention"


def test_daily_cap_blocks_at_limit():
    guard = PolicyGuard(daily_cap=3)
    for i in range(3):
        guard.register_execution(f"key{i}")
    v = guard.check(_txn(), RecoveryAction.RETRY_PAYMENT, "k9")
    assert v.rule == "daily_cap"


def test_daily_cap_resets_next_day_with_injected_clock():
    t0 = datetime(2026, 8, 24, 10, 0, tzinfo=timezone.utc)
    clock = {"now": t0}
    guard = PolicyGuard(daily_cap=1,
                        now=lambda: clock["now"])
    guard.register_execution("k1")
    assert guard.check(_txn(), RecoveryAction.RETRY_PAYMENT, "k2").rule == "daily_cap"
    clock["now"] = t0 + timedelta(days=1)
    assert guard.check(_txn(), RecoveryAction.RETRY_PAYMENT, "k3").verdict is Verdict.ALLOWED


def test_executor_records_failed_attempt_without_retrying():
    provider = PaymentSimulator(seed=5)
    executor = ActionExecutor(provider=provider, guard=PolicyGuard())
    target = _txn(transaction_id="txn_fail")

    provider.inject_failure(target.transaction_id)  # FR-17 demo hook
    report = executor.execute([(target, RecoveryAction.RETRY_PAYMENT)])

    r = report.results[0]
    assert r.outcome.value == "failed"          # graceful failure recorded
    attempts = [a for a in report.audit_trail if a.evidence["transaction_id"] == "txn_fail"]
    assert len(attempts) == 1                   # exactly one financial attempt

    # a second identical request is policy-blocked, not executed again
    report2 = executor.execute([(target, RecoveryAction.RETRY_PAYMENT)])
    assert report2.results[0].policy_rule == "duplicate_prevention"
    assert report2.results[0].outcome.value == "blocked_by_policy"


def test_executor_routes_non_financial_actions_around_provider():
    provider = PaymentSimulator()
    executor = ActionExecutor(provider=provider)
    report = executor.execute([(_txn(), RecoveryAction.STOP),
                               (_txn(transaction_id="t2"), RecoveryAction.ESCALATE_HUMAN)])
    assert [r.outcome.value for r in report.results] == ["stopped", "escalated"]
    assert len(report.audit_trail) == 2


def test_full_pipeline_strategy_plan_through_executor():
    from app.data.synthetic_generator import generate_batch
    from app.detection.engine import detect
    from app.strategy.engine import build_plan

    txns = generate_batch(n_total=300)
    plan = build_plan(txns, detect(txns))
    by_id = {t.transaction_id: t for t in txns}

    items = [(by_id[d.transaction_id], d.action) for d in plan.all_decisions]
    report = ActionExecutor(PaymentSimulator(seed=11)).execute(items)

    assert sum(r.recovered_amount_inr for r in report.results) > 0
    assert len(report.audit_trail) == len(items)
    blocked = [r for r in report.results if r.policy_verdict != "allowed"]
    assert any(r.policy_rule == "approval_gate" for r in blocked)  # high-value gate fired
