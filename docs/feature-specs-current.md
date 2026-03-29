# Current feature specs (as built)

This document captures the **implemented** feature set in the repo. It is an audit of what the
product does today, based on shipped UI routes, data loaders, and APIs.

Positioning summary: Whether is an operator briefing system for leadership teams answering three recurring questions: what regime are we in, what should we do now, and which decisions are misaligned with current macro conditions.

## 1) Product surfaces (UI routes)

### 1.0 Rationalized IA (primary vs supporting)
Primary IA is now the five-surface operator loop:
- `/` — **Weekly Brief**: the canonical posture, decision delta, and share artifact
- `/signals` — **Evidence**: evidence depth for thresholds, freshness, and replay
- `/decide` — **Decision Tools**: role, situation, and utility-based decision translation
- `/operations` — **Planning**: execution guardrails, finance posture, and final-brief approval
- `/method` — **Trust**: trust, source, formula, and confidence audit

Supporting surfaces are intentionally subordinate:
- `/toolkits` is a supporting instrument library under **Decision Tools**
- `/learn/failure-modes` is a supporting diagnostic reference under **Trust**
- `/guides`, `/resources`, `/answers`, `/solutions/*`, `/concepts`, and `/startup-macro-posture*` remain secondary discovery or distribution surfaces rather than primary workflow hubs
- `/guides/stage`, `/guides/[stakeholder]`, `/guides/stage/[stage]`, `/concepts/conflicts`, `/concepts/focus/[focus]`, and `/concepts/audience/[audience]` are retired as standalone implementations and now permanently redirect into canonical hub-selected states on `/guides` or `/concepts`

The homepage keeps interpretation layers optional and query-driven: the default weekly brief omits interpretation context entirely, and interpretation panels render only when a non-default `?view=` is explicitly selected.

Primary workflow pages now expose a top-of-page scroll path that explains the down-page sequence and highlights the current checkpoint as the operator moves through long surfaces.
Report-shell routes (`/`, `/signals`, `/operations` and nested report paths) also use a reduced global header mode: brand/home anchor, global search entry, and compact route-orientation cues stay available without restoring the full navigation chrome above the brief.
Workflow navigation on report-shell routes now also includes a compact step-progress state so users can keep their place in the five-surface loop while scrolling.

### 1.1 Weekly briefing (/) 
The home report is a weekly briefing view delivered through the shared `ReportShell` layout. It
includes status metadata (data freshness, confidence label, offline badges), fixed navigation
links, and section anchors used across the report experience.

The home page is now the canonical weekly workspace. The top fold keeps the `WeeklyDecisionCard`
hero plus share/copy actions, then the page continues as a compact handoff sequence:
- returning-visitor delta strip (only when the current read changed since the last visit),
- planning handoff,
- evidence/trust exception handoff,
- deeper-surface chooser.

The home top fold now separates metadata from decision contract: a compact current-outlook strip
shows posture, trend, confidence, and flip-window context, and the canonical weekly call appears
once below it with explicit `Action now`, `Pause if`, and `Change course if` fields. The share rail
now keeps the weekly operator brief and short snapshot as the only default-scan actions, while board
packaging, print/export, and company-specific exception controls sit inside a secondary disclosure.
The Weekly Brief now also includes a lightweight translation router so users can jump straight to
the kind of help they need: evidence, decision, trust, or share translation. Section-level help
panels persist by literacy type instead of forcing one global simplified mode for every user.
Operator-workflow telemetry now also logs assist-panel opens, artifact-mode selection, and route
transitions across the core weekly loop so mixed-literacy friction can be measured directly.
The weekly-call module also now uses earlier task-first and plain-English assistive copy so mixed-literacy users can map core terms such as `tightness`, `risk appetite`, and `flip condition` to an operating decision without leaving the first scan path.
Across deeper workflow, answer, toolkit, trust, and export surfaces, the public-facing decision contract now standardizes on `Current call`, `Action now`, `Pause if`, and `Change course if` as the primary scan labels.
The weekly brief sequence now favors `current call -> operating levers -> share-ready artifact -> deep evidence` rather than surfacing the evidence disclosure before the transmission surface.

The evidence handoff keeps trust compact on home by showing one summary plus explicit route
ownership for `/signals` and `/method` instead of reproducing those workflows inline.
The planning handoff compresses the weekly action, guardrail, and finance/share summary before
deeper review in `/operations`. Historical replay now belongs to `/signals` rather than running as
an inline home interaction. Role, situation, and toolkit paths are handled as explicit downstream
surfaces after planning rather than as a parallel home workflow.
The default post-brief path is now Planning; Evidence and Trust are framed as exception checks when
the weekly call still needs proof.

The optional `?view=evidence` mode still renders the high-density analytical matrix with direct row
labels, embedded threshold context, and restrained accent usage for outlier conditions.

Copy strategy for briefing and onboarding surfaces favors concise, action-first language: one headline plus one support sentence before primary actions, with deeper rationale moved into expandable or secondary sections.
Route summaries and hero copy favor user-job phrasing over internal product nouns, especially on Evidence, Planning, Decision Tools, and Trust.

Weekly Brief URLs now emit week-specific Open Graph and Twitter preview cards. Shared links for the
current brief or a historical Time Machine selection preview the selected week’s posture, immediate
decision, flip condition, and core rate context instead of falling back to a generic site card.

Cold opens into `/` now use a share-card-aligned loading state before the full report resolves, so
social clicks land on the same action-first artifact structure rather than a generic skeleton.

### 1.2 Evidence report (/signals)
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
`/signals` now also supports two explicit evidence modes:
- `What this means now` for action-first implication reading and compact scorecards
- `Evidence detail` for prioritized diagnostics, replay, threshold tuning, and advanced controls

