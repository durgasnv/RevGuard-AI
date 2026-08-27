"""Parse CSV files into normalized Transaction objects.

Supports two modes:
  1. Generic CSV  — column names map directly to Transaction fields.
  2. Razorpay CSV — the export format used by the Razorpay dashboard.
"""

from __future__ import annotations

import csv
import io
import logging
import re
from datetime import datetime, timezone

from app.schemas.transactions import FailureCategory, Transaction, TxnStatus
from app.detection.classifier import FAILURE_CODE_CATEGORY

logger = logging.getLogger(__name__)


# ── Razorpay column name → Transaction field ──────────────────────────

_RAZORPAY_MAP = {
    "payment_id": "transaction_id",
    "order_id": "order_id",
    "amount": "amount_inr",            # Razorpay stores paise
    "currency": "currency",
    "status": "_status",               # handled separately
    "method": "payment_method",
    "error_code": "failure_code",
    "error_description": "_error_desc",
    "created_at": "timestamp",
    "customer_email": "_email",
    "customer_contact": "_phone",
    "notes": "_notes",
}

_RAZORPAY_STATUS_MAP = {
    "authorized": TxnStatus.SUCCESS,
    "captured": TxnStatus.SUCCESS,
    "refunded": TxnStatus.SUCCESS,
    "failed": TxnStatus.FAILED,
    "created": TxnStatus.PENDING,
    "attempted": TxnStatus.PENDING,
}


def _parse_razorpay_amount(raw: str | int | float) -> float:
    """Convert paise string/number to rupees."""
    val = float(str(raw).replace(",", "").strip())
    return round(val / 100.0, 2)


def _parse_timestamp(raw: str) -> datetime:
    """Parse various timestamp formats into a timezone-aware datetime."""
    raw = raw.strip()
    for fmt in ("%Y-%m-%d %H:%M:%S %z", "%Y-%m-%dT%H:%M:%S%z",
                "%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%d %H:%M:%S",
                "%d %b %Y %H:%M:%S", "%Y-%m-%d"):
        try:
            dt = datetime.strptime(raw, fmt)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt
        except ValueError:
            continue
    return datetime.now(timezone.utc)


def _sanitize_code(raw: str | None) -> str | None:
    """Uppercase and normalize a failure code from a CSV cell."""
    if not raw or not raw.strip():
        return None
    code = re.sub(r"[^A-Za-z0-9_]", "_", raw.strip().upper())
    return code if code else None


# ── Generic CSV parser ───────────────────────────────────────────────

def parse_csv(content: str) -> list[Transaction]:
    """Parse a generic CSV where columns match Transaction field names.

    Required columns: transaction_id, amount_inr, payment_method, status, timestamp.
    Optional: failure_code, failure_category, retry_count, currency,
              customer_reference, subscription_reference.
    """
    reader = csv.DictReader(io.StringIO(content))
    if reader.fieldnames is None:
        return []

    txns: list[Transaction] = []
    skipped = 0
    for row in reader:
        try:
            amount = float(str(row.get("amount_inr", 0)).replace(",", "").strip())
            status_raw = row.get("status", "failed").strip().lower()
            status = TxnStatus(status_raw) if status_raw in TxnStatus.__members__.values() else TxnStatus.FAILED

            failure_code = _sanitize_code(row.get("failure_code"))
            category_raw = row.get("failure_category", "").strip()
            failure_category: FailureCategory | None = None
            if category_raw:
                try:
                    failure_category = FailureCategory(category_raw)
                except ValueError:
                    failure_category = FAILURE_CODE_CATEGORY.get(failure_code) if failure_code else None
            elif failure_code:
                failure_category = FAILURE_CODE_CATEGORY.get(failure_code)

            retry_count = int(row.get("retry_count", 0) or 0)

            txn = Transaction(
                transaction_id=row["transaction_id"].strip(),
                amount_inr=amount,
                currency=row.get("currency", "INR").strip(),
                payment_method=row["payment_method"].strip(),
                status=status,
                failure_code=failure_code,
                failure_category=failure_category,
                timestamp=_parse_timestamp(row["timestamp"]),
                retry_count=retry_count,
                customer_reference=row.get("customer_reference", "").strip() or None,
                subscription_reference=row.get("subscription_reference", "").strip() or None,
            )
            txns.append(txn)
        except (KeyError, ValueError, TypeError):
            skipped += 1
            continue  # skip malformed rows
    if skipped:
        logger.warning("parse_csv: skipped %d malformed rows", skipped)
    return txns


# ── Razorpay CSV parser ─────────────────────────────────────────────

def parse_razorpay_csv(content: str) -> list[Transaction]:
    """Parse an export from the Razorpay Dashboard → Payments page.

    The header row contains Razorpay's column names; the function maps them
    to the internal Transaction schema, converts paise→rupees, and
    classifies failures automatically.
    """
    reader = csv.DictReader(io.StringIO(content))
    if reader.fieldnames is None:
        return []

    txns: list[Transaction] = []
    skipped = 0
    for row in reader:
        try:
            amount = _parse_razorpay_amount(row.get("amount", 0))
            status_raw = row.get("status", "").strip().lower()
            status = _RAZORPAY_STATUS_MAP.get(status_raw, TxnStatus.FAILED)

            failure_code = _sanitize_code(row.get("error_code"))
            failure_category = FAILURE_CODE_CATEGORY.get(failure_code) if failure_code else None

            method_raw = row.get("method", "upi").strip().lower()
            method_map = {"upi": "upi", "card": "card", "netbanking": "netbanking",
                          "wallet": "wallet", "emi": "card", "dd": "netbanking"}
            payment_method = method_map.get(method_raw, "upi")

            txn = Transaction(
                transaction_id=row.get("payment_id", "").strip() or f"rzp_{hash(row.get('order_id', ''))}",
                amount_inr=amount,
                currency=row.get("currency", "INR").strip() or "INR",
                payment_method=payment_method,
                status=status,
                failure_code=failure_code,
                failure_category=failure_category,
                timestamp=_parse_timestamp(row.get("created_at", "")),
                retry_count=0,
                customer_reference=row.get("customer_contact", "").strip() or None,
                subscription_reference=None,
            )
            txns.append(txn)
        except (KeyError, ValueError, TypeError):
            skipped += 1
            continue
    if skipped:
        logger.warning("parse_razorpay_csv: skipped %d malformed rows", skipped)
    return txns
