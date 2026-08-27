# RevGuard-AI Documentation Index

Welcome to the technical documentation for **RevGuard-AI**, an autonomous revenue recovery control tower engineered for payment gateway ecosystems (with first-class support for Razorpay payment flows).

---

## 📑 Documentation Structure

```
docs/
├── README.md                          <- Documentation Index (this file)
├── specifications/                    <- Core architecture & problem definitions
│   ├── problem_statement.md           <- Payment leakage problem analysis
│   ├── solution_overview.md           <- High-level solution architecture
│   ├── requirements.md                <- Functional & non-functional requirements
│   ├── system_plan.md                 <- Master architecture & engineering plan
│   ├── design_gaps_and_solutions.md   <- Architectural audit & gap analysis
│   └── razorpay_problems_and_solutions.md <- Razorpay ecosystem error code mappings
├── phases/                            <- Implementation specifications by phase
│   ├── phase0_scope.md                <- Phase 0: Non-negotiable scope & policy definitions
│   ├── phase1_data_foundation.md      <- Phase 1: Synthetic data generation & baseline metrics
│   ├── phase2_integration.md          <- Phase 2: Gateway client abstraction & mock adapters
│   ├── phase3_detection.md            <- Phase 3: Failure pattern clustering & risk calculation
│   ├── phase4_diagnosis.md            <- Phase 4: AI root cause diagnostics & heuristic fallback
│   ├── phase5_strategy.md             <- Phase 5: Expected Value (EV) strategy engine
│   ├── phase6_policy_execution.md     <- Phase 6: Deterministic policy guard & action execution
│   ├── phase7_evaluation.md           <- Phase 7: Counterfactual uplift evaluation
│   ├── phase8_ui.md                   <- Phase 8: Merchant control tower UI
│   ├── phase9_integration.md          <- Phase 9: Unified API server & orchestration
│   ├── phase10_hardening.md           <- Phase 10: Statistical validation & noise resilience
│   └── phase11_reliability.md         <- Phase 11: Webhook idempotency & production readiness
├── design/                            <- UI & UX design prompts and specs
│   └── ui_mockup_prompt.md            <- Control Tower visual design specifications
└── reports/                           <- Audit & evaluation reports
    └── audit_report.md                <- Codebase quality & improvement audit report
```

---

## 🔍 Specifications & Architecture

- **[Problem Statement](specifications/problem_statement.md)**: Explains the mechanics of silent revenue leakage in payment gateways (transient gateway drops, bank downtime, auth failures, customer friction).
- **[Solution Overview](specifications/solution_overview.md)**: Architecture overview of RevGuard-AI's continuous detection, diagnosis, policy-guarded recovery, and audit assurance loop.
- **[Requirements](specifications/requirements.md)**: Detailed Functional (FR-01 to FR-17) and Non-Functional (NFR-01 to NFR-08) requirements.
- **[System Plan](specifications/system_plan.md)**: End-to-end component breakdown and phase milestones.
- **[Design Gaps & Solutions](specifications/design_gaps_and_solutions.md)**: Solutions for common edge cases, race conditions, and safety guardrails.
- **[Razorpay Ecosystem Mappings](specifications/razorpay_problems_and_solutions.md)**: Categorization of Razorpay payment error codes (`BAD_REQUEST_ERROR`, `GATEWAY_ERROR`, `SERVER_ERROR`), webhooks, and mitigation pathways.

---

## 🚀 Phase Roadmap & Implementation Guides

1. **[Phase 0: Scope & Policy Gates](phases/phase0_scope.md)** — Boundary definitions, safe simulation mode, deterministic guardrail rules (SC-01).
2. **[Phase 1: Data Foundation](phases/phase1_data_foundation.md)** — Synthetic transaction generator with realistic payment distributions (cards, UPI, netbanking, wallets) and baseline retry models.
3. **[Phase 2: Integration Layer](phases/phase2_integration.md)** — Abstract gateway client interfaces and Razorpay test clients.
4. **[Phase 3: Leakage Detection](phases/phase3_detection.md)** — Statistical clustering engine identifying concentrated payment failure patterns.
5. **[Phase 4: AI Diagnosis](phases/phase4_diagnosis.md)** — LLM-driven diagnostic agent with context builder, structured schemas, and deterministic heuristic fallback.
6. **[Phase 5: Strategy Engine](phases/phase5_strategy.md)** — Expected Value optimization formula: $EV = P(\text{recovery}) \times \text{Amount} - \text{Cost}$, priority queue ranking, and action recommendations (`RETRY_PAYMENT`, `SEND_PAYMENT_LINK`, `NOTIFY_CUSTOMER`, `ESCALATE_HUMAN`, `STOP`).
7. **[Phase 6: Policy Guard & Execution](phases/phase6_policy_execution.md)** — Enforces idempotency, cooldown windows, retry limits, customer fatigue rules, and records immutable audit events.
8. **[Phase 7: Uplift Evaluation](phases/phase7_evaluation.md)** — Counterfactual evaluation comparing RevGuard AI recovery rate and recovered revenue against naive retry baselines.
9. **[Phase 8: Merchant Control Tower](phases/phase8_ui.md)** — Glassmorphic React dashboard with live telemetry, KPI cards, interactive charts, and approval workflows.
10. **[Phase 9: API Orchestration](phases/phase9_integration.md)** — FastAPI application wiring ingestion, detection, diagnosis, strategy, execution, and evaluation.
11. **[Phase 10: Statistical Hardening](phases/phase10_hardening.md)** — Noise tolerance, batch volume scaling, and high-load stress validation.
12. **[Phase 11: Operational Reliability](phases/phase11_reliability.md)** — Webhook signature validation, idempotency caching, structured logging, and safety caps.

---

## 🎨 Design & Visual Assets

- **[UI Mockup Prompt](design/ui_mockup_prompt.md)**: Specifications for the Dark Theme Control Tower interface, design tokens, and components.

---

## 📊 Reports & Quality Audits

- **[Audit Report](reports/audit_report.md)**: Detailed bug analysis, architectural improvements, and test coverage metrics.
