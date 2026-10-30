# Premise test: pre-registration

Registered 2026-10-09, before any venture outcome was paired with any Whether reading. The commit
that adds this file is the registration timestamp; the results file
(`docs/research/premise-test-results.md`) is committed after it and reports every deviation from
what is written here.

## 1. Why this test exists

Whether's guidance rests on one claim: when it reads tight conditions, it is harder for U.S.
startups to raise money over the following quarters. Nothing in the repository has checked that
claim against fundraising data.

The test has a second job. The funding-pressure rate component spends its whole 0–90 range across
the 50 basis points from 3.5% to 4.0% on the one-month bill (`BASE_RATE_TIGHTNESS_THRESHOLD`,
`BASE_RATE_TIGHTNESS_MULTIPLIER`, `TIGHTNESS_BASE_RATE_POINTS` in `lib/regimeEngineCore.ts`). Three
consequences follow, all stated in the code's own comments:

- above 4% the score is pinned at its ceiling, so further tightening is invisible;
- each basis point of the bill is 1.8 points of the score, so the 10 points between an area's
  pause line and its restart line (76 and 66) are under six basis points of the bill;
- a debt-ceiling or month-end bill dislocation can move the published conditions "for a reason
  that is not monetary".

The narrow ramp was kept for comparability with the archive. This registration fixes three
alternative ramps, the measurements that compare them, and the rule that decides whether one
replaces the current ramp. No candidate is adjusted after this file is committed.

## 2. What the record is, and what "out of sample" can mean here

The record is 177 month-end readings, January 2012 to September 2026, replayed by today's engine
(`ENGINE_VERSION = "engine-2026-10-06"`) from `data/time_machine_cache.json`. It holds seven
changes in conditions. Weekly briefs have been published since 2026 (`data/published_briefs.json`
holds five).

Every month-end reading before 2026 is a reconstruction: today's formula applied to past inputs.
The formula was written in 2026 by people who knew what happened to rates, the curve and venture
funding from 2012 on. Git history dates each element:

| Engine element | Introduced | Commit |
| --- | --- | --- |
| Engine created: 90 points for a base rate above 5% (a step), 25 for inversion, lines at 70 and 50 | 2026-01-16 | `aa74407f` |
| Month-end Treasury cache (the record's inputs) | 2026-01-16 | `50df515c` |
| Step replaced by a ramp: 180 points per point of base rate, capped at 90, from 5% | 2026-02-17 | `705e3de7` |
| Macro overlays (VIX haircut and boundary contributors) | 2026-03-02 | `7867d4c4` |
| State machine: pending and committed transitions | 2026-03-11 | `0695c4ca` |
| Ramp start moved from 5% to 3.5% | 2026-05-29 | `0cefc34b` |
| Scoring arithmetic corrected and pinned | 2026-09-03 | `8d84f91c` |
| Tightening-speed term, shock crossings, market-stress veto | 2026-09-14 | `cc32313a` |
| `ENGINE_VERSION` stamped on archived readings | 2026-10-06 | `c56e6395` |

The monthly record (`data/summary_monthly_regime_history.json`) has been regenerated eight times,
most recently on 2026-10-07, each time under the engine of that day.

So no reading in the record is out of sample with respect to the formula's design. The only
readings scored by an engine fixed before the fact are the weekly briefs published after
2026-09-14, and none of them yet has an outcome two quarters later. What this registration can
protect against is narrower: tuning the formula, the candidates or the test to the venture
outcome data below. It cannot remove design-time knowledge of the period, and the results must
not be read as a forecast-skill estimate.

## 3. The premise and the hypotheses

**Premise.** When Whether reads tight conditions, it was harder for U.S. startups to raise over
the following two to four quarters than in other conditions.

**Tight reading.** At a quarter-end month-end, the reading is tight when funding pressure (the
published, bounded `scores.tightness`) is above 70, or the published conditions are Freezing or
Stormy. Under the current lines this is every reading that is not Sunny, except a month whose
conditions lag their own scores while a change waits on confirmation; the formula above decides.

- **P1.** Tight readings predict year-over-year declines in U.S. venture deal count and deal value
  over the next two to four quarters.
- **P2 (two-sided).** The funding-pressure score alone predicts those outcomes better than risk
  appetite alone, or risk appetite predicts them better than funding pressure. Neither direction
  is favoured.
- **P3.** Where both exist, the record-basis call (rates, the tightening-speed term and VIX: what
  the archive replays) predicts at least as well as the live-basis call (the record basis plus the
  curated market series a live read carries).

## 4. Outcome data

### 4.1 Source

U.S. quarterly venture deal value (USD billions) and deal count, from the PitchBook-NVCA Venture
Monitor. Each quarterly release has a public summary spreadsheet posted on nvca.org beside the
report PDF; the figures are read from its "VC deal activity" sheet, rows "Deal value ($B)" and
"Deal count". The "Estimated deal count" row is not used: it is a model of counts not yet
recorded, and it exists only for recent quarters.

The dataset is `data/research/venture-fundraising-quarterly.json`. It stores figures and
citations only: for each figure, the release it came from, the file URL, the sheet and row, the
release's as-of date, and the date the file was posted. No report text is stored.

### 4.2 Vintage rule

PitchBook revises recent quarters upward for a year or more as deals are recorded, and changes
methodology between releases (in 2023 it added a pre-seed stage and dropped "angel"). A
year-over-year change therefore compares like with like only when both quarters come from the
same release. Every year-over-year figure here does.

- **Primary (mature vintage).** For quarter `t`, the growth figure is computed from the earliest
  retrievable release whose own quarter is at least four quarters after `t`. Both `t` and `t − 4`
  are read from that one release. Where no such release exists, the latest retrievable release is
  used and the observation is marked immature.
- **Sensitivity (first-published vintage).** For quarter `t`, both `t` and `t − 4` are read from
  the release that first published `t`, which is what a reader could have known at the time.
  Available only where that release's spreadsheet is retrievable.

"Retrievable" means the spreadsheet can be downloaded from nvca.org, directly or through the
Internet Archive's copy of the nvca.org file. The source list is fixed by what that search finds
and is recorded in the dataset; a release is never dropped because of what it contains. A quarter
no retrievable release covers is missing, not imputed.

The primary analysis uses mature observations only. Immature observations are reported
separately and enter no verdict.

### 4.3 Growth measure

`g_t = ln(v_t / v_{t−4})`, for deal value and for deal count separately: the log year-over-year
change, reported as a percentage (`e^g − 1`) where shown. A decline is `g_t < 0`.

For a reading at quarter `s`, the forward outcome is `F_s = mean(g_{s+2}, g_{s+3}, g_{s+4})`: the
average growth over the two-to-four-quarter window the premise names. A forward decline is
`F_s < 0`.

### 4.4 Carta

Carta's public quarterly metrics (down-round share, bridge-round share, time between rounds) are
not collected in this round. They begin around 2018–2019, about 25 quarters in which the record
changes conditions four times, and are published as charts in narrative reports without a stated
vintage. Any later addition is exploratory and cannot change a verdict registered here.

## 5. Readings

- Series: the month-end record replayed from `data/time_machine_cache.json` by the engine's own
  walk (`replayRegimeWalk`), which must reproduce `data/summary_monthly_regime_history.json`
  exactly before any statistic is computed.
- The reading for quarter `s` is the month-end reading of the quarter's last month (March, June,
  September, December): the reading an operator held going into the next quarter.
