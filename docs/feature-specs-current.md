# Current feature specs (as built)

This document captures the **implemented** feature set in the repo. It is an audit of what the
product does today, based on shipped UI routes, data loaders, and APIs.

Positioning summary: Whether is an operator briefing system for leadership teams answering three recurring questions: what regime are we in, what should we do now, and which decisions are misaligned with current macro conditions.

## 1) Product surfaces (UI routes)

### 1.0 Rationalized IA (primary vs supporting)
Primary IA is now the five-surface operator loop:
- `/` — **Weekly Brief**: the canonical posture, decision delta, and share artifact
- `/evidence` — **Evidence**: evidence depth for thresholds, freshness, and replay
- `/resolve` — **Decision Tools**: role, situation, and utility-based decision translation
- `/planning` — **Planning**: execution guardrails, finance posture, and final-brief approval
- `/trust` — **Trust**: trust, source, formula, and confidence audit

Supporting surfaces are intentionally subordinate:
- `/toolkits` is a supporting instrument library under **Decision Tools**
- `/learn/failure-modes` is a supporting diagnostic reference under **Trust**
- `/guides`, `/resources/*`, `/answers`, `/solutions/*`, `/concepts`, and `/startup-macro-posture*` remain secondary discovery or distribution surfaces rather than primary workflow hubs
- SEO concentration now favors a smaller authority set: the five primary workflow hubs, a curated subset of high-intent answer pages, and a curated subset of authority resource pages.
- Secondary libraries such as `/guides`, `/toolkits`, `/posture`, most resource utilities, and most answer/detail bridge pages remain available in-product but default to noindex.
- `/guides` and top-level `/toolkits` entry URLs are helper entrypoints under their parent workflow hubs rather than standalone primary destinations
- `/guides` now acts as a compatibility redirect into query-selected translation states on `/resolve`, so role and stage translation live inside the canonical Decision Tools workflow rather than on a parallel library page.
- `/toolkits` now also acts as a compatibility redirect into the query-selected toolkit shortlist on `/resolve`, so toolkit search and browse state live inside the canonical Decision Tools workflow rather than as a standalone library route.
- `/posture` now acts as a compatibility redirect back to the Weekly Brief. Live posture reference no longer ships as a standalone workflow.
- `/search` now acts as a command-only redirect into the next canonical workflow state instead of rendering its own browse surface.
- `/resources` now redirects straight back into Planning's export/artifact checkpoint; deeper governance material still lives on focused `/resources/[slug]` detail pages.
- `/answers`, `/sources`, and `/confidence` no longer ship standalone page implementations; those URLs now permanently redirect to their canonical parent workflow states
- `/guides/stage`, `/guides/[stakeholder]`, `/guides/stage/[stage]`, `/concepts/conflicts`, `/concepts/focus/[focus]`, and `/concepts/audience/[audience]` are retired as standalone implementations and now permanently redirect into canonical hub-selected states on `/guides` or `/concepts`
- `/concepts` and `/learn/failure-modes` now permanently redirect into canonical decision/trust workflows rather than acting as independently indexable content hubs.

The homepage keeps interpretation layers optional and query-driven: the default weekly brief omits interpretation context entirely, and interpretation panels render only when a non-default `?view=` is explicitly selected.

Primary workflow pages now expose a top-of-page scroll path that explains the down-page sequence and highlights the current checkpoint as the operator moves through long surfaces.
Report-shell routes (`/evidence`, `/planning`, `/resolve`, `/trust` and nested report paths) use a reduced global header mode with one intro block before page-specific content; the homepage now suppresses report-shell header chrome so the weekly card remains the first dominant surface, compact report-shell intros now merge route purpose, trust state, and the first CTA into one priority card, do not inject a default export CTA on non-home routes, and the compact global nav stays quiet by default on mobile behind a collapsed workflow picker.
Workflow navigation on report-shell routes now also includes a compact step-progress state so users can keep their place in the five-surface loop while scrolling.
Primary navigation now uses compact route-first labels in header/nav contexts (`Start here`, `Evidence`, `Plan`, `Resolve`, `Trust`) while in-flow homepage CTAs use the most natural task verb for each destination, such as `Open weekly plan`, `Open evidence`, and `Check trust`.

### 1.1 Weekly briefing (/) 
The home report is a weekly briefing view delivered through the shared `ReportShell` layout. It
includes status metadata (data freshness, confidence label, offline badges), fixed navigation
links, and section anchors used across the report experience.

