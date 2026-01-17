# Whether Roadmap

This roadmap focuses on shipping a defensible, operator-facing “product strategy weather report.”
Each milestone is tied to the core loop: ingest Treasury data → compute regime → translate into
plain‑English operational constraints with traceable sources.

## Milestone 0 — Repo scaffolding (Week 0)
- [x] Establish Next.js 14 + TypeScript strict + Tailwind baseline.
- [x] Add core directories: `app/`, `lib/`, `data/`, `public/`.
- [x] Add `lib/types.ts` with Regime Engine interfaces.
- [x] Add `lib/regimeEngine.ts` with explainable scoring and classification.
- [x] Add `data/snapshot_fallback.json` for offline mode.

## Milestone 1 — Live Sensor Array (Week 1)
- [x] Implement `/api/treasury` route:
  - [x] Fetch from US Treasury Fiscal Data API.
  - [x] Normalize to `TreasuryData` shape.
  - [x] Cache daily (`revalidate: 86400`).
  - [x] Fallback to snapshot with `isLive: false`.
  - [x] Always return `source`, `record_date`, `fetched_at`.
- [x] Build Sensor cards:
  - [x] Base rate (1M yield) with tooltip explanation.
  - [x] Curve slope (10Y − 2Y) with tooltip explanation.
  - [x] Source + timestamp on every card.

## Milestone 2 — Regime Hero + Playbook (Week 2)
- [x] Regime Hero:
  - [x] Regime badge (Scarcity/Defensive/Volatile/Expansion).
  - [x] Short description that translates jargon into operational constraints.
- [x] Playbook lists:
  - [x] STOP / START / FENCE with reasons.
  - [x] Keep lists short and action‑oriented.

## Milestone 3 — Decision Shield (Week 3)
- [x] Dropdown-driven inputs (Lifecycle, Category, Action).
- [x] Verdict card (Safe / Risky / Dangerous) with:
  - [x] 2–4 bullets tied to sensor states.
  - [x] Guardrail constraint.
  - [x] Reversal trigger.
- [x] Copy-to-clipboard output for easy sharing.

## Milestone 4 — Time Machine (Week 4)
- [x] Historical mode:
  - [x] Month/Year picker.
  - [x] Server fetch with `record_date:lte:YYYY-MM-DD`.
  - [x] Banner that clearly marks historical context.
- [x] Handle missing data and “latest available” lookup.

## Milestone 5 — UX Polish + Verification (Week 5)
- Cockpit-style layout with high-density panels.
- Accessibility pass: keyboard nav, focus states, reduced motion.
- Verify offline mode + snapshot labeling.
- Add footer disclaimer: “Not Financial Advice.”

## Milestone 6 — Reliability + Regression Tests (Week 6)
- Unit tests for:
  - Regime scoring boundaries.
  - Classification rules.
  - Decision Shield verdicts.
- Add data parsing tests for Treasury response normalization.

## Milestone 7 — Operator Demand Expansion (Week 7)
- Broaden macro inputs beyond the yield curve (inflation, unemployment, credit spreads) with explicit source links.
- Add adjustable regime thresholds with audit trails for custom tuning.
- Expand Decision Shield to cover additional decision types (M&A, infra spend, geographic expansion).
- Add export/share flows (PDF, slide-ready summary, scheduled email or Slack brief).
- Build an Insight Database with citations to evidence and historical precedents.
- Add time-series comparisons (“then vs now”) with regime change diffs.
- Add alerts/notifications on regime changes.
- Support saved Decision Shield scenarios and team presets.
- Surface deep data provenance per sensor (direct source URLs, formulas, timestamps).
- Introduce an API/export endpoint for embedding regimes in internal dashboards.

## Milestone 8 — CXO Function Replacement (Week 8)
- CFO / Finance Strategy mode:
  - Translate regime outputs into runway, burn, and capital efficiency guardrails.
  - Budget planning export with macro posture summary and source citations.
- COO / Operating Strategy posture board:
  - Company-wide execution constraints and operating cadences tied to regime shifts.
  - Guardrail checklists for cross-functional planning reviews.
- CTO/CPO Strategic Planning overlays:
  - Roadmap posture toggles (growth vs. efficiency) with regime-aligned guidance.
  - Hiring and pricing decision templates tied to current sensors.
- Head of Strategy briefing suite:
  - One-page executive brief with regime narrative, risk flags, and reversal triggers.
  - Planning memo generator for leadership syncs with copy-ready language.

---

### Development stories (planned)
- As a product leader, I can see a curated Insight Database so I understand how macro regimes translate into concrete product and engineering constraints.
- As an operator, I can copy Decision Shield guidance tied to current sensors so I can validate hires, rewrites, and launches with traceable reasoning.
- As a team lead, I can compare fossil-record signals against today’s regime so I can spot legacy architecture and support patterns that no longer fit the climate.
- As an executive, I can read a one-sentence meta-insight that explains why posture must change with macro physics.
- As a strategy lead, I can subscribe to regime-change alerts and distribute summaries automatically.
- As a finance partner, I can export a slide-ready snapshot of the current regime with citations for planning reviews.

### Success criteria
- Every output is traceable to a public source and includes timestamps.
- Operators can copy/paste a defensible, plain‑English decision rationale.
- Offline mode is explicit and safe.
