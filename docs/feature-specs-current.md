# Current feature specs (as built)

This document captures the **implemented** feature set in the repo. It is an audit of what the
product does today, based on shipped UI routes, data loaders, and APIs.

Positioning summary: Whether is an operator briefing system for leadership teams answering three recurring questions: what regime are we in, what should we do now, and which decisions are misaligned with current macro conditions.

## 1) Product surfaces (UI routes)

### 1.1 Weekly briefing (/) 
The home report is a weekly briefing view delivered through the shared `ReportShell` layout. It
includes status metadata (data freshness, confidence label, offline badges), fixed navigation
links, and section anchors used across the report experience.

The home page is now the canonical weekly workspace. The top fold keeps the `WeeklyDecisionCard`
hero plus share/copy actions, then the page continues in a fixed operator sequence:
- weekly call,
- audit this call,
- historical replay,
- approve this week’s plan,
- translate by role or run a tool.

The audit band keeps trust compact on home by showing freshness, source coverage, revisit/flip
conditions, and the top evidence movers without forcing a route change. Historical replay uses the
same time-machine date-picker pattern as `/signals`, but starts directly on home. The operations
band compresses approve/hold/revisit, top guardrails, finance posture, and export entry points
before deeper review in `/operations`. The final band surfaces direct role, situation, toolkit,
ship-checklist, and team-context shortcuts.

The optional `?view=evidence` mode still renders the high-density analytical matrix with direct row
labels, embedded threshold context, and restrained accent usage for outlier conditions.

Copy strategy for briefing and onboarding surfaces favors concise, action-first language: one headline plus one support sentence before primary actions, with deeper rationale moved into expandable or secondary sections.

### 1.2 Signals report (/signals)
The signals report is the deep evidence appendix for the weekly workspace, with sections for:
- Sensor array (live yield curve readings + derived scores)
- Macro signal snapshot (CPI, unemployment, BBB spreads)
- Time Machine (historical month selector + cached summaries) visible without advanced-mode gating
- Threshold tuning (URL-driven overrides + audit log)
- Regime timeline (24‑month sequence for quick jumps)

Advanced controls remain available for threshold tuning and diagnostics expansion, but historical
replay is no longer treated as an expert-only action.

### 1.3 Operations overview (/operations)
Operations is the detailed execution depth page for the home workspace. The default surface is a
four-step progressive flow:
- weekly plan,
- guardrails,
- finance strategy,
- share brief.

Only one step is expanded at a time, while the other steps collapse into summary cards. Existing
hash deep links are preserved by mapping section-level hashes into the relevant step. Integrations,
data/API, and terminal usage remain optional implementation handoffs after the weekly plan is
approved.

### 1.4 Operations workstreams
- **Weekly plan** (`/operations`; legacy `/operations/plan` redirects here): the default execution
  path with weekly plan, guardrails, finance strategy, export brief, and operator requests.
- **Send to tools** (`/operations/integrations`): preview weekly mandate payloads for Slack, Notion,
  and Linear.
- **Data/API** (`/operations/data`): API usage guidance and handoff references for operators.
- **Terminal** (`/operations/cli`): command-line status, history, diff, and scenario workflows.

### 1.5 Onboarding (/onboarding)
Onboarding provides a first-time guide and a plain‑English glossary so new operators can decode
signals and navigate the report pages.

### 1.6 Method hub (/method) and formula reference (/methodology)
`/method` is the canonical trust-audit hub linked from Weekly Brief. It summarizes current
confidence, freshness, source coverage, and revisit conditions, then links out to `/sources`,
`/confidence`, `/methodology`, and `/learn`.

`/methodology` remains the lower-level formula reference documenting the sensor methodology and the
public data sources used in the report (FRED Treasury series, BLS CPI, BLS labor, FRED credit
spreads, FRED VIX, and Chicago Fed NFCI).

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
action-first top fold:
- direct toolkit shortcuts,
- ship checklist,
- team-context profiling,
- then role and situation browsing below.

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
Operations briefings support copy-ready briefs and executive narratives with sensor data and
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
- Signals are deterministic and traceable; no predictive ML output is used.