The home page is now the canonical weekly workspace. The top fold keeps the `WeeklyDecisionCard`
hero plus share/copy actions, then the page continues as a compact handoff sequence:
- planning handoff,
- evidence/trust exception handoff,
- optional deeper-surface chooser.

The home top fold now separates metadata from decision contract: a compact current-outlook strip
shows posture, trend, confidence, and flip-window context, and the canonical weekly call appears
once below it with explicit `Action now`, `Pause if`, and `Change course if` fields. The share rail
now keeps the weekly operator brief and short snapshot as the only default-scan actions, while board
packaging, print/export, and company-specific exception controls sit inside a secondary disclosure.
The weekly brief now also states its primary audience assumption directly: Whether defaults to
U.S.-based operators and a U.S. market baseline, then asks the user to pressure-test that read
against company-specific demand, retention, and cash signals.
Operator-workflow telemetry still logs artifact-mode selection and route transitions across the core
weekly loop.
The weekly-call module now also surfaces a compact weekly scalar block before the bounded decision strip:
- boldness budget score and weekly delta,
- hiring, expansion, and fundraising windows,
- one-line net delta shorthand.
The canonical weekly-call block now also includes:
- a compact decision-readiness verdict (`Act`, `Act with caution`, or `Hold`) inside the trust row,
- a bounded revisit queue (up to three items) when this week’s move implies specific decisions should be reopened,
- a delta-only brief in the share rail for repeat readers who only need the weekly change, reopen items, and current hold / reopen lines.
The current homepage hierarchy now makes the action lane dominant: `Do this now` leads the top fold, `What changed` supports it, and `Recheck now` plus readiness/trust sit in a smaller secondary lane rather than competing as equal-width cards.
The artifact rail now follows a routine-first hierarchy:
- one recommended artifact mode,
- one primary share/copy path,
- quick variants for repeat readers (`delta brief`, `call snapshot`),
- a direct handoff into Planning for board/governance repackaging and company-specific exceptions.
On the homepage, the artifact rail is now visually collapsed behind one default path: the first scan exposes one recommended share/copy action, while alternate artifact modes and heavier packaging sit behind a `More formats` disclosure.
Citation and continuity details remain adjacent but lower-emphasis, instead of repeating a second share summary around the primary artifact card.
Translation and glossary help remain available, but they now sit behind supporting disclosures instead of occupying the first scan path.
Across deeper workflow, answer, toolkit, trust, and export surfaces, the public-facing decision contract now standardizes on `Current call`, `Action now`, `Pause if`, and `Change course if` as the primary scan labels.
Those four lines now come from one shared weekly-call contract rather than route-local copy assembly, so the homepage card, copy CTA, command bar, and exported operator brief stay aligned on the core call. Shared copy/export artifacts also lead with the canonical Boldness Budget from the weekly leadership summary, with tightness reserved for pause/guardrail conditions.
The weekly brief sequence now favors `Boldness Budget -> current call -> operating levers -> share actions -> route handoff` rather than surfacing deep proof or team translation before the transmission surface.
The homepage global header now keeps the weekly brief calmer: it shows the direct next paths first, while the broader workspace chooser on `/` is tucked behind a collapsed `Browse workspaces` control rather than rendering as an always-open rail.
The lower homepage handoff now renders as a subordinate next-step layer instead of a second equal-weight dashboard band: one compact planning card leads, proof/trust remain visible exception checks, and replay/tool paths sit behind a collapsed optional disclosure with smaller follow-on links rather than a second open card grid.
The collapsed `Route this week's call` disclosure groups the downstream paths into Plan (capital posture, ship call), Resolve (by role, toolkits), Rule (blank decision form, reversal checklist), and Compare (past epochs, full archive), keeping them one expand away from the leading plan card.

The evidence handoff keeps trust compact on home by showing one summary plus explicit route
ownership for `/evidence` and `/trust` instead of reproducing those workflows inline.
The shared report shell no longer inserts extra homepage header / command chrome ahead of the weekly card, so the canonical brief remains the first major decision block.
The planning handoff compresses the weekly action, guardrail, and finance/share summary before
deeper review in `/planning`. Historical replay now belongs to `/evidence` rather than running as
an inline home interaction. Role, situation, and toolkit paths are handled as explicit downstream
surfaces after planning rather than as a parallel home workflow.
The default post-brief path is now Planning; Evidence and Trust are framed as exception checks when
the weekly call still needs proof.
Planning is now rendered as the visible next step on home, while Evidence and Trust are reduced to compact exception cards rather than a second homepage narrative.

