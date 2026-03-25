# Loop stage module boundaries

This repo’s core loop is:

`signals → posture → decision → artifact`

This mapping uses existing modules first and documents ownership + dependency direction.

## 1) Signals (normalize and readiness)

**Owner modules**
- `lib/report/reportData.ts`
- `lib/report/homePageData.ts`
- `lib/report/signalFormatting.ts`

**Tagged functions**
- `loadReportData` / `loadHomePageReportData` (signal fetch + normalization)
- `buildReportDynamics` (weekly signal deltas)
- `normalizeSignalContributions` (signal contribution normalization)

**Allowed dependencies**
- data clients (`lib/treasury/*`, `lib/snapshot.ts`, `lib/sensors.ts`)
- formatting/utilities

**Must not depend on**
- React components
- route/page rendering modules

## 2) Posture + decision derivation

**Owner modules**
- `lib/report/homeBriefModel.ts`
- `lib/report/decisionKnobs.ts`
- `lib/report/operatingCalls.ts`
- `lib/playbook.ts`

**Tagged functions**
- `buildHomeBriefModel`
- `buildWeeklyDecisionCardViewModel`
- `buildFlipRiskMeterState`
- `deriveDecisionKnobs`
- `buildWeeklyLockCommitment`
- `buildActionStripItems`
- `buildRoleAwareOperatingTemplates`

**Allowed dependencies**
- normalized report models/signals
- deterministic decision libraries (`boundedDecisionRules`, `regimeEngine`, `thresholds`)

**Must not depend on**
- React UI modules

## 3) Presentation + artifact transmission

**Owner modules**
- `app/components/weeklyDecisionCard.tsx`
- homepage sections/components under `app/components/home/*`
- export components under `app/operations/components/*`
- export builders under `lib/export/*`

**Tagged functions/components**
- `WeeklyDecisionCard`
- `HomeWhatChangedSection`, `HomeDecisionSection`, `HomeRevisitFlipSection`
- `buildWeeklyOperatorBriefPayload` / `buildBoardBrief`

**Allowed dependencies**
- stage-2 view models and artifacts
- display formatting/trust helpers

**Must not do**
- threshold scoring
- regime/decision policy derivation

## Cross-stage leakage found and resolved

1. **Leakage:** `app/components/weeklyDecisionCard.tsx` previously derived flip-risk urgency bands (`<=3`, `<=6`, fallback threshold handling) from `regimeDistance`.
2. **Fix:** moved to `lib/report/homeBriefModel.ts` as `buildFlipRiskMeterState`, then passed through `buildWeeklyDecisionCardViewModel` as `diagnostics.flipRiskMeter`.
3. **Result:** UI now renders pre-derived state and no longer decides policy thresholds.

## Dependency rule of thumb

- Components render.
- Report/model libs derive.
- Data libs normalize.

If a component introduces numeric threshold policy, move it into stage-2 libs unless there is a purely visual reason.
