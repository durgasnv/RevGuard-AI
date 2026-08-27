# RevGuard-AI

> **Autonomous Revenue Recovery Control Tower for Payment Ecosystems**  
> Engineered for the Razorpay Payment Gateway ecosystem to eliminate silent revenue leakage through AI-driven root cause diagnosis, Expected Value (EV) optimization, and policy-guarded recovery.

---

## 🌟 Executive Summary

In high-volume payment environments, transaction failures are responsible for significant unintended revenue loss. Many of these failures are recoverable—such as transient bank downtimes, UPI intent drops, expired payment sessions, or network timeouts—while others (e.g., hard fraud, card blocklists, invalid credentials) should never be retried.

**RevGuard-AI** is an autonomous revenue recovery control tower that bridges the gap between passive payment gateways and intelligent merchant recovery:

1. **Detects** payment leakage clusters using statistical pattern recognition.
2. **Diagnoses** failure root causes using LLM-powered context analysis with deterministic heuristic fallbacks.
3. **Optimizes** recovery actions by calculating Expected Economic Value ($EV = P(\text{recovery}) \times \text{Amount} - \text{Cost}$).
4. **Executes** policy-bounded interventions under strict safety guardrails (SC-01).
5. **Audits** every consequential decision in an immutable, transparent trail.

---

## 🚀 Key Features

### 🔍 Statistical Leakage Detection
- Real-time aggregation and clustering of failed transactions by failure category, gateway error code, payment method, and issuing bank.
- Automatic ranking of leakage clusters by total revenue at risk to focus on highest-impact opportunities first.

### 🤖 Context-Aware AI Diagnosis
- Deep analysis of failure patterns, latency anomalies, error codes, and merchant integration contexts.
- Multi-factor diagnostic engine powered by LLMs (with graceful fallback to deterministic rule heuristics) generating root cause explanations and calibrated confidence scores.

### ⚡ Expected Value (EV) Strategy Engine
- Computes probability of recovery $P(\text{recovery})$ for every failed transaction.
- Recommends the optimal economic action from a bounded set:
  - `RETRY_PAYMENT` — Optimal timing for transient gateway/bank errors.
  - `SEND_PAYMENT_LINK` — For session timeouts or device-switching recovery.
  - `NOTIFY_CUSTOMER` — For user-correctable errors (insufficient funds, OTP expiry).
  - `ESCALATE_HUMAN` — For high-value transactions requiring manual merchant authorization.
  - `STOP` — Non-retryable cases to prevent customer fatigue and unnecessary gateway fees.

### 🛡️ Deterministic Policy Guard (SC-01)
- Strict boundary rules enforcing idempotent operations, mandatory cooldown periods, maximum retry counts per transaction, and customer contact frequency caps.
- High-value approval thresholds requiring explicit merchant confirmation before execution.

### 📊 Comprehensive Audit Assurance & Telemetry
- Immutable event stream recording actor, timestamp, action, rationale, policy validation verdict, and raw evidence payload.
- Counterfactual uplift evaluation comparing RevGuard AI recovery rate and net recovered revenue against naive retry baselines.

### 📁 Upload & Instant Audit
- Standalone analysis tool allowing merchants to upload Razorpay CSV exports, generic payment CSVs, or Excel spreadsheets for instant leakage discovery without altering live state.

---

## 🏗️ Architecture & Data Flow

