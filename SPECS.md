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
- Expanded macro snapshot:
  - CPI (BLS), unemployment (BLS), and BBB credit spreads (FRED).
  - Must include explicit source URLs and formula links.
  - Snapshot is stored locally in `data/macro_snapshot.json` until live fetchers are added.

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
- Keep above-the-fold copy scan-first: max one headline + one support sentence before primary CTA.
- Color-coded badge (sparse semantic color only).

### Sensor Array
- Base rate card and curve slope card.
- Each card shows: value, label, source, timestamp.

### Playbook
- STOP / START / FENCE lists with reasons.
- Lists should be concise (≤ 5 items each).
- Prefer action-first bullets; avoid repeating the same guidance in multiple adjacent modules.

### Decision Shield
- Dropdown inputs (Lifecycle, Category, Action).
- Verdict output:
  - Safe / Risky / Dangerous
  - 2–4 bullets grounded in current sensors
  - Guardrail constraint
  - Reversal trigger
- Must include “Copy to Clipboard”.

### Threshold controls
- Operators can override base-rate and regime thresholds.
- Overrides live in URL query params with an on-screen audit trail.

### Export briefs
- Slack/email copy blocks.
- Print-to-PDF flow.
- Slide-ready bullet list.

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
- Build an Insight Database with citations to evidence and historic precedent.
- Support historical comparisons (“then vs now”) with regime deltas.
- Add regime-change alerts/notifications with reason codes.
- Enable saved Decision Shield scenarios and team presets.
- Offer an API/export endpoint for embedding regimes into internal dashboards.

## 8) Next-level scope (v1.1)
These requirements define the next-level release and should align with `docs/prd-next-level.md`
and `docs/specs-next-level.md`.

### Signal Ops (alerts + briefs)
- Trigger alerts only on regime changes or threshold crossings.
- Every alert must include:
  - Regime label + reason codes.
  - The exact sensor values and thresholds at the time of evaluation.
  - Source URLs and timestamps for each signal.
  - A Time Machine deep link for replay.
- Provide weekly digest output with “what changed” deltas.

### Executive briefing pack
- One-click export for:
  - Slack/email copy block.
  - Slide-ready bullet list.
  - PDF-friendly brief view.
- All exports must embed citations and data freshness badges.

### Decision Memory
- Append-only log capturing:
  - Decision inputs + category + action.
  - Regime + sensor values + thresholds in force.
  - Source URLs + timestamps for evidence.
  - Optional operator notes and external links.
- Entries must be immutable once saved and exportable as JSON/CSV.

### Scenario Studio (counterfactuals)
- Allow simulated sliders for base rate and curve slope.
- Show “Simulated” badge and block exporting as live data.
- Provide a summary of deltas vs. current regime, including constraint changes.

### Evidence pack upgrades
- Expand Insight Database with citations and a Fossil Record view.
- Surface evidence links inline with playbook and briefing outputs.

### Macro data reliability
- Add live fetchers for CPI, unemployment, and BBB spreads.
- Cache with explicit `fetched_at` timestamps and clear fallback reasons.
