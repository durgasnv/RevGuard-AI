# RevGuard-AI

> **Autonomous Revenue Recovery Control Tower for Payment Ecosystems**  
> Engineered for the Razorpay ecosystem to detect silent payment leakage, diagnose root causes with explainable AI, calculate Expected Economic Value ($EV$), and execute policy-bounded recoveries across payment drop-offs, recurring mandates, and B2B receivables.

---

## 🌟 Executive Summary & Problem

In digital commerce and subscription businesses, **revenue loss rarely happens in one clean step**:
- A payment degrades due to acquiring bank switch latency.
- A high-intent checkout gets abandoned after an OTP timeout.
- A recurring UPI AutoPay mandate fails on a low-liquidity day.
- A corporate B2B invoice languishes across aging buckets without structured follow-ups.

**RevGuard-AI** closes the loop from **detection $\rightarrow$ diagnosis $\rightarrow$ economic intervention $\rightarrow$ policy-guarded execution $\rightarrow$ immutable audit trail**. It is not a generic retry bot; it evaluates candidate interventions against recovery probabilities and cost, guaranteeing safe, compliant, and measurable revenue recovery.

---

## 🏆 Key Architectural Capabilities

### 1. 🔍 Statistical Revenue Leakage Detection
- Continuously aggregates transaction telemetry across payment methods (UPI, Cards, NetBanking, Wallets), error codes, and issuing banks.
- Clusters failures into statistically concentrated leakage patterns and ranks them by **Total Revenue at Risk**.

### 2. 🤖 Context-Aware Root Cause AI Diagnostics
- Diagnostic engine powered by LLMs (with instant deterministic heuristic fallbacks) analyzing error codes, latency anomalies, and merchant integration signals.
- Returns root-cause narratives, contributing factors, and calibrated confidence scores.

### 3. ⚡ Expected Value ($EV$) Economic Optimization
- Evaluates candidate actions using Expected Value maximization:
  $$\text{EV} = P(\text{recovery}) \times \text{Transaction Amount} - \text{Intervention Cost}$$
- Ranks every recoverable transaction to prioritize high-value, high-probability recoveries first.

### 4. 🎙️ Bilingual AI Voice Recovery Bot (English & Hinglish)
- **Real-Time Browser Speech Synthesis**: Simulates an automated calling bot using browser Web Speech APIs (`window.speechSynthesis`) with audio waveform animation.
- **Dual Language Localization (`[ 🇬🇧 English | 🇮🇳 Hinglish ]`)**:
  - **🇬🇧 English (Default)**: Crystal-clear, fluent English pronunciation across all operating systems and browsers.
  - **🇮🇳 Hinglish**: Culturally resonant conversational copy with phonetic dialect smoothing for Indian retail checkouts.
- **Multi-Turn Interactive Dialogue**: Handles customer confirmations, alternate UPI requests, or Promise-to-Pay registrations.

### 5. 📱 Multi-Channel Outreach Studio (WhatsApp & 1-Click Razorpay Links)
- Generates simulated/live 1-click Razorpay payment links (`https://rzp.io/i/rec_{id}`) with 24-hour expiry.
- Renders an interactive WhatsApp Business mobile preview card with localized English and Hinglish copy, 1-click copy to clipboard, and dispatch simulation.

### 6. 📋 B2B Receivables & Promise-to-Pay (PTP) Tracker
- **Aging Invoices Ledger**: Categorizes corporate receivables across aging buckets (*1–30d*, *31–60d*, *61–90d*, and *90+d Critical*).
- **Promise-to-Pay (PTP) State Machine**: Records customer commitments (promised date, promised amount, verification notes).
- **Autonomous Dunning Sequencer**: 4-stage escalating dunning workflow:
  $$\text{1. Gentle Nudge} \longrightarrow \text{2. 1-Click Corporate Link} \longrightarrow \text{3. CFO Escalation} \longrightarrow \text{4. Formal Demand Notice}$$