The optional `?view=evidence` mode still renders the high-density analytical matrix with direct row
labels, embedded threshold context, and restrained accent usage for outlier conditions.

Copy strategy for briefing and onboarding surfaces favors concise, action-first language: one headline plus one support sentence before primary actions, with deeper rationale moved into expandable or secondary sections.
Route summaries and hero copy favor user-job phrasing over internal product nouns, especially on Evidence, Planning, Decision Tools, and Trust.

Weekly Brief URLs now emit week-specific Open Graph and Twitter preview cards. Shared links for the
current brief or a historical Time Machine selection preview the selected week’s posture, immediate
decision, flip condition, and core rate context instead of falling back to a generic site card.

Cold opens into `/` now use a share-card-aligned loading state before the full report resolves, so
social clicks land on the same action-first artifact structure rather than a generic skeleton.

### 1.2 Evidence report (/evidence)
The evidence report is the deep evidence appendix for the weekly workspace, with sections for:
- Sensor array (live yield curve readings + derived scores)
- Macro signal snapshot (CPI, unemployment, BBB spreads)
- Time Machine (historical month selector + cached summaries) visible without advanced-mode gating
- Threshold tuning (URL-driven overrides + audit log)
- Regime timeline (24‑month sequence for quick jumps)

Advanced controls remain available for threshold tuning and diagnostics expansion, but historical
replay is no longer treated as an expert-only action.
The entry sequence now opens with a compact `what this means now` summary before the denser
diagnostic stack so cold visitors get the operating implication before the appendix depth.
`/evidence` now also supports two explicit evidence modes:
- `What this means now` for action-first implication reading and compact scorecards
- `Evidence detail` for prioritized diagnostics, replay, threshold tuning, and advanced controls

The section navigation now follows the active evidence mode so implication-first visitors are not
routed toward hidden detail-only sections. The top summary also includes persisted evidence and
trust translation helpers for first-use definitions of `tightness`, `risk appetite`, `curve slope`,
`confidence`, and `freshness`.
The implication scorecards now use threshold-anchored meters with explicit distance-to-watch-line
labels instead of equal-width safe/caution/risk bands. The inversion preview now shows a labeled
zero line, time anchors, direct end labels, and visible breaks when monthly spread reads are
missing. The deeper yield-curve diagnostics now direct-label multi-series lines, preserve gaps
instead of connecting through missing data, and encode scatterplot recency through a chronological
path plus a highlighted latest point.

### 1.3 Planning overview (/planning)
Planning is the detailed execution depth page for the home workspace. The default surface is a
four-step progressive flow:
- weekly plan,
- guardrails,
- finance strategy,
- share brief.

Only one step is expanded at a time, while the other steps collapse into summary cards. The home
Planning handoff also now uses a more stateful board treatment with explicit owner, approval-state,
and change-course cues instead of sentence-only summaries. Existing
hash deep links are preserved by mapping section-level hashes into the relevant step.
The share step now also houses the operator follow-through surfaces that were previously disconnected from the core loop:
- per-profile alert delivery controls and recent send history,
- Decision Memory export and latest-entry recall,
- share artifacts, explainer mode, board/governance repackaging, company-specific exceptions, delivery controls, and audit history in one checkpoint before the brief leaves the room.
`/planning` now exposes the same mixed-literacy translation model as the Weekly Brief: a
top-of-page router sends users to decision, evidence, trust, or share help, and persisted planning
assist panels explain only the planning layer the user needs. The execution stepper itself now shows
owner, approval state, and `reopen when` metadata on both the active step and collapsed summaries.
Shared report-shell routes now avoid stacking a separate trust summary panel ahead of the first task block; trust status stays compressed inside the intro layer unless a route explicitly promotes a deeper trust section.

### 1.4 Planning workstreams
- **Weekly plan** (`/planning`): the default execution
  path with weekly plan, guardrails, finance strategy, export brief, scoped alert delivery controls, Decision Memory recall/export, and operator requests.

### 1.5 Home and glossary support (`/`, `/trust#beginner-glossary`)
The homepage is the only canonical first-time and returning weekly workspace. Plain-English
glossary support lives under the Trust hub so operators can pull term translation without leaving
the weekly brief flow. The glossary now explicitly translates U.S. market and Treasury language for
the product's primary user base instead of assuming macro fluency.

