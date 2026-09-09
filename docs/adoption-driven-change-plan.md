# Adoption-Driven Change Plan

> **⚠️ HISTORICAL** — This adoption analysis predates the IA rationalization and feature consolidation shipped in mid-2026. Key decisions are now codified in `AGENTS.md` and `docs/feature-specs-current.md`.

This plan converts the whether.work adoption analysis into concrete repo changes. It maps
every "sunset candidate," "keep as evidence," and "make the product" item to real files and
routes so the work can be executed and verified surface by surface.

## North star

The strongest screen whether.work can ship:

```
2 DECISIONS NEED ATTENTION

Q4 hiring            RECONSIDER
  Why: Capital conditions and demand expectations have weakened relative to
  the assumptions recorded when you approved the plan.

Fundraising in March WATCH
  Why: One supporting assumption has deteriorated, but conditions remain
  inside your original range.

────────────────────────────────────────────
No change: Pricing · Cloud commitment · Office lease
```

Every feature that exists must plausibly do one of three things: **improve that screen**,
**improve its evidence**, or **determine when it should appear**. Anything else is either
internal machinery or a candidate for removal.

The adoption reason this screen serves is the distinctive one: **protect important decisions
from becoming stale**. The product already computes most of the machinery needed to render it.
The gap is wiring it together and removing the surfaces that compete with it.

## Three layers

```
KEEP INTERNALLY
  transition matrices · run-length analysis · historical replay ·
  model diagnostics · source health · fallback monitoring · threshold inspection

KEEP AS USER EVIDENCE
  historical contexts · sources · confidence · key signal movement

MAKE THE PRODUCT
  what changed? · what decision does it affect? · why? · how materially? ·
  do I need to reconsider now?
```

## Current state (grounding)

- Home hero already renders a **revisit panel**: "Revisit last week's decisions?" with
  `revisitDecisions` / `revisitQueue` (`app/components/DecisionHero.tsx:295-322`). This is
  the seed of the north-star screen.
- A **steady-week state** already exists (`weeklyLeadershipSummary.steadyWeek` →
  "No change / Last week's calls stand").
- **Decision Memory** exists (`lib/decisionMemory.ts`, `/operate/memory`,
  `DecisionMemoryButton`) but nothing compares recorded decision-time conditions against
  current conditions to produce RECONSIDER / WATCH verdicts. This is the flagship gap.
- **Decision-area delta rules** already exist (`lib/alerts/decisionDeltaRules.ts`,
  `lib/signalOps.ts`) but alert headlines are still generic ("Regime change",
  "Flip window narrowing") — see `app/api/check-regime-change/route.ts`.
- **Startup Climate Index** is computed (`lib/report/homeBrief/scoring.ts`) but never
  rendered anywhere in the UI. It is dormant, not a central object.
- **Phase-space / alternative-macro-visualizations** live in
  `app/signals/components/signalVisualizationSuite.tsx`, only in `/signals` `detail` view.
- **Transition / run-length surfaces** are `app/components/home/RegimeTransitionProbability.tsx`
  (rendered inside the hero watch box *and* `EvidenceTools`) and
  `app/components/RegimeHistory.tsx` ("Conditions over time", home lower band).
- **What-if tools** on home: `DecisionSimulator`, `ScenarioSimulator` (below the fold).
- **Source-health dashboard**: `app/components/sourceHealthPanel.tsx` on `/trust`.
- **Threshold tuning / model controls**: `app/signals/components/advancedThresholdsSection.tsx`,
  `thresholdsPanel.tsx`, `ThresholdNumberField.tsx`.
- **Standalone replay**: `/history` (`HistoryExplorer`, `RegimeStats`, `HistoricalTrendChart`,
  `/history/compare`), plus the Time Machine panel in `/signals` detail.
- **Multiple export formats**: `app/operate/components/exportBriefPanel.tsx` (Slack blocks,
  Jira md, wiki, Linear md, slide bullets, executive), plus `/brief.md`.
- **Decorative regime pages**: `/state`, `/comps`.

## Sunset / demote (concrete map)

