# Phase 8 — Merchant Control Tower UI

## Goal

Make the intelligence understandable and demoable through a dark-mode merchant dashboard connected to the FastAPI backend.

## What We Did

- Built the React 18 + Vite 5 + Tailwind CSS 3 frontend (`frontend/`):
  - Four tabbed views: Overview, Revenue Leakage, Recovery Queue, Audit Trail.
  - Dark-mode-first SaaS analytics aesthetic with INR formatting and color semantics (red=leakage, amber=approval, green=recovered, blue=AI activity).
- **OverviewView** (`frontend/src/views/OverviewView.jsx`):
  - KPI cards: Revenue at Risk, Expected Recoverable, AI Recovered, Unnecessary Interventions.
  - Bar chart: AI Strategy vs Baseline with uplift metrics.
  - Donut chart: recoverable vs unrecoverable/escalated split.
  - Area chart: 7-day failure trend with spike detection.
  - Top clusters preview with navigation to Leakage tab.
- **LeakageView** (`frontend/src/views/LeakageView.jsx`):
  - Ranked cluster table with severity badges, txn count, revenue at risk, payment methods, AI confidence bar.
  - Expandable rows: root cause narrative, contributing factors chips, evidence lines, sample IDs.
  - Fetches diagnoses from `GET /diagnose?top_n=100`.
- **QueueView** (`frontend/src/views/QueueView.jsx`):
  - KPI row: queued count, expected recovery, escalations/approvals, stopped.
  - Ranked queue table: transaction ref, amount, failure code, action pill, probability, EV, confidence, approval status.
  - Escalations list with amber styling and reason text.
  - Stopped list with reasons.
  - Execution outcome summary after run.
  - Bulk approve button for pending high-value items.
- **AuditView** (`frontend/src/views/AuditView.jsx`):
  - Reversed chronological timeline of execution audit events.
  - Filter chips by actor (strategy_api, ai_strategy, baseline, policy_guard).
  - Expandable rows: policy verdict, transaction details, evidence JSON.
- **Reusable components** (`frontend/src/components/ui.jsx`):
  - SeverityBadge, ActionPill, OutcomeTag, ConfidenceBar, KpiCard, Card.
- **API client** (`frontend/src/api.js`): typed fetch wrapper with INR/pct formatters, proxy to `/api` via Vite config.
- **App shell** (`frontend/src/App.jsx`): boot detection, demo loader (generates 600 txns + runs recovery), tab navigation, reset, footer disclaimer.

## Key Design Decisions

1. **Backend-driven, not frontend-computed.** All metrics come from API responses; the UI is a pure display layer with no business logic.
2. **One-click demo loader.** The empty state generates a synthetic batch, runs detection, and executes recovery in sequence — a single button press shows the full system.
3. **Confidence is a bar, not a number.** The visual confidence bar (color-coded by threshold) conveys precision better than a raw percentage in a dense table.
4. **Audit events are first-class.** Every policy block, outcome, and approval is visible in the audit trail — the dashboard doesn't hide the system's decision-making.

## Learnings

- **Proxies beat CORS hacks.** Vite's `server.proxy` config forwarding `/api` to `:8000` eliminated all cross-origin friction in development.
- **Dark mode is non-negotiable for fintech dashboards.** The color semantics (red for leakage, amber for approval) are more readable against dark backgrounds.
- **The approval workflow is the most interactive element.** The bulk-approve button in QueueView demonstrates the human-in-the-loop pattern without complex state management.
- **RECHARTS is sufficient.** No need for D3 or heavier charting libraries — the four chart types (bar, pie, area, confidence bar) cover the dashboard's needs.

## How to Run

```bash
cd frontend && npm install && npm run dev    # http://localhost:5173
cd backend && uvicorn app.main:app --app-dir .  # http://localhost:8000
```

## Limitations / Next

- No incident view (Phase 8 UI mockup had a timeline scrubber — deferred).
- No real-time streaming feed (the mockup concept of a live recovery sidebar).
- No date-range filtering (global picker was in the mockup spec but deferred).
- Responsive layout is basic; mobile-first was not a priority.
