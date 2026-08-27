# Design Gaps — Identified Issues and Solutions

## Issue 1: Dashboard Dependency — Why Would a Merchant Open It?

### The Problem

The current system requires the merchant to:
1. Open the dashboard
2. Navigate through tabs (Overview, Leakage, Queue, Audit)
3. Review clusters, diagnoses, and queue items
4. Approve high-value actions manually

A busy merchant operations manager will not do this daily. If the product depends on manual dashboard interaction, it fails in practice.

### The Answer

**The dashboard is not the product. The automated recovery is.**

The dashboard exists for two purposes only:
1. **Audit trail** — when something goes wrong and you need to prove what happened.
2. **Approval interface** — the 5% of cases that require human judgment (high-value transactions ≥ ₹25,000).

Everything else is automated. The merchant never *needs* to open the dashboard if the system is working correctly.

### Solution: Proactive Notification Layer

Instead of expecting the merchant to come to the system, the system goes to the merchant.

#### 1. One-Liner Summary (Per Recovery Run)

After every `POST /run`, generate a plain-English summary:

```
271 failures detected · ₹26.7L at risk
AI recovered ₹1.76L across 81 transactions (6.6% rate)
12 items need your approval (high-value ≥ ₹25k)
No action needed on the rest.
Uplift vs naive retry: +₹15k (+0.57pp)
```

This is the entire product experience for a merchant who doesn't want to open the dashboard. One message, read in 10 seconds, done.

**Delivery channels:**
- Email digest (daily or per-run)
- WhatsApp/SMS via integration (Indian merchants live on WhatsApp)
- Slack/Teams webhook for tech-savvy teams

#### 2. Approval-Only Notifications

The merchant only needs to act when:
- A transaction ≥ ₹25,000 requires approval
- A risk-related case needs human review
- A provider failure occurs that might need manual intervention

Everything else (retry, payment link, notify customer) runs automatically. The notification says:

```
APPROVAL NEEDED: ₹45,000 transaction (NETWORK_ERROR)
AI recommends: RETRY_PAYMENT (p=0.55, EV=₹24,745)
Approve: https://dashboard.example.com/approve/txn_abc123
Ignore: no action taken
```

One tap to approve, or ignore and the system stops. No dashboard visit required.

#### 3. Weekly Digest

Instead of daily dashboard visits, generate a weekly summary:

```
Week of Aug 18–24:
  ₹4.2L at risk across 340 failures
  ₹3.1L recovered (74% rate)
  3 items escalated to human review
  AI outperformed naive retry by +₹89k
  Top issue: UPI network degradation (43 txns, ₹2.1L)
```

This gives the merchant a high-level health check without requiring any interaction.

#### 4. One-Click "Review and Approve" Flow

When approvals are needed, the notification includes a deep link that:
1. Opens the dashboard directly to the Queue tab
2. Pre-filters to pending approvals
3. Shows a single "Approve All" button

The merchant clicks one link, taps one button, done. Total time: 15 seconds.

### Implementation

| Component | Location | Status |
|---|---|---|
| Summary generation | `POST /run` response already contains plan + execution counts | Done (response body) |
| Email/WhatsApp delivery | New `backend/app/notifications/` module | To build |
| Approval deep links | Frontend route `/approve/:txn_id` | To build |
| Weekly digest script | `backend/scripts/weekly_digest.py` | To build |

---

## Issue 2: Limited Failure Taxonomy — Real-World Errors Not Covered

### The Problem

The current 6-category failure taxonomy was designed for standard e-commerce payment failures:

| Current Category | Examples |
|---|---|
| `transient` | NETWORK_ERROR, GATEWAY_TIMEOUT |
| `customer_related` | INSUFFICIENT_FUNDS, AUTHENTICATION_FAILED |
| `payment_method_related` | CARD_EXPIRED, UPI_COLLECT_DECLINED |
| `retry_exhausted` | Derived: retry_count ≥ limit |
| `risk_related` | FRAUD_SUSPECTED, RISK_BLOCKED |
| `business_integration` | INVALID_REQUEST, CONFIG_ERROR |

