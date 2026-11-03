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
- `app/page.tsx` (top fold: `DecisionHero`, the h1 at every horizon; a non-weekly cadence adds `CadenceCallCard` below it)
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
  | The pause/resume pair | In sentences, the area's verb: "Hiring is paused", "a rare move from restarting", "the restart condition now holds" (2026-11-03; "its restart line" and "24 pts from restarting" until then). Slot and table labels "Pause if" / "Restart when"; export noun slots "Action" / "Pause line" / "Restart line", only beside the number. "Pause line" / "restart line" in prose is for the method sections (/about#method, /trust) | `reportCopy.ts` `DECISION_CONTRACT_LABELS` | corridor, lane, rail, watch line, Change course if, Re-open when, threshold, trigger, reversal, boundary |
  | The five decision areas | Hiring, Roadmap, Fundraising, Spending, New bets, on every surface: the picker, the tables, the levers on `/operate/scenarios`, every paste | `boundedDecisionRules.ts` `decisionAreaLabel` (the levers in `decisionKnobs.ts` read it through `operatingLeverToDecisionArea`) | Hire someone, Change the roadmap, Product tempo, Raise money, Capital raising, Approve new spend, Burn discipline, Investment pace, Start something new, Expansion bets |
  | The 0–100 room-to-act score | "Operating latitude", with `OPERATING_LATITUDE_GLOSS` beside the number | `reportCopy.ts` `OPERATING_LATITUDE_LABEL` | Boldness, latitude signal |
  | A 0–100 score in prose | name, number and meaning together: `formatSignalReading` / `SignalReading` | `signalTranslations.ts` | a bare "74/100" |
  | How far the scores sit from a change line (the API's `confidence`) | The label "Room before a change" (2026-10-28; "Margin" until then, which a reader took for a profit margin), answered "Plenty" / "Some" / "Little" ("Room before a change: little"; "Clear of / Within reach of / Close to the line" until 2026-11-03), with the nearer score's distance where the surface holds the scores, as a move the record makes ("A common risk-appetite move from Freezing", 2026-11-03; "Risk appetite 1 pt from Freezing" until then); at its shortest "3 pts from a change". The method pages (/calibration, /trust) call it "the room before a change" in prose too; "margin" stays in the API docs, field names and code | wording: `reportFormatting.ts` `MARGIN_LABEL`, `formatMarginBand`, `formatMargin`; band: `confidence.ts` `resolvePublishedConfidence`; points: `resolveNearestLineMargin` | "Confidence" or "High / Medium / Low confidence" in reader text (2026-10-09), HIGH/MED/LOW codes, "confidence" for data freshness, the engine's `diagnostics.confidence` |
  | How big a score's distance is (2026-11-03) | How often the month-end record since 2012 moved that score that far in one month: "a common move" (at least 1 month in 3), "an unusual move" (at least 1 in 12), "a rare move" (less often), "a record move" (never), in place of the points on the picker's badges, the band above the card and the trust strip; the points stay beside a scale (the ladder, the area table) | `marketMoveScale.ts` `describeScoreMoveBand` | "likely", "chance", "probability", odds of any kind: it is a count of past months, not a forecast |
  | How big a market move is | The Fed step first ("Less than one quarter-point Fed cut turns conditions Stormy"), then the instrument and the record's count on the line under it ("That is the 1-month Treasury bill rate falling 0.17 percentage points. The rate moved that far in about 1 month in 6 since 2012.") | `marketMoveScale.ts` `describeRateMoveInFedSteps`, `describeMarketMoveScale`; `flipProximity.ts` | the instrument as the lead; "k of the n months on record" |
  | The pressure score | "Funding pressure", in full on charts too | `boundedDecisionRules.ts` `ruleMetricLabel`, `signalTranslations.ts` | tightness, Capital tightness, credit conditions, "Pressure" alone |
  | The curve number | "Recession warning gauge (10-year minus 2-year rate)" on first use; as a label, "Recession warning gauge", with the instrument named once beside it or in a key (the /signals legends, 2026-11-03) | `signalTranslations.ts` `regimeSignalLabel` | 10Y−2Y alone or as a label, curve slope, curve signal; "2Y" / "10Y" / "1M" in a label or a sentence ("2-year", "10-year", "1-month") |
  | Conditions changing | "what would change this guidance", "conditions change if" | `DECISION_CONTRACT_LABELS.watch` | flip, flip watch, "the call changes" |
  | The line where conditions change | Its number in sentences ("risk appetite is 55, above 50"; "5 pts above 50"); "Change line" only as a label beside the number (ladder tick, chart, table header); "where conditions change" when a sentence must say what the number does (2026-11-03: "the line where conditions change" and "its change line" were in most sentences on the brief) | `app/components/ui/scoreLadder.tsx` | call-change line, "the line that changes the call", boundary, threshold |
  | How conditions change | `trackRecordCopy.ts` `CALL_CHANGE_RULE`, once per page | `trackRecordCopy.ts` | hysteresis, confirmation gate, dwelt crossing |
  | No live reading | `reportCopy.ts` `NO_LIVE_READING_CALL`: what is missing and what to hold | `reportCopy.ts` | "bounded operating discipline", "policy override" |
  | Which inputs set the scores | "Scored on the same data we used for past months." (a reading an earlier engine scored: "Scored on more data than we had for past months."); the strip's cell "Based on"; a left-out input's effect "Not counted: …" | `scoringBasis.ts` | "off the record", "record basis", "gated", "the record's inputs" in reader text |
  | The review response | "Continued" / "Changed" / "Deferred", with a plain sentence beside the badge (`RESPONSE_SENTENCES`) | `decisionRecordView.ts` `RESPONSE_OPTIONS` / `RESPONSE_SENTENCES` | kept / renewed / cancelled / abandoned / "it's fine" |
- If a component needs to display `Action`, `Threshold`, `Reversal`, `Pause if`, `Restart when`, or `Conditions change if`, route that phrasing through shared report/export formatting instead of custom string assembly.
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