### 1.5.1 About and identity framing (`/about`)
The About page explicitly frames Whether as a small independent operator tool rather than a large research institution. It now states the intended authority boundary: trust the product for weekly pacing, bounded decisions, provenance, and degradation honesty—not as bespoke company advice or a substitute for internal metrics and judgment.

### 1.6 Trust hub (/trust) and formula reference
`/trust` is the canonical trust-audit hub linked from Weekly Brief. It summarizes current
confidence, freshness, source coverage, and revisit conditions, then keeps active false-signal
warnings inside the same Trust surface before linking out to `/trust#formula-reference`. The legacy `/sources` and `/confidence`
entry URLs now redirect at the routing layer back into the canonical Trust anchors instead of acting
as parallel trust pages.
The page now opens with a binary trust verdict (`safe to use`, `use cautiously`, or historical-only)
inside the trust snapshot block so operators can decide whether a deeper audit is necessary without a separate preamble card.
The opening trust snapshot stays trust-specific: freshness, source coverage, and use boundary are shown first, while the live weekly call remains on `/`.

`/methodology` now permanently redirects to `/trust#formula-reference`, which documents the sensor methodology and the public data sources used in the report (FRED Treasury series, FRED CPI, FRED labor, FRED credit spreads, FRED VIX, and Chicago Fed NFCI).

The methodology reference also now clarifies scope: the canonical pacing model is intentionally built on a bounded macro input set (base rate, curve slope, BBB spread, CPI, unemployment), and the operating outputs are a translation layer rather than a claim of bespoke precision.
Failure-mode diagnostics are now handled through the Trust and Planning workflows rather than as a standalone indexable library. Planning now exposes compact false-signal checks before guardrail approval so operators can pressure-test the weekly plan without leaving the core loop.

### 1.7 Share-preview assets for canonical hubs
High-priority hub routes now ship dedicated static SVG social preview assets for:
- `/posture`
- `/evidence`
- `/planning`
- `/resolve`
- `/resources`
- `/startup-macro-posture` and `/startup-macro-posture/index`
- `/guides`
- `/answers` and `/answers/[slug]`

Secondary hubs (`/guides`, `/resources`, `/toolkits`) now lead with immediate value and
focused next actions while reinforcing their parent workflow hub. `/answers` now redirects directly
back into the canonical Decision Tools quick-answer path instead of maintaining a separate hub shell.
Full helper libraries remain below the featured paths when those surfaces render a library view.
`/guides` now owns both stakeholder and stage detail states behind query-selected panels, but supporting libraries are no longer assumed to be indexable by default. Programmatic SEO scope now stays intentionally narrower than the total content footprint: curated answer pages remain indexable only when they map directly to a current operator decision and pass freshness/provenance gates, while supporting utilities, template downloads, and library index pages remain product-accessible but default to noindex and stay out of the sitemap.
`/search` remains product-accessible only as a command router URL: it forwards the query directly into the next primary workflow surface instead of acting like a browse-first library.
`/resolve/team-context` no longer operates as a standalone personalization branch; it now redirects into Planning, and the home unresolved-utility fallback is the ship checklist rather than a separate company-profile workflow. `/resolve` itself now leads with one best-next-step path, keeps alternate answers and translation paths behind a lower-emphasis disclosure by default, and uses a smaller fallback chooser after that; team/stage views and tool depth stay hidden until explicitly selected.
The active answer catalog is now intentionally narrower and keeps only the highest-signal decision-closing pages; retired long-tail slugs redirect back into the canonical Decision Tools answer flow. The active resource-article set is likewise reduced to a focused practical subset, with retired long-form briefs redirecting back into Planning's artifact checkpoint rather than a standalone Resources hub.

The homepage remains on live `/api/og` generation so the weekly brief preview can stay tied to current data.

Planning now opens with a weekly approval boundary before any broader monthly synthesis. The monthly action summary remains available as a secondary disclosure inside the first planning step instead of being the first primary payload.

Report-shell route intros are now compressed more aggressively on mobile so the first page-specific task block lands faster in the viewport; the route brief still orients the operator, but no longer needs a second always-visible decision panel on small screens.

Trust readiness language is now stricter on trust and planning surfaces: cached or medium-reliability states stay in staged-approval language (`use with caution` / `approvals staged`) instead of presenting as fully ready-to-use.
Trust/readiness computation now consumes structured freshness state (`fresh` / `stale` / `unknown` plus `live` / `cached` / `historical`) instead of relying on rendered freshness labels, so stale-but-present timestamps no longer pass as ready-to-use.

