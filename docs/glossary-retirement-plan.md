# Retiring the glossary (plan and record, 2026-09-22)

The goal is a site where no reader ever needs `/glossary`. Moving the 26 definitions somewhere
else, or turning them into tooltips, does not count. Deleting the route is the last step and the
proof, not the work.

## Why the glossary exists

A sweep of `app/`, `lib/report/`, `lib/export/`, `lib/email/` and `lib/alert/` found three separate
causes. They need to be fixed in this order, because each one inflates the next.

1. **One concept, many names.** Some examples:
   - The line that re-opens a paused decision ships under about 13 names: "Change course if",
     "Re-open when", "Clears only when", "Resume when", "reopen line", "Reversal (clears when)",
     "Reversal trigger", "WATCH:", "FLIP:", and others.
   - The line where the call itself changes ships under about 9: "Posture flips", "watch line",
     "regime boundary", "regime line", "posture boundary", "Flip trigger", and others.
   - Operating latitude also appears as "Boldness", "BOLDNESS BUDGET", "Latitude signal" and a
     bare `NN/100`.
   - A regime appears as its weather name, as the raw engine key (`SCARCITY` reaches `/history`,
     `/resources`, `/history/compare`, Scenario Studio, exports and alerts), as "Transitional
     regime", or as a forecast label (Expansion / Mixed / Scarcity / Defensive).

   The glossary is the only place these names look consistent. Any explanation written before
   the names are merged has to cover every synonym.
2. **Words that mean two things.**
   - "Posture" is the regime in one place and the call sentence in another. `weeklyOperatorBrief`
     prints "Posture:" twice, with a different meaning each time.
   - "Confidence" is the engine's distance from a line, a hardcoded per-status number on
     `dataProvenanceStrip`, and "how reliable the data is" in the glossary.
   - "Flip watch" is both a list of distances and an on/off flag.
   - The *same string* (`conciseFlipThreshold`) is labelled "Posture flips" on the hero and
     "Re-open when" on resource pages.
   - The board note labels the re-open line `FLIP:`.
3. **Mechanism where the reader needs the implication.**
   - Bond-desk shorthand (10Y−2Y, bp, 1M, OAS, BBB, U-3, EV/Revenue, FRED codes) and engine
     vocabulary (corridor, rate stack, leg, hysteresis, haircut, veto) reach primary surfaces.
   - The 10Y−2Y spread is written in five units: %, pp, bp, pts and "points".
   - Operating latitude, the biggest number on `/`, is defined only inside the collapsed "Why
     this call" panel.

The one translation layer that exists, `applyPlainEnglishSubstitutions`, rewrites jargon with
regexes *after* it is written, and nothing on the site calls it. Only a test does. That is the
wrong direction. Copy should be written plainly at the source.

## The rule this plan installs

> **The reader layer names the implication, never the instrument.** Every term a reader sees is
> either plain English or carries its meaning on the same card. Instrument names, series codes and
> formulas live only in the method layer (`/signals` deep evidence, `/trust` formula reference), and
> are defined in place there.

"Primary surfaces" means `/`, `/answers/*`, `/resources/*`, `/signals/[cluster]/*`,
`/brief/[week]`, `/share` and every export, the weekly email, alerts, and Slack. Their budget for
in-place definition popovers is zero. If a term needs a popover there, rename it instead.

## Decisions (made 2026-09-22)

A copy audit landed on `main` the same day, with `tests/readerVocabulary.test.tsx` and the
vocabulary table in `lib/report/AGENTS.md`. Where that table already decided a name, this plan
follows it. The decisions below cover only what the table left open.

| # | Question | Decision |
|---|---|---|
| D1 | Names for the three lines | **Pause if** / **Resume when** / **Call changes if**. `DECISION_CONTRACT_LABELS.reversal.resumeWhen` replaces `changeCourseIf`, and `publicDecisionLabels.reversal` reads it, so "Re-open when" is gone. |
| D2 | "Posture" | Already settled on `main`: "the call". Reader copy keeps ratcheting it down. |
| D3 | Operating latitude | Keep the name (table). `OPERATING_LATITUDE_GLOSS` sits beside the number wherever the number is. Retire "Boldness" and "BOLDNESS BUDGET". |
| D4 | Confidence | The word names the engine band only (High / Medium / Low confidence). No percent on reader surfaces. Data freshness never uses the word. |
| D5 | Forecast outcome labels | Rendered as weather names; the typed layer stays internal. |
| D6 | Stage word | Duration ("Freezing for 5 months"), not Early / Mid / Late. |
| D7 | `/glossary` redirect | `/trust#formula-reference` |

## Phases

