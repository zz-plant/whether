# Does investor advice move with conditions? Results

**Run:** the registered analysis (`bun run advice-corpus:analyze`), once, on `data/advice-corpus/posts.json` (prompt `advice-v2`) and the month-end record as merged from main on 2026-10-09. Protocol and deviations D1–D7: `docs/research/advice-corpus-preregistration.md`.
**Labels:** every post was labelled by the local model `qwen3-coder:30b-128k` through Ollama. The validation labels, the rubric and this analysis are the frontier reviewer's (the agent that wrote the study).
**Read this first:** the local model's stance labels did not reach the registered agreement bar (kappa 0.6) under either prompt version. As registered in D4, the analysis ran anyway, and every verdict below rests on labels below the bar.

## Verdicts

| | Prediction | Statistic | Result | Verdict |
| --- | --- | --- | --- | --- |
| H1 | Expand share lower when funding pressure is above 70 | Firm-matched difference, 7 firms | **+9.6 pts** (95% CI −3.6 to +34.7), p 0.74 | **Counts against.** The point estimate is the wrong sign. |
| H2 | Conserve share rises 0–12 months after the July 2022 crossing | Largest Δ over 13 lags | **−7.3 pts at lag 3** (CI −26.3 to +27.2), p 0.93 against 91 quiet months | **Counts against.** Every lag shows a fall, not a rise. |
| H3 | Net stance tracks funding pressure more closely than risk appetite | R_FP − R_RA | **−0.235** (CI −0.468 to −0.033) | **Counts against**, but for a reason the prediction did not anticipate: net stance moved *with* funding pressure (r +0.22 at lag 0), the wrong direction, and not at all with risk appetite (best r +0.02). |
| H4 | Craft share does not move with either score | Firm-matched differences, ±5-pt margin | FP **−5.1 pts** (CI −12.3 to +3.1); RA **+3.4 pts** (CI −5.0 to +11.3) | **Inconclusive.** Neither interval excludes 0; neither fits inside ±5. |
| H5 | Metrics shift with conditions (exploratory) | Firm-matched differences among posts naming a metric | Efficiency **−10.8 pts** (CI −28.4 to +6.8); growth **−7.0 pts** (CI −27.7 to +10.7); 5 firms | **No shift detected**; too few firms to say more. |

Holm-adjusted p-values (D2's set: H1, H2, and R_FP's permutation p): 1.00, 1.00, 1.00.

**In one sentence:** in ten firms' archives, the advice the local model read as "grow faster" did not become rarer, and the advice it read as "protect cash" did not become commoner, after funding pressure crossed its line in July 2022; if anything both moved the other way, and the labels are not reliable enough to say more than that the registered predictions were not borne out.

## 1. The corpus

| Source | Indexed | In window | E2 short | E3 announcement | E4 duplicate | Corpus | Candidates | Sampled | Classified | Eligible |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| a16z articles | 732 | 718 | 18 | 22 | 1 | 677 | 110 | 59 | 169 | 29 |
| Sequoia articles | 341 | 337 | 3 | 122 | 1 | 211 | 20 | 20 | 40 | 3 |
| Y Combinator blog | 2,309 | 2,307 | 776 | 60 | 4 | 1,467 | 182 | 135 | 317 | 39 |
| Paul Graham essays | 234 | 97 | 3 | 0 | 0 | 94 | 15 | 7 | 22 | 6 |
| First Round Review | 992 | 991 | 87 | 2 | 0 | 902 | 298 | 67 | 364 | 39 |
| Bessemer Atlas and memos | 358 | 331 | 1 | 2 | 0 | 328 | 106 | 22 | 128 | 23 |
| Greylock Greymatter | 155 | 155 | 4 | 1 | 0 | 150 | 38 | 12 | 50 | 8 |
| NFX | 452 | 452 | 47 | 7 | 1 | 397 | 153 | 23 | 176 | 38 |
| USV writing | 612 | 404 | 20 | 36 | 31 | 317 | 33 | 30 | 63 | 4 |
| AVC (Fred Wilson) | 3,556 | 3,556 | 1,126 | 8 | 60 | 2,362 | 308 | 197 | 505 | 57 |
| Above the Crowd (Bill Gurley) | 39 | 39 | 0 | 1 | 0 | 38 | 8 | 3 | 11 | 2 |
| Tomasz Tunguz | 1,885 | 1,880 | 28 | 13 | 5 | 1,834 | 642 | 111 | 753 | 159 |
| **All** | **11,665** | **11,267** | **2,113** | **274** | **103** | **8,777** | **1,913** | **686** | **2,598** | **407** |

