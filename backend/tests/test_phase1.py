from app.data.synthetic_generator import generate_batch
from app.evaluation.baseline import baseline_plan
from app.schemas.transactions import FailureCategory, RecoveryAction, TxnStatus


def test_batch_meets_evaluation_minimum():
    txns = generate_batch(n_total=100)
    assert len(txns) == 100


def test_all_six_failure_categories_present():
    failed = [t for t in generate_batch() if t.status == TxnStatus.FAILED]
    cats = {t.failure_category for t in failed}
    assert cats >= set(FailureCategory)


def test_ground_truth_consistency():
    for t in generate_batch():
        if t.gt_recoverable:
            assert t.gt_best_action and t.gt_action_probabilities[t.gt_best_action] > 0
        else:
            assert not t.gt_action_probabilities


def test_baseline_retries_retryable_and_stops_on_hard_codes():
    plan = baseline_plan(generate_batch())
    actions = {a for _, a in plan}
    assert RecoveryAction.RETRY_PAYMENT in actions
    assert RecoveryAction.STOP in actions