- Signal quarters: 2012Q1 onward, as far as the outcome window allows. With mature outcomes
  through 2025Q3, the forward window `s+2…s+4` closes at `s = 2024Q3`: 51 signal quarters.

## 6. Statistics

### 6.1 Uncertainty

Consecutive readings and overlapping forward windows are strongly autocorrelated, and 51 quarters
hold only a few independent episodes. Every interval is a 95% percentile interval from a circular
moving-block bootstrap over signal quarters: block length 8 quarters, 10,000 resamples, seed
`20261009`, resampling (reading, outcome) pairs together so their alignment is kept. A resample in
which a compared group is empty is discarded and the count of discards is reported. Block lengths
4 and 12 are reported as a sensitivity.

### 6.2 P1

For each outcome (deal value, deal count):

- **Mean difference:** `Δ = mean(F_s | tight) − mean(F_s | not tight)`, with its interval.
- **Hit rate:** the share of tight readings followed by a forward decline, beside the base rate
  (the share of all signal quarters followed by one) and the share of non-tight readings followed
  by one. The hit-rate difference (tight minus not tight) gets an interval too.
- **By horizon:** the same two statistics for `g_{s+2}`, `g_{s+3}` and `g_{s+4}` separately.
  Reported; no verdict rests on them.

Verdict, decided by the mean difference and the hit rate together:

- **Supported:** for both outcomes, `Δ < 0` with an interval entirely below zero, and the tight
  hit rate is above the base rate.
- **Partly supported:** exactly one outcome meets that.
- **Not supported:** neither does.
- **Contradicted:** for either outcome, `Δ > 0` with an interval entirely above zero. This
  verdict is reported instead of "not supported" when it applies.

### 6.3 P2

For each outcome, Spearman rank correlations between the score at `s` and `F_s`:

- funding-pressure skill `S_FP = −ρ(tightness_s, F_s)` (higher pressure should mean weaker
  fundraising);
- risk-appetite skill `S_RA = +ρ(riskAppetite_s, F_s)`;
- the difference `D = S_FP − S_RA`, with its interval.

