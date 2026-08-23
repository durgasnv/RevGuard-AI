from app.data.synthetic_generator import generate_batch
from app.evaluation.baseline import baseline_plan
from app.evaluation.runner import run_plan
from app.integrations.base import (
    ProviderAction,
    ProviderRequest,
    ProviderStatus,
)
from app.integrations.simulator import PaymentSimulator
from app.schemas.transactions import RecoveryAction, TxnStatus


def test_simulator_recovers_revenue():
    provider = PaymentSimulator(seed=7)
    results, _ = run_plan(baseline_plan(generate_batch(n_total=200)), provider,
                          actor="baseline")
    recovered = [r for _, _, r in results if r.status == ProviderStatus.RECOVERED]
    assert recovered


def test_duplicate_idempotency_key_blocked():
    provider = PaymentSimulator()
    txn = next(
        t for t in generate_batch(n_total=50)
        if t.status == TxnStatus.FAILED
        and t.gt_action_probabilities.get("RETRY_PAYMENT", 0) > 0
    )
    req = ProviderRequest(
        idempotency_key="fixed-key",
        action=ProviderAction.RETRY_PAYMENT,
        transaction=txn,
    )
    assert provider.execute(req).status != ProviderStatus.DUPLICATE
    assert provider.execute(req).status == ProviderStatus.DUPLICATE


def test_injected_failure_handled_gracefully():
    provider = PaymentSimulator(seed=3)
    target = next(
        t for t in generate_batch(n_total=100)
        if t.status == TxnStatus.FAILED and t.gt_action_probabilities
    )
    provider.inject_failure(target.transaction_id)

    action = RecoveryAction(target.gt_best_action)
    resp = provider.execute(ProviderRequest(
        idempotency_key=f"sim:{action.value}:{target.transaction_id}",
        action=ProviderAction(action.value),
        transaction=target,
    ))
    assert resp.status == ProviderStatus.FAILED
    assert resp.reason == "injected_provider_failure"
