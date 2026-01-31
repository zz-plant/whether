# Current feature specs (as built)

This document captures the **implemented** feature set in the repo. It is an audit of what the
product does today, based on shipped UI routes, data loaders, and APIs.

## 1) Product surfaces (UI routes)

### 1.1 Weekly briefing (/) 
The home report is a weekly briefing view delivered through the shared `ReportShell` layout. It
includes status metadata (data freshness, confidence label, offline badges), fixed navigation
links, and section anchors used across the report experience. 

Content blocks on the overview page include:
- Executive snapshot (summary + constraints + provenance)
- Weekly action summary
- Market climate summary
- Regime change alert (when thresholds are crossed)
- Change-since-last-read tracker
- New alert list
- Regime assessment card with score explanations
- Signal matrix with sensor details and history

### 1.2 Signals report (/signals)
The signals report focuses on evidence and methodology, with sections for:
- Sensor array (live yield curve readings + derived scores)
- Macro signal snapshot (CPI, unemployment, BBB spreads)
- Threshold tuning (URL-driven overrides + audit log)
- Time Machine (historical month selector + cached summaries)
- Regime timeline (24‑month sequence for quick jumps)

### 1.3 Operations overview (/operations)
Operations overview organizes execution guidance into workstreams and highlights monthly action
summary data.

### 1.4 Operations workstreams
- **Plan** (`/operations/plan`): playbook moves (start/stop/fence), finance strategy,
  insight database prompts, and operator requests.
- **Decisions** (`/operations/decisions`): decision shield workflow, assumption locking,
  decision memory logging, templates, and counterfactual simulation controls.
- **Briefings** (`/operations/briefings`): strategy brief, export brief tooling,
  executive briefing, and CXO output catalog.

### 1.5 Onboarding (/onboarding)
Onboarding provides a first-time guide and a plain‑English glossary so new operators can decode
signals and navigate the report pages.

### 1.6 Formula reference (/formulas)
The formulas page documents the sensor methodology and links directly to public data sources used
in the report (Treasury API, BLS CPI, BLS labor, FRED credit spreads).

## 2) Data sourcing & provenance

### 2.1 Treasury yields (live + fallback)
- Primary data source: US Treasury Fiscal Data API yield curve endpoint.
- Data is normalized into a `TreasuryData` shape and stamped with `record_date`, `fetched_at`,
  and source metadata.
- If the API is unavailable, the report falls back to `data/snapshot_fallback.json` and marks the
  response as cached with a fallback reason.

### 2.2 Macro snapshot
- CPI, unemployment, and BBB credit spreads are loaded from
  `data/macro_snapshot.json` as a static snapshot until live fetchers are added.
- Each series carries a source URL, record date, and freshness metadata.

### 2.3 Time Machine cache
- Historical Treasury snapshots are served from `data/time_machine_cache.json`.
- The Time Machine UI validates available months, shows cache coverage, and uses cached
  summary archives for weekly/monthly/quarterly/yearly playback.

## 3) Regime engine & scoring

### 3.1 Inputs
- **Base rate**: 1‑month Treasury yield (fallback to 3‑month if missing).
- **Curve slope**: 10Y − 2Y yield spread.

### 3.2 Scores
- **Tightness score (0–100)**: adds 90 points if base rate > threshold and 25 points if the curve
  is inverted; capped at 100.
- **Risk appetite score (0–100)**: maps curve slope linearly from -1.0% to 1.5%.

### 3.3 Regime classification
Regime is determined by tightness vs. risk appetite thresholds (defaults are 70 and 50
respectively). Thresholds can be overridden via URL parameters, and the UI maintains an audit log
of operator changes.

### 3.4 Outputs
The regime assessment includes:
- Current regime label + description
- Tightness and risk appetite scores
- Constraint list for the current regime
- Data warnings when inputs are missing
- Input metadata for provenance display

## 4) Decision support tooling

### 4.1 Decision Shield
A client-side decision shield evaluates a lifecycle + category + action against the current
regime. It returns:
- Verdict (safe / risky / dangerous)
- Summary text
- Sensor-based bullet rationale
- Guardrail guidance
- Reversal trigger definition

Selections persist in URL parameters and local storage, and operators can save presets that are
locally stored. Results can be copied as shareable text.

### 4.2 Assumption locking
A lightweight form captures operating assumptions (risk posture, evidence stance, constraints)
and stores them locally for later review.

### 4.3 Decision Memory
Decision Memory is a client-side log of decisions with snapshot metadata. It supports:
- Structured note parsing (summary, bullets, tags)
- Snapshot link generation
- Copy-ready text and templates (Jira/Linear/Confluence formats)
- CSV export

### 4.4 Counterfactual view
Counterfactual sliders adjust base rate and curve slope in basis points to preview regime changes
and constraints under simulated conditions. Scenario state is persisted via URL parameters and
local storage.

## 5) Playbooks, summaries, and briefings

### 5.1 Playbook & operator requests
The playbook surfaces start/stop/fence actions based on the current regime, sourced from the
insight database and operator request catalog in `data/recommendations.ts` and
`lib/operatorRequests.ts`.

### 5.2 Weekly + monthly summaries
Weekly and monthly summaries are generated from the current assessment for use in the overview
page and APIs. These summaries include copy blocks, constraints, and provenance metadata.

### 5.3 Briefing exports
Operations briefings support copy-ready briefs and executive narratives with sensor data and
macro context embedded for leadership consumption.

## 6) APIs (server routes)

### 6.1 Data APIs
- `GET /api/treasury` — normalized Treasury yield data with fallback support.

### 6.2 Summary APIs
- `GET /api/weekly` — weekly summary payload with provenance.
- `GET /api/monthly` — monthly summary payload with provenance.
- `GET /api/quarterly` — quarterly summary payload with provenance.
- `GET /api/yearly` — yearly summary payload with provenance.
- `GET /api/summary-delta` — difference between weekly and monthly summaries.
- `GET /api/cadence` — alignment check between weekly and monthly constraints.

### 6.3 Open Graph
- `GET /api/og` — SVG Open Graph image with regime metadata (supports Time Machine selection).

## 7) Non-goals (as enforced in UI copy)
- The UI is framed as operational guidance, not financial advice.
- Signals are deterministic and traceable; no predictive ML output is used.
