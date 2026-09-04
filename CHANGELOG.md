# Changelog

All notable changes to RevGuard-AI are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.5.0] - 2026-09-02

### Added
- **Interactive 2-Minute Judge Walkthrough Guided Tour**: Multi-step interactive evaluation modal (`JudgeTourModal`) guiding judges through the 6 core innovations of RevGuard-AI with 1-click tab jumps and action triggers.
- **Interactive Razorpay Error Code Diagnostic Sandbox**: Developer testing playground in `DevelopersView` with real-time decision-tree analysis, Rule SC-01/02/04 compliance mapping, EV math formulas, and 1-click live event injection for 6 top Razorpay failure codes (`U69`, `ZA`, `RB`, `BT`, `EX`, `U30`).
- **NPCI 24-Hour Switch Liquidity & Core Banking Maintenance Heatmap**: Hourly grid visualizer in `BankSwitchHealthRadar` contrasting nighttime CBS maintenance failure rates (42%) against prime business liquidity windows (99%).
- **Dynamic UPI QR Code & 1-Tap Mobile Intent Generator**: Embedded NPCI-compliant dynamic QR code generator with 1-tap mobile deep links (Google Pay, PhonePe, Paytm, BHIM) and instant webhook-driven capture simulation.
- **RBI 6-Hour Disruption Incident Disclosure Generator (Form INC-01)**: 1-click statutory incident report export tool in the Acquiring Switch Radar complying with mandatory 6-hour regulatory outage disclosure timelines.
- **Executive Daily Recovery Digest & Multi-Channel Dispatcher**: Proactive 10-second plain-English executive briefing (Design Gap #1) with simulated 1-click broadcast to Slack `#finance-revenue-digest` and WhatsApp Business.
- **Bilingual 2-Way AI Voice Recovery Call Bot**: Real-time Speech-to-Text (`webkitSpeechRecognition`) and Speech Synthesis (`SpeechSynthesisUtterance`) supporting English and Hinglish with multi-turn state tracking and automated Promise-to-Pay (PTP) commitment recording.
- **B2B Voice Bot Integration**: Dedicated voice recovery for corporate invoices in `B2BView` with PO verification notes.
- **Live Razorpay Webhook Event Injector**: Interactive webhook simulation modal (`WebhookInjectorModal`) to inject payment failures (`payment.failed`, `order.paid`) and monitor live ingestion streams.
- **UPI AutoPay Mandate Recovery Ladder Sequencer**: 4-step salary-cycle heuristic retry visualizer (`MandateLadderModal`) showcasing liquidity window timing vs. naïve blind retries.
- **Acquiring Bank Switch Latency Radar**: Real-time monitoring of HDFC, ICICI, Axis, and SBI switches with autonomous traffic re-routing under Rule SC-02.
- **Interactive Slack CFO Escalation Bridge**: In-app `#finance-revenue-escalations` Slack channel simulation with 1-click human-in-the-loop approvals for transactions $>₹25,000$.
- **Dynamic Yield Incentive & Margin-Bounded Discount Optimizer**: Economic yield formula calculator bounded strictly by Rule SC-03 gross margin limits.
- **Obsidian Black & Charcoal Grey Theme**: Modern dark theme matching executive fintech control towers (`#08090C` canvas, `#0E1116` surfaces, `#1C202B` borders, electric blue accents).

---

## [0.4.0] - 2026-08-25

### Added
- **Enterprise B2B Accounts Receivable Engine**: Full corporate aging bucket tracking (`1_30_days`, `31_60_days`, `61_90_days`, `90_plus_days`).
- **Autonomous Dunning Ladder**: 4 automated stages (`gentle_nudge`, `invoice_link`, `finance_director`, `legal_notice`).
- **Promise-to-Pay (PTP) State Machine**: Interactive PTP modal, promised date calendar, and backend persistence (`/api/b2b/invoices/{id}/ptp`).
- **B2B AI Chase & Settlement Endpoints**: Automated chase sequence dispatch and 1-click Razorpay settlement.

---

## [0.3.0] - 2026-08-15

### Added
- **Mathematical Expected Value ($EV$) Strategy Engine**: Recovery action ranking optimizing $EV = P \times \text{Amount} - \text{Intervention Cost}$.
- **Counterfactual Uplift & A/B Evaluation**: Multi-strategy simulator comparing RevGuard AI against a naïve baseline (blind retry) across identical synthetic datasets.
- **Immutable Consequential Audit Trail**: Centralized cryptographic event ledger capturing all policy validations, agent actions, and outcomes.
- **Multi-Persona Session Switcher**: Role-based views for CFO (Priya Sharma), Head of Payments (Vikram Mehta), Ops Analyst (Ananya Iyer), and Account Manager (Rohit Sen).

---

## [0.2.0] - 2026-08-05

### Added
- **Deterministic & Statistical Clustering Engine**: Aggregates payment failures by root cause, gateway error codes, and payment methods.
- **Diagnostic Reasoning Agent**: Calibrates recovery probability $P$ based on failure category and historical error priors.
- **Rule SC-01 Deterministic Safety Guard**: Hard limit of 3 retry attempts, contact hour restrictions (8:00 AM – 9:00 PM), and fatigue suppression.
- **Interactive Explainable AI Decision Chains**: 5-step visual decision trace modal showing trigger, diagnosis, $EV$ computation, safety check, and final action.

---

## [0.1.0] - 2026-07-20

### Added
- **Core Ingestion Pipeline**: Ingestion of Razorpay webhook payloads (`payment.failed`, `payment.captured`) with HMAC-SHA256 signature verification and idempotency caching.
- **Batch CSV/JSON Parser**: Fast multi-source parsing for historical and synthetic transaction batches up to 5,000 records.
- **Synthetic Payment Failure Generator**: Configurable transaction batch generator with realistic failure distributions (UPI timeouts, mandate declines, 3DS authentication drops).
- **FastAPI Core Architecture & Test Suite**: Initial modular service architecture with comprehensive Pytest coverage.
