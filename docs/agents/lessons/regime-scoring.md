# Regime scoring: what the numbers do and do not claim

Moved out of `CLAUDE.md`. Read before touching `lib/regimeEngineCore.ts`, confidence, or anything that prints a score or delta.

The constants in `lib/regimeEngineCore.ts` are annotated; this is the behaviour that comes out
of them, which is less obvious.

- **`tightness` saturates, on purpose, and the hero now says when it has.** The rate component
  spans 0-90 across a 50bp window (3.5% to 4.0% base rate) and the components over-subscribe the
  cap, so above ~4% the published score is a constant 100 and its week-over-week delta is zero.
  Read `scores.tightnessPressure` for magnitude — same points, no ceiling anywhere — and
  `scores.tightnessSaturated` to tell a clipped score from a flat reading. Classification still
  uses the bounded score, so no published regime moved when pressure was added.

  The delta row used to render only when the delta was non-zero, so at the ceiling it vanished:
  100/100, no direction, and the reader left to infer from the ceiling tag that the silence meant
  "off the top" rather than "flat". It now says so. Pressure is computed per read and never
  persisted, so a *pressure* delta is not available without a stored-history change; what is
  published is the fact that the score has stopped being able to report a move.

- **A distance from a threshold is not a weekly move, and three artifacts published it as one
  (2026-09-16).** `RegimeDiagnostics` carried `tightnessDelta` and `riskAppetiteDelta`, and both
  were `score - threshold`, with no previous week in the calculation. The weekly email, the export
  brief and the published brief archive each printed one as **"vs last week"** — so an unchanged
  week still reported a move, of whatever size the score happened to sit above the line, and a
  score pinned at 100 reported +30 every week forever. `getRegimeProjection` already warned, in a
  comment, not to pass these where a velocity was wanted; three call sites did it anyway, which is
  why the fields are now `tightnessVsThreshold` and `riskAppetiteVsThreshold`. A name has to carry
  that, not a comment three files away.

  Each surface was fixed for what it actually has: the published archive reads
  `reportDynamics.changedSignals` and carries the real move (no record was contaminated — the field
  predates every entry); the weekly email's snapshot has no previous week in it, so its label
  changed to "vs the regime line"; the export brief dropped the segment, because the honest version
  of that number duplicates the corridor rails printed beside it. `OperatingSnapshot.schemaVersion`
  is 2, and a stored snapshot of the old shape reads as absent and is refilled by the next cron.
- **The two axes are not independent.** `riskAppetite` is a pure function of curve slope, and
  slope also drives the inversion term in `tightness`, so an inversion moves both at once. Note
  `riskAppetiteRegime = 50` therefore means "slope above +0.25%", not "a flat curve" — a
  relationship the threshold's own doc comment asks callers not to encode.