"In window" counts posts extracted with a month from January 2012 to September 2026; the 398 others were outside it, undated (Bessemer's investment memos, two Atlas posts, four Paul Graham pages that are not essays) or unreachable (four pages). Duplicates (E4) are judged within a firm, so AVC posts cross-posted to usv.com count once. "Eligible" is the primary set: candidates labelled capital-relevant and addressed to founders. One selected post timed out twice and is unlabelled, as §4.3 registers.

Coverage is uneven. Tunguz contributes 159 of the 407 eligible posts and AVC 57; Sequoia, Benchmark and Greylock contribute 13 between them. Firm weighting (each firm present in a period counts once) is what stops Tunguz from deciding the result; R2 drops him.

Eligible posts by year: 2012 9 · 2013 21 · 2014 36 · 2015 40 · 2016 43 · 2017 33 · 2018 17 · 2019 33 · 2020 33 · 2021 23 · 2022 36 · 2023 32 · 2024 13 · 2025 27 · 2026 11.

## 2. Labelling

- **Model and settings:** `qwen3-coder:30b-128k` (Ollama 0.32.9), temperature 0, seed 42, JSON-schema output, title and text only (no date, firm or author).
- **Prompts:** `advice-v1` labelled every post first; validation forced `advice-v2` (D4), which labelled every post again. Only `advice-v2` labels are analysed.
- **Compute:** pilot 44 posts (2 min a run, four runs), embeddings for 8,777 posts in 3 minutes, `advice-v1` 135 minutes of wall time for 2,599 posts, `advice-v2` about six hours of wall time, most of it queued behind another session's long generations on the same two model slots (D7). Summed request time was 4.5 hours for `advice-v1` and 11.7 hours for `advice-v2`, the second inflated by the same queueing. The local compute budget of about three hours was exceeded because the registered revision doubled the labelling and the machine was shared.
- **Failures:** none under `advice-v1`; one post under `advice-v2` (timed out twice). The model reported "high" confidence for every post, so robustness check R6 (drop low-confidence labels) is identical to the primary analysis and tells nothing.
- **Evidence quotes:** 851 of 875 quotes (97%) appear verbatim in the model's input. The longest prompt the model read was 3,630 tokens, inside every context it ran in.

## 3. Agreement with a careful reader

The reviewer labelled 160 posts blind to the model, the date and the firm (60 random candidates, 40 random sampled non-candidates, 20 each of the model's expand, conserve and craft), and 50 fresh random posts after the revision.

| Field | `advice-v1`, 160 | `advice-v2`, 160 | `advice-v2`, random 100 | `advice-v2`, fresh 50 |
| --- | ---: | ---: | ---: | ---: |
| Stance | 0.571 (70.6%) | **0.523** (66.9%) | 0.506 (72.0%) | 0.419 (70.0%) |
| Capital relevance | 0.463 | 0.605 | 0.480 | 0.410 |
| Audience | 0.664 | 0.731 | 0.697 | 0.658 |
| Efficiency metric named | 0.709 | 0.676 | 0.542 | 0.408 |
| Growth metric named | 0.475 | 0.496 | 0.532 | 0.779 |

Cohen's kappa (raw agreement in brackets). The registered bar was 0.6 on stance over the 160.

Stance under `advice-v2`, all 160 (rows: reviewer; columns: model):

| | expand | conserve | craft | none |
| --- | ---: | ---: | ---: | ---: |
| expand | 8 | 0 | 1 | 1 |
| conserve | 1 | 17 | 0 | 0 |
| craft | 10 | 4 | 35 | 24 |
| none | 5 | 3 | 4 | 47 |

What this means for the hypotheses. When the reviewer saw expand or conserve, the model mostly agreed (8 of 10, 17 of 18). The reverse is weaker: of the 24 posts the model called **expand**, the reviewer called 8 expand and 10 craft, so the model's expand pile is roughly one-third expansion advice and the rest mostly growth tactics; of its 24 **conserve**, 17 were conserve. The revision fixed capital relevance (0.463 → 0.605) and the reading of market reports, and made the craft/none boundary worse (24 craft posts called none). H1 counts the expand pile, so its noise matters most there.

**Prefilter.** The model called 29 of the 685 sampled non-candidates capital-relevant (4.2%, Wilson 95% CI 3.0–6.0%); the reviewer called 3 of 40. Scaled to the 6,864 non-candidates, about 290 capital-relevant posts were never read, against 470 found among the candidates: recall about 62% (53–70%). R5 adds the sampled non-candidates back at weight 10 and changes no verdict.

## 4. Base rates

- Months with funding pressure above 70: 24% of the record (42 of 177). Months with risk appetite above 50: 67%.
- Among the 407 eligible posts: expand 137, conserve 142, craft 81, none 47. Over all 2,598 classified posts: expand 163, conserve 152, craft 636, none 1,647. Audience: founders 1,565, investors 272, general 761.
- By funding-pressure era (eligible posts, firm-weighted):

| Months | Funding pressure | Posts | Firms | Expand | Conserve | Craft | None |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 2012-01 to 2022-06 | at or below 70 | 305 | 10 | 29.7% | 47.2% | 14.1% | 9.0% |
| 2022-07 to 2025-11 | above 70 | 90 | 8 | 39.2% | 40.0% | 16.8% | 4.1% |
| 2025-12 to 2026-08 | at or below 70 | 11 | 4 | 52.1% | 33.3% | 14.6% | 0.0% |
| 2026-09 | above 70 | 1 | 1 | – | – | – | – |

The high-pressure era has a third as many posts as the decade before it and two fewer firms (Sequoia's and Benchmark's eligible posts all predate it).

## 5. H1: expansion advice in high-pressure months

Seven firms had at least three eligible posts on both sides of the line. Their own expand shares, below the line → above it:

| Firm | Posts below | Expand | Conserve | Posts above | Expand | Conserve |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Andreessen Horowitz | 11 | 45% | 18% | 18 | 56% | 11% |
| Bessemer Venture Partners | 10 | 40% | 40% | 13 | 23% | 38% |
| First Round Capital | 21 | 19% | 52% | 18 | 28% | 22% |
| NFX | 27 | 41% | 19% | 11 | 82% | 18% |
| Tomasz Tunguz | 139 | 38% | 24% | 20 | 35% | 40% |
| Union Square Ventures | 56 | 11% | 66% | 5 | 40% | 40% |
| Y Combinator | 41 | 27% | 39% | 4 | 25% | 75% |

Mean of the seven differences: **+9.6 points** (block-bootstrap 95% CI −3.6 to +34.7; one-sided circular-shift p 0.74). Three firms moved the predicted way (Bessemer by 17 points; Tunguz and Y Combinator by 2 or 3), four the other way (a16z, First Round, NFX, USV). The registered rule says a point estimate at or above zero counts against H1.

## 6. H2: conservation advice after the crossing

Δ₂(L) = conserve share over the 12 months from July 2022 + L, minus the 12 months before July 2022:

| Lag (months) | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Δ₂ (pts) | −9.3 | −9.7 | −9.4 | **−7.3** | −7.3 | −7.8 | −9.8 | −16.6 | −23.0 | −29.5 | −39.2 | −36.4 | −33.4 |

The largest is −7.3 at lag 3 (within-month resampling CI −26.3 to +27.2; the lag's interval 0–6). Against the same statistic at 91 quiet months (2013-01 to 2020-07), p = 0.93. Every lag is a fall, so H2 counts against.

Secondary, descriptive: advice did not lead the crossing either (Δ for lags −12 to −1 runs from 0 to −10.5). The cross-correlation of the monthly conserve share with the above-line indicator is negative at every lag 0–12 (−0.17 to −0.38). After the downward crossing in December 2025 the conserve share *rose* (+5.8 to +9.2 points over lags 0–3), on 11 posts.

## 7. H3: which score

| | Best lag | Predicted-direction r | Permutation p |
| --- | ---: | ---: | ---: |
| Funding pressure (−r) | 0 | −0.217 | 0.90 |
| Risk appetite (+r) | 2 | +0.018 | 0.63 |

D₃ = −0.235 (CI −0.468 to −0.033). At lag 0, net stance (expand − conserve) correlates +0.22 with funding pressure and −0.05 with risk appetite; with both in one regression, the standardised coefficients are +0.34 (funding pressure) and +0.18 (risk appetite), over 63 months with at least three eligible posts. The registered rule calls D₃ below zero with its interval below zero a result against H3; the honest reading is that neither score tracks stance in the predicted direction, and funding pressure goes the wrong way. Because funding pressure is nearly a step, that is the H1 contrast again in another form.

## 8. H4: craft advice

Over all 1,565 founder-addressed posts with the prefilter weights, nine firms on each comparison: craft share in FP > 70 months minus the rest, −5.1 points (CI −12.3 to +3.1); RA > 50 months minus the rest, +3.4 points (CI −5.0 to +11.3). Correlation of the monthly craft share with each score at lag 0: +0.03 and −0.04. Nothing suggests craft moves with either score, but the intervals are too wide to show it does not; by the registered rule, inconclusive. The model's craft/none boundary is its weakest (§3), which widens these intervals.

## 9. H5 (exploratory): metrics

215 eligible posts name at least one metric. Among them, the firm-matched change in the share naming an efficiency metric when funding pressure is above 70 is −10.8 points (CI −28.4 to +6.8), and in the share naming a growth metric −7.0 points (CI −27.7 to +10.7), over five firms. By year, the share of eligible posts naming burn multiple is 0% to 2021 and 3–8% from 2022 to 2025; payback runs 0–19% with no trend; the Rule of 40 appears in at most 15% of a year's posts (2024, 13 posts). The burn multiple's arrival in 2022 is the one visible shift, and it is a new term's arrival as much as a change in emphasis.

| Year | Eligible | growth_rate | valuation_multiple | burn_multiple | cac_payback | rule_of_40 | any efficiency | any growth |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 2012 | 9 | 22% | 0% | 0% | 11% | 0% | 33% | 33% |
| 2013 | 21 | 5% | 10% | 0% | 5% | 0% | 43% | 14% |
| 2014 | 36 | 14% | 11% | 0% | 0% | 0% | 33% | 19% |
| 2015 | 40 | 10% | 15% | 0% | 5% | 0% | 45% | 30% |
| 2016 | 43 | 9% | 9% | 0% | 14% | 0% | 44% | 19% |
| 2017 | 33 | 9% | 15% | 0% | 15% | 3% | 33% | 18% |
| 2018 | 17 | 18% | 12% | 0% | 6% | 0% | 41% | 24% |
| 2019 | 33 | 15% | 9% | 0% | 6% | 0% | 33% | 18% |
| 2020 | 33 | 15% | 6% | 0% | 12% | 3% | 42% | 24% |
| 2021 | 23 | 4% | 22% | 0% | 9% | 0% | 30% | 26% |
| 2022 | 36 | 11% | 14% | 6% | 19% | 0% | 56% | 22% |
| 2023 | 32 | 16% | 19% | 3% | 9% | 6% | 47% | 28% |
| 2024 | 13 | 15% | 31% | 8% | 8% | 15% | 46% | 31% |
| 2025 | 27 | 4% | 11% | 7% | 4% | 0% | 37% | 15% |
| 2026 | 11 | 18% | 9% | 0% | 9% | 0% | 27% | 18% |

## 10. Event windows

Firm-weighted shares in the six months before each change and the six from it (posts before / after; change with its within-month resampling interval). Descriptive; the seven are not independent tests.

| Month | Change | Posts | Expand | Conserve |
| --- | --- | --- | --- | --- |
| 2018-12 | Sunny → Stormy | 9 / 16 | 25% → 19% (−6; −22 to +27) | 50% → 26% (−24; −47 to +18) |
| 2021-03 | Stormy → Sunny | 8 / 12 | 50% → 50% (0; −38 to +30) | 25% → 25% (0; −27 to +33) |
| 2022-03 | Sunny → Stormy | 12 / 17 | 42% → 29% (−13; −36 to +23) | 42% → 57% (+15; −16 to +42) |
| 2022-09 | Stormy → Freezing | 17 / 20 | 29% → 36% (+8; −30 to +25) | 57% → 41% (−16; −37 to +22) |
| 2025-05 | Freezing → Cloudy | 7 / 19 | 70% → 73% (+3; −28 to +23) | 20% → 8% (−12; −25 to +17) |
| 2025-12 | Cloudy → Sunny | 20 / 8 | 75% → 67% (−8; −28 to +13) | 8% → 25% (+18; +5 to +25) |
| 2026-09 | Sunny → Cloudy | 7 / 1 | one post after; not read | |

Only 2022-03 (into Stormy) moved both shares the predicted way, and its intervals span zero. The one interval that excludes zero (conserve up after the December 2025 move *into* Sunny) points the wrong way, on eight posts.

## 11. Robustness

| Check | Eligible | H1 Δ₁ (CI; p) | H2 best Δ₂ (lag; p) | H3 D₃ (CI) |
| --- | ---: | --- | --- | --- |
| Primary | 407 | +9.6 (−3.6 to +34.7; 0.74) | −7.3 (3; 0.93) | −0.235 (−0.468 to −0.033) |
| R1 unweighted | 407 | +10.4 (−3.4 to +25.8; 0.81) | −4.6 (0; 0.87) | −0.223 (−0.456 to −0.012) |
| R2 without Tunguz | 248 | +11.7 (−3.4 to +38.9; 0.75) | −10.9 (3; 0.98) | −0.388 (−0.786 to −0.112) |
| R3 all founder posts | 1,565 | +2.4 (−4.5 to +16.4; 0.69) | +4.3 (4; 0.73) | −0.089 (−0.214 to +0.076) |
| R4 quarterly (H3 only) | – | – | – | −0.172 (−0.312 to +0.138) |
| R5 with the sample | 436 | +8.2 (−18.3 to +29.1; 0.81) | +4.6 (6; 0.65) | −0.172 (−0.415 to +0.065) |
| R6 confident labels | 407 | identical to primary: every label is "high" | | |

No check supports H1 or H2. Under R3 and R5 the largest H2 difference turns slightly positive (+4.3, +4.6), which moves H2 from "counts against" to "inconclusive" under those checks; neither comes near significance (p 0.73, 0.65). Under R3, R4 and R5, H3's interval includes zero (inconclusive rather than against).

## 12. What this design cannot show

- **Cause.** Every number here is an association in time. Funding pressure rose above its line in July 2022, the year rates rose fastest in four decades and public software multiples fell by about half, and from 2023 AI drew a growing share of venture money; advice could be answering any of them. One upward crossing with a year of posts after it is one event, however many posts sit on either side.
- **Which firms.** The ten are the archives still online and dated. Firms that stopped writing, deleted their archives or never wrote are absent (survivorship), and two candidates were dropped before any text was read (Mark Suster's archive refuses honest clients; Craft and David Sacks have no archive that spans the period).
- **Who they write for.** A firm's blog is also its marketing. Advice to founders may follow the firm's own fundraising, its portfolio's needs or a new content team rather than the market. NFX's expand share rising from 41% to 82% is as likely to be what NFX chose to publish as what the market asked for.
- **Era, not month.** Funding pressure is close to a step on the record: 0 in nearly every month to April 2022, then above its line for 41 months. A test against it is mostly a test of one era against another, and the eras also differ in which firms post and how much (305 eligible posts in the decade below the line, 90 in the 41 months above it).
- **Labels.** The model's stance labels agree with the reviewer at kappa 0.52, below the registered 0.6, and its expand pile is about one-third expansion advice. A real shift of ten points in expansion advice could be hidden by that noise; a shift of the size the curated list suggests (a majority of capital texts on the "right" side) would have had to be very large to show through it.
- **The prefilter.** About 38% of capital-relevant posts were never read; the 10% sample estimates the average miss, not the miss in every firm or year.
- **The record changed slightly.** Merging main before the analysis moved funding pressure from 0 to 2 in March and April 2020; nothing else on the record changed, and no line crossing moved.

## 13. Reproduce

```sh
bun run advice-corpus:analyze          # every number above, as JSON (seeded; about 7 seconds)
bun run advice-corpus:validate -- --score
bun run advice-corpus:check            # monthly.json against posts.json
```

The fetch, extraction, prefilter and labelling stages (`advice-corpus:discover`, `:extract`, `:prefilter`, `:classify`) read the archives and the local model; their cache is not committed, by design.