The section navigation now follows the active evidence mode so implication-first visitors are not
routed toward hidden detail-only sections. The top summary also includes persisted evidence and
trust translation helpers for first-use definitions of `tightness`, `risk appetite`, `curve slope`,
`confidence`, and `freshness`.

### 1.3 Planning overview (/operations)
Planning is the detailed execution depth page for the home workspace. The default surface is a
four-step progressive flow:
- weekly plan,
- guardrails,
- finance strategy,
- share brief.

Only one step is expanded at a time, while the other steps collapse into summary cards. The home
Planning handoff also now uses a more stateful board treatment with explicit owner, approval-state,
and change-course cues instead of sentence-only summaries. Existing
hash deep links are preserved by mapping section-level hashes into the relevant step. Integrations,
implementation depth (integrations, API contracts, and CLI fallback) is linked from `/operations` into developer docs after the weekly plan is approved.
`/operations` now exposes the same mixed-literacy translation model as the Weekly Brief: a
top-of-page router sends users to decision, evidence, trust, or share help, and persisted planning
assist panels explain only the planning layer the user needs. The execution stepper itself now shows
owner, approval state, and `reopen when` metadata on both the active step and collapsed summaries.

### 1.4 Planning workstreams
- **Weekly plan** (`/operations`): the default execution
  path with weekly plan, guardrails, finance strategy, export brief, and operator requests.
- **Developer references** (linked from `/operations`): `docs/developer/api-reference.md`, `docs/developer/cli-fallback.md`, and `docs/developer/integrations.md`.

### 1.5 Home and glossary support (`/`, `/method#beginner-glossary`)
The homepage is the only canonical first-time and returning weekly workspace. Plain-English
glossary support lives under the Trust hub so operators can pull term translation without leaving
the weekly brief flow.

### 1.5.1 About and identity framing (`/about`)
The About page explicitly frames Whether as a small independent operator tool rather than a large research institution. It now states the intended authority boundary: trust the product for weekly pacing, bounded decisions, provenance, and degradation honesty—not as bespoke company advice or a substitute for internal metrics and judgment.

### 1.6 Trust hub (/method) and formula reference
`/method` is the canonical trust-audit hub linked from Weekly Brief. It summarizes current
confidence, freshness, source coverage, and revisit conditions, then links out to `/sources`,
`/confidence`, `/method#formula-reference`, and `/learn/failure-modes`.
The page now opens with a binary trust verdict (`safe to use`, `use cautiously`, or historical-only)
before the detailed trust workflow so operators can decide whether a deeper audit is necessary.

`/methodology` now permanently redirects to `/method#formula-reference`, which documents the sensor methodology and the public data sources used in the report (FRED Treasury series, BLS CPI, BLS labor, FRED credit spreads, FRED VIX, and Chicago Fed NFCI).

The methodology reference also now clarifies scope: the canonical pacing model is intentionally built on a bounded macro input set (base rate, curve slope, BBB spread, CPI, unemployment), and the operating outputs are a translation layer rather than a claim of bespoke precision.

### 1.7 Share-preview assets for canonical hubs
High-priority hub routes now ship dedicated static SVG social preview assets for:
- `/posture`
- `/signals`
- `/operations`
- `/decide`
- `/resources`
- `/startup-macro-posture` and `/startup-macro-posture/index`
- `/guides`
- `/answers` and `/answers/[slug]`

The `/answers` hub now opens with live weekly posture context (current posture, immediate implication, flip condition, and direct return path to `/`) before the answer directory grid so operators can orient quickly before browsing distribution pages.
Secondary hubs (`/answers`, `/guides`, `/resources`, `/toolkits`) now lead with immediate value and
focused next actions rather than leading with backtracking copy about where the user should have
started. Full libraries remain below the featured paths.
`/guides` now owns both stakeholder and stage detail states behind query-selected panels, and `/concepts` now owns focus, audience, and conflict-map browsing behind query-selected states, which keeps those secondary surfaces canonical without parallel route implementations.

The homepage remains on live `/api/og` generation so the weekly brief preview can stay tied to current data.

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
- Signal normalization fields include z-score, directional transform, and clipped z-score for base rate, slope, BBB spread, CPI YoY, and unemployment.
- Composite outputs expose `cts` and `ras` values without replacing legacy tightness/risk-appetite outputs yet.
- A refusal state is included when disagreement/volatility/data-gap guards trigger, returning explicit fallback directives (`NO_POSTURE_CHANGE_RECOMMENDED`, `REVERSIBLE_BETS_ONLY`).

This pilot is additive and backward-compatible: existing regime labels and threshold behavior remain active while policy outputs are validated.

## 4) Decision support tooling

### 4.1 Decisions workstream status
Decisions is an active first-class workflow surface in shipped navigation (`/decide`) with an
action-first top fold anchored to the live weekly call:
- one recommended next path derived from the live weekly call,
- direct-answer and team-translation alternatives at lower visual weight,
- then ship checklist, team-context profiling, and role/situation browsing below the primary chooser.

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
- **P2 (open):** Monthly section expansion toward weekly parity where operator value is clear. Re-review during roadmap grooming so status remains current and does not drift in this “as built” audit.

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
- `GET /api/alert-deliveries` / `POST /api/alert-deliveries` — delivery logs and send attempts.

### 6.4 Integration APIs
- `GET /api/integrations/weekly-mandate?target=slack|notion|linear` — target-specific weekly
  mandate export payload.

### 6.5 Open Graph
- `GET /api/og` — SVG Open Graph image with regime metadata (supports Time Machine selection).

## 7) Non-goals (as enforced in UI copy)
- The UI is framed as operational guidance, not financial advice.
- Evidence is deterministic and traceable; no predictive ML output is used.
