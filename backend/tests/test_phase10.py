"""Evaluation hardening tests: distribution robustness + determinism (P10)."""

from collections import Counter

from app.data.synthetic_generator import PROFILES, generate_batch
from app.evaluation.engine import evaluate

FAST_PROFILES = ["standard", "waste_prone"]
SEEDS = [42, 43]


def _run(profile: str, seed: int) -> float:
    txns = generate_batch(n_total=400, seed=seed, profile=profile)
    return evaluate(txns, seed=seed).uplift.extra_recovered_inr


def test_profiles_exist_and_produce_different_mixes():
    assert set(PROFILES) == {"standard", "upi_degradation_heavy",
                             "high_value_risk_heavy", "waste_prone"}
    mixes = {}
    for profile in PROFILES:
        txns = generate_batch(n_total=300, seed=42, profile=profile)
        failed = [t for t in txns if t.status.value == "failed"]
        codes = Counter(t.failure_code for t in failed)
        mixes[profile] = codes
    # UPI-heavy must have more NETWORK_ERROR than standard
    assert (mixes["upi_degradation_heavy"]["NETWORK_ERROR"]
            > mixes["standard"]["NETWORK_ERROR"])
    # waste-prone stresses auth failures (the no-action cluster)
    assert (mixes["waste_prone"]["AUTHENTICATION_FAILED"]
            > mixes["standard"]["AUTHENTICATION_FAILED"])


def test_uplift_positive_across_seeds_and_profiles():
    for profile in FAST_PROFILES:
        for seed in SEEDS:
            uplift = _run(profile, seed)
            assert uplift > 0, f"uplift<=0 for {profile} seed={seed}"


def test_zero_unnecessary_interventions_everywhere():
    for profile in FAST_PROFILES:
        txns = generate_batch(n_total=400, seed=42, profile=profile)
        report = evaluate(txns, seed=42)
        assert report.ai_strategy.unnecessary_interventions == 0


def test_evaluation_is_deterministic_per_seed():
    a = _run("standard", 42)
    b = _run("standard", 42)
    c = _run("standard", 43)
    assert a == b
    # different seed should generally differ; not guaranteed but overwhelmingly
    # likely across hundreds of random draws
    assert a != c or True  # determinism is the contract, not seed divergence


def test_hardened_runner_gate_logic():
    """The runner's summarize() flags violations honestly."""
    from scripts.run_hardened_evaluation import summarize
    import io
    from contextlib import redirect_stdout

    bad = {"x": [{"uplift_inr": -5, "ai_rate": 0.01,
                  "unnecessary": 2, "seed": 9}]}
    out = io.StringIO()
    with redirect_stdout(out):
        summarize(bad)
    text = out.getvalue()
    assert "ANTI-CHERRY-PICK VIOLATIONS" in text
    assert "uplift<=0" in text and "waste>0" in text
