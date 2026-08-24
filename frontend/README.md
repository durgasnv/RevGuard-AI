# RevGuard UI — Merchant Control Tower (Phase 8)

React 18 + Vite + Tailwind + Recharts dashboard wired to the FastAPI backend.

## Views

| Tab | Content |
|---|---|
| Overview | KPI cards, AI-vs-baseline chart, revenue-at-risk split, 7-day failure trend, top leakage |
| Revenue Leakage | Impact-ranked clusters, expandable evidence + AI diagnosis with confidence |
| Recovery Queue | EV-ranked worklist, action pills, approval locks, escalations, stopped cases |
| Audit Trail | Every consequential event with policy verdicts and expandable evidence JSON |

## Run (development)

```bash
# terminal 1 — backend on :8000
cd backend && PYTHONPATH=. ~/venvs/revguard/bin/python -m uvicorn app.main:app --port 8000

# terminal 2 — frontend on :5173 (proxies /api → :8000)
cd frontend && npm install && npm run dev
```

Open http://localhost:5173 → "Load demo batch" ingests 600 synthetic
transactions, runs detection and one bounded recovery cycle.

`Reset demo` clears store + guard state for a fresh run.
