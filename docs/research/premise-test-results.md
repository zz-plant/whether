# Premise test: results

Run on 2026-10-09 under the registration in `docs/research/premise-test-preregistration.md`,
committed and pushed (`4285307d`) before any outcome was paired with any reading. Every number
below is in `data/research/premise-test-results.json`; `bun scripts/research/premiseTest.ts --check`
recomputes it from the committed inputs and fails if a figure moves.

## Verdicts

| Hypothesis | Verdict |
| --- | --- |
| **P1.** Tight readings predict year-over-year declines in deal count and deal value over the next two to four quarters | **Not supported.** Both differences point the registered way; both intervals include zero. |
| **P2.** Funding pressure predicts better than risk appetite, or the reverse (two-sided) | **No detectable difference**, for deal value and for deal count. Risk appetite is ahead on both point estimates. |
| **P3.** The record-basis call does at least as well as the live-basis call | **Not testable.** No published weekly brief has an outcome two quarters later yet (n = 0). |
| **Decision rule** | **No candidate passes. The current ramp stays**, and no switch pull request is opened. |

What the data does show is timing: both scores move most closely with deal count in the same
quarter, and the relationship falls by more than half by four quarters ahead and is gone by six. The
readings describe fundraising as it happens more than they anticipate it (see "Lead and lag").

## Data

### Outcomes

U.S. venture deal value and deal count by quarter, 2011Q1–2026Q3, from the "Deal value ($B)" and
"Deal count" rows of the PitchBook-NVCA Venture Monitor's public summary spreadsheets
(`data/research/venture-fundraising-quarterly.json`, built by
`scripts/research/ventureFundraising.ts`).

- **Releases retrieved:** 29, from 2019Q2 to 2026Q3. Every release before 2019Q2 and the 2022Q3
  release have no public spreadsheet on nvca.org or in the Internet Archive's index of nvca.org
  uploads. Under the registered vintage rule a missing release is skipped, never imputed.
- **Mature vintage (primary):** each quarter's year-over-year pair comes from the earliest
  retrieved release at least four quarters later; 2011Q1–2018Q2 all come from the 2019Q2 release,
  which covers 2006 onward. Mature through 2025Q3; 2025Q4–2026Q3 are immature and enter no verdict.
- **First-published vintage (sensitivity):** 29 quarters, 2019Q2–2026Q3 except 2022Q3.

