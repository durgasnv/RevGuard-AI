#!/usr/bin/env python3
"""Weekly digest generator for RevGuard-AI.

Generates a summary report from the last 7 days of transactions and
writes it to stdout (or a file). Intended to be run by cron.

Usage:
    python scripts/weekly_digest.py [--period 7d] [--output report.json]
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

# Allow running from repo root
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.data.synthetic_generator import generate_batch
from app.notifications.summary import generate_summary


def main() -> None:
    parser = argparse.ArgumentParser(description="RevGuard-AI weekly digest")
    parser.add_argument("--period", default="7d",
                        help="Lookback period label (default: 7d)")
    parser.add_argument("--output", "-o", default=None,
                        help="Write JSON to file instead of stdout")
    parser.add_argument("--seed", type=int, default=42,
                        help="RNG seed for synthetic data if store is empty")
    parser.add_argument("--n-total", type=int, default=300,
                        help="Number of synthetic txns to generate if store is empty")
    args = parser.parse_args()

    # In a production deployment this would read from a persistent store.
    # For demo/dev we generate a batch to summarise.
    txns = generate_batch(n_total=args.n_total, seed=args.seed, profile="standard")

    summary = generate_summary(txns, period_label=f"weekly_{args.period}")

    output = json.dumps(summary, indent=2, default=str)
    if args.output:
        Path(args.output).write_text(output, encoding="utf-8")
        print(f"Digest written to {args.output}", file=sys.stderr)
    else:
        print(output)


if __name__ == "__main__":
    main()
