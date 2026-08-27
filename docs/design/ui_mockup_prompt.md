# UI Mockup Prompt — Revenue Recovery Control Tower

Paste-ready prompts for generating UI concepts online (v0.dev, Lovable, bolt.new, Claude/ChatGPT mockups, or image generators). Use Prompt A for interactive React mockups, Prompt B for quick visual concepts.

---

## Prompt A — Interactive Dashboard Mockup

```text
Design a modern fintech merchant dashboard called "Revenue Recovery Control Tower".
It monitors payment failures for an Indian merchant using Razorpay and shows how an
AI system detects revenue leakage, diagnoses causes, and executes bounded recovery actions.

USER: A merchant operations manager who checks revenue health daily. Not a developer —
needs instant clarity on where money is leaking and what the AI did about it.

Aesthetic: dark-mode-first SaaS analytics feel (think Linear × Stripe Dashboard),
INR currency formatting (₹, Indian digit grouping e.g. ₹26,68,854), Tailwind CSS,
clean sans-serif, generous data density without clutter, subtle color semantics:
red = leakage/risk, amber = needs attention/approval, green = recovered,
blue = informational/AI activity.

Build these five views:

1. EXECUTIVE OVERVIEW (landing page)
   - KPI cards: Revenue at Risk ₹26,68,854 · Recovered ₹1,76,296 · Recovery Rate 6.61% ·
     Unnecessary Interventions 0 · Baseline Comparison +₹15,105 uplift (+0.57pp)
   - Sparkline trend of failure rate over last 7 days with a visible spike annotation
   - Donut chart: recoverable vs unrecoverable vs escalated revenue split
   - "AI vs Baseline" bar comparison (recovered ₹1.76L vs ₹1.61L)

2. REVENUE LEAKAGE (cluster list + detail)
   - Ranked table of leakage clusters, columns: severity badge, title, affected
     transactions, revenue at risk, evidence chips. Rows:
       • HIGH | Fraud blocks on cards | 15 txns | ₹12,02,459 | "no automated path — human review"
       • HIGH | Auth failures (repeated customers) | 57 txns | ₹3,65,522 | burst pattern
       • HIGH | Subscription retry exhaustion | 31 txns | ₹2,80,932 | "auto-retry would duplicate"
       • HIGH | UPI network degradation BURST | 43 txns in 7.3h | ₹2,19,274 | ~5.9 failures/hr
       • MEDIUM | Insufficient funds | 39 txns | ₹1,61,891 | timing issue → payment link
   - Clicking a cluster opens a detail drawer: timeline heatmap of failures,
     payment-method breakdown bars, AI root-cause narrative card with confidence
     meter (e.g. 95%), contributing factors list, and recommended action chip.

3. RECOVERY QUEUE (prioritized worklist)
   - Sortable table ranked by Expected Recovery Value: transaction ref, amount,
     failure code, AI-recommended action pill (RETRY / PAYMENT LINK / NOTIFY /
     ESCALATE), probability, expected value ₹, confidence %, status
     (Queued / Needs Approval / Escalated / Stopped)
   - Top row example: RETRY · ₹22,126 · NETWORK_ERROR · p=0.55 · EV=₹12,165 · conf 95%
   - High-value rows (≥₹25,000) show a lock icon + amber "Approval required" badge
   - Bulk approve button for merchant review flow

4. INCIDENT VIEW
   - One incident expanded: the UPI degradation burst. Timeline scrubber across the
     8-hour window, correlated failing transactions listed underneath, root cause
     card ("gateway/network degradation affecting UPI; upstream outage suspected"),
     revenue impact counter ticking up, and a "bounded action taken" log strip.

5. AUDIT TRAIL
   - Vertical timeline/feed of every consequential event: timestamp, actor badge
     (AI Strategy / Policy Guard / Simulator / Merchant), action, reason snippet,
     policy verdict tag (allowed / blocked / pending_approval), outcome tag
     (recovered / failed / escalated / stopped)
   - Example entries: "Policy Guard blocked RETRY on txn_9f… : fraud code hard
     non-retryable" ; "AI Strategy queued PAYMENT LINK on txn_a5… : EV ₹4,210"
   - Filter by actor, verdict, outcome. Every row expandable to show raw evidence JSON.

Include top navigation between the 5 views, a global date-range picker (Last 7 days
default), and a persistent right-side drawer concept for "Live recovery feed"
showing simulated real-time outcomes (recovered ✓ / failed ✗ streaming rows).

Interactions to demonstrate: cluster row click → drawer slide-in; queue sort by EV;
approve flow with optimistic state change; audit filter chips.
```

---

## Prompt B — Quick Visual Concept (image generators / moodboards)

```text
Dark-mode fintech analytics dashboard for an AI payment-recovery control tower,
Indian merchant, INR amounts. Left nav rail with 5 sections: Overview, Leakage,
Recovery Queue, Incidents, Audit. Landing view: four KPI stat cards (Revenue at
Risk ₹26.7L in red, Recovered ₹1.76L in green, Recovery Rate 6.61%, AI vs Baseline
+0.57pp uplift), a 7-day failure-rate line chart with a red spike annotation, a
donut of recoverable/unrecoverable/escalated revenue, and below it a ranked
leakage table with severity badges and evidence chips, plus a right-side live
feed panel streaming recovery outcomes. Linear/Stripe aesthetic, blue accents,
amber approval locks, monospace numbers.
```

---

## Notes for comparing generated results against our real system

- Numbers above come from the actual 600-txn evaluation run (`scripts/run_evaluation.py`) — keep them in the prompt so mockups are grounded, then judge layouts by whether they'd survive our real data shape.
- Must-haves to check in any output: severity-ranked clusters with *evidence*, EV-ranked queue with policy/approval states, and an audit feed where Policy Guard blocks are first-class events — those three reflect the core differentiator (decision layer, not a retry bot).
- If a tool asks about data: say it comes from a FastAPI backend with endpoints `/detect`, `/diagnose`, `/run` returning pydantic models — useful when moving from mockup to wired UI in Phase 8.