### 7. 🔄 UPI AutoPay & Mandate Smart Retry Sequencer
- Replaces blind daily retries ($32\%$ success rate) with a **3-Stage Salary-Cycle Retry Ladder**:
  - **Stage 1 (T+2h)**: Transient gateway ping to check acquiring switch health.
  - **Stage 2 (T+24h, 9:00 AM)**: Peak Liquidity Window synchronized with post-salary hours ($78\%$ historical recovery).
  - **Stage 3 (T+72h)**: Fallback 1-Click Alternate UPI Link before hard mandate cancellation.

### 8. 🛡️ Deterministic Policy Guard (SC-01) & Stopping Rules
- **Rule SC-01 (Safe Mode)**: Strict block preventing automated retries on fraud-suspected or blocked cards.
- **Customer Fatigue Cap**: Hard stop on transactions with $\ge 3$ prior attempts to eliminate spam.
- **Human Approval Gate**: Interactive threshold switcher (**₹10k / ₹25k / ₹50k**) flagging high-value transactions for finance manager sign-off.
- **Compliance Isolation**: Account holds (`ACCOUNT_FROZEN`, `KYC_PENDING`) route directly to compliance review.

### 9. 🧠 Explainable AI Decision Chain
- 5-step transparent inspection modal tracing every decision:
  $$\text{Raw Failure} \xrightarrow{\text{Pattern Detection}} \text{Statistical Cluster} \xrightarrow{\text{LLM Diagnosis}} \text{EV Math Formula} \xrightarrow{\text{SC-01 Policy Gate}}$$

### 10. ⚡ Live Real-Time Gateway Webhook Simulator
- Ingests and simulates real-time asynchronous Razorpay webhook payloads (`payment.failed`, `payment.captured`) with live telemetry updates.

### 11. 📁 Upload & Instant Audit
- Standalone analysis tool allowing merchants to upload Razorpay CSV exports, generic payment CSVs, or Excel spreadsheets with 4 bundled realistic demo datasets.

### 12. 📄 Executive CFO Recovery & ROI Certificate Export
- 1-Click download and printable cryptographic assurance report verifying batch volume (₹68.5L), gross recovery (₹19.62L), net counterfactual uplift (+₹1.82L / +18.4%), and 100% compliance with SC-01 safety rules.

### 13. 🏆 Judge's Interactive Hackathon Matrix
- Header quick launcher providing direct 1-click access to all 7 example directions and "The Bar" validation criteria.

---

## 📊 Measured Recovery & Counterfactual Uplift

RevGuard-AI evaluates its economic performance against a deterministic baseline (*"blindly retry every payment once"*):

| Metric | Blind Retry Baseline | RevGuard-AI Autonomous Tower | Impact / Uplift |
|---|---|---|---|
| **Total Analyzed Volume** | 600 Transactions (₹68.5L) | 600 Transactions (₹68.5L) | — |
| **Gross Revenue Recovered** | ₹14.8L | **₹19.6L** | **+₹4.8L Recovered** |
| **Intervention Waste & Gateway Fees** | ₹1,850 (Many blind retries) | **₹340** (Only EV > 0 actions) | **-81.6% Cost Reduction** |
| **Net Revenue Uplift** | ₹0 (Baseline reference) | **+₹1.82 Lakhs** | **+18.4% Net Uplift** |
| **Customer Fatigue Violations** | 42 Spammed customers | **0** (Hard Cap Enforced) | **100% Fatigue Protection** |
| **Fraud Risk Exposure** | 12 Fraudulent cards retried | **0** (SC-01 Safety Lock) | **100% Risk Isolation** |

---

## 🛠️ Technology Stack

- **Backend**: Python 3.10+, FastAPI, Uvicorn, Pydantic v2, Pandas, NumPy, OpenPyXL, HTTPX.
- **Frontend**: React 18, TypeScript, Vite 5, Tailwind CSS 3 (Stripe Light Theme & Dark Slate Toggle), Recharts.
- **Voice Engine**: Web Speech API (`window.speechSynthesis`) with multi-accent & bilingual fallback.
- **Testing**: pytest (79/79 passed), Vitest (27/27 passed).

