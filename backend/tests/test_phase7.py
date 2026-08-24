from app.data.synthetic_generator import generate_batch
from app.evaluation.baseline import baseline_plan
from app.evaluation.engine import evaluate
from app.execution.executor import ActionExecutor
from app.integrations.base import ProviderAction, ProviderRequest
from app.integrations.simulator import PaymentSimulator
from app.policy.guard import PolicyGuard


def test_fair_simulator_is_order_and_instance_independent():
    txns = [t for t in generate_batch(n_total=200)
            if t.status.value == "failed" and t.gt_action_probabilities]
    txn = txns[0]
    action_value = next(a for a, p in txn.gt_action_probabilities.items() if p > 0)

    def outcome(instance_seed_offset=0):
        sim = PaymentSimulator(seed=42 + instance_seed_offset, fair=True)
        resp = sim.execute(ProviderRequest(
            idempotency_key=f"sim:{action_value}:{txn.transaction_id}",
            action=ProviderAction(action_value), transaction=txn))
        return resp.status.value

    assert outcome() == outcome() == outcome(instance_seed_offset=100)


def test_evaluation_end_to_end_consistency():
    r = evaluate(generate_batch(), seed=42)
    for m in (r.baseline, r.ai_strategy):
        assert m.recovered_inr <= m.revenue_at_risk_inr + 0.01
        assert abs(m.unrecovered_inr + m.recovered_inr - m.revenue_at_risk_inr) < 0.5
        assert 0 <= m.recovery_rate <= 1
        assert m.unnecessary_interventions >= 0
    assert r.uplift.extra_recovered_inr == round(
        r.ai_strategy.recovered_inr - r.baseline.recovered_inr, 2)


def test_ai_strategy_has_zero_unnecessary_interventions():
    """Priors learned from historical outcomes must not waste actions."""
    r = evaluate(generate_batch(), seed=42)
    assert r.ai_strategy.unnecessary_interventions == 0


def test_uplift_positive_on_standard_batch():
    r = evaluate(generate_batch(), seed=42)
    assert r.uplift.extra_recovered_inr > 0


def test_exception_report_is_honest_and_complete():
    r = evaluate(generate_batch(), seed=42)
    assert r.exceptions
    codes = {e.failure_code for e in r.exceptions}
    assert "FRAUD_SUSPECTED" in codes          # correctly escalated, not recovered
    total_unrecovered = sum(e.amount_inr for e in r.exceptions)
    assert abs(total_unrecovered - r.ai_strategy.unrecovered_inr) < 1.0


def test_both_strategies_run_through_identical_gate_rules():
    """Baseline gets the same policy protection as the AI queue."""
    txns = generate_batch()
    r = evaluate(txns, seed=42)
    failed = r.failed_count
    assert r.baseline.interventions_attempted > 0
    assert r.ai_strategy.interventions_attempted > 0
    # the naive baseline plans an action for EVERY failed txn; the shared
    # guard filters out retry-limit violations etc. before execution:
    assert len(baseline_plan(txns)) == failed
    assert r.baseline.interventions_attempted < failed