Verdict per outcome: if the interval for `D` lies above zero, funding pressure predicts better; if
below, risk appetite predicts better; otherwise there is no detectable difference. The unbounded
pressure (`scores.tightnessPressure`) is reported beside the published score as a secondary
reading; the verdict uses the published score.

**Lead and lag.** Spearman `ρ(score_s, g_{s+k})` for `k = −4 … +8`, both scores, both outcomes.
Descriptive: it shows whether the scores lead or trail fundraising, and it carries no verdict.

### 6.4 P3

The live basis exists only for published weekly briefs, the first in 2026, and no brief yet has an
observed outcome two quarters later. P3 is therefore registered now and not testable now: the
results report `n = 0` and "not testable".

When it becomes testable, it is tested this way. For every quarter-end with a published brief on
or after its last day and within seven days of it, the live-basis tight flag (from the brief) and
the record-basis tight flag (from the month-end record) are each scored with the P1 mean
difference, using first-published outcomes (mature ones arrive a year later). P3 is supported if
the record basis's `Δ` is no worse (no less negative) than the live basis's by more than 0.05.
It is first evaluated when eight such quarter-ends have outcomes, which is not before 2029. A
backfill of market inputs into the archive (in progress elsewhere at registration) would allow a
reconstructed live basis; any test on it is exploratory, because those reconstructions did not
exist when the weeks were published.

### 6.5 Sensitivity analyses

Reported for P1 and P2, carrying no verdict: the first-published vintage (2019Q2 onward); block
lengths 4 and 12; the two halves of the tight definition separately (funding pressure above 70;
Freezing or Stormy); and including the immature quarters.

## 7. Candidate ramps

### 7.1 What changes and what does not

A candidate replaces only the level ramp: the points the rate level contributes to funding
pressure, 0 to 90. Everything else is the current engine, unchanged: the inversion component (50
points per point of inversion, capped at 25), the tightening-speed term (on the one-month bill,
91-day window), the macro adjustments and market-stress veto, the cap at 100, the lines at 70 and
50, risk appetite, and the state machine with its confirmation gate and shock crossings.

Rate points are always `clamp(round(·), 0, 90)`. Inputs are FRED series at two-decimal precision.

### 7.2 The current ramp (C0), for reference

Input `x` = the one-month bill (`DGS1MO`, the engine's base rate). Rate points
`= clamp(round((x − 3.5) × 180), 0, 90)`: zero at 3.5%, ceiling at 4.0%.

### 7.3 C1: wide ramp

Input `x` = the one-month bill. Rate points `= clamp(round((x − 2.0) × 90 / 3.5), 0, 90)`: zero at
2.0%, ceiling at 5.5%, about 25.7 points per point of rate.

### 7.4 C2: trailing ten-year percentile

Input `x` = the one-month bill. Window `W` = the 120 month-end one-month-bill values for the 120
calendar months before the reading's month, a month-end value being the last non-missing `DGS1MO`
print dated in that month. Percentile
`p = (#{w ∈ W : w < x} + 0.5 × #{w ∈ W : w = x}) / 120`. Rate points
`= clamp(round((p − 0.5) × 180), 0, 90)`: zero at or below the trailing median, ceiling only when
the bill is above every month-end of the previous ten years. A reading with fewer than 120 window
values is not scored.

For January 2012 the window starts in January 2002, so month-ends from 2002 to 2011, which the
bundled cache does not hold, are taken from FRED and stored with the research inputs.

### 7.5 C3: current ramp behind a dislocation guard

Input `x` = the median of the one-month and three-month bills (`DGS1MO`, `DGS3MO`) on the reading's
date; with two values the median is their mean. Rate points `= clamp(round((x − 3.5) × 180), 0, 90)`,
the current ramp. When the three-month bill is missing, `x` is the one-month bill and the reading is
flagged unguarded.

The guard halves the weight of a one-month-only dislocation. It also shifts the level by half the
gap between the two bills, which is part of what is being tested.

## 8. Measurements for each candidate

All four are computed on the same 177-month record for C0 through C3, each candidate's conditions
replayed through the unchanged state machine.

### 8.1 Saturation

The share of the 177 month-ends at which the rate component is at its ceiling, meaning raising its
input by 25 basis points, all else equal, would not raise its rate points, while those points are
at least 45 (the upper half, so the floor does not count). For C2 the window is held fixed and only
`x` is raised. Secondary: the share of month-ends at which the bounded funding-pressure score is
100.

### 8.2 Turnover

Changes in conditions in the replayed 177-month record, and per year (divided by the 14.67 years
between the first and last month-end). The current engine's record has seven.

### 8.3 Premise performance

The P1 mean differences with the candidate's own tight flag (its funding pressure above 70, or its
conditions Freezing or Stormy), mature vintage. The premise score is
`PS = −(Δ_value + Δ_count) / 2`, in log points: larger means tight readings sort weaker forward
fundraising further from the rest. The paired bootstrap (same resampled blocks for the candidate
and C0) gives the share of resamples in which the candidate's `PS` exceeds C0's.

