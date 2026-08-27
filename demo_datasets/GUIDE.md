# Comprehensive Guide: Datasets & Upload Analysis in RevGuard-AI

This guide provides everything you need to test, evaluate, and explore the **Upload & Instant Leakage Audit** feature in RevGuard-AI, including dataset specifications, step-by-step UI instructions, failure code taxonomy, and external data sources.

---

## 📑 Table of Contents
1. [Overview of Demo Datasets](#-overview-of-demo-datasets)
2. [Step-by-Step UI Upload Guide](#-step-by-step-ui-upload-guide)
3. [Deep-Dive into Demo Scenarios](#-deep-dive-into-demo-scenarios)
4. [External Websites & Sources for Datasets](#-external-websites--sources-for-datasets)
5. [Data Schema & Format Reference](#-data-schema--format-reference)
6. [Failure Code Taxonomy & AI Actions](#-failure-code-taxonomy--ai-actions)

---

## 📁 Overview of Demo Datasets

The `demo_datasets/` directory contains 4 pre-built, realistic transaction files covering different payment failure ecosystems:

| File Name | Format | Records | Primary Use Case / Focus |
| :--- | :--- | :--- | :--- |
| [`razorpay_payments_export_aug2026.csv`](./razorpay_payments_export_aug2026.csv) | **Razorpay CSV** | 140 | E-commerce merchant export with UPI collect timeouts, 3DS authentication drops, and expired cards. Amounts in paise. |
| [`generic_payment_failures_q3.csv`](./generic_payment_failures_q3.csv) | **Generic CSV** | 160 | B2C/SaaS subscription recurring billing log with retry exhaustion, insufficient funds, and risk blocks in standard INR. |
| [`ecommerce_failures_aug2026.xlsx`](./ecommerce_failures_aug2026.xlsx) | **Excel (.xlsx)** | 100 | Multi-category spreadsheet with Netbanking gateway downtime, OTP expiry, and card 3DS authentication drops. |
| [`razorpay_high_ticket_b2b_leakage.csv`](./razorpay_high_ticket_b2b_leakage.csv) | **Razorpay CSV** | 85 | High-ticket B2B invoice collection (₹25,000 – ₹2,50,000) with corporate limit switches and webhook drops. |

---

## 🚀 Step-by-Step UI Upload Guide

Follow these steps to analyze any dataset in isolation without modifying the live database:

1. **Open the Dashboard**: Go to [http://localhost:5173](http://localhost:5173) in your browser.
2. **Navigate to Upload & Analyze**: Click on **📁 Upload & Analyze** in the left sidebar navigation.
3. **Select Format**: Choose the matching format card:
   - **Razorpay CSV**: Select when uploading exports from the Razorpay Merchant Dashboard (`amount` in paise, Razorpay column headers).
   - **Generic CSV**: Select for standard payment logs (`amount_inr`, standard failure categories).
   - **Excel (.xlsx)**: Select for Excel workbooks containing payment sheets.
4. **Choose File**: Click **Browse / Choose File** and select any file from `demo_datasets/`.
5. **Run Analysis**: Click **Analyze File**.
6. **Review Insights**:
   - **Financial Volume**: Total volume, lost revenue, and success vs failure percentages.
   - **Breakdowns**: Failure distribution by category and payment rail (UPI, Card, Netbanking, Wallet).
   - **Leakage Clusters**: AI-grouped failure patterns ranked by economic severity with root cause diagnostics and suggested recovery actions.

---

## 🔍 Deep-Dive into Demo Scenarios

### Scenario 1: E-Commerce Festival Sale (`razorpay_payments_export_aug2026.csv`)
- **Simulated Event**: High-volume retail checkout during a festive promotion.
- **Leakage Detected**:
  - `3DS_TIMEOUT` (15 txns): Customers abandoning the OTP challenge page on mobile checkouts.
  - `GATEWAY_TIMEOUT` (12 txns): Transient bank switch latency under peak load.
  - `CARD_EXPIRED` (11 txns): Stale saved card tokens in customer wallets.
- **AI Recommendation**: Automated smart retry for timeouts; instant WhatsApp/SMS notification for expired cards.

### Scenario 2: SaaS Recurring Billing (`generic_payment_failures_q3.csv`)
- **Simulated Event**: End-of-month subscription renewal runs.
- **Leakage Detected**:
  - `INSUFFICIENT_FUNDS`: Salary cycle timing mismatch on customer debit cards.
  - `FRAUD_SUSPECTED`: High-velocity cards blocked by risk policy.
- **AI Recommendation**: Immediate retries stopped to prevent card churn; customer payment links dispatched with a 3-day grace window.

### Scenario 3: Corporate B2B Invoicing (`razorpay_high_ticket_b2b_leakage.csv`)
- **Simulated Event**: B2B enterprise supplier invoice settlements.
- **Leakage Detected**:
  - `BANK_UNAVAILABLE`: RTGS/NEFT batch settlement cutoff window.
  - `CONFIG_ERROR`: Webhook signature mismatch on corporate accounting integration.
- **AI Recommendation**: Human escalation for high-value exposures exceeding ₹1,00,000 policy threshold.

---

## 🌐 External Websites & Sources for Datasets

If you want to test RevGuard with other real-world, open-access, or synthetic datasets, check these recommended sources:

### 1. Kaggle Open FinTech Datasets
- **[PaySim Mobile Money Dataset](https://www.kaggle.com/datasets/ealaxi/paysim1)**
  - Millions of simulated mobile money payments with rail types, balance changes, and fraud flags.
- **[Credit Card Transactions Dataset](https://www.kaggle.com/datasets/kartik2112/fraud-detection)**
  - Synthesized transaction histories with merchant categories, decline codes, and amounts.
- **[Olist Brazilian E-Commerce Dataset](https://www.kaggle.com/datasets/olistbr/brazilian-ecommerce)**
  - 100k real customer orders across credit cards, debit cards, vouchers, and bank payment slips.

### 2. Live Merchant Dashboard Exports
- **Razorpay**: Log in to [dashboard.razorpay.com](https://dashboard.razorpay.com) → **Transactions → Payments → Export as CSV**.
- **Stripe**: Log in to [dashboard.stripe.com](https://dashboard.stripe.com) → **Payments → Export**. (Map columns to Generic CSV format).

### 3. Regulatory & Central Bank Open Statistics
- **[NPCI Product Statistics](https://www.npci.org.in/what-we-do/upi/product-statistics)**: Official UPI, IMPS, and AePS volume and decline statistics from the National Payments Corporation of India.
- **[RBI Payment System Indicators](https://www.rbi.org.in)**: Official monthly volume and value indicators for Indian payment ecosystems.

### 4. Machine Learning & Tabular Repositories
- **[Hugging Face Datasets Hub](https://huggingface.co/datasets?search=fintech+transactions)**: Open datasets formatted in CSV, Parquet, and JSON.
- **[UCI Machine Learning Repository](https://archive.ics.uci.edu/datasets)**: Financial and default payment datasets.

### 5. Synthetic Data Generators
- **[Mockaroo](https://www.mockaroo.com)**: Generate custom CSVs matching RevGuard schemas.

---

## 📋 Data Schema & Format Reference

### 1. Razorpay CSV Schema
Export format matching Razorpay Payments export:
```csv
payment_id,order_id,amount,currency,status,method,error_code,error_description,created_at,customer_email,customer_contact,notes
pay_RZP_1029384,order_ORD_4421,450000,INR,failed,card,GATEWAY_TIMEOUT,"Bank network unresponsive",2026-08-25 14:20:00,user@domain.com,+919876543210,"{}"
```
*Note: Amount is parsed in paise (`450000` = ₹4,500.00).*

### 2. Generic CSV / Excel Schema
Standard column headers:
```csv
transaction_id,amount_inr,currency,payment_method,status,failure_code,failure_category,retry_count,timestamp,customer_reference,subscription_reference
txn_GEN_9928172,3499.00,INR,card,failed,CARD_EXPIRED,payment_method_related,1,2026-08-25 10:15:00,+919876543210,sub_saas_102
```

---

## 🧠 Failure Code Taxonomy & AI Actions

RevGuard maps over 20+ payment error codes to deterministic policy categories and automated actions:

| Failure Code | Category | Automated Action | Policy Rule |
| :--- | :--- | :--- | :--- |
| `GATEWAY_TIMEOUT`, `NETWORK_ERROR`, `ISSUER_BUSY`, `SYSTEM_ERROR` | **Transient** | `RETRY_PAYMENT` | Exponential backoff (max 3 retries) |
| `INSUFFICIENT_FUNDS` | **Customer Related** | `SEND_PAYMENT_LINK` | Delay retry; provide payment link |
| `AUTHENTICATION_FAILED`, `CUSTOMER_ABORTED` | **Customer Related** | `NOTIFY_CUSTOMER` | Prompt customer to re-authenticate |
| `CARD_EXPIRED`, `INVALID_CARD_DETAILS` | **Payment Method** | `NOTIFY_CUSTOMER` | Request updated card details |
| `UPI_COLLECT_DECLINED`, `BANK_UNAVAILABLE` | **Payment Method** | `SEND_PAYMENT_LINK` | Offer alternate payment rail |
| `3DS_TIMEOUT`, `ACS_UNAVAILABLE` | **3D Secure** | `RETRY_PAYMENT` | Delayed retry with secondary gateway |
| `OTP_EXPIRED`, `FACE_MATCH_FAILED`, `PIN_BLOCKED` | **Biometric** | `NOTIFY_CUSTOMER` | Alternate biometric / PIN prompt |
| `FRAUD_SUSPECTED`, `RISK_BLOCKED`, `CARD_BLOCKED` | **Risk Related** | `ESCALATE_HUMAN` | **Hard Stop**: Policy SC-01 blocks auto-retry |