This taxonomy misses real-world failure modes:
- **Biometric failures**: Face recognition, fingerprint, OTP expiry, PIN block
- **Device/hardware errors**: Card swipe failure, chip read error, NFC failure
- **Account-type restrictions**: Trading account frozen, demat blocked, KYC pending
- **3D Secure failures**: ACS unavailable, cardholder cancelled 3DS

### The Answer

Expand the taxonomy with 4 new categories. Each category has a different recovery action — the strategy engine needs these distinctions to pick the right intervention.

### Solution: Expanded Failure Taxonomy

#### New Categories

| Category | Failure Codes | Retryable? | Recovery Action | Example Scenario |
|---|---|---|---|---|
| `biometric_failure` | FACE_MATCH_FAILED, FINGERPRINT_FAILED, OTP_EXPIRED, PIN_BLOCKED, BIOMETRIC_TIMEOUT | No — customer must re-authenticate | NOTIFY_CUSTOMER with instructions | UPI ₹100k+ mandate requires face auth; customer's face doesn't match |
| `device_hardware` | CARD_READ_ERROR, CHIP_READ_FAILED, SWIPE_ERROR, NFC_FAILED, PRINTER_LOW | Conditional — retry on different terminal | RETRY_PAYMENT (different terminal) or ESCALATE_HUMAN | POS terminal chip reader malfunction |
| `account_restriction` | ACCOUNT_FROZEN, DEMAT_BLOCKED, TRADING_SUSPENDED, KYC_PENDING, COMPLIANCE_HOLD | No — regulatory/account issue | ESCALATE_HUMAN to compliance team | Trading account frozen due to regulatory action |
| `3ds_authentication` | 3DS_FAILED, ACS_UNAVAILABLE, CARDHOLDER_CANCELLED_3DS, 3DS_TIMEOUT | Conditional — customer can retry | RETRY_PAYMENT with 3DS retry | 3D Secure page timed out; customer can retry |

#### Why Each Category Needs Different Handling

**Biometric failures** — The customer is physically present but the authentication step failed. The correct action is to tell the customer to try a different method (fingerprint instead of face, OTP instead of biometric). Sending a payment link doesn't help — the customer is standing at the terminal.

**Device/hardware errors** — The payment instrument is fine, the customer is fine, but the terminal is broken. The correct action is to retry on a different terminal or route the payment through a different channel (QR code instead of card swipe).

**Account restrictions** — This is a regulatory/compliance issue, not a payment issue. No automated recovery action can fix a frozen account. The correct action is to escalate to the compliance team and notify the merchant's account manager.

**3D Secure failures** — The customer's bank ACS (Access Control Server) was unavailable or the customer cancelled the 3DS prompt. This is different from a basic authentication failure — the customer may succeed on retry. The correct action is to retry with the same method after a short delay.

#### Updated Classifier Mapping

```python
# New codes added to classifier.py

BIOMETRIC_CODES = {
    "FACE_MATCH_FAILED", "FINGERPRINT_FAILED",
    "OTP_EXPIRED", "PIN_BLOCKED", "BIOMETRIC_TIMEOUT",
}

DEVICE_HARDWARE_CODES = {
    "CARD_READ_ERROR", "CHIP_READ_FAILED",
    "SWIPE_ERROR", "NFC_FAILED", "PRINTER_LOW",
}

ACCOUNT_RESTRICTION_CODES = {
    "ACCOUNT_FROZEN", "DEMAT_BLOCKED",
    "TRADING_SUSPENDED", "KYC_PENDING", "COMPLIANCE_HOLD",
}

THREE_DS_CODES = {
    "3DS_FAILED", "ACS_UNAVAILABLE",
    "CARDHOLDER_CANCELLED_3DS", "3DS_TIMEOUT",
}
```