### 8.4 Dislocation sensitivity

How many rate points a candidate moves when a bill moves for a reason the policy rate does not
share. The policy reference is the effective federal funds rate (FRED `DFF`, daily).

For a date `d` paired with a reference date `r`, each bill's non-monetary move is
`n = (bill_d − DFF_d) − (bill_r − DFF_r)`, and its counterfactual value at `d` is `bill_d − n`:
the bill as if it had moved only with the policy rate since `r`. The pair's sensitivity is the
absolute difference between the candidate's rate points from the actual bills at `d` and from the
counterfactual bills at `d` (C2's window held fixed).

The pairs, fixed now:

- **Month-ends.** Each of the 177 record dates, paired with the latest date on or before the 15th
  of the same month on which `DGS1MO`, `DGS3MO` and `DFF` all print.
- **Debt-ceiling episodes.** Every date in the window with all three series printing, paired with
  the window's reference date:
  - 2013: reference 2013-09-03, window 2013-09-04 to 2013-10-31;
  - 2021: reference 2021-09-01, window 2021-09-02 to 2021-12-31;
  - 2023: reference 2023-04-03, window 2023-04-04 to 2023-06-15.

`DS_month` is the mean sensitivity over month-end pairs, `DS_debt` the mean over all episode dates
pooled, and `DS = (DS_month + DS_debt) / 2`. Each episode's mean and maximum are reported. A
secondary ratio divides each candidate's mean response to non-monetary moves by its mean response
to the policy-rate moves over the same pairs (rate points from the counterfactual bills at `d`
against the actual bills at `r`); it is reported and carries no weight in the rule.

The daily values these pairs need are stored with the research inputs, each with its FRED series
and date.

## 9. Decision rule

Switch the live ramp to candidate `c` only if all four hold:

1. **Premise.** `PS_c − PS_C0 ≥ 0.05`, the paired bootstrap puts `PS_c` above `PS_C0` in at least
   80% of resamples, and the candidate's own `Δ` is negative for both outcomes.
2. **Saturation.** The candidate's saturation share is at most half of C0's.
3. **Turnover.** At most 10 changes in conditions over the 177-month record (C0: 7).
4. **Dislocation.** `DS_c ≤ 0.75 × DS_C0`.

If more than one candidate passes, the one with the largest `PS` gain is chosen; on a tie, the one
with fewer changes in conditions. If none passes, the current ramp stays. The result is published
either way, in `docs/research/premise-test-results.md`.

A switch is a separate pull request. It bumps `ENGINE_VERSION`, regenerates the archive under the
new version while keeping the old version's snapshots, never edits a published weekly brief, and
reports the record's diff: months changed, changes in conditions, and the confidence calibration.

## 10. Shadow scoring

Whatever the rule decides, the three candidates are scored alongside every weekly reading from the
day this lands, stored beside the reading under their own key, and used for nothing a reader sees.
That record is the first one in which candidate readings are written before their outcomes exist.
It is reviewed when it covers eight quarter-ends with first-published outcomes; a candidate that
failed the rule here can be reconsidered then only through a new registration.

## 11. Limits

- **Small n.** 51 signal quarters, about four independent tight episodes, seven changes in
  conditions. Intervals will be wide and a null result is the expected outcome even if the premise
  is partly true.
- **In-sample design.** Section 2: the formula and the candidates were written with the period in
  view. A pass here is consistency with history, not forecasting skill.
- **Venture data reflects many causes.** Deal counts and values move with exits, fund cycles,
  sector booms (AI in 2024–2026) and megadeals; a few rounds can move a quarter's deal value.
  Rates are one cause among several, so a weak relationship does not show the reading is useless
  for an operator, and a strong one would not show the rates caused it.
- **Quarterly granularity.** Readings change weekly; outcomes are quarterly and compared at
  quarter-ends, so timing within a quarter is lost.
- **Vintage.** The mature rule needs releases a year after each quarter, so the newest year is
  immature and excluded from the primary analysis; the first-published sensitivity covers only
  2019Q2 onward.

## 12. What was seen before registering

- The author knows the broad history of rates and venture funding over 2012–2026, including the
  2021 peak and the 2022–2023 decline. So did the people who wrote the formula.
- To confirm the source format, the author opened one release (Q3 2026) and its "VC deal
  activity" sheet, and listed which releases' spreadsheets exist. No figure was paired with any
  reading, and no candidate metric was computed, before this file was committed.

## 13. Deviations

Any departure from this file in the analysis is listed in the results under "Deviations", with
the reason, and the registered version is reported beside it wherever both can be computed.
