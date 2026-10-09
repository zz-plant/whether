# `lib/report` agent guide

This directory owns the canonical translation from signals into posture, bounded decisions, trust state, and export-ready semantics.

Use this guide when editing:
- posture or readiness labels
- bounded decision wording
- trust, freshness, provenance, or fallback state
- weekly brief model shape
- export payload semantics that downstream UI renders

## What this directory owns

- Canonical report semantics and typed contracts
- Decision transmission copy that should stay consistent across `/`, `/operate`, `/resolve`, exports, and SEO surfaces
- Trust-state labels and degraded/fallback behavior
- Home-brief model assembly and view-model contracts
- Shared formatting helpers for bounded decision phrasing

## What this directory must not own

- Route-specific layout choices
- Local UI-only copy tweaks that are not meant to propagate
- Ad hoc labels assembled inside components to bypass shared formatters
- Parallel export semantics that disagree with the homepage brief

## Canonical upstream and downstream files

Prefer editing these sources before changing consumers:
- `lib/report/homeBriefModel.ts`
- `lib/report/homeBrief/builders.ts`
- `lib/report/reportData.ts`
- `lib/report/reportFormatting.ts`
- `lib/report/trustStatus.ts`
- `lib/report/decisionTransmissionCopy.ts`
- `lib/report/canonicalDecisionCopy.ts`
- `lib/report/operatingCalls.ts`
- `lib/report/decisionKnobs.ts`

Typical downstream renderers:
- `app/page.tsx` (top fold: `DecisionHero`; non-weekly cadences lead with `CadenceCallCard`)
- `app/components/home/*`
- `app/operate/components/*`

## Working rules

- If a label should mean the same thing across more than one surface, define or update it here.
- One name per concept, and these are the names (set 2026-09-22 after a site-wide copy audit found
  three vocabularies for the four market states and "posture" doing a plain sentence's work on
  every surface). `tests/readerVocabulary.test.tsx` bans the old ones outright or ratchets them:

  | Concept | The name | Defined in | Never |
  | --- | --- | --- | --- |
  | The four market states | the weather label (Sunny, Cloudy, Stormy, Freezing); "conditions" as the noun | `regimePresentation.ts` `REGIME_LABELS` / `getRegimePublicLabel` | an engine key in reader text; "regime" |
  | The weekly recommendation | "guidance" ("this week's guidance"), never countable | `reportFormatting.ts` `publicDecisionLabels.call` | posture, stance, operating call, "the call" |
  | `PolicyPosture` (RISK_ON / SAFETY_MODE / TRANSITION) | "pace": Speed up / Hold / Slow down | `paceLabels.ts` | Risk-On, Safety Mode, Transition |
  | The pause/resume pair | "the pause line", "the resume line"; slot labels "Pause if" / "Resume when"; export noun slots "Action" / "Pause line" / "Resume line" | `reportCopy.ts` `DECISION_CONTRACT_LABELS` | corridor, lane, rail, watch line, Change course if, Re-open when, threshold, trigger, reversal, boundary |
  | The five decision areas | Hiring, Roadmap, Fundraising, Spending, New bets, on every surface: the picker, the tables, the levers on `/operate/scenarios`, every paste | `boundedDecisionRules.ts` `decisionAreaLabel` (the levers in `decisionKnobs.ts` read it through `operatingLeverToDecisionArea`) | Hire someone, Change the roadmap, Product tempo, Raise money, Capital raising, Approve new spend, Burn discipline, Investment pace, Start something new, Expansion bets |
  | The 0–100 room-to-act score | "Operating latitude", with `OPERATING_LATITUDE_GLOSS` beside the number | `reportCopy.ts` `OPERATING_LATITUDE_LABEL` | Boldness, latitude signal |
  | A 0–100 score in prose | name, number and meaning together: `formatSignalReading` / `SignalReading` | `signalTranslations.ts` | a bare "74/100" |
  | How settled the guidance is | "High / Medium / Low confidence" (the word only) | wording: `reportFormatting.ts` `formatConfidenceChipLabel`; value: `confidence.ts` `resolvePublishedConfidence`, on every surface | HIGH/MED/LOW codes, a percent, "confidence" for data freshness, the engine's `diagnostics.confidence` |
  | The pressure score | "Funding pressure", in full on charts too | `boundedDecisionRules.ts` `ruleMetricLabel`, `signalTranslations.ts` | tightness, Capital tightness, credit conditions, "Pressure" alone |
  | The curve number | "Recession warning gauge (10-year minus 2-year rate)" on first use | `signalTranslations.ts` `regimeSignalLabel` | 10Y−2Y alone, curve slope, curve signal |
  | Conditions changing | "what would change this guidance", "conditions change if" | `DECISION_CONTRACT_LABELS.watch` | flip, flip watch, "the call changes" |
  | The line where conditions change | "the change line" in labels, "the line where conditions change" in prose | `app/components/ui/scoreLadder.tsx` | call-change line, "the line that changes the call", boundary, threshold |
  | How conditions change | `trackRecordCopy.ts` `CALL_CHANGE_RULE`, once per page | `trackRecordCopy.ts` | hysteresis, confirmation gate, dwelt crossing |
  | No live reading | `reportCopy.ts` `NO_LIVE_READING_CALL`: what is missing and what to hold | `reportCopy.ts` | "bounded operating discipline", "policy override" |
- If a component needs to display `Action`, `Threshold`, `Reversal`, `Pause if`, `Resume when`, or `Conditions change if`, route that phrasing through shared report/export formatting instead of custom string assembly.
- Keep translation-only layers translation-only. Interpretation layers may change explanatory bullets, but they must not mutate canonical posture, confidence, readiness, or threshold semantics.
- Keep fallback behavior explicit and non-fatal. Historical or degraded modes must remain renderable with a compact operating implication.
- Preserve contract stability where possible. If you change a type or semantic contract here, update all affected consumers in the same change.

## When to edit models vs UI

- Edit `lib/report/*` when the meaning, label, threshold, trust rule, or payload contract changes.
- Edit UI components only when the meaning is stable and the job is hierarchy, layout, emphasis, or disclosure behavior.
- If a UI change requires several components to redefine the same copy, the copy belongs here instead.

## Required follow-through

When semantics change, update:
- relevant tests in `tests/*` covering weekly brief composition, layout contracts, or decision transmission
- `docs/feature-specs-current.md`
- `docs/one-screen-weekly-brief-spec.md` when top-fold or weekly brief contract changes

## Anti-patterns seen in this repo

- Rewording the same decision labels independently in `/`, `/planning`, and export builders
- Moving trust language into multiple parallel summaries
- Letting components invent local “friendlier” labels that drift from canonical decision semantics
- Treating exports as a separate brief instead of a transmission layer of the same guidance