#### Updated EV Model Priors

```python
# New category priors in ev_model.py

FailureCategory.BIOMETRIC_FAILURE: {
    RecoveryAction.RETRY_PAYMENT: 0.0,      # not a payment issue
    RecoveryAction.SEND_PAYMENT_LINK: 0.10,  # customer can pay later via link
    RecoveryAction.NOTIFY_CUSTOMER: 0.45,    # tell customer to retry with different auth
},
FailureCategory.DEVICE_HARDWARE: {
    RecoveryAction.RETRY_PAYMENT: 0.50,      # retry on different terminal
    RecoveryAction.SEND_PAYMENT_LINK: 0.25,  # fallback to online payment
    RecoveryAction.NOTIFY_CUSTOMER: 0.15,
},
FailureCategory.ACCOUNT_RESTRICTION: {
    # policy-mandated zeros — no automated action can fix this
},
FailureCategory.THREE_DS_AUTHENTICATION: {
    RecoveryAction.RETRY_PAYMENT: 0.45,      # customer can retry 3DS
    RecoveryAction.SEND_PAYMENT_LINK: 0.30,
    RecoveryAction.NOTIFY_CUSTOMER: 0.20,
},
```

#### Dashboard Representation

The LeakageView would show these as distinct clusters:

```
HIGH  | Biometric auth failure (face match) | 12 txns | ₹1,85,000
      → "Customer must re-authenticate; notify with alternative method"

MEDIUM | Card reader hardware error | 8 txns | ₹67,500
      → "Retry on different terminal or route via QR code"

HIGH  | Trading account frozen (compliance) | 3 txns | ₹4,20,000
      → "No automated path — escalate to compliance team"

LOW   | 3DS page timeout | 15 txns | ₹2,34,000
      → "Customer can retry; payment link as fallback"
```

---

## Issue 3: File Format Support — Merchants Don't Have JSON

### The Problem

The current system accepts only raw JSON via `POST /ingest`:

```json
[
  {
    "transaction_id": "txn_001",
    "amount_inr": 5000.00,
    "payment_method": "upi",
    "status": "failed",
    "failure_code": "NETWORK_ERROR",
    "failure_category": "transient",
    "timestamp": "2025-01-15T10:30:00Z",
    "retry_count": 1,
    "customer_reference": "cust_abc"
  }
]
```

Real merchants don't have JSON. They have:
- CSV exports from Razorpay/PayU/CCAvence dashboards
- Excel spreadsheets from their accountant
- API responses from their payment gateway integration
- Manual transaction logs

### The Answer

The system should accept **any standard payment data format** and normalize it internally. The file format is a parser — not a system redesign.

### Solution: Multi-Format Ingestion

#### Supported Formats (Priority Order)

| Format | Extension | Source | Parser Complexity |
|---|---|---|---|
| **Razorpay CSV export** | `.csv` | Razorpay Dashboard → Transactions → Export | Low — column mapping |
| **Generic payment CSV** | `.csv` | Any payment gateway export | Low — flexible column detection |
| **Razorpay API JSON** | `.json` | Razorpay `/payments` API response | Minimal — already close to internal schema |
| **Excel workbook** | `.xlsx` | Accountant's monthly report | Medium — openpyxl dependency |
| **Manual entry** | `.csv` | Merchant fills a template | Low — template-based |

#### Razorpay CSV Format (Primary)

Razorpay exports CSVs with these columns:

```csv
payment_id,order_id,amount,currency,status,method,description,created_at,failure_code,failure_reason
pay_QxYz123,order_QxYz456,500000,INR,failed,upi,"Payment for order #123",2025-01-15 10:30:00,NODE_TIMEOUT,"Connection timed out"
```