Each phase is one PR, and each ends with a rendered read-through: run `bun run ui:shots` and look at
the PNGs as a first-time reader. The repo has learned that source reads miss what rendering shows.

### Phase 1: One name per concept (strings only, no design)

- Add `lib/report/readerVocabulary.ts`. It holds the canonical reader label for every concept above
  and a `BANNED_READER_TERMS` list of the synonyms it replaces. `DECISION_CONTRACT_LABELS` and
  `publicDecisionLabels` read from it, so there are no longer two sources.
- Merge the names:
  - The three lines, per D1. That means every file in the sweep:
    - the hero rails;
    - `publicDecisionLabels.reversal`;
    - `operatingCalls.ts` ("caution line", "reopen line", "Resume when");
    - `workspaceModel.ts` ("stop line");
    - `signalIndicators.ts`, `decisionStaleness.ts`, `thresholdsPanel.tsx` and
      `evidenceSectionShared.ts` ("watch line");
    - `boundedDecisionRules.ts` ("regime boundary/line");
    - `artifactPayload.ts` (`GUARDRAIL:`, `FLIP:`);
    - `weeklyOperatorBrief.ts` (`AVOID:`, `WATCH:`);
    - `trustPageModel.ts` ("Flip trigger");
    - `downloadableResources.ts` ("Reversal trigger").
  - "Flip watch" becomes "How close the call is to changing" for the distance list. The on/off
    flag becomes "Call change watch: on/off" everywhere, replacing "Transition watch" and "Regime
    shift watch".
  - Regime: every render path goes through `REGIME_WEATHER_LABELS`. Fix `RegimeStats.tsx:77`,
    `resources/[slug]/page.tsx:171`, `history/compare/page.tsx:129`, `scenarioStudioSimulator.tsx`,
    `runwayPlannerPanel.tsx`, `briefBuilders.ts:392`, `issueTrackerBrief.ts:73`, `wipPolicy.ts:77`,
    `monthEndPulse.ts:73`, `alertDelivery.ts`, `decisionDeltaRules.ts`, `brief.md/route.ts:132`,
    `meetingSlideExport.ts`, `fossilRecordSection.tsx`, `integrationBriefs.ts:33`, and
    `trustStatus.ts:490` (citationMeta). Drop the separate descriptor sets ("Transitional regime",
    `viewModel.ts` descriptors, "Risk-On (Capital-Loose)" / "Safety Mode").
  - Posture, latitude, confidence and stage, per D2–D4 and D6. Delete "Boldness" and "BOLDNESS
    BUDGET". Make "Funding Pressure" / "Risk Appetite" the same case everywhere.
  - Data status: one set, **Live** / **Saved copy from {date}** / **Partly live**. Each carries the
    existing `DATA_STATUS_GUIDANCE` sentence beside the label. This retires "fallback", "cached",
    "degraded", "canonical snapshot", "simulated", "Archived Snapshot", "Outage mode" and "TRUST:
    FALLBACK SNAPSHOT" from reader copy.
  - Trend: "vs last week: better / worse / no change / not compared". Never the raw `unavailable`
    (`decisionAnswerCopy.ts:21`). Never "momentum".
  - Delete "bounded" from reader copy. The three lines *are* the definition. Rewrite the fallback
    headline "Hold bounded operating discipline." (`weeklyCallContract.ts:43`), because it can
    become the hero's h1.
  - Replace "tightness" in `api/posture/current/route.ts:43`, `seoDecisionPayload.ts:115`,
    `signalIndicators.ts:355` and `content/answers/pages.json`.
- **Guard.** Add `tests/readerVocabulary.test.tsx`. It renders every primary route that renders
  offline (the pattern in `answerPageReaderCopy.test.tsx`), builds every export and alert string
  from a fixture snapshot, and fails on any `BANNED_READER_TERMS` match. That includes the engine
  keys `/\b(SCARCITY|DEFENSIVE|VOLATILE|EXPANSION|RISK_ON|TRANSITION)\b/`. Routes that suspend at the
  data boundary say so and fall back to source-level checks.
- Update `docs/editorial-guardrails.md` → Decision vocabulary. Its "operating-posture descriptions"
  bullet is already stale (`regimePresentation.ts:139` collapsed that layer).

### Phase 2: A number never appears without its scale

- Add one primitive, `SignalReading` (in `app/components/ui/plainLanguage.tsx`). It renders label,
  value, scale and meaning together: *Funding pressure 74/100: harder than usual to raise.* Its
  string twin in `signalTranslations.ts` serves exports. From then on, a bare `N/100` cannot be
  written without going around it.