## 2) Data sourcing & provenance

### 2.1 Treasury yields (live + fallback)
- Canonical in-product source: FRED CSV Treasury constant-maturity series (`DGS1MO`, `DGS3MO`, `DGS2`, `DGS10`).
- Secondary/provenance source: US Treasury Fiscal Data API is used only for validation workflows and source cross-checking, not for runtime scoring.
- Data is normalized into a `TreasuryData` shape and stamped with `record_date`, `fetched_at`,
  and source metadata.
- If live fetch is unavailable, the report falls back to `data/snapshot_fallback.json` and marks the
  response as cached with a fallback reason.

### 2.2 Macro snapshot
- Core series now include CPI, unemployment, BBB OAS, HY OAS, Chicago Fed NFCI, and VIX with live fetch support where available.
- Startup/operator overlays (VC funding velocity, tech layoff trend, SaaS multiples) and structural overlays (earnings revisions, AI compute cost trend, regulatory risk tracker) are shipped via snapshot-backed series for deterministic fallback.
- Each series carries a source URL, record date, and freshness metadata.

### 2.3 Time Machine cache
- Historical Treasury snapshots are served from `data/time_machine_cache.json`.
- The Time Machine UI validates available months, shows cache coverage, and uses cached
  summary archives for weekly/monthly/quarterly/yearly playback.
- Historical assessment now attempts to align macro-series history to the selected `asOf` date and records explicit coverage labels (`historical aligned`, `historical aligned partial`, or `treasury-only`) so historical vs. live comparisons stay structurally comparable when data exists and honestly degraded when it does not.

## 3) Regime engine & scoring

### 3.1 Inputs
- **Base rate**: 1‑month Treasury yield (fallback to 3‑month if missing).
- **Curve slope**: 10Y − 2Y yield spread.
- **Macro overlays (boundary calibration)**: HY OAS, Chicago Fed NFCI, VIX, VC funding velocity, and tech layoff trend adjust tightness/risk appetite before final classification and trigger multi-weak-read warnings.

### 3.2 Scores
- **Tightness score (0–100)**: adds 90 points if base rate > threshold and 25 points if the curve
  is inverted; capped at 100.
- **Risk appetite score (0–100)**: maps curve slope linearly from -1.0% to 1.5%.

### 3.3 Regime classification
Regime is determined by tightness vs. risk appetite thresholds (defaults are 70 and 50
respectively). Thresholds can be overridden via URL parameters, and the UI maintains an audit log
of operator changes.

Canonical taxonomy is the four-quadrant set only: `SCARCITY`, `DEFENSIVE`, `VOLATILE`, `EXPANSION`.
Policy pilot outputs (`RISK_ON`, `SAFETY_MODE`, `TRANSITION`) are a separate posture layer and do not replace regime keys used by Decision Shield, alerts, or UI matrix logic.

### 3.4 Outputs
Adjustment semantics:
- Macro overlays modify tightness/risk-appetite scores before classification, so they can change the resulting regime when signals are near boundaries.
- Diagnostics (`boundaryContributors`, weak-read warnings, confidence) explain *why* adjustments applied.
- Recommendations and constraints always derive from the final classified regime.

The regime assessment includes:
- Current regime label + description
- Tightness and risk appetite scores
- Constraint list for the current regime
- Data warnings when inputs are missing
- Input metadata for provenance display



### 3.4.1 Sector sensitivity overlay (decision translation layer)
### 3.4.2 Trust and fallback behavior for missing sector/company context
- Sector query fallback: unknown or empty `?sector` values resolve to canonical fallback `b2b-saas`.
- Missing company-rule payload fallback (interpretation `company` view): render available bounded rules in provided priority order and cap to the top three; if fewer than three exist, render only available rules without blocking the page.
- Trust posture: these fallbacks are translation-layer only and never mutate base regime classification, canonical confidence label, or trigger thresholds.

- Sector overlays are **secondary interpretations only** and do not mutate base regime classification.
- Canonical sector taxonomy:
  - `b2b-saas` → higher upside sensitivity (`Expansion+`, `Mixed+` when warranted)
  - `consumer` → neutral calibration (`Expansion (neutral)`, `Mixed (neutral)`, etc.)
  - `infrastructure` → higher downside sensitivity (`Mixed-`, `Defensive-` when warranted)
  - `fintech` → mixed calibration with tighter downside checks and selective upside (`Mixed (neutral)|Mixed-` in boundary weeks)
  - `healthcare` → conservative calibration favoring hold/tighten near thresholds (`Defensive (neutral)|Defensive-` as warranted)
  - `ai-platforms` → aggressive upside calibration (`Expansion+`, `Mixed+` with stronger loosen bias when warranted)
