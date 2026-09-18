# Whether Roadmap

This roadmap focuses on shipping a defensible, operator-facing “product strategy weather report.”
Each milestone is tied to the core loop: ingest Treasury data → compute regime → translate into
plain‑English operational constraints with traceable sources.
Audit notes for Milestones 5–8 live in `docs/roadmap-audit.md`.

## Immediate priority backlog (live-gap focused)

### Shipped baseline (2026-08-29)
1. ~~**Promote export/share to the Overview header**~~ — Shipped: `CopySlackBriefButton` and `PresentModeButton` in `DecisionHero` header (2026-08-29).
2. ~~**Ship source health panel (stale/failed feed visibility)**~~ — Shipped: System status and Source board on `/trust` with per-source freshness, fallback reasons, and fetch metadata.
3. ~~**Harden API contracts for summary and Signal Ops payloads**~~ — Shipped: `tests/apiSummaryContracts.test.ts` and `tests/cliContracts.test.ts` provide contract coverage for `/api/weekly`, `/api/monthly`, alerts, and digest.
4. ~~**Finish historical structured archive materialization**~~ — Shipped: `lib/summary/summaryArchive.ts` with deterministic regression coverage.
5. ~~**Consolidate operations IA around live routes**~~ — Shipped: `lib/navigation/informationArchitecture.ts` consolidates live routes (`/`, `/operate`, `/signals`, `/answer`, `/trust`, `/history`).