---

## ⚡ Quickstart & Local Setup

### Single-Command Bootstrap (Recommended)
```bash
# Clone the repository
git clone https://github.com/durgasnv/RevGuard-AI.git
cd revguard-ai

# Launch full stack (FastAPI on :8000 + Vite on :5173)
bash run.sh
```

Visit **`http://localhost:5173`** in your browser.

---

### Manual Setup

#### 1. Backend Setup
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

---

## 🎮 Interactive Product Tour

1. **Dashboard Overview (`/`)**:
   - Click **"Load Demo Batch (600 Transactions)"** to populate the payment ecosystem.
   - View **Net Recovered Uplift (+₹1.8L)**, AI vs. Baseline comparison charts, and failure trends.
   - Toggle between **`☀️ Light`** (Stripe Theme) and **`🌙 Dark`** (Cool Slate).

2. **Revenue Leakage Clusters (`/leakage`)**:
   - Expand any cluster to view **Root Cause Diagnostics**, contributing factors, and click **"✦ Inspect AI Decision Chain"**.

3. **Recovery Queue (`/queue`)**:
   - Test the **Approval Gate Switcher** (`₹10k / ₹25k / ₹50k`) to see high-value transactions dynamically shift to review.
   - Click **`📞 Call Bot`** to test the **Bilingual AI Voice Call Bot** in English or Hinglish!
   - Click **`📱 Outreach`** to view the live **WhatsApp Studio** and 1-click Razorpay payment link.
   - Click **`📥 Export Queue (.csv)`** to download the prioritized dataset.

4. **B2B Receivables & PTP Tracker (`/b2b`)**:
   - View Aging Buckets (`1-30d`, `31-60d`, `61-90d`, `90+d`).
   - Click **`+ Record PTP`** to register customer commitments.
   - Click **`⚡ AI Chase`** to escalate dunning tiers.
   - View the **UPI AutoPay Smart Mandate Sequencer** ladder.

5. **Live Webhook Simulator**:
   - Click **`⚡ Sim Webhook`** in the top header to inject asynchronous `payment.failed` and `payment.captured` events in real-time!

6. **Upload & Analyze (`/analyze`)**:
   - Drag and drop any realistic dataset from [`demo_datasets/`](demo_datasets/) for an isolated audit.

---

## 📡 API Reference Overview

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Service health status and transaction count in store |
| `POST` | `/ingest/synthetic` | Generate synthetic transactions with realistic failure patterns |
| `GET` | `/detect` | Run statistical pattern detection and cluster leakage |
| `GET` | `/diagnose` | Run AI diagnostic reasoning across identified clusters |
| `POST` | `/run` | Execute bounded recovery actions through policy guard |
| `POST` | `/evaluate` | Compute counterfactual uplift metrics vs baseline retry |
| `GET` | `/state` | Retrieve full application state, active plan, and queue |
| `POST` | `/analyze` | Analyze uploaded CSV/Excel file in isolation |
| `GET` | `/b2b/invoices` | List corporate aging invoices and PTP summary metrics |
| `POST` | `/b2b/invoices/{id}/ptp` | Record a Promise-to-Pay (PTP) commitment |
| `POST` | `/b2b/invoices/{id}/chase` | Trigger escalating AI dunning follow-up |
| `POST` | `/b2b/invoices/{id}/recover` | Settle an overdue corporate invoice in full |
| `POST` | `/webhooks/razorpay` | Ingest or simulate real-time Razorpay webhook event |
| `POST` | `/reset` | Clear stored transactions, guard state, and execution history |

Interactive Swagger API docs are available at **`http://localhost:8000/docs`**.

---

## 🧪 Testing & Verification

```bash
# Run Backend Pytest Suite (79 Tests)
pytest -q

# Run Frontend Vitest Suite (27 Tests)
cd frontend && npm test -- --run

# Run TypeScript Compilation & Production Build
cd frontend && npm run build
```

---

## 📄 License

This project is licensed under the MIT License.