- Replace the bare scores the dependency sweep listed:
  - `/signals` (`evidencePageModel.ts:335,358`);
  - `/brief/[week]` reading cards;
  - `/history/compare`, `RegimePhaseMap`, `HistoricalTrendChart`, `TimelineBar`;
  - Scenario Studio;
  - `/decisions`;
  - focus mode (`presentationFrames.tsx:118`);
  - `StickyCallStrip.tsx:125`.
- Hero changes:
  - Room to move gets its caption under the number, above the fold. The definition leaves the
    collapsed panel.
  - The weather stamp always carries its one-line meaning. Today the rationale line at
    `DecisionHero.tsx:509` is dropped whenever there is an action-now line, so usually the stamp
    is unexplained.
  - "ceiling" becomes "at the top of the scale", with the reason shown as text, not in a `title`
    attribute.
- Wire the unused `ScoreBandReference` into the hero's "Why this call" panel, or delete it. Don't
  keep it test-only.

### Phase 3: Instruments out of the reader layer

- Flip-watch sentences (`flipProximity.ts:102,131`) should say what moves, in plain words: "if
  long-term rates rise 0.35 percentage points against two-year rates, the call changes to Cloudy."
  They should not mention "the 10Y−2Y curve" or "the 1-month Treasury bill".
- **Units:** scores are in "points" (0–100). Rates and spreads are written as "percentage
  points" in prose and "%" on axes. Drop `bp` and `pp` from every reader surface. Fix "N points"
  on the recession gauge (`homeBrief/builders.ts:127`), which is in %.
- **Exports** (`briefBuilders.ts`, `issueTrackerBrief.ts`, `weeklyOperatorBrief.ts`,
  `ExportBoardAnnexButton.tsx`, `runwayPlannerPanel.tsx` memo, meeting slides, investor snippet):
  - Drop the parenthetical shorthand: (1M), (10Y−2Y), (BBB), (OAS), (U-3), EV/Revenue, YoY.
  - Series names go in one trailing Sources line.
  - Rename the macro series labels at the source, in `data/macro_snapshot.json`, so they don't
    get re-translated at each surface.
- **Alerts:** the flash subject "the 10y−2y curve moved +0.30%" becomes "the recession warning
  gauge moved 0.30 percentage points".
- Spell out or delete GTM, WoW, WIP, ZIRP. Delete the metaphors: corridor, rate stack, leg,
  envelope, whipsaw, unit discipline.
- Fix the "Fed" wording at `scenarioStudioSimulator.tsx:327` and `decisionShield.ts:449`. The base
  rate is the 1-month bill (`signalTranslations.ts:59-67`).
- Fix the no-op mapping at `evidenceSectionShared.ts:13` ("Base rate" → "Base rate").
- Chart `aria-label`s spell out the shorthand the visual key explains (`signalVisualizationSuite.tsx:289,414`,
  `signalInversionPreview.tsx:113`).

### Phase 4: The method layer defines its own terms in place

This is the one place instrument names belong, because a reader who opens a formula has asked
for them.

- `CurveTermsKey` stays, because it is an in-place definition. Its "Full glossary" link goes.
  Extend it to the Key-numbers curve card, whose description is "10Y minus 2Y Treasury yield
  spread" today, and to `/signals/[cluster]`, which has neither a key nor a link.
- `/trust` formula cards (`formulaReference.tsx:230-318`) currently gloss only the Inputs card.
  Every variable in a formula gets its plain meaning on first use in that card: HY spread, Chicago
  FCI, inversion depth, hiking cycle, the VIX veto and its window, haircuts. Where a short form
  differs from the long form glossed 50 lines up, keep the long form. "Boldness (homepage
  headline)" becomes Room to move.
