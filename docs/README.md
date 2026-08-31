# RevGuard-AI Documentation Index

Welcome to the technical documentation for **RevGuard-AI**, an autonomous revenue recovery control tower engineered for payment gateway ecosystems with native support for the Razorpay payment infrastructure.

---

## 🔍 Specifications & Core Architecture

- **[Problem Statement](specifications/problem_statement.md)**: Analysis of silent revenue leakage in digital checkouts, issuer switch latencies, UPI collect drop-offs, and B2B aging receivables.
- **[Solution Overview](specifications/solution_overview.md)**: End-to-end architecture covering continuous detection, LLM diagnosis, Expected Value ($EV$) optimization, deterministic policy gates (SC-01), bilingual voice recovery, and B2B Promise-to-Pay tracking.
- **[Requirements Matrix](specifications/requirements.md)**: Comprehensive Functional Requirements (**FR-01 to FR-25**), Safety Guardrails (**SC-01 to SC-07**), and Evaluation Criteria (**ER-01 to ER-08**).
- **[System Architecture Plan](specifications/system_plan.md)**: Master architectural plan and module interactions across detection, diagnosis, strategy, execution, and audit trail logging.
- **[Design Gaps & Solutions](specifications/design_gaps_and_solutions.md)**: Architectural safeguards for race conditions, idempotency caching, and customer fatigue caps.
- **[Razorpay Error Code Mappings](specifications/razorpay_problems_and_solutions.md)**: Categorization of Razorpay error codes (`BAD_REQUEST_ERROR`, `GATEWAY_ERROR`, `SERVER_ERROR`), webhook payloads, and mitigation pathways.

---

## 🚀 Implementation Roadmap (Phases 0 – 11)

1. **[Phase 0: Scope & Policy Gates](phases/phase0_scope.md)** — Boundary definitions, safe test-mode simulation, and deterministic guardrail rules (SC-01).
2. **[Phase 1: Data Foundation](phases/phase1_data_foundation.md)** — Synthetic transaction generator with realistic payment method distributions (UPI, Cards, NetBanking, Wallets) and baseline models.
3. **[Phase 2: Gateway Integration](phases/phase2_integration.md)** — Abstract gateway client interfaces and Razorpay test-mode API clients.
4. **[Phase 3: Leakage Detection](phases/phase3_detection.md)** — Statistical clustering engine identifying concentrated payment failure patterns and calculating revenue at risk.
5. **[Phase 4: AI Diagnosis](phases/phase4_diagnosis.md)** — LLM-driven diagnostic agent with context builder, structured schemas, and deterministic heuristic fallback.
6. **[Phase 5: Strategy & EV Optimization](phases/phase5_strategy.md)** — Expected Value formula ($EV = P \times \text{Amount} - \text{Cost}$), priority ranking, and bounded action selection (`RETRY_PAYMENT`, `SEND_PAYMENT_LINK`, `NOTIFY_CUSTOMER`, `ESCALATE_HUMAN`, `STOP`).
7. **[Phase 6: Policy Guard & Execution](phases/phase6_policy_execution.md)** — Idempotency enforcement, cooldown windows, retry limits, and immutable audit trail logging.
8. **[Phase 7: Uplift Evaluation](phases/phase7_evaluation.md)** — Counterfactual evaluation comparing RevGuard AI recovery rate and recovered revenue against naive retry baselines.
9. **[Phase 8: Merchant Control Tower](phases/phase8_ui.md)** — React 18 dashboard with glassmorphism, dual theme toggle (Stripe Light / Slate Dark), live charts, and interactive drawers.
10. **[Phase 9: API Orchestration](phases/phase9_integration.md)** — FastAPI application wiring ingestion, detection, diagnosis, strategy, execution, and evaluation.
11. **[Phase 10: Statistical Hardening](phases/phase10_hardening.md)** — Noise tolerance, batch volume scaling, and high-load stress validation.
12. **[Phase 11: Operational Reliability](phases/phase11_reliability.md)** — Webhook signature validation, idempotency caching, structured logging, and safety caps.

---

## 🚢 Production Deployment

- **[Unified Deployment Guide](../DEPLOYMENT.md)**: Zero-friction deployment configurations for:
  - **1-Click Render.com Blueprint** (`render.yaml`)
  - **1-Click Railway.app Deployment** (`railway.json`)
  - **Universal Multi-Stage Docker Build** (`Dockerfile` & `docker-compose.yml`)
  - **Fly.io & Cloud Run Containers**
  - **Decoupled Vercel (Frontend) + Render/Railway (Backend)**

---

## 📁 Demo Datasets & Testing Guides

- **[Demo Datasets Guide](../demo_datasets/GUIDE.md)**: Walkthrough for using the 4 realistic bundled datasets (`razorpay_payments_export_aug2026.csv`, `generic_payment_failures_q3.csv`, `ecommerce_failures_aug2026.xlsx`, `razorpay_high_ticket_b2b_leakage.csv`) and recommended external open payment data sources (Kaggle PaySim, NPCI open statistics, Mockaroo).
- **[Demo Datasets Overview](../demo_datasets/README.md)**: Dataset file inventory and format documentation.

---

## 📊 Quality Audits & Reports

- **[Quality Audit Report](reports/audit_report.md)**: Detailed bug analysis, architectural improvements, and test coverage metrics (106 automated tests passing).