- **Confidence measures distance from a boundary, nothing else — and the archive now says so out
  loud (2026-09-16).** Two guards matter: an imputed input caps it
  (`CONFIDENCE_PERCENT_IMPUTED_CEILING`), because the stand-ins sit far from the boundaries and used
  to score the *ceiling* on an empty payload; and the risk gap is converted to its tightness
  equivalent before the two are compared, because the raw scales differ 4.5x and the risk axis
  otherwise decided the answer in 164 of 175 historical months.

  Calibrating the percent against `data/summary_archive.json` was the open work here. It is done,
  and the result is not that the number needs a different slope. Over the 176 month-end readings
  (2012-01 to 2026-08) the published regime held into the next month 169 times in 175, and:

  | Points from a boundary | Percent reported | Months held | Months |
  | --- | --- | --- | --- |
  | 0 to 5 | 55% | 100% | 11 |
  | 5 to 10 | 60% | 78% | 9 |
  | 10 to 20 | 65% | 100% | 12 |
  | 20 to 37 | 75% | 94% | 54 |
  | 37 or more | 92% | 99% | 89 |

  Every band held more often than the percent those months reported, above its 95% interval, the
  ceiling band included. Worse for the number's name, **distance does not order the outcome**: the
  least-confident band held 11 of 11 while the band above it held 7 of 9. And the archive cannot
  support re-fitting it — six flips in fourteen years is not a probability per band, and a curve
  fitted to the base rate would report ~97% every week and discriminate nothing.

  So the percent keeps measuring distance, which is honest, and the record is published beside it
  rather than folded into it (`lib/report/confidenceCalibration.ts`, rendered at
  `/trust#confidence-record`). It is derived from the bundled archive at module load, so the monthly
  refresh improves it instead of dating it. `tests/confidenceCalibration.test.ts` asserts the two
  findings as properties rather than pinning the counts, and fails if a later archive ever makes
  distance order the outcome — which is exactly when the copy would need rewriting.

  Still true: the scale tops out for most months. 51% of them report the 92% ceiling, and only 14
  distinct values have ever been produced.

  **One reading had three confidences until 2026-09-28, and now has one.** On the week of Sep 22,
  `/` and `/signals` said High while `/operate` and `/trust` said Medium ("Live · reduced
  confidence") and every `/share` paste said Medium and "Confidence is not high". The trust strip
  builder was already shared; what callers handed it was not. The engine's `diagnostics.confidence`
  and a copy of it in the posture-state contract both ranked the raw gap, where a risk-appetite
  point is a 4.5x larger move than a funding-pressure point: the defect the normalisation above
  fixed, still live in two places. That week sat 20 points from the nearest line and 7 raw points
  from the risk line, so the rules disagreed, and the brief model preferred the contract's label on
  every route that built one. Every surface that prints the word or the percent (pages, the posture
  state the APIs serve, every export, the email, the confidence-drop alert, the CLI) now reads
  `resolvePublishedConfidence` in `lib/report/confidence.ts`, which also decides once what counts as
  a stale fallback. `tests/trustStripAgreement.test.tsx` runs `/`, `/signals`, `/operate`, `/trust`,
  the posture state and every `/share` paste through the real loader against that week's reading.

  The engine's label stays: it is the state machine's confirmation gate, and a gate is not a
  published fact (the diagnostics now say so by name: `CONFIRMATION_GATE_*`, and a doc comment on
  `RegimeDiagnostics.confidence`, which keeps its name because it is stored). Its other readers are
  the alert-rule gate in `lib/signalOps.ts` and the band stored on transition events. `lib/summary/*`
  printed it until 2026-10-06, in the `summary` block of `/api/weekly` and `/api/monthly` and in the
  generated archives; the builders read `resolveSummaryConfidence` now, and the archives switch on
  their next regeneration (55 of 176 monthly entries change; `docs/feature-specs-current.md` §6.9).

  Still open, and its own change: the published confidence ignores the shock downgrade. The engine
  sets its gate band to LOW on a shock crossing so the flip is not dressed as confirmed, but
  `resolvePublishedConfidence` reads only the scores, so a shock week publishes its distance-based
  label on every surface (Dec 2025, archived as a shock: HIGH). The shock sentence carries the
  warning. Honouring it would move the published confidence on every shock week.
- **The base rate is the 1-month bill.** `getBaseRate`'s `FED` rung has never fired. The 3.5%
  threshold is described as a policy-rate average but is fed `DGS1MO`, and with only a 50bp
  window driving the whole classification, a bill-specific dislocation moves the published call.


## The call is scored on the record's inputs (2026-10-09)

The record that vouches for the call has to test the score that sets it. The month-end archive
(`/history`, the track record, `/calibration`'s "96% held") scores interest rates, the curve, the
pace of rate rises and VIX; the live call also counted the venture funding pace, the tech-layoff
trend, the high-yield spread and the Chicago Fed index. So four published weeks read Freezing whose
month-end read Cloudy, and on Oct 7 risk appetite was 49 = 60 on the record's inputs − 11 from two
curated snapshots with no history at all. A calibration study can only vouch for the inputs it was
run on.

- **Only `RECORD_BASIS_MARKET_INPUTS` move a published score** (`engine-2026-10-09`). The rest are
  scored into `scores.offRecord` (the previous engine's numbers, and which inputs moved them) and
  shown: `ScoringBasis` in `lib/report/scoringBasis.ts` says what they would make each score, and
  warns when they would cross a line. Add an input to the basis only in the change that puts its
  month-end history in the archive; `tests/recordBasis.test.ts` checks every cached month carries it.
- **"Backtestable" is a property of the public series, not of the input's importance.** FRED's
  high-yield series begins 2023-10-10 (ICE licensing), so it stays off the basis however good a
  stress read it is. The Chicago Fed index runs from 1971 and joined with its backfill
  (`engine-2026-10-09b`): it moved two months' funding pressure by two points and no month's
  conditions, so every record figure held (spec §1.1.67).
- **Backfill what a reader had, not what was true later.** A weekly series published with a lag is
  read as of its publication (the index: five days after the week it measures), and a series that is
  re-estimated (the index again) is backfilled from today's vintage, which the spec says out loud.
- **A gated input's effect is never a part of a move.** The breakdown's parts add up to the
  published move; what the left-out inputs would add is a separate, not-counted line.
- **Say the basis with the call.** Every surface that prints a call prints "Scored on the record's
  inputs." (or "more inputs than the record" for a reading an earlier engine scored), and the API
  carries `scoringBasis`. A frozen week's basis is derived from the engine its record names, so the
  record is never edited to say it.

## A delta is a move only if both readings were scored from the same inputs (2026-09-29)

The weekly change on every surface is today's assessment minus the previous Time Machine snapshot scored
by `evaluateRegime(snapshot, thresholds)`, which is rates alone. Today's assessment also carries the
rate-speed term and the market series (since 2026-10-09 only the record's: the curated ones no longer
move a published score, above). On the Sep 25 read risk appetite fell 13: 2 from the curve
and 11 from startup-market inputs the earlier score never had, and the "pause line crossed" it triggered
(43 against 44) was those inputs, not the market moving. Before printing or acting on a difference between two
readings, ask whether the readings share their inputs; if they do not, say which part of the difference is
the inputs. `explainScoreMovement` (`lib/report/scoreMovement.ts`) does that for the two scores, and
`docs/feature-specs-current.md` §1.1.27 has the numbers and the like-for-like question it leaves open.

## The engine decides; `lib/report/` says it (2026-10-06)

Four of the last wording commits to the regime's copy (91cb0156, e9879a0f, 4bba8ebe, a244e212) were
commits to scoring files, because the regime profiles, the axis explanations, the input labels, the data
warnings, the contributor lines, the policy refusal reasons and the machine's transition reasons were all
written inside `regimeEngineCore`, `regimeEngine`, `regimeEngineDiagnostics`, `regimeEnginePolicy` and the
state machine — which imported `regimeSignalLabel` from `lib/report/` to do it, so the engine and the report
layer imported each other.

The scorer (`scoreRegime`, `lib/regimeEngineScoring.ts`) now returns codes: the regime key, contributor codes,
warning codes, a transition `cause` (`held` / `pending` / `committed`, with the lines crossed and whether it
was a shock), refusal codes. `describeRegimeAssessment` (`lib/report/regimeDescription.ts`) writes them into
the same `RegimeAssessment`, field for field and in the same key order — a stored snapshot is JSON, and a
re-read one must equal the one written. `evaluateRegime` composes the two and kept its signature. The state
machine lives at `lib/regimeStateMachine.ts`, and `advanceRegimeState` returns the step with its `cause`;
only the described assessment carries `transitionReason`.

What did not change: the strings are still stored. The walk keeps `description` as each month's summary and
the generators write every one of them into `data/`, so a wording edit in `regimeDescription.ts` still
rewrites archived text on the next regeneration. The split makes that edit visibly a copy change; it does
not make it free.

## One replay walk, and the archives replayed offline (2026-10-06)

The threaded walk (evaluate, hand the machine snapshot forward) existed four times: the runtime month walk in
`timeMachineCache.ts` and one per archive generator, each with its own copy of the VIX reading literal, and
the generators with three copies of the record-date search, the Treasury snapshot, the coverage check and the
provenance formatters, plus a re-implementation of the engine's velocity-window search. Divergence between
copies is what 050e9371 had to repair. Now:

- `replayRegimeWalk` and `buildReplayVixReading` (`lib/timeMachine/regimeReplay.ts`) are the walk; the
  runtime walk and `replayArchivePeriods` (`scripts/regimeArchiveContext.ts`) both call them.
- The cadence logic each generator owned is `buildWeeklyArchive`, `buildMonthlyArchive` and
  `buildQuarterlyYearlyArchive` in `scripts/regimeArchiveReplay.ts`; the `generate*Summaries.ts` scripts
  fetch, call one, and write.
- The velocity pair the cache stores comes from the engine's `resolveBaseRateVelocityPair`, the same search
  that scores the term.

The refactor was proven byte-identical by running all three generator scripts before and after it, offline,
against FRED-shaped series rebuilt from the bundle and a frozen clock: every file they write matched.

**The bundle is enough to replay the archives.** Each month-end's yields, the base-rate pair, the daily VIX
tail, the weekly Chicago Fed observations (since 2026-10-09) and every weekly and pre-2012 quarterly input are on record, and rebuilt into series they reproduce the
monthly archive's record dates, regimes and both scores for all 176 months, and the Time Machine cache entry
for entry, apart from the fetch timestamp. `tests/regimeArchiveReplay.test.ts` holds the generators' own code
to that, so a change that moves an archived month fails offline instead of surfacing at the next
regeneration.

## The scorer reads no data (2026-10-06)

`computePolicyAssessment` standardizes the base rate and the curve slope against a ten-year month-end
history, and it used to fetch that history itself: `regimeEnginePolicy.ts` imported `getTreasuryPolicyHistory`,
which imported the 1.2MB `data/time_machine_cache.json`. So every reading's policy composites depended on a
file nothing at the call site named. The history is an argument now — `scoreRegime(…, policyHistory)` and
`computePolicyAssessment(…, policyHistory)`, with the window selection in the engine — and `evaluateRegime`
supplies the bundled series (`TREASURY_POLICY_HISTORY`, `lib/policy/history.ts`). `lib/regimeEngine.ts` and
`lib/policy/history.ts` are the only engine-layer files that import bundled data or `lib/report/`;
`tests/architectureInvariants.test.ts` holds the rest to that.

## Which calibration scored it: `ENGINE_VERSION` (2026-10-06)

Nothing recorded which engine scored an archived entry or a stored snapshot, so a constant change and a data
change looked the same in `data/`. `ENGINE_VERSION` (`lib/regimeEngineCore.ts`) names the calibration:

- The generators stamp `engineVersion` on every entry they write (all four cadences in
  `summary_archive.json`, and the weekly and monthly summary files). It is optional to readers: entries
  written before it have none, and `lib/summary/summaryArchive.ts` does not read it.
- `hashOperatingInputs` includes it, so a re-score of the same inputs under a new calibration is a new
  snapshot id and KV key. That changed every hash once, which was traced before it shipped: the hash names
  the snapshot, its per-reading KV key (no reader) and a field in the ingest-pipeline telemetry; nothing
  compares it between runs, triggers on it, or sends anything because of it.
- `tests/engineVersion.test.ts` fingerprints the scorer's output (codes and numbers, no copy) on a fixed
  synthetic grid and pins the digest to the version, so a scoring change under an unchanged version fails.
  The grid is synthetic so a regeneration of the bundled data never reads as a new calibration. Bump the
  version and add a digest; never overwrite an old one.
- A bump no longer drops "what changed this week" to the month-end (2026-10-07). Published briefs store
  the inputs their scores were scored from (`inputs`), and the week after a bump scores last week's again
  with the new engine (`rescoreStoredInputs`, `lib/report/comparisonReading.ts`; spec §1.1.53). A
  calibration that starts reading an input records do not store has to add it to the stored inputs
  (`PublishedBriefInputsSchema`, `buildStoredInputs`); `tests/weeklyComparison.test.tsx` fails when the
  set of market series that moves a score changes.

**The weekly, quarterly and yearly archives are pinned the same way (2026-10-06).** They store no scores, so
`tests/regimeArchiveReplay.test.ts` holds their regime and record date: all 452 weeks inside the bundled VIX
tails, and every quarter and year from 2012. Two limits are stated in the test rather than passed by luck:
weeks after the last cached month-end replay without VIX (the tails end there), and 2010-2011 quarters have no
VIX either, so they thread the walk without being compared. Weekly yields come from the weekly entries' own
inputs, so for that cadence the test checks the engine and the walk, not the yields. A mutation of the
machine's confirmation gate fails the monthly, weekly and quarterly replays and the version fingerprint
together.