**Key mapping:**
- `amount` is in **paise** (divide by 100 for INR)
- `status` maps to `TxnStatus` enum
- `method` maps to `payment_method`
- `failure_code` maps directly to our failure codes
- `created_at` maps to `timestamp`
- `payment_id` maps to `transaction_id`

#### Generic CSV Parser

For non-Razorpay CSVs, the parser uses flexible column detection:

```python
COLUMN_ALIASES = {
    "transaction_id": ["transaction_id", "txn_id", "payment_id", "id", "ref", "reference"],
    "amount_inr": ["amount_inr", "amount", "value", "total", "rupees", "inr"],
    "status": ["status", "state", "result"],
    "failure_code": ["failure_code", "error_code", "error", "reason_code"],
    "timestamp": ["timestamp", "created_at", "date", "time", "datetime"],
    "payment_method": ["payment_method", "method", "type", "mode"],
}
```

The parser tries each alias until it finds a match. If a column is missing, it uses sensible defaults (e.g., `status = "failed"` if `failure_code` is present).

#### API Endpoints

| Endpoint | Method | Content-Type | Description |
|---|---|---|---|
| `POST /ingest` | POST | `application/json` | Raw JSON (existing) |
| `POST /ingest/csv` | POST | `text/csv` or `multipart/form-data` | CSV file upload |
| `POST /ingest/razorpay` | POST | `application/json` | Razorpay API format |
| `POST /ingest/excel` | POST | `multipart/form-data` | Excel file upload |

#### Implementation

```python
# backend/app/ingestion/csv_parser.py

def parse_csv(file_content: str) -> list[Transaction]:
    """Parse a CSV file into Transaction objects."""
    reader = csv.DictReader(io.StringIO(file_content))
    transactions = []
    for row in reader:
        txn = _map_row_to_transaction(row)
        transactions.append(txn)
    return transactions

def _map_row_to_transaction(row: dict) -> Transaction:
    """Map a CSV row to a Transaction using column aliases."""
    mapped = {}
    for field, aliases in COLUMN_ALIASES.items():
        for alias in aliases:
            if alias in row and row[alias]:
                mapped[field] = row[alias]
                break
    return Transaction(**_normalize(mapped))
```

#### Frontend Upload

The dashboard adds a file upload component:

```
+-----------------------------------------+
|  Upload Transaction Data                |
|                                         |
|  +---------------------------------+    |
|  |  Drop CSV/Excel file here       |    |
|  |  or click to browse             |    |
|  +---------------------------------+    |
|                                         |
|  Supported: Razorpay CSV, Generic CSV,  |
|  Excel (.xlsx), JSON                    |
|                                         |
|  [Upload and Analyze]                   |
+-----------------------------------------+
```

#### File Format Summary

| File Type | What It Contains | Who Uses It |
|---|---|---|
| **Razorpay CSV** | Payment ID, order ID, amount (paise), status, method, failure code, timestamp | Merchants using Razorpay dashboard export |
| **Generic CSV** | Transaction reference, amount, status, failure reason, date | Merchants using other gateways (PayU, CCAvenue, etc.) |
| **Razorpay JSON** | Full API response from `/payments` endpoint | Developers integrating via API |
| **Excel (.xlsx)** | Spreadsheet with transaction data from accountant | Merchants who track manually |
| **JSON (existing)** | Normalized internal format | Direct API integration |

---

## Summary

| Issue | Root Cause | Solution |
|---|---|---|
| Dashboard dependency | Product requires manual interaction | Proactive notifications, approval-only alerts, weekly digests |
| Limited failure taxonomy | 6 categories miss real-world errors | Expand with biometric, hardware, account restriction, 3DS categories |
| JSON-only ingestion | Merchants have CSVs and Excel | Multi-format ingestion layer with flexible parsers |

All three solutions are additions, not rewrites. They extend the existing architecture without changing the core pipeline (detect -> diagnose -> strategy -> guard -> execute -> measure).