```
                  ┌────────────────────────────────────────────────┐
                  │          Payment Ingestion Pipeline            │
                  │  (Webhooks / Synthetic Generator / CSV / Excel)│
                  └──────────────────────┬─────────────────────────┘
                                         │
                                         ▼
                  ┌────────────────────────────────────────────────┐
                  │           Leakage Detection Engine             │
                  │     (Statistical Pattern Clustering)           │
                  └──────────────────────┬─────────────────────────┘
                                         │
                                         ▼
                  ┌────────────────────────────────────────────────┐
                  │             AI Diagnosis Agent                 │
                  │ (LLM Context Builder + Heuristic Fallback Engine)│
                  └──────────────────────┬─────────────────────────┘
                                         │
                                         ▼
                  ┌────────────────────────────────────────────────┐
                  │           EV Strategy & Prioritization         │
                  │ (Expected Value Ranking & Action Decisioning)   │
                  └──────────────────────┬─────────────────────────┘
                                         │
                                         ▼
                  ┌────────────────────────────────────────────────┐
                  │             Policy Guard (SC-01)               │
                  │ (Deterministic Safety Boundary & Limits Gate)  │
                  └──────────────┬──────────────────┬──────────────┘
                                 │                  │
                [Approved / Auto]│                  │[Blocked / Escalate]
                                 ▼                  ▼
                  ┌──────────────────────┐  ┌──────────────────────┐
                  │  Execution Adapters  │  │  Human Review Queue  │
                  │ (Gateway API Client) │  │  (Merchant Approval) │
                  └──────────────┬───────┘  └──────────┬───────────┘
                                 │                     │
                                 └──────────┬──────────┘
                                            │
                                            ▼
                  ┌────────────────────────────────────────────────┐
                  │      Consequential Audit Log & UI Dashboard    │
                  └────────────────────────────────────────────────┘
```

---

## 📂 Repository Structure

```
revguard-ai/
├── backend/                           # FastAPI Python Backend
│   ├── app/
│   │   ├── ai/                        # LLM client, prompt templates, diagnosis agent
│   │   ├── core/                      # Configuration, constants, policy definitions
│   │   ├── data/                      # Synthetic transaction generator & data models
│   │   ├── detection/                 # Statistical failure clustering engine
│   │   ├── evaluation/                # Counterfactual evaluation & baseline models
│   │   ├── execution/                 # Action executor & recovery dispatchers
│   │   ├── ingestion/                 # CSV & Excel file parsers
│   │   ├── integrations/              # Gateway adapters (Razorpay test client)
│   │   ├── notifications/             # Proactive summary digests & alerts
│   │   ├── policy/                    # Deterministic safety policy guard
│   │   ├── schemas/                   # Pydantic data schemas & enums
│   │   ├── strategy/                  # Expected Value (EV) decision engine
│   │   ├── audit.py                   # Centralized audit logging infrastructure
│   │   └── main.py                    # REST API entrypoint & route handlers
│   ├── pyproject.toml                 # Backend build configuration & metadata
│   ├── requirements.txt               # Python package dependencies
│   ├── scripts/                       # CLI evaluation, smoke tests & digests
│   ├── setup_env.sh                   # Automated Python venv initialization
│   └── tests/                         # Pytest test suite (Phases 1-11)
├── frontend/                          # React + TypeScript + Vite + Tailwind UI
│   ├── src/
│   │   ├── components/                # Glassmorphic UI component library (ui.tsx)
│   │   ├── views/                     # Overview, Leakage, Queue, Audit, Analyze
│   │   ├── api.ts                     # Strongly-typed API client & formatters
│   │   ├── types.ts                   # TypeScript interfaces & domain types
│   │   ├── App.tsx                    # Control Tower shell with sidebar & header
│   │   ├── index.css                  # Design tokens, gradients, animations
│   │   └── main.tsx                   # React DOM application mount
│   ├── package.json                   # Frontend dependencies & scripts
│   ├── tailwind.config.js             # Extended theme, colors, shadows, keyframes
│   ├── tsconfig.json                  # TypeScript configuration
│   └── vite.config.ts                 # Vite bundler & Vitest test runner setup
├── docs/                              # Architecture, Specifications, Phase Plans
│   ├── README.md                      # Documentation index & sitemap
│   ├── specifications/                # Problem statement, requirements, solution
│   ├── phases/                        # Implementation specifications (Phases 0-11)
│   ├── design/                        # UI mockup prompts & design specs
│   └── reports/                       # Audit & evaluation reports
├── run.sh                             # Single-command stack launcher
└── .gitignore                         # Git exclusion rules
```