- Overlay output contract (`deriveSectorAdjustedPosture`):
  - `basePostureLabel`
  - `adjustedPostureLabel` (`+`, `-`, or `(neutral)` variant formatting)
  - `postureVariant` (`plus|neutral|minus`)
  - `adjustmentStrength` (`none|light|moderate|strong`)
  - `adjustmentDelta` (signed scalar, damped near regime boundaries)
  - `actionBias` (`tighten|hold|loosen`) and `reversalCondition` for bounded decision translation
- Calculation semantics: normalize tightness and risk-appetite distance from thresholds, apply sector multipliers + offset, then damp the resulting delta by nearest-threshold distance so overlays do not oscillate during boundary weeks.
- Boundary rule: overlays are damped as scores approach regime thresholds so route-to-route language remains stable during transition weeks.

### 3.5 Policy-spec pilot layer (new)
A policy-alignment pilot now runs **alongside** the legacy regime engine in the assessment payload:
- Versioned policy metadata (`policy-v1`) is emitted for traceability.
- Signal normalization fields include z-score, directional transform, and clipped z-score for base rate, slope, BBB spread, CPI YoY, and unemployment; Treasury signals use the local long-range archive when available, while other policy signals normalize against the available local history window.
- Composite outputs expose `cts` and `ras` values without replacing legacy tightness/risk-appetite outputs yet.
- A refusal state is included when disagreement/volatility/data-gap guards trigger, returning explicit fallback directives (`NO_POSTURE_CHANGE_RECOMMENDED`, `REVERSIBLE_BETS_ONLY`).

This pilot remains additive at the scoring layer, but refusal is now binding at the guidance layer: if the policy layer refuses a posture change, readiness is capped, operator copy shifts to reversible-only execution language, and export/share surfaces must not present the move as a clean posture upgrade or downgrade.

## 4) Decision support tooling

### 4.1 Decisions workstream status
Decisions is an active first-class workflow surface in shipped navigation (`/resolve`) with an
action-first top fold anchored to the live weekly call:
- one recommended next path derived from the live weekly call,
- direct-answer and team-translation alternatives at lower visual weight,
- then ship checklist, Planning handoff, and role/situation browsing below the primary chooser.

`/toolkits` remains available as the supporting instrument library for Decision Tools, but it is no longer treated as a peer primary hub in navigation.

Decision Shield logic/components remain integrated through decision and operations surfaces.

### 4.2 Decision templates
Copy-ready decision templates remain available inside operations brief/export surfaces for async
review notes and leadership discussion.

### 4.3 Export behavior
Briefing/report exports remain available where they package current signal-driven guidance.
Integration payload exports are also available through `/api/integrations/weekly-mandate` for
Slack, Notion, and Linear targets.

### 4.4 Forecast confidence + runway-risk semantics
- Forecast confidence messaging is anchored to **boundary distance + crossing risk**, not long-horizon macro prediction.
- `forecast` interpretation copy must include:
  - highest-likelihood next posture (`regimeProbabilities` top value),
  - crossing-risk label (`low|medium|high`),
  - points-to-threshold distance + momentum direction.
- Runway planner risk messaging uses bounded bands:
  - risk score is clamped to 0–100 with labels `low|moderate|high|critical`,
  - recommendations include explicit raise window, burn adjustment range, and reversal language,
  - posture/regime flips should change urgency and guardrail strictness, not just copy tone.

## 5) Playbooks, summaries, and briefings

### 5.1 Playbook & operator requests
The playbook surfaces start/stop/fence actions based on the current regime, sourced from the
insight database and operator request catalog in `data/recommendations.ts` and
`lib/operatorRequests.ts`.

### 5.2 Weekly + monthly summaries
Weekly and monthly summaries are generated from the current assessment for use in the overview
page and APIs. These summaries are structured-first payloads (sections + provenance metadata) with
copy blocks rendered from the same structured data for sharing/export.

### 5.4 Structured summary contract (weekly/monthly)
Weekly/monthly summaries use a structured-first contract and render raw copy from that structure.

```mermaid
flowchart LR
  R[Regime + constraints] --> S[Structured fields]
  S --> U[UI sections
(climate, moves, constraints, provenance)]
  S --> C[Copy block
for sharing/export]
  S --> A[API payload
structured + copy + provenance]
```

