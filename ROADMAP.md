# Whether Roadmap

This roadmap focuses on shipping a defensible, operator-facing “product strategy weather report.”
Each milestone is tied to the core loop: ingest Treasury data → compute regime → translate into
plain‑English operational constraints with traceable sources.
Audit notes for Milestones 5–8 live in `docs/roadmap-audit.md`.

## Immediate priority backlog (lowest-hanging fruit)
These items are sequenced for maximum operator impact with minimal net-new system design.

1. **Promote export/share to the Overview header**
   - Move leadership brief actions to the top-level report header as a primary CTA.
   - Success signal: operators can copy or share a briefing from the first screen without scrolling.
2. **Ship weekly digest output from existing summary primitives**
   - Reuse weekly/monthly summary + delta generation to produce a lightweight digest payload.
   - Success signal: recurring digest can be consumed in Slack/email workflows with citations.
3. **Add regime alert reason codes + Time Machine deep links**
   - Enrich alert payloads with explicit trigger reason(s) and historical context links.
   - Success signal: every alert is actionable and auditable in one click.
4. **Replace static macro snapshot with live fetchers (CPI, unemployment, BBB spreads)**
   - Preserve fallback behavior and provenance metadata while moving macro data to live pulls.
   - Success signal: macro cards show current record dates without manual snapshot refreshes.
5. **Add source health panel (stale/failed feed visibility)**
   - Surface per-source freshness, fallback reasons, and last successful fetch metadata.
   - Success signal: operators can immediately see whether guidance is live, stale, or degraded.

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
- [x] Cockpit-style layout with high-density panels.
- [x] Accessibility pass: keyboard nav, focus states, reduced motion.
- [x] Verify offline mode + snapshot labeling.
- [x] Add footer disclaimer: “Not Financial Advice.”
- [x] Add an executive decision brief block with a single recommendation + risk badge.
- [x] Add a “what changed since last read” delta panel on Overview with a Time Machine link.
- [x] Add inline “signal translation” helpers for jargon-heavy metrics.
- [ ] Promote export/share actions (copy-ready leadership brief) to the Overview header. (See audit.)

## Milestone 6 — Reliability + Regression Tests (Week 6)
- [x] Unit tests for:
  - [x] Regime scoring boundaries.
  - [x] Classification rules.
  - [x] Decision Shield verdicts.
- [x] Add data parsing tests for Treasury response normalization.

## Milestone 7 — Operator Demand Expansion (Week 7)
- [x] Broaden macro inputs beyond the yield curve (inflation, unemployment, credit spreads) with explicit source links.
- [x] Add adjustable regime thresholds with audit trails for custom tuning.
- [x] Expand Decision Shield to cover additional decision types (M&A, infra spend, geographic expansion).
- [x] Add export/share flows (PDF, slide-ready summary, scheduled email or Slack brief).
- [x] Build an Insight Database with citations to evidence and historical precedents.
- [x] Add time-series comparisons (“then vs now”) with regime change diffs.
- [x] Add alerts/notifications on regime changes.
- [x] Support saved Decision Shield scenarios and team presets.
- [x] Surface deep data provenance per sensor (direct source URLs, formulas, timestamps).
- [x] Introduce an API/export endpoint for embedding regimes in internal dashboards.

## Milestone 8 — CXO Function Replacement (Week 8)
- [x] CFO / Finance Strategy mode:
  - [x] Translate regime outputs into runway, burn, and capital efficiency guardrails.
  - [x] Budget planning export with macro posture summary and source citations.
- [x] COO / Operating Strategy posture board:
  - [x] Company-wide execution constraints and operating cadences tied to regime shifts.
  - [x] Guardrail checklists for cross-functional planning reviews.
- [x] CTO/CPO Strategic Planning overlays:
  - [x] Roadmap posture toggles (growth vs. efficiency) with regime-aligned guidance.
  - [x] Hiring and pricing decision templates tied to current sensors.
- [x] Head of Strategy briefing suite:
  - [x] One-page executive brief with regime narrative, risk flags, and reversal triggers.
  - [x] Planning memo generator for leadership syncs with copy-ready language.

## Milestone 9 — Signal Ops + Briefing Pack (Week 9)
- [ ] Promote export/share actions (copy-ready leadership brief) to the Overview header.
- [ ] Launch executive briefing pack (Slack/email/slide-ready) with citations and regime summary.
- [ ] Add regime-shift alerting with reason codes and Time Machine deep links.
- [ ] Add weekly digest output with “what changed” delta summary.
- [ ] Allow role-specific alert routing (CFO/COO/CTO/CPO presets).

## Milestone 10 — Decision Memory + Scenario Studio (Week 10)
- [ ] Decision Memory log with immutable records (regime, sensors, thresholds, sources).
- [ ] Scenario presets library with shareable templates.
- [ ] Counterfactual slider view with explicit “Simulated” labeling.
- [ ] Then-vs-now comparisons baked into the Scenario Studio.
- [ ] Assumption locking banner to keep posture choices explicit in reviews.

## Milestone 11 — Evidence + Data Reliability (Week 11)
- [ ] Live macro fetchers for CPI, unemployment, and BBB spreads with source URLs.
- [ ] Evidence pack upgrades: Insight Database citations and Fossil Record view.
- [ ] Data freshness health checks with explicit fallback reasons.
- [ ] Add a “source health” panel that surfaces stale/failed data feeds.

---

### Development stories (planned)
- As a product leader, I can see a curated Insight Database so I understand how macro regimes translate into concrete product and engineering constraints.
- As an operator, I can copy Decision Shield guidance tied to current sensors so I can validate hires, rewrites, and launches with traceable reasoning.
- As a team lead, I can compare fossil-record signals against today’s regime so I can spot legacy architecture and support patterns that no longer fit the climate.
- As an executive, I can read a one-sentence meta-insight that explains why posture must change with macro physics.
- As a strategy lead, I can subscribe to regime-change alerts and distribute summaries automatically.
- As a finance partner, I can export a slide-ready snapshot of the current regime with citations for planning reviews.
- As an operations lead, I can generate a briefing pack with citations in under a minute.
- As a planning reviewer, I can audit decisions against the exact regime and threshold settings at the time.
- As a staff leader, I can run a counterfactual and share the deltas as a link.

### Success criteria
- Every output is traceable to a public source and includes timestamps.
- Operators can copy/paste a defensible, plain‑English decision rationale.
- Offline mode is explicit and safe.

---

## Acquisition readiness (Reforge)
Track these items to present Whether as a Reforge-grade operating system.
- [ ] Executive brief CTA is primary in the Overview header.
- [ ] Weekly/monthly briefing APIs are stable and copy-ready with citations.
- [ ] Insight Database includes precedent case studies per regime.
- [ ] Decision Memory logs are immutable and exportable.
- [ ] Role-based presets ship for CFO/COO/CTO/CPO workflows.
- [ ] Source health panel surfaces stale or failed data feeds.
- [ ] Live macro fetchers replace snapshot-only CPI/unemployment/BBB inputs.
