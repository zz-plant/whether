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
  published fact. Its other readers are the alert-rule gate in `lib/signalOps.ts`, the band stored
  on transition events, and `lib/summary/*`. The last one still prints it, in the `summary` block
  of `/api/weekly` and `/api/monthly` and in the generated monthly archive; moving it rewrites
  archived text on the next regeneration, so it is its own change.
- **The base rate is the 1-month bill.** `getBaseRate`'s `FED` rung has never fired. The 3.5%
  threshold is described as a policy-rate average but is fed `DGS1MO`, and with only a 50bp
  window driving the whole classification, a bill-specific dislocation moves the published call.