Required weekly structure:
- `climate.label`, `climate.summary[]`
- `recommendedMoves[]`, `executionPriorities[]`, `watchouts[]`
- `planningLanguage`, `executionConstraints[]`

Required monthly structure:
- `executionConstraints[]`
- `provenance.source`, `provenance.timestamp`, `provenance.dataAge`

Archive compatibility formula for legacy records:

$$
\text{structured}_{legacy} =
\begin{cases}
\text{existing structured}, & \text{if present} \\
\text{buildStructured}(regime, constraints, provenance), & \text{otherwise}
\end{cases}
$$

### 5.5 Prioritized refactors (summary system)
- **P0 (implemented):** Shared structured→copy renderer across weekly/monthly for deterministic formatting reuse.
  - Renderer module: `lib/summary/summaryCopyRenderer.ts`
  - Shared contracts: `lib/summary/summaryTypes.ts`
  - Coverage: `tests/summaryCopyRenderer.test.ts`
- **P1 (implemented):** Offline archive materialization for historical `structured` fields, with guardrail coverage ensuring weekly/monthly entries are materialized.
- **P1 (implemented):** API contract tests for `/api/weekly` and `/api/monthly` structured payload guarantees.
- **P2 (partially implemented):** Monthly `planningLanguage` parity is now shipped across structured output, copy rendering, and cadence-card display.
- **P2 (open):** Broader monthly section expansion toward weekly parity remains open where operator value is clear. Re-review during roadmap grooming so status remains current and does not drift in this “as built” audit.

### 5.3 Briefing exports
Planning briefings support copy-ready briefs and executive narratives with sensor data and
macro context embedded for leadership consumption.

Interpretation-context transmission contract (homepage-selected `?view=` only):
- Slack/board/call-citation builders include an optional interpretation context block when the selected layer is non-default.
- Context block includes: selected layer label + key (`default|sector|company|financial|forecast`), interpretation summary, compact bounded bullets (max 3), and an explicit trust line: translation-layer only (canonical posture/confidence/thresholds unchanged).
- Financial view may append compact runway action lines (runway risk, raise timing, burn adjustment) so the selected lens is transmissible in copy/paste artifacts.
- Fallback behavior: default view omits interpretation context entirely; invalid/missing view resolves to default and exports remain canonical.

### 5.6 Signal Ops (live)
- Regime alerts are persisted and retrievable through API (`/api/regime-alerts`).
- Alert payloads include reason codes, source URLs, and Time Machine deep links.
- Alert creation enforces trigger filtering and a 24-hour cooldown unless the regime flips again.
- Weekly digest output is available via `/api/weekly-digest`, including score deltas and dominant
  reason messages.

## 6) APIs (server routes)

### 6.1 Data APIs
- `GET /api/treasury` — normalized Treasury yield data with fallback support.

### 6.2 Summary APIs
- `GET /api/weekly` — weekly summary payload with structured sections, copy text, and provenance.
- `GET /api/monthly` — monthly summary payload with structured sections, copy text, and provenance.
- `GET /api/quarterly` — quarterly summary payload with provenance.
- `GET /api/yearly` — yearly summary payload with provenance.
- `GET /api/summary-delta` — difference between weekly and monthly summaries.
- `GET /api/cadence` — alignment check between weekly and monthly constraints.

### 6.3 Signal Ops APIs
- `GET /api/regime-alerts` — list logged regime alerts.
- `POST /api/regime-alerts` — create an alert when trigger/cooldown rules pass.
- `GET /api/weekly-digest` — digest summary generated from logged alerts.
- `GET /api/alert-preferences` / `POST /api/alert-preferences` — per-client delivery preferences.
- `GET /api/alert-deliveries` / `POST /api/alert-deliveries` — delivery logs and send attempts, filterable by `clientId` for per-profile audit views.

### 6.4 Decision audit APIs
- `GET /api/decision-memory` / `POST /api/decision-memory` — append-only Decision Shield audit entries, filterable by `clientId`, with CSV export support.

### 6.5 Integration APIs
- `GET /api/integrations/weekly-mandate?target=slack|notion|linear` — target-specific weekly
  mandate export payload.

### 6.6 Open Graph
- `GET /api/og` — SVG Open Graph image with regime metadata (supports Time Machine selection).

