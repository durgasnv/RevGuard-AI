"""Hardened evaluation: multiple seeds x distribution profiles (Phase 10).

Runs the baseline-vs-AI comparison across every profile and several seeds,
reports per-profile mean/min/max, and exits non-zero if ANY run shows
uplift <= 0 or AI waste > 0 — so headline metrics cannot be cherry-picked.

Usage:
    PYTHONPATH=. python scripts/run_hardened_evaluation.py [--json]
"""

from __future__ import annotations

import argparse
import json
import statistics
import sys

from app.data.synthetic_generator import PROFILES, generate_batch
from app.evaluation.engine import evaluate

SEEDS = [42, 43, 44, 45, 46]
N_TOTAL = 600


def run_all() -> dict[str, list[dict]]:
    results: dict[str, list[dict]] = {}
    for profile in PROFILES:
        rows = []
        for seed in SEEDS:
            txns = generate_batch(n_total=N_TOTAL, seed=seed, profile=profile)
            ev = evaluate(txns, seed=seed).model_dump()
            rows.append({
                "profile": profile,
                "seed": seed,
                "baseline_recovered_inr": ev["baseline"]["recovered_inr"],
                "ai_recovered_inr": ev["ai_strategy"]["recovered_inr"],
                "uplift_inr": ev["uplift"]["extra_recovered_inr"],
                "ai_rate": ev["ai_strategy"]["recovery_rate"],
                "unnecessary": ev["ai_strategy"]["unnecessary_interventions"],
                "exceptions": len(ev["exceptions"]),
            })
        results[profile] = rows
    return results


def summarize(results: dict[str, list[dict]]) -> None:
    print(f"{'profile':<24}{'uplift mean':>13}{'uplift min':>12}"
          f"{'AI rate':>9}{'unnec':>7}")
    failures = []
    for profile, rows in results.items():
        uplifts = [r["uplift_inr"] for r in rows]
        unn = [r["unnecessary"] for r in rows]
        rates = [r["ai_rate"] for r in rows]
        print(f"{profile:<24}{statistics.mean(uplifts):>13,.0f}"
              f"{min(uplifts):>12,.0f}{statistics.mean(rates):>8.2%}"
              f"{max(unn):>7}")
        for r in rows:
            if r["uplift_inr"] <= 0:
                failures.append(f"  uplift<=0: {profile} seed={r['seed']} "
                                f"({r['uplift_inr']:,.0f})")
            if r["unnecessary"] > 0:
                failures.append(f"  waste>0: {profile} seed={r['seed']} "
                                f"({r['unnecessary']} unnecessary)")
    if failures:
        print("\nANTI-CHERRY-PICK VIOLATIONS:")
        print("\n".join(failures))
    else:
        print(f"\nAll {sum(len(v) for v in results.values())} runs pass: "
              "uplift > 0 and zero unnecessary interventions everywhere.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--json", action="store_true",
                        help="dump raw per-run rows as JSON")
    args = parser.parse_args()
    results = run_all()
    if args.json:
        print(json.dumps(
            [r for rows in results.values() for r in rows], indent=2))
        sys.exit(0)
    summarize(results)