| Feature | Current location | Action |
| --- | --- | --- |
| Phase-space / multi-viz suite | `signalVisualizationSuite.tsx` (scatter + line series, `/signals` detail) | Keep engine. Gate behind advanced; do not surface as a default evidence read. |
| Transition / run-length card | `RegimeTransitionProbability.tsx` (hero watch box + `EvidenceTools`) | Remove both render sites. Keep `computeTransitionProbability` internally for model diagnostics. |
| Regime history chart | `RegimeHistory.tsx` ("Conditions over time") | Remove from home lower band. Engine (`getMonthlyRegimeHistory`) stays for evidence/replay. |
| What-if simulators | `DecisionSimulator.tsx`, `ScenarioSimulator.tsx` (home below fold) | Remove from home. Keep a single bounded what-if behind the decision-attention flow only if it changes a revisit verdict. |
| Source-health dashboard | `sourceHealthPanel.tsx` on `/trust` | Remove user surface. Keep `lib/report/sourceHealth.ts` + fallback monitoring internal. |
| Threshold tuning / model controls | `advancedThresholdsSection.tsx`, `thresholdsPanel.tsx` | Keep internal / advanced-only. Users never tune regime thresholds as a product job. |
| Standalone replay | `/history`, `/history/compare`, Time Machine panel | Keep engine and `decisionArchive.tsx` (record-of-decisions evidence). Demote scrub/playback UX to supporting/advanced. |
| Multiple export formats | `exportBriefPanel.tsx`, `/brief.md` | One shareable brief is the artifact. Keep Slack + copy-brief primary; demote Jira/wiki/Linear/slide variants. |
| Decorative regime pages | `/state`, `/comps` | `/state` → gate or retire unless it drives a decision. `/comps` stays dev/utility. |
| Generic threshold-builder page | `/threshold` (utility "Framework") | Keep as reference/SEO only; not a product job. |

## Keep as user evidence (compact)