### 6.7 Agent access (MCP)
- `POST /api/mcp` (no `?tool` param) — **MCP streamable-HTTP transport** (JSON-RPC 2.0,
  protocol 2025-06-18): `initialize`, `ping`, `tools/list`, `tools/call` over
  `application/json` responses. Tool registry lives in `lib/mcp/httpMcpServer.ts`
  (get_brief, get_context, get_projection, get_comps, get_signals). Standard MCP clients
  can mount `https://whether.work/api/mcp` directly.
- `GET/POST /api/mcp?tool=…` — legacy REST tool API, kept for existing integrations.
- `bun run mcp:whether` — local stdio MCP server (separate tool set, official SDK).

### 6.8 Alert cadence (2026-08-11)
Both crons now evaluate bounded-rule tripwires after ingest: the daily 02:00 UTC run calls
`/api/check-regime-change` and `/api/alert-deliveries` in addition to the Monday run, so a
regime flip or threshold crossing pushes the day it lands instead of waiting up to six days.
Both endpoints are transition-based (KV last-known state: `regime:*`, `alert:state`), so
daily runs stay silent unless something actually crossed. The brief email remains
weekly-only — the cadence promise is weekly; only rule firings break cadence.

## 7) Non-goals (as enforced in UI copy)
- The UI is framed as operational guidance, not financial advice.
- Evidence is deterministic and traceable; no predictive ML output is used.

## 8) Demo and interactive features (2026-05-23)

### 8.1 Decision simulation slider
**Location**: `app/components/home/DecisionSimulator.tsx`, rendered on `/` below the hero.

A what-if slider that lets operators drag tightness from 20–85 and see the regime, call, and action recompute in real time. Color-coded threshold markers show Defensive (↑65) and Scarcity (↑75) boundaries. A status badge indicates whether the current regime holds or the call would change.

### 8.2 Regime transition probability
**Location**: `app/components/home/RegimeTransitionProbability.tsx`, rendered on `/` below the simulator.

Computes historical transition frequency from the time machine data and displays the probability of moving from the current regime to the most likely next regime, with an SVG arc visualization and average duration in weeks.

### 8.3 Multi-week decision trendline
**Location**: `app/components/home/DecisionTrendline.tsx`, rendered on `/` below the visitor context.

Reads the decision journal from localStorage and renders a 6-week bar chart showing posture momentum. Color-coded bars (rose=tightening, emerald=expanding, slate=holding) with date labels. Momentum label and color gradient indicate direction.

### 8.4 Decision journal and visitor context
**Location**: `app/components/home/VisitorContext.tsx`, rendered on `/` below the hero.

Stores weekly decisions in localStorage on each visit. On return visits, shows "It's been a few days" or "Last visit: X posture · This week: Y posture" when posture has changed.

### 8.5 Reliability score
**Location**: Computed in `app/page.tsx`, rendered in `BriefHero.tsx` next to the tightness number.

Combines confidence (HIGH=90/MED=60/LOW=30), freshness (live=100/cached=50), and source coverage into a 0-100 score. Color-coded: emerald ≥80, amber ≥60, rose <60.

### 8.6 Degraded-state decision guidance
**Location**: `BriefHero.tsx` "What to adjust" section.

When sources are degraded or the reliability score drops below 60, an amber warning appears: "Stage all irreversible decisions until the next clean refresh."

### 8.7 Print layout
**Location**: `app/styles/layout.css` @media print block.

Hides navigation, sidebar, and non-essential chrome. Converts dark theme to light (white bg, dark text). A4 page size with `break-inside: avoid` on cards.

### Demo recording guide
To record GIFs of interactive features:

```bash
bun run dev                                    # Start dev server
```

**Decision simulator GIF**: Navigate to `/`, scroll to the simulator. Record dragging the tightness slider from current value to the flip threshold and back. The regime/call/action cells update in real time. ~8 seconds.

**Reliability cascade GIF**: Open `/` with simulated degraded state (set `?offline=1` or use cached data). Record the hero: emerald reliability score → amber warning in "What to adjust." ~5 seconds.

**Trendline GIF**: Visit `/` on 3+ different weeks (or pre-fill localStorage with mock entries). Record the trendline bar chart showing posture momentum. ~5 seconds.

**Transition probability GIF**: Navigate to `/` and scroll to the probability arc. Record the SVG arc and percentage display. ~4 seconds.

**Print layout GIF**: Open `/`, Cmd+P, show print preview with clean white layout. ~5 seconds.

For screen recording, use macOS QuickTime (File → New Screen Recording) or Kap (https://getkap.co). Convert to GIF with `ffmpeg` or gifski.
