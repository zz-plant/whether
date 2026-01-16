# Whether Roadmap

This roadmap focuses on shipping a defensible, operator-facing “product strategy weather report.”
Each milestone is tied to the core loop: ingest Treasury data → compute regime → translate into
plain‑English operational constraints with traceable sources.

## Milestone 0 — Repo scaffolding (Week 0)
- Establish Next.js 14 + TypeScript strict + Tailwind baseline.
- Add core directories: `app/`, `lib/`, `data/`, `public/`.
- Add `lib/types.ts` with Regime Engine interfaces.
- Add `lib/regimeEngine.ts` with explainable scoring and classification.
- Add `data/snapshot_fallback.json` for offline mode.

## Milestone 1 — Live Sensor Array (Week 1)
- Implement `/api/treasury` route:
  - Fetch from US Treasury Fiscal Data API.
  - Normalize to `TreasuryData` shape.
  - Cache daily (`revalidate: 86400`).
  - Fallback to snapshot with `isLive: false`.
  - Always return `source`, `record_date`, `fetched_at`.
- Build Sensor cards:
  - Base rate (1M yield) with tooltip explanation.
  - Curve slope (10Y − 2Y) with tooltip explanation.
  - Source + timestamp on every card.

## Milestone 2 — Regime Hero + Playbook (Week 2)
- Regime Hero:
  - Regime badge (Scarcity/Defensive/Volatile/Expansion).
  - Short description that translates jargon into operational constraints.
- Playbook lists:
  - STOP / START / FENCE with reasons.
  - Keep lists short and action‑oriented.

## Milestone 3 — Decision Shield (Week 3)
- Dropdown-driven inputs (Lifecycle, Category, Action).
- Verdict card (Safe / Risky / Dangerous) with:
  - 2–4 bullets tied to sensor states.
  - Guardrail constraint.
  - Reversal trigger.
- Copy-to-clipboard output for easy sharing.

## Milestone 4 — Time Machine (Week 4)
- Historical mode:
  - Month/Year picker.
  - Server fetch with `record_date:lte:YYYY-MM-DD`.
  - Banner that clearly marks historical context.
- Handle missing data and “latest available” lookup.

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

---

### Development stories (planned)
- As a product leader, I can see a curated Insight Database so I understand how macro regimes translate into concrete product and engineering constraints.
- As an operator, I can copy Decision Shield guidance tied to current sensors so I can validate hires, rewrites, and launches with traceable reasoning.
- As a team lead, I can compare fossil-record signals against today’s regime so I can spot legacy architecture and support patterns that no longer fit the climate.
- As an executive, I can read a one-sentence meta-insight that explains why posture must change with macro physics.

### Success criteria
- Every output is traceable to a public source and includes timestamps.
- Operators can copy/paste a defensible, plain‑English decision rationale.
- Offline mode is explicit and safe.
