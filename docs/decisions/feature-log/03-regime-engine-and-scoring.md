<!-- Part of the feature log. Index: ./README.md -->

## 3) Regime engine & scoring

### 3.1 Inputs
- **Base rate**: 1‑month Treasury yield (fallback to 3‑month if missing).
- **Curve slope**: 10Y − 2Y yield spread.
- **Macro overlays (boundary calibration)**: the overlays on the record basis
  (`RECORD_BASIS_MARKET_INPUTS`: VIX with its haircut and veto, and the Chicago Fed NFCI) adjust
  tightness/risk appetite before final classification and trigger multi-weak-read warnings. HY OAS,
  VC funding velocity and the tech layoff trend are scored into `scores.offRecord` and move nothing
  published, because the archive holds no month-end history for them (§1.1.66, §1.1.67).

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
- Macro overlays on the record basis modify tightness/risk-appetite scores before classification, so they can change the resulting regime when signals are near boundaries. Overlays off it change only `scores.offRecord` (§1.1.66).
- Diagnostics (`boundaryContributors`, weak-read warnings, confidence) explain *why* adjustments applied.
- Recommendations and constraints always derive from the final classified regime.

The regime assessment includes:
- Current regime label + description
- Tightness and risk appetite scores
- Constraint list for the current regime
- Data warnings when inputs are missing
- Input metadata for provenance display



### 3.4.1 Sector sensitivity overlay (deleted 2026-10-27)
- What it was: `deriveSectorAdjustedPosture` tilted the base posture for one of six sectors (sector multipliers on the tightness and risk-appetite distances from their lines, plus an offset, damped near the lines) and never changed the regime. Its one output was the last row of the brief model's `history.macroOverlay`, after four macro rows (VC funding, startup layoffs, VIX, SaaS multiples).
- Why it went: no surface has drawn `history.macroOverlay` since its panel was deleted on 2026-08-06, and once `/` and the share preview stopped reading `?sector=` (2026-10-27) nothing chose a sector other than `b2b-saas` either. The overlay, the field, the `overlaySector` option on `buildHomeBriefModel` and `loadWeeklyBriefSnapshot`, and `resolveSectorKey` went together.
- What stays: `lib/report/sectorSensitivity.ts` keeps the six sector keys and their labels, which `/api/image/brief` prints as its `?sector=` context label (§3.4.2).
- Sector overlays for readers are still open in `ROADMAP.md` Milestone 13. A new one starts from the surface that draws it.

### 3.4.2 Trust and fallback behavior for missing sector/company context
- Sector query: `/` reads no `?sector=` (2026-10-27). `/api/image/brief` accepts one of the six keys for its context label and ignores anything else.
- Trust posture: these fallbacks are translation-layer only and never mutate base regime classification, canonical confidence label, or trigger thresholds.

### 3.5 Policy-spec pilot layer (new)
A policy-alignment pilot now runs **alongside** the legacy regime engine in the assessment payload:
- Versioned policy metadata (`policy-v1`) is emitted for traceability.
- Signal normalization fields include z-score, directional transform, and clipped z-score for base rate, slope, BBB spread, CPI YoY, and unemployment; Treasury signals use the local long-range archive when available, while other policy signals normalize against the available local history window.
- Composite outputs expose `cts` and `ras` values without replacing legacy tightness/risk-appetite outputs yet.
- A refusal state is included when disagreement/volatility/data-gap guards trigger, returning explicit fallback directives (`NO_POSTURE_CHANGE_RECOMMENDED`, `REVERSIBLE_BETS_ONLY`).

This pilot remains additive at the scoring layer, but refusal is now binding at the guidance layer: if the policy layer refuses a posture change, readiness is capped, operator copy shifts to reversible-only execution language, and export/share surfaces must not present the move as a clean posture upgrade or downgrade.
