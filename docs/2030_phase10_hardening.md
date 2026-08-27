# Phase 10 — Evaluation Hardening

## Goal

Ensure the claims made by the product are defensible: uplift is positive across multiple seeds and distribution profiles, zero unnecessary interventions holds everywhere, and results cannot be cherry-picked.

## What We Did

- Built four distribution profiles (`backend/app/data/synthetic_generator.py`):
  - `standard`: balanced mix (default).
  - `upi_degradation_heavy`: concentrated transient UPI failures — stresses burst detection and retry strategy.
  - `high_value_risk_heavy`: more fraud blocks and high-value failures — stresses escalation and policy gating.
  - `waste_prone`: more auth failures and expired cards — stresses unnecessary-intervention prevention.
- Built the hardened evaluation runner (`backend/scripts/run_hardened_evaluation.py`):
  - Runs 4 profiles × 5 seeds (42–46) = 20 evaluation runs.
  - Reports per-profile mean/min/max uplift and AI rate.
  - Exits non-zero with `ANTI-CHERRY-PICK VIOLATIONS` if ANY run shows uplift ≤ 0 or AI waste > 0.
  - Supports `--json` output for programmatic consumption.
- Added `PROFILES` export from the synthetic generator so tests and scripts share the profile set.
- Verified determinism: same seed + same profile = identical results across runs.

## Key Design Decisions

1. **Multi-seed × multi-profile prevents cherry-picking.** A single lucky run doesn't prove anything; 20 runs across different distributions with consistent positive uplift does.
2. **Anti-cherry-pick gate is binary.** No "mostly good" — if any single run fails, the whole evaluation fails. This is the standard for honest claims.
3. **Profiles stress different failure modes.** `waste_prone` maximizes auth-failure transactions (where the baseline wastes the most retries); `high_value_risk_heavy` maximizes escalation-heavy scenarios; `upi_degradation_heavy` maximizes burst recovery. Each profile tests a different hypothesis.
4. **Determinism is a contract.** Same inputs must produce same outputs — the test `test_evaluation_is_deterministic_per_seed` verifies this. If results vary with identical inputs, the evaluation is not reproducible.

## Test Coverage (test_phase10.py)

- `test_profiles_exist_and_produce_different_mixes`: profile-specific failure distributions are statistically distinct.
- `test_uplift_positive_across_seeds_and_profiles`: uplift > 0 for every profile × seed combination.
- `test_zero_unnecessary_interventions_everywhere`: AI waste = 0 for all profiles.
- `test_evaluation_is_deterministic_per_seed`: same seed = same result.
- `test_hardened_runner_gate_logic`: the summarize() function correctly flags violations.

## How to Run

```bash
PYTHONPATH=backend .venv/bin/python backend/scripts/run_hardened_evaluation.py
PYTHONPATH=backend .venv/bin/python -m pytest backend/tests/test_phase10.py -q
```

## Limitations / Next

- Profiles are hand-crafted; no automated generation from real merchant data.
- 20 runs is a small sample; production claims would need hundreds.
- The hardened runner doesn't yet produce a publishable report format — output is console text.
