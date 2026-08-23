from app.data.synthetic_generator import generate_batch
from app.detection.engine import detect
from app.schemas.transactions import (
    FailureCategory,
    RecoveryAction,
    TxnStatus,
)
from app.strategy.engine import build_plan, decide
from app.strategy.schemas import DecisionOutcome


def _setup(n: int = 600):
    txns = generate_batch(n_total=n)
    report = detect(txns)
    return txns, build_plan(txns, report)


def test_retry_never_selected_when_exhausted():
    _, plan = _setup()
    exhausted_ids = {
        t.transaction_id for t in generate_batch()
        if t.retry_count >= 2 and t.failure_category
        not in (FailureCategory.RISK_RELATED, FailureCategory.BUSINESS_INTEGRATION)
    }
    for d in plan.all_decisions:
        if d.transaction_id in exhausted_ids:
            assert d.action is not RecoveryAction.RETRY_PAYMENT


def test_insufficient_funds_prefers_link_over_retry():
    txns = [t for t in generate_batch()
            if t.failure_code == "INSUFFICIENT_FUNDS"]
    assert txns
    for t in txns[:20]:
        d = decide(t)
        if d.outcome in (DecisionOutcome.QUEUED, DecisionOutcome.NEEDS_APPROVAL):
            assert d.action is RecoveryAction.SEND_PAYMENT_LINK


def test_negative_ev_small_amounts_are_stopped():
    from datetime import datetime, timezone

    from app.schemas.transactions import Transaction

    # auth failure on a micro-amount: every action's cost exceeds probable recovery
    txn = Transaction(
        transaction_id="txn_neg_ev_test",
        amount_inr=15.0,
        payment_method="upi",
        status=TxnStatus.FAILED,
        failure_code="AUTHENTICATION_FAILED",
        failure_category=FailureCategory.CUSTOMER_RELATED,
        timestamp=datetime.now(timezone.utc),
        customer_reference="cust_test",
    )
    d = decide(txn)
    assert d.outcome is DecisionOutcome.STOPPED
    assert "expected value" in d.reason or "no viable" in d.reason


def test_risk_transactions_always_escalate_with_human():
    _, plan = _setup()
    risk = [d for d in plan.escalations if d.failure_category == "risk_related"]
    assert risk
    for d in risk:
        assert d.action is RecoveryAction.ESCALATE_HUMAN
        assert d.requires_approval
        assert d.recovery_probability == 0.0


def test_high_value_automatable_actions_require_approval():
    _, plan = _setup()
    for d in plan.queue + plan.escalations:
        if d.amount_inr >= 25_000 and d.action is not RecoveryAction.STOP \
                and d.action is not RecoveryAction.ESCALATE_HUMAN:
            assert d.requires_approval


def test_queue_ranked_by_expected_value_desc():
    _, plan = _setup()
    evs = [d.expected_recovery_value_inr for d in plan.queue]
    assert evs == sorted(evs, reverse=True)
    assert all(d.rank == i for i, d in enumerate(plan.queue, 1))


def test_plan_is_blind_to_ground_truth():
    """Scrambling gt fields must not change the plan."""
    txns_a = generate_batch(seed=99, n_total=300)
    txns_b = generate_batch(seed=99, n_total=300)
    for t in txns_b:
        t.gt_action_probabilities = {}
        t.gt_best_action = None
        t.gt_recoverable = False
    plan_a = build_plan(txns_a, detect(txns_a))
    plan_b = build_plan(txns_b, detect(txns_b))
    key = lambda d: (d.transaction_id, d.action.value,  # noqa: E731
                     d.expected_recovery_value_inr, d.outcome.value)
    assert sorted(map(key, plan_a.all_decisions)) == sorted(map(key, plan_b.all_decisions))