- **Provenance**: claim → evidence → source → observation date. Keep the compact trust strip,
  freshness dot, and citation line on the brief and share surfaces. Do not expose ingestion
  machinery (that's the source-health dashboard above).
- **Historical contexts**: published briefs (`/brief/[week]`), Decision Archive — these are the
  "record of why we decided" evidence. Keep; do not wrap in a time-machine explorer as the default.
- **Confidence**: keep as a compact line ("High confidence · 3 independent drivers moved
  consistently") next to the call, not a confidence-analysis subsystem.
- **Key signal movement**: tightness / risk-appetite deltas in the hero signal readout. Keep.

## Make the product (the flagship build)

### 1. Decision-staleness engine (P0)

Wire existing pieces into the north-star verdicts:

- `lib/decisionMemory.ts` already records decision-time regime scores, thresholds, guardrail,
  and reversal. Add an **assumption snapshot** concept: the conditions that had to be true for
  the decision to make sense (capital availability, demand expectation, labor availability).
- New comparison module (e.g. `lib/report/decisionStaleness.ts`): for each stored decision,
  compare current conditions against the recorded assumption range and emit
  `RECONSIDER | WATCH | no-change` with a one-line why.
- Feed verdicts into the existing hero revisit queue and into alerts.

Verdict rules (bounded):

```
RECONSIDER  ≥2 supporting assumptions moved outside the recorded range
WATCH       1 supporting assumption moved outside the recorded range
no-change   all assumptions inside the recorded range
```

### 2. Decision alerts (P0)

Reframe alerts from signal events to decision verdicts.

- Reuse `lib/alerts/decisionDeltaRules.ts` + `lib/signalOps.ts` decision-area deltas.
- Headline shape: `RECONSIDER Q4 HIRING — two supporting assumptions weakened` instead of
  `Regime changed to X` / `10Y yield crossed 4.2%`.
- Update `app/api/check-regime-change/route.ts` Slack blocks and
  `lib/alert/alertTemplates.ts` to lead with the decision verdict.
- Generic signal alerts (threshold crossings, flip-window narrowing) stay internal or as
  subordinate detail lines under the decision verdict.

### 3. Home page: protect the one screen (P0)

- Keep: hero call, action strip, revisit panel, bounded conditions, share rail, trust line.
- Promote: the revisit panel to the canonical "What needs reconsideration this week?" block,
  including the `No change` lane (pricing, cloud commitment, office lease, etc.) so the
  steady state is explicit.
- Remove from home: `RegimeTransitionProbability`, `RegimeHistory`, `DecisionSimulator`,
  `ScenarioSimulator`, `TickerCompany`, `SourceDisagreement`. These are below-the-fold tool
  racks that compete with the attention screen.

### 4. SCI → supporting metadata (P1)

`buildStartupClimateIndex` is dormant. Either:

- Surface it as one supporting metadata line under the posture call — "Overall conditions:
  deteriorating" — and delete the numeric object, or
- Remove the computation entirely.

Do not ship it as `SCI 57.4 ▼ 6.2`. The adoption reason is the interpretation, not the number.

### 5. Ritual simplification (P1)

The useful thing is "What needs reconsideration this week?" — which the revisit panel
already answers. `RitualCheck.tsx` (mark reviewed + streak) is weak gamification; keep at
most the reviewed marker, drop the streak if it adds no decision value.

**Done 2026-09-08, further than "keep the marker".** `RitualCheck` is deleted and
`app/components/weeklyCloseout.tsx` takes its place. A streak measures attendance; what a
decision meeting produces is a decision, so the closeout asks the two questions the meeting
answers — what did you change, what are you watching — and reopens that record the following
week against the areas the model has queued again. `flaggedAgain` is the point: an area
changed last week and queued again is a decision that is not holding, and the weekly ritual
is the only place that shows up. The four dots became a plain coverage line ("3 of the last
4 weeks closed"), which still means something after a missed week, unlike a streak.

It also closed a disclosure gap. Of eleven localStorage-backed surfaces, five said where the
data lived; `RitualCheck` was among the six that did not, sitting directly below
`DecisionStalenessPanel`, which does say it. The closeout says it.

## One-screen redraft (2026-08)

The adoption-driven phases above made `/` the decision-attention surface. This section goes
further: the weekly operating call is the product, and everything outside one screen faces a
very high bar. The bar is **"does this surface change what the operator does this week?"** If
not, it is either a disclosure on `/`, a deep link, or gone from nav. It must never be a peer
route that invites a second scan.

### The keep list (the ritual)

Everything that answers "how bold should we be this week?" in one scan:

```
THIS WEEK
Boldness Budget + weekly delta
  ↓ What should change? (3–5 operating calls: hiring / spend / raise / expansion)
  ↓ Pause if ...
  ↓ Reopen when ...
four-week memory
one shareable artifact
```

Ships as: `DecisionHero` (budget, delta, sparkline), `ThreeWhethersCard` (action strip),
`DecisionHero` bounded box (guardrail / reversal / flip watch), `RitualCheck` +
`DecisionStalenessPanel` + memory rail (memory), `ShareBriefButton` + citation footer
(artifact), `FreshnessDot` + confidence line (compact trust).

### Cut — primary nav collapses to `/`

Today `navigationLayers` exposes five primary routes: `/`, `/operate`, `/signals`, `/resolve`,
`/trust`, plus supporting `/history` and `/history/compare`. The redraft demotes all but `/`:

| Route | Current job | Redraft |
| --- | --- | --- |
| `/` | Weekly Brief | The product. Everything else is one click from here. |
| `/operate` (Plan) | Execution stepper, export, memory, alerts | Deep link + `?view=plan` state on `/`. The "Action now / Pause if / Change course if" block already ships on `/`. |
| `/signals` (Evidence) | "Why this call" + detail mode | `?detail=` disclosure on `/`. Evidence belongs under the call, not on a peer route. |
| `/resolve` (Resolve) | Role/stage translation, toolkits | Deep link only. "Tell me what matters to me" is solved by company decisions, not role views. |
| `/trust` | Freshness, confidence, formula | Inline trust line + citation footer on `/`. Formula reference stays as a deep link. |
| `/history`, `/history/compare` | Scrub/playback | Keep the immutable archive (`/brief/[week]`); scrub/playback stays behind a disclosure. |

Primary nav then has one entry. `primaryNavigationLayers` shrinks to `/`.

### Cut — the `/` below-the-fold browsing layer

The rest of `/` must not invite browsing either. Remove or demote to disclosure:

- `StageSwitcher` + `ViewSelector` (`cadenceSelector`) — the interpretation layer switch.
- `CompanyMetricsPanel` ("Your numbers") — company view as a home widget.
- `CompareStrip` auto-expand — keep as a manual "compare to last week" disclosure, not an
  auto-opened panel.
- `DecisionRouteRail` — the "Route this week's call" handoff that points at the peer routes
  being demoted.
- `?view=` interpretation machinery on `/` (`sector`, `company`, `financial`, `forecast`) —
  the default view is the product.

### Keep — engines, SEO, deep links (do not delete)

- All lib machinery: regime engine, forecast model, time machine, sector sensitivity,
  interpretation layer, runway planner, decision memory, staleness, export builders.
- Programmatic SEO corpus (`/answers`, `/resources`, `/concepts`, `/guides`) — the only
  organic discovery surface, since the weekly brief changes weekly and cannot be indexed.
- MCP + API surface — the "generate on demand" path for evidence, projection, comps.
- `/brief/[week]` immutable archive.
- Deep links and unlisted URLs — hidden but reachable beats deleted.

### The rule that decides each cut

> If a surface doesn't change what the operator does this week, it's a disclosure on `/` or
> gone from nav. Provenance, confidence, evidence, replay, tooling, and packaging only pass as
> compact inline elements of the artifact — never as peer routes.

### One-screen cut — DONE (2026-08)

Executed:
- `navigationLayers`: `/operate`, `/signals`, `/resolve`, `/trust` moved to `tier: "supporting"`
  under `weekly-brief`. `primaryNavigationLayers` is now just `/`. All routes stay in
  `navigationLayers`, so report-shell chrome, command palette, deep links, MCP/API, and SEO
  remain intact. Demoted routes resolve their header next-step back to the brief.
- Removed from `/`: `StageSwitcher`, `ViewSelector`, `CompanyMetricsPanel`, `DecisionRouteRail`.
  `CompareStrip` no longer auto-expands. The `?view=` interpretation layers no longer have a
  `/` UI switch; the machinery stays in `lib/report/interpretationLayer.ts` for export/share/OG
  and URL-driven deep links.
- Kept on `/`: the ritual (hero, action strip, bounded conditions, memory, share artifact,
  trust line) plus `DecisionStalenessPanel` and the plan deep-link CTA.

## Execution order

### Phase 1 — protect the home screen (smallest, highest leverage) — DONE (2026-08)
1. Remove `RegimeTransitionProbability` from hero + `EvidenceTools`.
2. Remove `RegimeHistory`, `DecisionSimulator`, `ScenarioSimulator`, `TickerCompany`,
   `SourceDisagreement` from the home below-fold band.
3. Promote the revisit panel into the canonical "What needs reconsideration this week?"
   block with an explicit `No change` lane.
4. Remove `SourceHealthPanel` user surface from `/trust`.
5. Run targeted tests + typecheck; update `docs/feature-specs-current.md`.

### Phase 2 — decision-staleness engine — DONE (2026-08)
1. Add assumption snapshot to decision memory records.
2. Build `lib/report/decisionStaleness.ts` verdict logic.
3. Wire verdicts into hero revisit queue + `No change` lane.
4. Unit tests for verdict rules; update brief + memory contracts.

### Phase 3 — decision alerts — DONE (2026-08)
1. Reframe alert headlines to decision verdicts.
2. Update Slack blocks + email templates + digest.
3. Update `docs/editorial-guardrails.md` vocabulary if new labels land (RECONSIDER/WATCH).

### Phase 4 — evidence/export consolidation — DONE (2026-08)
1. Gate `/signals` detail visualizations behind advanced.
2. Demote `/history` scrub/playback to supporting; keep archive + published briefs.
3. Consolidate export panel to one primary brief + Slack.

## Verification

- Phase 1: `bun run test tests/homeRouteDecisionTransmissionContract.test.tsx`,
  `tests/regimeHistoryRenderContract.test.tsx`, `tests/regimeTransitionProbability.test.ts`
  (update these — they lock the surfaces being removed), then `bun run typecheck`.
- Phase 2: new unit tests for `decisionStaleness` verdicts + existing decision-memory tests.
- Phase 3: existing `tests/signalOps.test.ts` + `tests/apiDecisionMemoryAndAlertsRoutes.test.ts`.
- Every phase: `bun run lint`; `bun run check` before merge.

## Contracts to keep stable

- The canonical weekly call and its bounded slots (`DECISION_CONTRACT_LABELS`) stay.
- `revisitQueue` / `revisitDecisions` shape can extend (add verdict + why) but must not break
  existing consumers (`DecisionHero`, `DecisionRouteRail`, exports).
- Decision Memory append-only semantics stay immutable.
- Read deadlines, cron-does-not-self-fetch, and materialized-history invariants in
  `AGENTS.md` are unaffected.

## Non-goals (from the adoption analysis)

- No role dashboards (Founder/CFO/Investor/Operator views). Company decisions/context solve
  relevance directly.
- No generic threshold-builder, provider/fallback config UI, or data-pipeline status as
  customer work.
- No new export formats beyond one shareable brief.
- No new macro visualizations of the same state.