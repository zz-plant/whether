# Policy-spec alignment plan (proposed)

This document scopes the implementation work needed to align the current regime engine with the proposed policy specification:

> "A Transparent Mapping From Observable Macro Signals to Firm-Level Decision Parameter Adjustment"

It is intentionally implementation-oriented: what changes are required, where they land in this repo, and what validation gates are needed.

## 1) Alignment summary (current vs target)

## Current implementation (as built)
- Two primary regime dimensions are scored on a **0–100 deterministic scale**:
  - Tightness score from base rate + inversion points.
  - Risk appetite score from linear 10Y-2Y mapping.
- Regime classification is a four-quadrant threshold model (`SCARCITY`, `DEFENSIVE`, `VOLATILE`, `EXPANSION`).
- Macro overlays (HY OAS, NFCI, VIX, VC funding velocity, tech layoffs) adjust scores near boundaries.
- Diagnostics include confidence, intensity, transition watch, and multi-weak-read warnings.

## Target policy specification
- Inputs include base rate, slope, BBB OAS, CPI YoY, unemployment.
- Normalization uses **rolling 10-year z-scores**, directional transforms, and clipping (`±3σ`).
- Two composites are explicit and weighted:
  - CTS = weighted(base rate z, BBB z)
  - RAS = weighted(slope z, BBB z)
- Posture mapping uses z-band thresholds and explicit transition rules.
- Refusal conditions block forced posture shifts on high disagreement/volatility/data gaps.
- Output is governance parameter adjustments (not strategy directives) with posture-specific defaults.


## Rigor critique: policy plan vs current implementation

Verdict: the policy alignment plan is **materially more rigorous** than the currently shipped regime implementation, but it is still a migration blueprint (not yet an executable spec with calibrated constants).

### Where the plan is more rigorous
- **Explicit statistical normalization contract**: the plan requires rolling-window z-scores, directional transforms, and clipping, while current logic is mostly fixed-threshold deterministic transforms.
- **Traceable composite architecture**: the plan formalizes CTS/RAS-style weighted composites and calls for intermediate-value exposure to keep transformations auditable.
- **Refusal-state design**: the plan introduces non-forcing outcomes for disagreement/volatility/data gaps, which is a stronger anti-overconfidence safeguard than current warning-only handling.
- **Versioned policy governance**: the plan calls for policy-versioned config, archived policy updates, and migration phases with explicit exit criteria.
- **Validation depth**: the plan adds deterministic suites for normalization, clipping, classification boundaries, and refusal branches instead of relying mainly on threshold behavior checks.

### Where current implementation is stronger today
- **Operational concreteness**: current scoring/classification is fully implemented and wired through summaries/reports now; the plan is prospective.
- **Runtime simplicity**: current rules are easier to reason about in production incidents (fewer moving statistical parts).
- **Data-path pragmatism**: current overlays and fallbacks are already integrated end-to-end, whereas parts of the plan still depend on unresolved design choices (window materialization, conflict math, percentile estimator).

### Residual rigor gaps in the plan itself
To be fully rigorous before implementation starts, the plan still needs:
1. **Canonical equations and boundary semantics** (exact formulas and inclusive/exclusive threshold behavior).
2. **Single source of truth for rolling history** (materialized vs on-demand, reproducibility guarantees).
3. **Calibration protocol** for weights/refusal thresholds (how chosen, how revalidated, who approves).
4. **Backtest/replay acceptance criteria** (what parity or improvement constitutes successful cutover).
5. **Policy-change governance checklist** encoded as machine-checkable metadata (version, rationale, effective date, migration note).

### Net assessment
- **Conceptual/methodological rigor**: plan > current implementation.
- **Production-readiness today**: current implementation > plan (because implemented).
- **Best path**: treat the plan as a stronger target operating model, then convert unresolved decisions into concrete, test-backed policy constants before code cutover.

## 2) Scope of required repo changes

## A. Regime math and policy configuration (core)
1. Add a versioned policy config module for:
   - signal list, source metadata, refresh cadence
   - rolling window settings (10 years)
   - z-score clipping bounds
   - CTS/RAS weights
   - posture thresholds/bands
   - refusal thresholds
2. Replace or layer current score math with normalized composites:
   - compute per-signal rolling mean/std
   - compute z-score and directional normalization
   - compute CTS/RAS using fixed published weights
3. Preserve auditability by exposing intermediate values in assessment payloads.

Likely touch points:
- `lib/regimeEngine.ts`
- `lib/types.ts`
- new: `lib/policy/*` (config + transform helpers)

## B. Data inputs and fallback behavior
1. Ensure runtime ingestion + fallback for required policy signals:
   - base rate (1M, 3M fallback), slope (10Y-2Y), BBB OAS, CPI YoY, unemployment
