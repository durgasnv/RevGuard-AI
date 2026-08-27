# RevGuard-AI Sample Datasets & Sources

This directory contains realistic demo payment exports designed for testing the **Upload & Instant Leakage Audit** feature in RevGuard-AI.

---

## 📁 Included Demo Files

| File Name | Format Type | Rows | Scenario / Use Case |
| :--- | :--- | :--- | :--- |
| [`razorpay_payments_export_aug2026.csv`](./razorpay_payments_export_aug2026.csv) | **Razorpay CSV** | 140 | E-commerce merchant export containing transient UPI collect drops, card 3DS timeouts, and expired cards. Amounts in paise. |
| [`generic_payment_failures_q3.csv`](./generic_payment_failures_q3.csv) | **Generic CSV** | 160 | SaaS subscription recurring billing log with retry exhaustion, insufficient funds, and risk blocks in standard INR. |
| [`ecommerce_failures_aug2026.xlsx`](./ecommerce_failures_aug2026.xlsx) | **Excel (.xlsx)** | 100 | Multi-category spreadsheet with Netbanking gateway downtime, OTP expiry, and card 3DS authentication failures. |
| [`razorpay_high_ticket_b2b_leakage.csv`](./razorpay_high_ticket_b2b_leakage.csv) | **Razorpay CSV** | 85 | High-value B2B invoice collections (₹25,000 – ₹2,50,000) with corporate limit switches and webhook drops. |

---

## 🚀 How to Test in the RevGuard Dashboard

1. Open the RevGuard dashboard at [http://localhost:5173](http://localhost:5173).
2. Navigate to **Upload & Analyze** in the left sidebar.
3. Choose the corresponding format option:
   - For `.csv` from Razorpay: Select **Razorpay CSV**
   - For generic `.csv`: Select **Generic CSV**
   - For `.xlsx`: Select **Excel (.xlsx)**
4. Click **Choose File**, select any of the files in this `demo_datasets/` folder, and click **Analyze File**.
5. RevGuard will instantly compute:
   - **Total Transaction Volume & Lost Revenue**
   - **Success vs. Failure Rate**
   - **Category & Payment Method Breakdown**
   - **Ranked Failure Clusters with AI Diagnostics & Recommended Actions**

---

## 🌐 Recommended External Sources for Payment & FinTech Datasets

If you are looking for additional real-world or open-access payment transaction datasets, the following public resources are recommended:

### 1. **Kaggle FinTech & Payment Gateways Datasets**
- **Credit Card Transaction Data**: Contains millions of simulated transactions with fraud indicators, merchant categories, and card types.
  - Link: [kaggle.com/datasets/ealaxi/paysim1](https://www.kaggle.com/datasets/ealaxi/paysim1) (PaySim Mobile Money dataset)
  - Link: [kaggle.com/datasets/kartik2112/fraud-detection](https://www.kaggle.com/datasets/kartik2112/fraud-detection) (Synthesized Credit Card Transactions)
- **E-Commerce Payment Logs (Olist Store)**: Brazilian e-commerce public dataset with 100,000 real orders covering multiple payment methods (credit card, boleto, voucher, debit card).
  - Link: [kaggle.com/datasets/olistbr/brazilian-ecommerce](https://www.kaggle.com/datasets/olistbr/brazilian-ecommerce)

### 2. **Razorpay Dashboard Export (Real Data)**
- If you have an active or test Razorpay account:
  1. Log in to [dashboard.razorpay.com](https://dashboard.razorpay.com).
  2. Navigate to **Transactions → Payments**.
  3. Click **Export** (top right) and select **Export All / Filtered as CSV**.
  4. Upload the downloaded `.csv` directly to RevGuard's **Razorpay CSV** parser.

### 3. **NPCI & RBI Open Data Portals (India Ecosystem)**
- **NPCI Product Statistics**: Monthly UPI, IMPS, NETC, and AePS volume and failure trend statistics published by the National Payments Corporation of India.
  - Link: [npci.org.in/what-we-do/upi/product-statistics](https://www.npci.org.in/what-we-do/upi/product-statistics)
- **Reserve Bank of India (RBI) Payment System Indicators**: Official monthly indicators covering debit cards, credit cards, RTGS, and prepaid instruments.
  - Link: [rbi.org.in/scripts/BS_ViewBulletin.aspx](https://www.rbi.org.in)

### 4. **Hugging Face Datasets**
- Search `fintech`, `payment-fraud`, or `transactions` on Hugging Face Datasets for tabular datasets formatted in CSV, Parquet, or JSON.
  - Link: [huggingface.co/datasets](https://huggingface.co/datasets)

### 5. **Mockaroo (Custom Dataset Generator)**
- Use [mockaroo.com](https://www.mockaroo.com) to generate up to 1,000 custom rows matching RevGuard's Generic CSV schema (`transaction_id, amount_inr, payment_method, status, failure_code, retry_count, timestamp`).

---

## 📋 Custom Dataset Schema Reference

### Generic CSV / Excel Column Headers
| Field Name | Required? | Example Value | Description |
| :--- | :--- | :--- | :--- |
| `transaction_id` | **Yes** | `txn_10293847` | Unique transaction ID string |
| `amount_inr` | **Yes** | `4500.00` | Transaction value in Indian Rupees (INR) |
| `payment_method` | **Yes** | `upi`, `card`, `netbanking` | Payment rail used |
| `status` | **Yes** | `success`, `failed`, `pending` | Transaction outcome state |
| `timestamp` | **Yes** | `2026-08-27 14:30:00` | UTC timestamp string |
| `failure_code` | No | `GATEWAY_TIMEOUT`, `CARD_EXPIRED` | Gateway or bank error code |
| `failure_category` | No | `transient`, `payment_method_related` | Category override if available |
| `retry_count` | No | `0`, `1`, `2` | Number of previous retries |
| `customer_reference` | No | `+919876543210` | Phone or customer identifier |
| `subscription_reference` | No | `sub_saas_4421` | Recurring subscription ID |