### Active focus (community & operator demand)
1. ~~**Scheduled Monday Slack & Email delivery**~~ (Top request #1 & #3) — Shipped: KV-backed multi-team webhook registry (`lib/slack/slackWebhookStore.ts`), connection & test API (`/api/slack/subscribe`), UI destination toggle, and automated Monday delivery fan-out with auto-pruning (2026-09-17).
2. ~~**Runway & stage decision calibration**~~ (Top request #11 & #12) — Shipped: runway bands (`lib/report/operatorRunway.ts`: <6, 6–12, 12–24, 24+ months) scale every stage rule's do-now, pause and reversal lines (`scaleAdjustmentToRunway`), selectable from the hero and the phone header, carried by `?runway=` and the `whether-company-runway` cookie (2026-09-17).
3. ~~**1-slide board deck & investor memo exports**~~ (Top request #31 & #32) — Shipped: `/api/export/board-slide?format=pptx|pdf` writes the meeting slide as a native one-slide PPTX (hand-written OOXML, `lib/export/boardSlideDeck.ts`) or a 16:9 PDF, downloadable from `/share`; the monthly investor update block (`lib/export/investorUpdateSnippet.ts`) copies from `/share` with the regime, its move since the prior month-end, the call, and the runway sentence for the browser's band (2026-09-17).
4. **Linear / Jira epic guardrail tagging** (Top request #4) — Sync macro posture to engineering planning tools to warn on high-risk, speculative bets. *Open decision (2026-09-17): the sync needs each team's Linear API key or Jira token stored server-side, which is a new class of stored secret and a new `/privacy` entry; deferred behind items 3 and 5. A credential-free slice — a per-epic guardrail label and description block an operator pastes themselves, extending the issue-tracker brief on `/share` — is the fallback if tokens are not to be held.*
5. ~~**Mid-week flash alerts & proximity-to-flip watch**~~ (Top request #21 & #22) — Shipped: the daily cron judges the short rate and the 10Y−2Y curve against the previous read (`lib/alert/flashMoves.ts`: a quarter point on the rate or twenty points on the curve between consecutive reads) and pushes a critical alert by email and Slack the day it lands, outside the weekly cooldown; the hero's Conditions cell carries a flip watch (`lib/report/flipProximity.ts`) stating the market move that would change the call, in the input's units (2026-09-17).


## Milestone 0 — Repo scaffolding (Week 0)
- [x] Establish Next.js 14 + TypeScript strict + Tailwind baseline.
- [x] Add core directories: `app/`, `lib/`, `data/`, `public/`.
- [x] Add `lib/types.ts` with Regime Engine interfaces.
- [x] Add `lib/regimeEngine.ts` with explainable scoring and classification.
- [x] Add `data/snapshot_fallback.json` for offline mode.

## Milestone 1 — Live Sensor Array (Week 1)
- [x] Implement `/api/treasury` route:
  - [x] Fetch from FRED Treasury constant-maturity series.
  - [x] Keep US Treasury Fiscal Data API for validation/provenance cross-checks.
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
- [x] Promote export/share actions (copy-ready leadership brief) to the Overview header. Shipped: `CopySlackBriefButton` and `PresentModeButton` in `DecisionHero` header (2026-08-29).

## Milestone 6 — Reliability + Regression Tests (Week 6)
- [x] Unit tests for:
  - [x] Regime scoring boundaries.
  - [x] Classification rules.
  - [x] Decision Shield verdicts.
- [x] Add data parsing tests for Treasury response normalization.

## Milestone 7 — Operator Demand Expansion (Week 7)
- [x] Broaden macro inputs beyond the yield curve (inflation, unemployment, credit spreads) with explicit source links.
- [x] Add adjustable regime thresholds with audit trails for custom tuning.
- [ ] Decision Shield expansion logic exists in code but is not exposed as a primary live route.
- [x] Add export/share flows (PDF, slide-ready summary, scheduled email or Slack brief).
- [x] Build an Insight Database with citations to evidence and historical precedents.
- [x] Add time-series comparisons (“then vs now”) with regime change diffs.
- [x] Add alerts/notifications on regime changes.
- [ ] Saved Decision Shield scenarios/presets exist in component logic but are not surfaced in the
  primary route map.
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
- [x] Promote export/share actions (copy-ready leadership brief) to the Overview header. Shipped (2026-08-29).
- [x] Launch executive briefing pack (Slack/email/slide-ready) with citations and regime summary.
- [x] Add regime-shift alerting with reason codes and Time Machine deep links.
- [x] Add weekly digest output with “what changed” delta summary.
- [x] Allow role-specific alert routing (CFO/COO/CTO/CPO presets). Shipped: tagged alert decisions with department and rolePreset metadata (2026-09-04).

## Milestone 10 — Decision Memory + Scenario Studio (Week 10)
- [x] Decision Memory log with immutable records (regime, sensors, thresholds, sources). Shipped: append-only ledger on `/operate/memory` with CSV export (2026-09).
- [x] Scenario presets library with shareable templates on a shipped route. Shipped: presets on `/operate/scenarios` (2026-09-04).
- [x] Counterfactual slider view with explicit “Simulated” labeling on a shipped route. Shipped: dual rate/slope sliders and banner on `/operate/scenarios` (2026-09-04).
- [x] Then-vs-now comparisons baked into the Scenario Studio. Shipped: live baseline vs counterfactual delta panel on `/operate/scenarios` (2026-09-04).
- [x] Assumption locking banner to keep posture choices explicit in reviews. Shipped: assumption health verdicts and simulation guardrails (2026-09-04).

## Milestone 11 — Evidence + Data Reliability (Week 11)
- [x] Live macro fetchers for CPI, unemployment, and BBB spreads with source URLs.
- [x] Evidence pack upgrades: Insight Database citations and Fossil Record view. Shipped: Fossil Record table on `/signals` (2026-09-04).
- [x] Data freshness health checks with explicit fallback reasons. Shipped: freshness timestamps and fallback status on `/trust` Source board.
- [x] Add a "source health" panel that surfaces stale/failed data feeds. Shipped: System status and Source board on `/trust`.

## Milestone 12 — Automated Transmission & Ritual Embedding (Week 12)
- [x] Multi-team Slack delivery with scheduled Monday digest into `#leadership` with welcome test ping. Shipped: `SlackWebhookStore`, `/api/slack/subscribe`, UI channel toggle, and `deliverSlackBrief` fan-out with auto-pruning (2026-09-17).
- [x] Zero-login automated executive email brief delivery with copy-ready decision bullets. Shipped: `sendWeeklyBrief` and `subscriberStore` with Cloudflare Email adapter.
- [ ] Live Notion and Coda embed / sync block for PRDs and quarterly planning documents.
- [ ] Linear and Jira initiative / epic macro-guardrail sync (flag speculative bets during Scarcity/Defensive).
- [x] Mid-week emergency flash alerts for unexpected regime changes (intraday spread blowouts, emergency rate cuts). Shipped: `lib/alert/flashMoves.ts`, wired through `checkRegimeChange` (Slack) and `runScheduledAlertDelivery` (email) on both crons (2026-09-17).
- [x] Proximity-to-flip watch indicator ("0.08% on 10Y-2Y curve away from shifting regime"). Shipped: `lib/report/flipProximity.ts`, rendered in the hero's Conditions cell (2026-09-17).

## Milestone 13 — Company-Calibrated Decisions (Week 13)
- [x] Dynamic runway-scaled guardrails (<6m, 12m, 24m+ cash bands) scaling stop/start/fence rules. Shipped: `lib/report/operatorRunway.ts` and `scaleAdjustmentToRunway` in `boundedDecisionRules.ts` (2026-09-17).
- [x] Stage profile presets (Seed vs. Series A vs. Growth) adjusting hiring speed and burn tolerance. Shipped: `lib/report/operatorStage.ts` and the per-stage adjustments in `boundedDecisionRules.ts` (see `docs/feature-specs-current.md` §1.1.7, 2026-09-06).
- [ ] Sector overlays (B2B SaaS vs. Consumer vs. DeepTech / AI Infrastructure).
- [ ] Bootstrapped / profitable mode (decoupling VC fundraising assumptions, calibrating for pricing power and gross margin).
- [ ] ARR-per-employee and burn multiple efficiency benchmark thresholds.
- [ ] Tech talent heat index integration (WARN notices and layoffs tracking) to calibrate hiring pacing.

## Milestone 14 — Governance & Executive Artifacts (Week 14)
- [x] 1-slide board deck export (native PPTX and presentation-ready PDF). Shipped: `/api/export/board-slide`, linked from `/share` and `/api-docs` (2026-09-17).
- [x] Monthly investor update snippet generator (2-paragraph copyable block with regime, delta, and runway implications). Shipped: "Investor update" on `/share` (2026-09-17).
- [ ] White-label / unbranded PDF and slide exports for PE/advisors and board directors.
- [ ] Board pre-read memo template (structured 2-page Markdown/PDF for leadership syncs).
- [ ] Audit-proof Decision Memory export for compliance, board scrutiny, and compensation reviews.

## Milestone 15 — Platform Ecosystem & Portfolio Intelligence (Week 15)
- [ ] Model Context Protocol (MCP) server expansion and typed client SDK (`@whether/sdk`).
- [ ] Native Zapier and Make.com connectors for custom operator workflows.
- [ ] GitHub Action for macro-aware PR & architecture reviews (flagging high-variable-cost cloud spend in tight regimes).
- [ ] VC / Multi-Company Health Matrix (portfolio-wide runway vs. macro sensitivity view).
- [ ] Bulk portfolio broadcast tools for VC platform and accelerator leads.

---

### Development stories (planned)
- As a product leader, I can see a curated Insight Database so I understand how macro regimes translate into concrete product and engineering constraints.
- As an operator, I can copy Decision Shield guidance tied to current sensors so I can validate hires, rewrites, and launches with traceable reasoning.
- As a team lead, I can receive the Monday brief directly in our `#leadership` Slack channel without logging in.
- As a founder, I can export a 1-slide PPTX board summary that aligns investors on macro posture in under a minute.
- As a CFO, I can enter our cash runway and see stop/fence/start rules scaled specifically to our remaining months.
- As an engineering executive, I can tag epics in Linear that violate current capital efficiency bounds.
- As a strategy lead, I can subscribe to mid-week flash alerts when a rate shock or credit blowout threatens our posture.
- As a VC operating partner, I can inspect a health matrix of 40 portfolio companies against current macro tightness.

### Success criteria
- Every output is traceable to a public source and includes timestamps.
- Operators can copy/paste a defensible, plain‑English decision rationale in under 60 seconds.
- Ritual transmission works without requiring the user to open a browser tab every Monday.
- Offline mode is explicit and safe.

---

## Explicit Non-Goals & Rejected Feature Traps (What We Will Not Build)

To protect the core product loop (**signals → posture → decision delta → bounded action → shareable artifact**) and prevent product sprawl, the following high-demand community requests are explicitly rejected:

1. **No Bloomberg / TradingView Terminal Replication:**
   - *Why rejected:* Operators repeatedly upvote requests for crypto liquidity, oil/energy commodity prices, and intraday stock tick charts. Whether's mission is not to explain or display the market; it is to deliver an operational verdict.
2. **No Speculative Fed Forecasting / Prediction Crystal Ball:**
   - *Why rejected:* Users ask "Predict what the Fed will do next month." Whether is a pacing instrument with explicit numeric thresholds, not a macroeconomic opinion blog or speculative forecasting tool.
3. **No Black-Box Monte Carlo Financial Models:**
   - *Why rejected:* Complex probabilistic multi-variable simulations obscure the derivation. Decisions must remain traceable to public formulas with visible constants on `/trust`.
4. **No Generic Uncurated BI Dashboards:**
   - *Why rejected:* Adding custom SQL queries or arbitrary chart widgets creates new-system overhead and destroys the 60-second decision transmission speed.

---

## Acquisition readiness (Reforge)
Track these items to present Whether as a Reforge-grade operating system.
- [x] Executive brief CTA is primary in the Overview header. Shipped: `CopySlackBriefButton` is the primary hero action (2026-08-29).
- [x] Weekly/monthly briefing APIs are stable and copy-ready with citations. Shipped: `/api/weekly`, `/api/monthly`, `/brief.md`, and `/api/integrations/weekly-mandate` (2026-08).
- [ ] Insight Database includes precedent case studies per regime.
- [x] Decision Memory logs are immutable and exportable. Shipped: `/api/decision-memory` and `/decisions` (2026-09). `/operate/memory` was retired into a redirect to `/history` — which is the *published* archive, not the reader's own — and this line went on claiming it for weeks, during which no browser could read or write the ledger at all.
- [x] Role-based presets ship for CFO/COO/CTO/CPO workflows. Shipped: stakeholder briefs on /operate and role-calibrated alert routing (2026-09-04).
- [x] Source health panel surfaces stale or failed data feeds. Shipped: System status and Source board on `/trust`.
- [x] Live macro fetchers replace snapshot-only CPI/unemployment/BBB inputs. Shipped: live FRED fetchers in `lib/fred.ts` (2026-08).