| Release | Saved | Spreadsheet | Mature pairs it supplies | Sheet |
| --- | --- | --- | --- | --- |
| 2019Q2 | 2019-07-10 | [Final_PitchBook_NVCA_2Q_2019_Venture_Monitor_Summary_XLS.xlsb.xlsx](https://nvca.org/wp-content/uploads/2019/08/Final_PitchBook_NVCA_2Q_2019_Venture_Monitor_Summary_XLS.xlsb.xlsx) | 2011Q1–2018Q2 | Deal Flow x Stage & Qtr |
| 2019Q3 | 2019-10-07 | [3Q_2019_…_Summary_XLS-1.xlsx](https://nvca.org/wp-content/uploads/2019/10/3Q_2019_PitchBook_NVCA_Venture_Monitor_Summary_XLS-1.xlsx) | 2018Q3 | Deal Flow x Stage & Qtr |
| 2019Q4 | 2020-01-11 | [Final_4Q_2019_…_Summary_XLS.xlsx](https://nvca.org/wp-content/uploads/2020/01/Final_4Q_2019_PitchBook_NVCA_Venture_Monitor_Summary_XLS.xlsx) | 2018Q4 | Deal Activity |
| 2020Q1 | 2020-04-10 | [Summary-XLS_Q1_2020_….xlsx](https://nvca.org/wp-content/uploads/2020/04/Summary-XLS_Q1_2020_PitchBook_NVCA_Venture_Monitor_Summary_XLS.xlsx) | 2019Q1 | Deal Activity |
| 2020Q2 | 2020-07-10 | [Summary-XLS_Final_Q2_2020_….xlsx](https://nvca.org/wp-content/uploads/2020/07/Summary-XLS_Final_Q2_2020_PitchBook_NVCA_Venture_Monitor_Summary_XLS.xlsx) | 2019Q2 | Deal Activity |
| 2020Q3 | 2020-10-09 | [Summary-XLS_Q3_2020_….xlsx](https://nvca.org/wp-content/uploads/2020/10/Summary-XLS_Q3_2020_PitchBook_NVCA_Venture_Monitor_Summary_XLS.xlsx) | 2019Q3 | Deal Activity |
| 2020Q4 | 2021-01-11 | [Q4_2020_…_Summary_XLS.xlsx](https://nvca.org/wp-content/uploads/2021/01/Q4_2020_PitchBook_NVCA_Venture_Monitor_Summary_XLS.xlsx) | 2019Q4 | Deal Activity |
| 2021Q1 | 2021-04-14 | [Final_Q1_2021_…_Summary_XLS.xlsx](https://nvca.org/wp-content/uploads/2021/04/Final_Q1_2021_PitchBook_NVCA_Venture_Monitor_Summary_XLS.xlsx) | 2020Q1 | Deal Activity |
| 2021Q2 | 2021-07-14 | [Q2_2021_…_Summary_XLS.xlsx](https://nvca.org/wp-content/uploads/2021/07/Q2_2021_PitchBook_NVCA_Venture_Monitor_Summary_XLS.xlsx) | 2020Q2 | Deal Activity |
| 2021Q3 | 2021-10-08 | [Underlying-Report-Data_Q3-2021-Venture-Monitor.xlsx](https://nvca.org/wp-content/uploads/2021/10/Underlying-Report-Data_Q3-2021-Venture-Monitor.xlsx) | 2020Q3 | Deal Activity |
| 2021Q4 | 2022-01-07 | [Underlying-Report-Data_Q4-2021-Venture-Monitor.xlsx](https://nvca.org/wp-content/uploads/2022/01/Underlying-Report-Data_Q4-2021-Venture-Monitor.xlsx) | 2020Q4 | Deal Activity |
| 2022Q1 | 2022-04-13 | [Q1_2022_…_Summary_XLS.xlsx](https://nvca.org/wp-content/uploads/2022/04/Q1_2022_PitchBook_NVCA_Venture_Monitor_Summary_XLS.xlsx) | 2021Q1 | Deal Activity |
| 2022Q2 | 2022-07-13 | [Q2_2022_…_XLS.xlsx](https://nvca.org/wp-content/uploads/2022/07/Q2_2022_PitchBook_NVCA_Venture_Monitor_XLS.xlsx) | 2021Q2 | Deal Activity |
| 2022Q4 | 2023-01-11 | [Underlying-Report-Data_Q4-2022-Venture-Monitor.xlsx](https://nvca.org/wp-content/uploads/2023/02/Underlying-Report-Data_Q4-2022-Venture-Monitor.xlsx) | 2021Q3–2021Q4 | Deal Activity |
| 2023Q1 | 2023-04-13 | [Q1_2023_…_Data.xlsx](https://nvca.org/wp-content/uploads/2023/04/Q1_2023_PitchBook-NVCA_Venture_Monitor_Data.xlsx) | 2022Q1 | Deal Activity |
| 2023Q2 | 2023-07-12 | [Q2_2023_…_Summary_XLS.xlsx](https://nvca.org/wp-content/uploads/2023/07/Q2_2023_PitchBook-NVCA_Venture_Monitor_Summary_XLS.xlsx) | 2022Q2 | Deal Activity |
| 2023Q3 | 2023-10-12 | [Q3_2023_…_Summary_XLS.xlsx](https://nvca.org/wp-content/uploads/2023/10/Q3_2023_PitchBook-NVCA_Venture_Monitor_Summary_XLS.xlsx) | 2022Q3 | Deal Activity |
| 2023Q4 | 2024-01-10 | [Q4_2023_…_Summary_XLS.xlsx](https://nvca.org/wp-content/uploads/2024/01/Q4_2023_PitchBook-NVCA_Venture_Monitor_Summary_XLS.xlsx) | 2022Q4 | Deal Activity |
| 2024Q1 | 2024-04-11 | [Q1-2024-…-Summary-XLS.xlsx](https://nvca.org/wp-content/uploads/2024/04/Q1-2024-PitchBook-NVCA-Venture-Monitor-Summary-XLS.xlsx) | 2023Q1 | Deal Activity |
| 2024Q2 | 2024-07-10 | [Q2-2024-…-Summary-XLS.xlsx](https://nvca.org/wp-content/uploads/2024/07/Q2-2024-PitchBook-NVCA-Venture-Monitor-Summary-XLS.xlsx) | 2023Q2 | Deal Activity |
| 2024Q3 | 2024-10-09 | [Q3-2024-…-Summary-XLS.xlsx](https://nvca.org/wp-content/uploads/2024/10/Q3-2024-PitchBook-NVCA-Venture-Monitor-Summary-XLS.xlsx) | 2023Q3 | Deal Activity |
| 2024Q4 | 2025-01-13 | [Q4-2024-…-Summary-XLS.xlsx](https://nvca.org/wp-content/uploads/2025/01/Q4-2024-PitchBook-NVCA-Venture-Monitor-Summary-XLS.xlsx) | 2023Q4 | Deal Activity |
| 2025Q1 | 2025-04-15 | [Q1-2025-…-Summary-XLS-19001-1.xlsx](https://nvca.org/wp-content/uploads/2025/04/Q1-2025-PitchBook-NVCA-Venture-Monitor-Summary-XLS-19001-1.xlsx) | 2024Q1 | Deal Activity |
| 2025Q2 | 2025-07-14 | [Q2-2025-…-Summary-XLS-19728.xlsx](https://nvca.org/wp-content/uploads/2025/07/Q2-2025-PitchBook-NVCA-Venture-Monitor-Summary-XLS-19728.xlsx) | 2024Q2 | Deal Activity |
| 2025Q3 | 2025-10-14 | [Q3_2025_…_Summary_XLS_20370.xlsx](https://nvca.org/wp-content/uploads/2025/10/Q3_2025_PitchBook-NVCA_Venture_Monitor_Summary_XLS_20370.xlsx) | 2024Q3 | Deal activity |
| 2025Q4 | 2026-01-15 | [Q4-2025-…-Summary-XLS.xlsx](https://nvca.org/wp-content/uploads/2026/01/Q4-2025-PitchBook-NVCA-Venture-Monitor-Summary-XLS.xlsx) | 2024Q4 | Deal activity |
| 2026Q1 | 2026-04-14 | [Q1-2026-…-Summary-XLS.xlsx](https://nvca.org/wp-content/uploads/2026/04/Q1-2026-PitchBook-NVCA-Venture-Monitor-Summary-XLS.xlsx) | 2025Q1 | Deal activity |
| 2026Q2 | 2026-07-08 | [Q2-2026-…-Summary-XLS.xlsx](https://nvca.org/wp-content/uploads/2026/07/Q2-2026-PitchBook-NVCA-Venture-Monitor-Summary-XLS.xlsx) | 2025Q2 | VC deal activity |
| 2026Q3 | 2026-10-07 | [download 125414](https://nvca.org/download/125414/) | 2025Q3; 2025Q4–2026Q3 immature | VC deal activity |

"Saved" is the spreadsheet's own last-saved timestamp, which falls on or a day before each
release; nvca.org's file dates were reset by a 2024 site migration and are not used.

### How every figure was checked

No figure was extracted by a model. All came from the spreadsheets' cells, read four ways:

1. **Two independent readers.** The generator's TypeScript reader and a separate Python reader
   (standard-library zip and XML) extracted the same 368 figure slots (254 distinct
   release-quarter figures) with no disagreement.
2. **Each release against its own annual table.** For every release, the four quarters of each
   complete year sum to the sheet's annual figure, exactly for counts and within $5 million for
   value: 310 release-years checked, none failed. The generator refuses to write otherwise.
3. **Against the printed reports.** The annual figures printed in four report PDFs (2Q 2019,
   Q4 2022, Q3 2023, Q2 2026) were compared with the spreadsheets. Every value and count matches,
   with two explained differences. Printed deal counts for years that include estimated quarters
   equal the spreadsheet's counted deals plus its "Estimated deal count" additions (2022 in the
   Q3 2023 report: 17,498 counted plus 172 estimated is the printed 17,670); the dataset uses the
   counted row, as registered. And the 2Q 2019 report prints 2018 deal value as $134.7 billion
   where that release's spreadsheet sums to $136.8 billion; the dataset reads the spreadsheet,
   and that release supplies 2018 only as the current quarter for 2018Q1 and 2018Q2.
4. **Independent extraction by the local model.** `qwen3-coder` 30B, run on the owner's Ollama,
   was shown each release's raw header and value rows and asked for the figures of every quarter
   the dataset uses from it. It agreed on 103 of 127 release-quarters. In all 24 disagreements the
   model's value and count both sit in a column headed with a different quarter (usually a year
   earlier), and the parser's column is headed with the quarter asked for; each was resolved by
   reading the cells. No figure changed.

### Rate inputs

`data/research/premise-test-rate-inputs.json` (built by `scripts/research/premiseTestRateInputs.ts`
from FRED): the one-month bill at each month-end from 2002 to 2011 (the percentile candidate's
window for 2012–2021 readings), and the one-month bill, three-month bill and effective federal
funds rate on every registered dislocation pair: 177 month-ends with their mid-month references,
and 41, 82 and 52 dates in the 2013, 2021 and 2023 debt-ceiling windows. FRED's month-end bills
match the bundled cache on all 177 record dates.

## Readings

The month-end record replayed by today's engine: 177 readings, January 2012 to September 2026,
seven changes in conditions. With the current ramp, the parallel scorer in
`lib/research/candidateRamps.ts` reproduces every month's conditions and both scores exactly.

51 signal quarters, 2012Q1–2024Q3. Twenty are tight, from two episodes: 2018Q4–2020Q4 and
2022Q1–2024Q3. All twenty are Freezing or Stormy; nine also have funding pressure above 70.

## P1

`Δ` is the mean forward growth after tight readings minus after the rest, in log points (−0.062 is
about 6% lower year-over-year growth). Intervals are 95%, circular block bootstrap, block length
8, 10,000 resamples, seed 20261009; 19 resamples had no tight or no non-tight quarter and were
discarded.

| Outcome | Δ | 95% interval | Declines after tight | After the rest | Base rate | Hit-rate difference (95%) |
| --- | --- | --- | --- | --- | --- | --- |
| Deal value | −0.062 | −0.430 to 0.271 | 40% (8 of 20) | 19% | 27% | +0.21 (−0.16 to 0.61) |
| Deal count | −0.052 | −0.182 to 0.093 | 65% (13 of 20) | 29% | 43% | +0.36 (−0.05 to 0.72) |

Tight readings were followed by weaker fundraising and by more declines than the base rate, on
both outcomes, but neither mean difference is distinguishable from zero. Verdict: **not
supported**.

By horizon (reported, no verdict):

| Horizon | Δ value (95%) | Δ count (95%) |
| --- | --- | --- |
| s+2 | −0.193 (−0.575 to 0.163) | −0.090 (−0.226 to 0.049) |
| s+3 | −0.076 (−0.468 to 0.269) | −0.056 (−0.189 to 0.096) |
| s+4 | +0.081 (−0.300 to 0.424) | −0.012 (−0.146 to 0.160) |

The difference shrinks with the horizon and, for deal value, reverses by s+4.

## P2

Spearman correlation between the score at the quarter-end and forward growth. Skill is
`−ρ` for funding pressure and `+ρ` for risk appetite; `D` is funding pressure's skill minus risk
appetite's. 16 resamples in which a score was constant (no rank correlation exists) were discarded.

| Outcome | Funding pressure skill | Risk appetite skill | D | 95% interval | Verdict |
| --- | --- | --- | --- | --- | --- |
| Deal value | 0.00 | 0.16 | −0.16 | −0.52 to 0.05 | no detectable difference |
| Deal count | 0.36 | 0.46 | −0.11 | −0.35 to 0.10 | no detectable difference |

The unbounded pressure (`tightnessPressure`) in place of the published score gives `D` of −0.14
and −0.09, the same verdicts. The two scores are not independent: risk appetite is the curve
slope less the VIX adjustments, and the slope also drives funding pressure's inversion term.

### Lead and lag

Spearman `ρ(score at s, growth at s+k)`, all quarters with a mature outcome:

| k | n | Funding pressure, value | Funding pressure, count | Risk appetite, value | Risk appetite, count |
| --- | --- | --- | --- | --- | --- |
| −4 | 59 | −0.16 | −0.33 | 0.01 | 0.29 |
| −2 | 57 | −0.26 | −0.45 | 0.24 | 0.46 |
| 0 | 55 | −0.22 | −0.55 | 0.30 | 0.63 |
| +1 | 54 | −0.19 | −0.54 | 0.36 | 0.62 |
| +2 | 53 | −0.10 | −0.48 | 0.25 | 0.54 |
| +3 | 52 | 0.04 | −0.32 | 0.17 | 0.44 |
| +4 | 51 | 0.09 | −0.21 | 0.04 | 0.27 |
| +6 | 49 | 0.21 | −0.03 | −0.18 | 0.01 |
| +8 | 47 | 0.25 | −0.04 | −0.28 | −0.10 |

Both scores track deal count most closely in the same quarter and the next one; the correlation
falls by more than half by four quarters ahead and is near zero by six. For deal value, funding pressure turns
positive from three quarters ahead: the 2023–2024 tight readings were followed by the 2025–2026
rise in deal value. These are point estimates on overlapping, autocorrelated quarters.

## P3

Not testable: n = 0. The live basis exists only for the weekly briefs published since 2026, and
none has an outcome two quarters later. It is first evaluated, as registered, when eight
quarter-ends have both bases and first-published outcomes, which is not before 2029.

## Sensitivity analyses

Registered in §6.5; none carries a verdict.

| Variant | n | Δ value (95%) | Δ count (95%) | Reading of P1 under this variant |
| --- | --- | --- | --- | --- |
| First-published vintage | 25 | −0.035 (−0.313 to 0.175) | −0.177 (−0.263 to −0.105) | partly supported |
| Block length 4 | 51 | −0.062 (−0.410 to 0.266) | −0.052 (−0.176 to 0.087) | not supported |
| Block length 12 | 51 | −0.062 (−0.297 to 0.193) | −0.052 (−0.165 to 0.075) | not supported |
| Funding pressure above 70 only (9 tight) | 51 | −0.044 (−0.575 to 0.316) | −0.111 (−0.245 to −0.033) | partly supported |
| Freezing or Stormy only | 51 | identical to the primary: all 20 tight quarters are Freezing or Stormy | | not supported |
| Including immature quarters | 55 | +0.001 (−0.361 to 0.308) | −0.049 (−0.167 to 0.078) | not supported |

Two variants show a deal-count decline with an interval below zero. Both lean on the same
2022–2024 quarters, and the first-published variant lost 2,404 of 10,000 resamples to empty groups
at n = 25, so its interval is less reliable than it looks. Under the first-published vintage, P2's
deal-count difference also favours risk appetite (`D` −0.30, −0.67 to −0.01).

## Candidate ramps

All four ramps scored on the same 177 month-ends, each replayed through the unchanged state
machine.

| Ramp | Saturation | Score at 100 | Changes in conditions | Tight quarters | Premise score | Gain on current | Beats current (share of resamples) | Dislocation: month-ends | Debt ceilings | Combined |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C0 current (3.5–4.0%) | 21.5% | 12.4% | 7 (0.48/yr) | 20 | 0.057 | — | — | 0.82 | 1.76 | 1.29 |
| C1 wide (2.0–5.5%) | 5.1% | 11.9% | 5 (0.34/yr) | 20 | 0.057 | 0.000 | 0% | 0.84 | 3.45 | 2.14 |
| C2 ten-year percentile | 15.8% | 11.3% | 8 (0.55/yr) | 24 | 0.017 | −0.040 | 3% | 2.24 | 0.89 | 1.56 |
| C3 bill median on the current ramp | 20.3% | 12.4% | 6 (0.41/yr) | 20 | 0.057 | 0.000 | 0% | 1.11 | 0.00 | 0.56 |

Saturation is the share of month-ends at which a 25-basis-point rise in the input would not raise
the rate points, in the upper half of the range. Dislocation is the mean rate points a ramp moves
on the part of a bill move the federal funds rate did not share.

Per debt-ceiling window, mean (maximum) rate points: 2013, zero for every ramp (bills near zero);
2021, zero except C2 at 0.79 (14); 2023, C0 5.92 (90), C1 11.60 (34), C2 1.73 (8), C3 0 (0).

### The decision rule

| Condition (§9) | C1 wide | C2 percentile | C3 bill median |
| --- | --- | --- | --- |
| Premise: gain ≥ 0.05, beats current in ≥ 80% of resamples, both Δ negative | fails (gain 0) | fails (gain −0.040) | fails (gain 0) |
| Saturation at most half of C0's (≤ 10.7%) | passes (5.1%) | fails (15.8%) | fails (20.3%) |
| At most 10 changes in conditions | passes (5) | passes (8) | passes (6) |
| Dislocation ≤ 0.75 × C0's (≤ 0.97) | fails (2.14) | fails (1.56) | passes (0.56) |
| **Switch?** | no | no | no |

No candidate passes all four, so the current ramp stays.

### What the comparison found

- **The ramp barely touches the premise test.** In the signal window every tight quarter is
  Freezing or Stormy, which risk appetite decides. C1 and C3 change funding pressure, but not one
  quarter-end's tight flag, so their premise score equals the current ramp's to the digit. A ramp
  change cannot earn the registered premise margin while risk appetite carries the tight reading.
- **The wide ramp fixes saturation and costs dislocation exposure.** It cuts the share of
  month-ends at the ceiling from 21.5% to 5.1% and changes conditions less often, but in 2023 the
  bill sat inside its range, so the debt-ceiling dislocation moved it on most days of the window.
- **The bill median removes the debt-ceiling exposure and little else.** It moved zero points in
  all three windows, because the three-month bill held up while the one-month bill fell, but its
  saturation is nearly the current ramp's.
- **The percentile ramp reads the wrong episode as tight.** After a decade near zero, the 2.0–2.4%
  bills of 2018–2019 were ten-year highs, so it scored Cloudy from December 2017 and Freezing from
  December 2018; its premise score falls to 0.017.
- **The current ramp's dislocation risk is real.** On 2023-04-20 the one-month bill printed 3.40%
  with the federal funds rate at 4.83%: bills maturing before the June X-date were bid up. On the
  current ramp that reading scores 0 rate points where the policy rate implied 90, the
  non-monetary move the code comment in `lib/regimeEngineCore.ts` warns about. It fell between
  month-ends (April's closed at 4.35%), so no reading in the record carried it; a weekly reading
  that week would have.

## Deviations from the registration

1. **Sheet names.** The registration named the sheet "VC deal activity". Older releases name the
   same table "Deal Activity", "Deal activity" or (2019Q2 and 2019Q3) "Deal Flow x Stage & Qtr";
   the generator reads whichever holds the U.S. deal activity table, and the rows are the
   registered ones. Each release's sheet is recorded in the dataset.
2. **Release dates.** Recorded as each spreadsheet's internal last-saved timestamp, because the
   file dates on nvca.org were reset by a site migration in July 2024.
3. **Undefined resamples in P2.** The registration discards resamples with an empty group. A
   resample in which a score never varies has no rank correlation either; those 16 (P2) were
   discarded the same way and are counted above.
4. **The registered window is pinned in code.** The analysis and the rate-input validator read the
   177 month-ends through 2026-09-30 only, so the monthly cache refresh cannot move a registered
   number.
5. **The local model's tag.** The task named `qwen3-coder:30b-64k`; the check ran on
   `qwen3-coder:30b-128k`, the same weights with a longer context, because it was already loaded
   and loading a second copy evicts models other sessions are using. It was a cross-check, not
   the extractor.
6. **The record gained the Chicago Fed index after the first run.** The archive began scoring
   the Chicago Fed National Financial Conditions Index the same day (`docs/feature-specs-current.md`
   §1.1.67), and this test replays the archive's inputs, so it was rerun on the new record. One
   signal quarter moved: 2020Q1's funding pressure went from 0 to 2. Its tight flag, every
   condition, P1, the candidate table and the decision rule are unchanged. P2 and the lead-lag
   table moved: `D` went from −0.12 (−0.49 to 0.14) to −0.16 (−0.52 to 0.05) for deal value and
   from −0.08 (−0.34 to 0.17) to −0.11 (−0.35 to 0.10) for deal count, both verdicts the same, and
   the discarded constant-score resamples fell from 126 to 16. The first run's figures are in the
   commit that added this report.

## Limits

- **Small n, few episodes.** 51 signal quarters and two tight episodes. A null result was the
  expected outcome even if the premise is partly true, and the intervals are wide enough to hold
  a large effect as well as none.
- **In-sample.** The engine and all three candidates were written in 2026 with this period in view
  (registration §2). Agreement with history would not have been forecasting skill, and the lack of
  it is not proof the reading is useless to an operator.
- **Venture data has many causes.** The 2021 boom followed Sunny readings and ended in 2022;
  the 2025–2026 rise in deal value is concentrated in a few very large AI rounds; exits and fund
  cycles move both series. Rates are one cause among several.
- **Quarterly granularity.** Readings change weekly and are compared at quarter-ends.
- **Vintage.** The newest year is immature and excluded; the first-published check covers only
  2019Q2 onward and misses 2022Q3.
- **The dislocation measure counts anticipation.** It treats any bill move the federal funds rate
  did not share as non-monetary, so a bill that rises ahead of an announced hike (October 2022:
  +43 basis points before the November meeting) counts against the ramp that reads it.

## What happens next

The candidates are scored beside every weekly reading from now on (`OperatingSnapshot.shadowRamps`,
`docs/feature-specs-current.md` §1.1.68), the first record in which a candidate's reading exists
before its outcome. It is reviewed at eight quarter-ends with first-published outcomes. A
candidate that failed here can be reconsidered then only through a new registration.

## Reproducing

```bash
bun scripts/research/ventureFundraising.ts --check      # outcome data, offline
bun scripts/research/premiseTestRateInputs.ts --check   # rate inputs, offline
bun scripts/research/premiseTest.ts --check             # every number above
bun scripts/research/ventureFundraising.ts --write      # re-download the 29 releases and rebuild
```