2. Add cycle-aware missing-data tracking to support refusal logic ("exceeds two reporting cycles").
3. Explicitly annotate derived/primary signal provenance in assessment output.

Likely touch points:
- `lib/macroSnapshot.ts`
- `lib/treasury/*`
- `data/snapshot_fallback.json` (if schema extension required)

## C. Posture and refusal model
1. Introduce posture model aligned to policy terms:
   - `RISK_ON`, `SAFETY_MODE`, `TRANSITION`
2. Implement neutral/elevated/extreme z-band classification.
3. Add refusal pipeline that can return:
   - `NO_POSTURE_CHANGE_RECOMMENDED`
   - `REVERSIBLE_BETS_ONLY`
4. Keep backward compatibility adapters for existing UI surfaces until migration completes.

Likely touch points:
- `lib/regimeEngine.ts`
- `lib/regimeLabels.ts`
- `lib/decisionShield.ts`
- `lib/summary/*`

## D. Governance parameter output contract
1. Add explicit structured governance parameter outputs:
   - hiring threshold
   - payback window tolerance
   - rollback requirement
   - approval velocity
   - expansion scope
   - experimentation tolerance
2. Define posture-specific + transition defaults in code/config.
3. Ensure weekly/monthly renderers can consume structured governance parameters.

Likely touch points:
- `lib/playbook.ts`
- `lib/summary/summaryTypes.ts`
- `lib/summary/weeklySummary.ts`
- `lib/summary/monthlySummary.ts`
- `lib/report/*`

## E. Methodology/transparency docs and route copy
1. Update methodology page with:
   - normalization equations
   - weights and threshold tables
   - refusal conditions
   - versioning and changelog policy
2. Align docs to distinguish:
   - current implemented behavior
   - target/policy behavior (during migration)

Likely touch points:
- `app/formulas/components/methodologyContent.tsx`
- `docs/feature-specs-current.md`
- new: policy version history doc

## 3) Proposed phased delivery

### Phase 0 — Design freeze + contracts
- Finalize canonical policy constants and naming.
- Add config schema + static validation tests.
- Add "policy version" field to assessment payload.

Exit criteria:
- Types compile.
- Config test fixtures pass.

### Phase 1 — Signal normalization + composites
- Implement rolling-window stats and z-score transforms.
- Compute CTS/RAS alongside legacy scores behind a feature flag.
- Emit dual telemetry (legacy + policy) for comparison.

Exit criteria:
- Deterministic tests for z-score math, clipping, directional transforms.
- No API contract regressions in legacy mode.

### Phase 2 — Posture + refusal engine
- Enable z-band posture mapping and transition detection.
- Add refusal conditions and explicit no-change outputs.
- Add confidence index components (agreement, band distance, 30-day volatility).

Exit criteria:
- Unit tests for refusal branches.
- Snapshot tests for posture classification edge cases.

### Phase 3 — Governance output and UI migration
- Replace narrative-only guidance with structured governance parameter table.
- Update weekly/monthly/report rendering to consume new fields.
- Add methodology UI sections for policy transparency.

Exit criteria:
- Route-level rendering tests pass.
- Export payload includes governance parameters + provenance.

### Phase 4 — Legacy deprecation
- Remove legacy threshold-only score pathways once parity validated.
- Archive previous policy versions and migration notes.

Exit criteria:
- Feature flag removed.
- Docs and tests only reference active policy path.

## 4) Validation plan

Minimum validation per phase:
- Lint + tests for every phase (`bun run lint`, `bun run test`).
- For scoring/posture phases, add targeted deterministic suites:
  - rolling window and z-score correctness
  - clip behavior (`±3σ`)
  - directional transforms
  - quadrant/posture mapping
  - refusal triggers (conflict, volatility, data-gap)
- For UI phases, add route rendering coverage for methodology + summary payload consumers.

## 5) Open design decisions to resolve before implementation

1. **Rolling window source-of-truth:**
   - Should 10-year windows be computed from local cache, on-demand API history, or precomputed materialized series?
2. **Band thresholds and strict inequalities:**
   - Exact boundary behavior for `|Z| = 0.5` and `|Z| = 1.5`.
3. **Conflict index formula:**
   - Explicit mathematical definition and calibration source.
4. **Volatility refusal threshold:**
   - Confirm percentile estimator and lookback period details.
5. **Backward compatibility strategy:**
   - Whether legacy labels remain in API while UI migrates to policy labels.

## 6) Suggested implementation order in this repo

1. `lib/policy/` config and transforms.
2. `lib/regimeEngine.ts` dual-path scoring and posture classification.
3. `lib/summary/*` and `lib/report/*` contract extension.
4. `app/formulas/components/methodologyContent.tsx` transparency updates.
5. `docs/feature-specs-current.md` and policy version docs.

This sequence minimizes UI churn while allowing side-by-side validation before cutover.
