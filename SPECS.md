# Whether Product + Engineering Specs

This document defines the MVP scope for Whether (Regime Station). It is intentionally explicit
so outputs remain traceable, explainable, and operator‑friendly.

## 1) Core loop
1. Server fetches US Treasury yield curve data.
2. Normalize to `TreasuryData`.
3. Run Regime Engine scoring + classification.
4. Render regime, sensors, and playbook with source + timestamp.
5. If upstream fails, serve snapshot data with OFFLINE labeling.

## 2) Data sourcing (MVP)
- Source: US Treasury Fiscal Data API.
- Endpoint: `/v2/accounting/od/daily_treasury_yield_curve`.
- Required fields: 1M, 2Y, 10Y yields.
- Caching: 24h revalidate; Treasury updates end‑of‑day.
- Required metadata on all outputs:
  - `source`
  - `record_date`
  - `fetched_at`

## 3) Regime Engine specs
### Inputs
- Base rate proxy: 1‑month yield (fallback to 3‑month if missing).
- Curve slope: 10Y − 2Y.

### Outputs
- `tightness` score (0–100)
- `riskAppetite` score (0–100)
- `regime`:
  - `SCARCITY`
  - `DEFENSIVE`
  - `VOLATILE`
  - `EXPANSION`

### Classification
- `tightness > 70` and `riskAppetite < 50` ⇒ **SCARCITY**
- `tightness > 70` and `riskAppetite > 50` ⇒ **DEFENSIVE**
- `tightness < 70` and `riskAppetite < 50` ⇒ **VOLATILE**
- `tightness < 70` and `riskAppetite > 50` ⇒ **EXPANSION**

### Explainability
- Every score must have a tooltip that states the formula in plain English.
- No opaque ML; all logic should be deterministic and testable.

## 4) UI requirements
### Regime Hero
- Large label + short description that translates to operator constraints.
- Color-coded badge (sparse semantic color only).

### Sensor Array
- Base rate card and curve slope card.
- Each card shows: value, label, source, timestamp.

### Playbook
- STOP / START / FENCE lists with reasons.
- Lists should be concise (≤ 5 items each).

### Decision Shield
- Dropdown inputs (Lifecycle, Category, Action).
- Verdict output:
  - Safe / Risky / Dangerous
  - 2–4 bullets grounded in current sensors
  - Guardrail constraint
  - Reversal trigger
- Must include “Copy to Clipboard”.

### Time Machine
- Month/Year selector.
- Historical banner across the UI (“Historical View: YYYY‑MM”).
- Must use “latest available on or before date”.

### Offline Mode
- If Treasury API fails:
  - Use snapshot data.
  - Show “OFFLINE / SIMULATED” badge.

## 5) Non‑goals
- No trading or financial advice.
- No market predictions.
- No personalized finance guidance.
- No AI chat features.

## 6) Acceptance checklist
- Data source + timestamps visible on every numeric output.
- Snapshot/Offline mode clearly labeled when active.
- Decision Shield output can be copied cleanly.
- TypeScript strict build passes.
- Footer includes “Not Financial Advice”.

## 7) Likely operator requests (post‑MVP)
These are expected follow‑on requests once the product is in use. Each item should preserve
traceability and plain‑English guidance.
- Expand macro inputs beyond the yield curve (inflation, unemployment, credit spreads) with explicit sources.
- Allow adjustable regime thresholds with a clear audit trail and defaults.
- Add more Decision Shield categories (M&A, infra spend, geographic expansion, restructuring).
- Provide export/share formats (PDF, slide-ready snapshot, scheduled email/Slack brief).
- Build an Insight Database with citations to evidence and historic precedent.
- Support historical comparisons (“then vs now”) with regime deltas.
- Add regime-change alerts/notifications with reason codes.
- Enable saved Decision Shield scenarios and team presets.
- Deepen data provenance per sensor (direct source URLs, formula docs, timestamps).
- Offer an API/export endpoint for embedding regimes into internal dashboards.