---

## 🛠️ Tech Stack

### Backend
- **Language**: Python 3.10+
- **Framework**: FastAPI, Uvicorn, Starlette
- **Data Validation & Schemas**: Pydantic v2
- **Data & Numeric Processing**: NumPy, pandas, openpyxl
- **HTTP & Integrations**: HTTPX (async client support)
- **Testing**: pytest, pytest-asyncio, pytest-cov

### Frontend
- **Framework**: React 18 (TypeScript)
- **Build Tool**: Vite 5
- **Styling**: Tailwind CSS 3 with custom glassmorphism, animations & design tokens
- **Data Visualization**: Recharts (Custom Bar, Area, and Donut charts)
- **Testing**: Vitest, React Testing Library, JSDOM

---

## ⚡ Quickstart & Installation

### Prerequisites
- **Python**: 3.10 or higher
- **Node.js**: 18.0.0 or higher (`npm` included)
- **Git**: Installed and configured

### 1. Launch the Full Stack (Recommended)

Run the included automated bootstrap script from the repository root:

```bash
bash run.sh
```

The script will:
1. Initialize the Python virtual environment and install backend dependencies.
2. Install frontend `npm` packages.
3. Start the FastAPI backend server on `http://localhost:8000`.
4. Start the Vite React development server on `http://localhost:5173`.

Visit **`http://localhost:5173`** in your browser.

---

### 2. Manual Setup (Alternative)

#### Backend Setup
```bash
# Navigate to backend and create virtual environment
cd backend
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI server
PYTHONPATH=. uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### Frontend Setup
```bash
# Navigate to frontend in a new terminal
cd frontend

# Install packages
npm install

# Start Vite development server
npm run dev
```

---

## 📡 API Reference Overview

| HTTP Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Service health status and transaction count in store |
| `POST` | `/ingest/synthetic` | Generate and store synthetic payment transactions |
| `POST` | `/ingest/csv` | Ingest raw CSV transaction log |
| `POST` | `/ingest/excel` | Ingest raw Excel spreadsheet transaction log |
| `POST` | `/webhook/razorpay` | Ingest real-time Razorpay webhook event with signature check |
| `GET` | `/detect` | Run statistical pattern detection and cluster leakage |
| `POST` | `/diagnose` | Run AI diagnostic reasoning across identified clusters |
| `GET` | `/plan` | Generate EV-ranked recovery plan and approval queue |
| `POST` | `/run` | Execute bounded recovery actions through policy guard |
| `GET` | `/evaluate` | Compute counterfactual uplift metrics vs baseline retry |
| `GET` | `/state` | Retrieve full application state, active plan, and execution history |
| `POST` | `/analyze` | Analyze uploaded CSV/Excel file in isolation without modifying store |
| `GET` | `/summary` | Generate merchant digest of failure trends and recovery potential |
| `POST` | `/reset` | Clear stored transactions, guard state, and execution history |

Interactive Swagger API documentation is available at **`http://localhost:8000/docs`**.

---

## 🧪 Testing & Verification

### Running Backend Tests
```bash
cd backend
PYTHONPATH=. pytest -v
```

### Running Frontend Tests
```bash
cd frontend
npm test -- --run
```

### Frontend Typecheck & Build
```bash
cd frontend
npm run typecheck
npm run build
```

---

## 📖 Further Documentation

For in-depth architectural specifications and implementation breakdowns, see the **[`docs/`](docs/README.md)** directory:

- [Problem Statement](docs/specifications/problem_statement.md)
- [Solution Architecture](docs/specifications/solution_overview.md)
- [System Plan & Milestones](docs/specifications/system_plan.md)
- [Razorpay Error Code Mappings](docs/specifications/razorpay_problems_and_solutions.md)
- [Implementation Phases (0 to 11)](docs/phases/)
- [Quality Audit Report](docs/reports/audit_report.md)

---

## 📄 License

This project is licensed under the MIT License.