- `CompactTrustPopover` shows FRED codes as citations beside plain names ("one-month Treasury bill
  · FRED DGS1MO"), never as labels.
- Scenario Studio sliders and presets describe their effect ("rates near zero", "short-term rates
  above long-term"), not the market regime they're named after.
- If a term still can't be renamed away, give it a `<Term id>` that uses `<dfn>` plus a Base UI
  Popover, opened by tap or click. Hover-only `title` text is already ruled out
  (`DecisionHero.tsx:613`). Its text comes from the registry that replaces
  `BEGINNER_GLOSSARY_ENTRIES`. It is allowed only on method-layer routes. The Phase 1 test asserts
  zero uses on primary routes.

### Phase 5: Delete `/glossary`

Deletion is safe once every entry has a disposition that shipped:

| Entry | Disposition |
|---|---|
| tightness, risk-appetite | `SignalReading` everywhere (Phase 2) |
| boldness-score | Room to move, with a caption (D3, Phase 2) |
| regime, regime-types | Weather name with its one-line meaning always beside it. Engine names never render. |
| posture | Retired (D2) |
| guardrail, flip-condition, posture-flip | Self-describing names (D1) |
| bounded-decision | The word retired; the three lines show the idea |
| confidence | Margin (D4) |
| trend | "vs last week: …" |
| fallback-mode, cached-snapshot | "Saved copy from {date}" with its consequence sentence. Two entries for one concept. |
| signals-breakdown | Delete. No surface shows this split. |
| curve-slope, base-rate | Plain names already. Their meaning is carried by `SignalReading` (Phase 2) and the method layer. |
| yield-curve, treasury-maturities, spread, inversion, basis-point | Method layer only, via `CurveTermsKey`. bp retired. |
| credit-spread, vix, financial-conditions-index, fred-series | Defined in place on the `/trust` formula cards (Phase 4) |
| `GLOSSARY_USAGE_NOTES` | Delete. It is filler and fails the copy audit on its own. |

Removal checklist, from the dependency sweep:

- **Code:**
  - Delete `app/glossary/page.tsx` and `GlossaryCompassGlyph.tsx`.
  - Delete `GlossaryLink`, `GLOSSARY_HREF`, the unread `presentation.glossaryHref`
    (`homeBrief/builders.ts:81,775`, `homeBriefModel.ts:376`), and `applyPlainEnglishSubstitutions`.
  - Remove the 5 link callers (`DecisionHero.tsx:621`, `decisionAnswerPageContent.tsx:258`,
    `[decision-scenario]/page.tsx:177`, `curveTermsKey.tsx:58`, `formulaReference.tsx:198`).
  - Remove the `/trust` "Unfamiliar with a term?" section and its `FLASH_IDS` entry.
- **Routing:**
  - Add `["/glossary", "/trust#formula-reference"]` to `iaConsolidationRedirectPairs`.
  - Add `/glossary` to `retiredSitemapPaths`.
  - Remove the `utilityLinks` entry, which also removes it from the footer, header, palette and
    route label.
  - Remove the sitemap entry.
  - Remove the `ui-capture.config.mjs` target.
- **llms-full corpus:** keep the definitions for agents, built from the term registry. Drop the
  `/glossary` URL.
- **Tests:**
  - Delete `glossaryRoute.test.tsx`.
  - Update `plainLanguageSurfaces`, `answerPageReaderCopy`, `reportCopy`, `signalLabelContract`,
    `treasurySourceLabel`, and the `weeklyDecisionCardModel` factory.
  - Add the `existsSync` assertion in `pageConsolidation.test.tsx`.
- `check:dead-exports` catches anything else left orphaned.

## Done means

- `tests/readerVocabulary.test.tsx` is green on every primary route, export and alert.
- Zero `<Term>` uses outside the method layer.
- No reader-facing number from 0 to 100 without its scale.
- A cold read of `ui:shots` for `/`, one `/answers/*`, `/brief/[week]` and the Slack brief finds
  nothing that makes a first-time reader want to look a word up.

## Found along the way (separate tasks)

- `dataProvenanceStrip.tsx` keys its labels on status strings the loader never produces, so most
  statuses show "Confidence 50%" and a generic line.
- The runway memo reads array props as objects, so every macro value prints "N/A".

## Status (2026-09-22)

All five phases shipped on `feat/retire-glossary`. `/glossary` returns a 308 to
`/trust#formula-reference`. `tests/readerVocabulary.test.tsx` bans the retired line names, the
retired score names and every pointer to the old page. `TERM_DEFINITIONS` keeps a Terms block in
`llms-full.txt` for machine readers.

One finding changed the plan. `weeklyCall.changeCourseIf` holds the line where the call changes,
not the resume line, so every surface that printed it now labels it "Call changes if". The other
conditions that would change the call print under "Watch this week". Before this, both carried
"Change course if", which was ambiguous enough to fit either meaning.

Left open, deliberately:

- ~~**`changeCourseIf` has two meanings.**~~ Resolved: the field is split into `callChangesIf`
  (always the flip trigger) and an optional `resumeWhen` (the stage's discipline, printed under
  "Resume when" beside it). See `lib/report/weeklyCallContract.ts`.
- **"Capital posture" in `/resources`.** It is the target keyword of a whole content cluster,
  including slugs, titles and downloads. Renaming it is an SEO decision, not a copy fix.
- **Score distances are written "pts"** (`formatPointsToLine`, `scoreCell`). The abbreviation
  is common enough that no reader needs it defined.
- **Archive records are not rewritten.** `publishedBriefDisplay` translates their stored labels
  at render, so the append-only record keeps the words it was frozen with.

