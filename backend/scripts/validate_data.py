"""Validate a generated batch: schema integrity + expected distributions."""

from __future__ import annotations

import sys
from collections import Counter

from app.data.synthetic_generator import generate_batch
from app.schemas.transactions import FailureCategory, TxnStatus


def main() -> int:
    txns = generate_batch()
    errors: list[str] = []

    if len(txns) < 50:
        errors.append(f"batch too small: {len(txns)} < 50 (ER-01)")

    ids = [t.transaction_id for t in txns]
    if len(set(ids)) != len(ids):
        errors.append("duplicate transaction_ids found")

    failed = [t for t in txns if t.status == TxnStatus.FAILED]
    cats = Counter(t.failure_category for t in failed)
    for required in FailureCategory:
        if cats.get(required, 0) == 0:
            errors.append(f"no transactions for category {required.value}")

    recoverable = [t for t in failed if t.gt_recoverable]
    if not recoverable:
        errors.append("no recoverable ground-truth transactions")

    print(f"total={len(txns)} success={len(txns)-len(failed)} failed={len(failed)}")
    for cat, n in cats.most_common():
        print(f"  {cat.value:<24} {n}")
    print(f"recoverable(gt)={len(recoverable)} "
          f"revenue_at_risk=₹{sum(t.amount_inr for t in failed):,.0f}")

    if errors:
        print("\nVALIDATION FAILED:")
        for e in errors:
            print(f" - {e}")
        return 1
    print("\nvalidation OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
