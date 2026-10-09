# Does investor advice move with conditions? Pre-registration

**Status:** registered 2026-10-09, before any in-window post was fetched for its text, embedded or classified.
**Repository:** `zz-plant/whether`, branch `concepts/advice-corpus`. This file is the branch's first commit; the pipeline, data, validation and results follow in later commits, so the order can be checked in `git log`.
**Deviations** from anything below go in §11 with a reason and a date. The text above §11 is not edited after this commit.

## 1. Question

Does the advice venture investors publish for founders move with the two conditions Whether measures: **funding pressure** (how hard money is to raise, 0–100) and **risk appetite** (how willing investors are to take risk, 0–100)?

The curated `/concepts` list (branch `concepts/advice-moves-with-conditions`) tags famous essays and memos by hand. Famous examples are chosen after the fact, so a list of them cannot tell a pattern from a selection. This study reads every dated post from a fixed set of archives, labels each one with a rule written down here first, and tests stated predictions.

**What the design cannot show.** It measures association in time, not cause. Rate cycles coincided with other shocks (COVID in 2020, the AI boom from 2023), so a shift in advice that lines up with funding pressure may answer one of those instead. The firms are a convenience sample of archives that are still online (survivorship), they write for different readers, and they change what they publish for reasons of their own (a new content team, a podcast replacing a blog). Funding pressure on the record is close to a step: 0 in almost every month from January 2012 to April 2022, above its line from July 2022 to November 2025, below it from December 2025 to August 2026, above it again in September 2026. Most of the funding-pressure contrast is therefore one long era against another, and any era effect is a candidate explanation.

## 2. The record

Monthly month-end readings from `getTimeMachineRegimeSeries()` (`lib/timeMachine/timeMachineCache.ts`), the series the site's history page publishes, as of commit `5a494e9c` (177 months, January 2012 to September 2026).

- `FP_t`: funding pressure at the end of month *t*. **Above its line** means `FP_t > 70`, the engine's rule (`lib/regimeEngineCore.ts`).
- `RA_t`: risk appetite at the end of month *t*. **Above its line** means `RA_t > 50`.
- Funding pressure crosses its line upward in **2022-07** (71 at that month-end) and **2026-09**, and downward in **2025-12**.
- The seven changes in conditions on the record (the month the published conditions changed):

| Month | From | To |
| --- | --- | --- |
| 2018-12 | Sunny | Stormy |
| 2021-03 | Stormy | Sunny |
| 2022-03 | Sunny | Stormy |
| 2022-09 | Stormy | Freezing |
| 2025-05 | Freezing | Cloudy |
| 2025-12 | Cloudy | Sunny |
| 2026-09 | Sunny | Cloudy |

A post published in calendar month *m* is paired with the month-end reading of *m* (lag 0). If the record is revised before the analysis runs, the analysis uses the record at the analysis commit and the results say what moved.

## 3. Sources

### 3.1 Registered sources

Twelve archives from ten firms. The **firm** is the weighting unit (§6.1): Paul Graham's essays and the YC blog are Y Combinator; AVC and usv.com are Union Square Ventures. Index counts are what enumeration returned on 2026-10-09, before window filtering and exclusions.

| Source | Firm | How it is enumerated | Indexed |
| --- | --- | --- | --- |
| a16z articles | Andreessen Horowitz | the `post-sitemap*.xml` files in `a16z.com/sitemap_index.xml`; each page fetched | 732 (dates on the page) |
| Sequoia articles | Sequoia Capital | `/article/` URLs in `sequoiacap.com/sitemap.xml`; each page fetched | 341 |
| Y Combinator blog | Y Combinator | `ycombinator.com/blog?page=N`, whose listing carries each post's HTML | 2,309 (2012: 222 … 2026: 6) |
| Paul Graham essays | Y Combinator | `paulgraham.com/articles.html`; each essay fetched and dated by its own "Month YYYY" line | 234 (all years) |
| First Round Review | First Round Capital | `review.firstround.com/sitemap-posts.xml`; each page fetched | 992 |
| Bessemer Atlas and memos | Bessemer Venture Partners | `/atlas/` and `/memos/` URLs in `bvp.com/sitemap.xml`; each page fetched | 358 |
| Greylock Greymatter | Greylock Partners | WordPress REST API, excluding the Portfolio News, Firm News and Press categories | 155 (2017–2025) |
| NFX | NFX | `/post/` URLs in `nfx.com/sitemap.xml`; each page fetched | 452 |
| USV writing | Union Square Ventures | `/writing/` URLs in `usv.com/sitemap.xml`; each page fetched | 612 |
| AVC (Fred Wilson) | Union Square Ventures | WordPress REST API at avc.com to May 2024, then `avc.xyz/sitemap.xml` | 3,556 + 88 |
| Above the Crowd (Bill Gurley) | Benchmark | WordPress REST API | 39 |
| Tomasz Tunguz | Tomasz Tunguz (Redpoint, then Theory Ventures) | `tomtunguz.com/post/page/N/` for date and URL; each post fetched | 1,884 |

Coverage is uneven, and the analysis is built for it rather than around it: AVC posted daily until 2020 and rarely after; the YC blog thins after 2018; Greylock's archive starts in 2017; a16z's live archive is mostly recent. The Wayback Machine is not used: every registered archive is live, and the rule is to use it only for an archive that is gone.

### 3.2 Considered and dropped

- **Both Sides of the Table (Mark Suster).** Moved to Medium, which answers HTTP 403 to a client that identifies itself honestly. The study does not disguise its User-Agent, and the archive is not gone.
- **Craft Ventures / David Sacks.** No dated archive spans the period: craftventures.com publishes no blog index or sitemap, and Sacks's Substack holds about 30 posts, all from 2023 on.

### 3.3 How sources are read

- robots.txt is read first on every host and obeyed (RFC 9309 longest-match; a Crawl-delay longer than one second is honoured).
- At most one request per second per host, through one queue per host; hosts run in parallel.
- User-Agent: `WhetherAdviceCorpus/1.0 (+https://whether.work/concepts; a dated corpus of public investor advice, read at most once a second per host)`.
- Sitemaps, listing pages and public APIs before page-by-page crawling.
- Raw responses and extracted text are cached under `.cache/advice-corpus/` (gitignored). **No post text is committed.** Committed files carry derived metadata only: URL, title, firm, source, author, publication month, labels, confidence, model, prompt version, and an evidence quote of at most 15 words.
- Greylock's robots.txt carries a Content-Signal of `ai-train=no`. Nothing here trains a model; the local model reads each post once to label it, and no text leaves the machine.

### 3.4 Inclusion and exclusions

A post is **in the corpus** when it comes from a registered source, was published January 2012 to September 2026, and survives these exclusions, applied in order and counted:

- **E1.** Published outside the window, or no publication month can be read from the index or the page.
- **E2.** Fewer than 150 words of extracted text (link posts, videos, image posts, failed extraction).
- **E3.** An investment, portfolio or hiring announcement, by title: it starts with "Partnering with", "Why we invested", "Why we're investing", "Why we are investing", "Our investment in", "Investing in", "Welcome", "Welcoming", "Introducing", "Announcing" or "Congratulations"; or it contains "joins"/"joining"/"join" followed by a registered firm's name (or "us", "the team"); or "we're hiring" / "we are hiring".
- **E4.** A duplicate: the same title (lower-cased, letters and digits only) twice within one firm; the earliest is kept.

## 4. Classification rubric

### 4.1 Fields

Every classified post gets:

- `capital_relevant` (boolean): a substantial part of the post (its main point, or at least a full paragraph) is about money decisions at a startup or the market for startup capital.
- `audience`: `founders` (founders, operators, executives, portfolio companies, startup employees), `lps` (limited partners, fund managers, other investors, or running funds), or `general`.
- `stance`: what the post tells founders to do about their company.
  - **expand**: tells founders to grow faster: hire or spend ahead of revenue, raise more to accelerate, take bigger or more bets, or put growth ahead of efficiency.
  - **conserve**: tells founders to protect cash: cut or hold spending, slow or freeze hiring, extend runway, reach profitability, raise to survive rather than to accelerate, or put efficiency ahead of growth.
  - **craft**: teaches a method (product, hiring practice, sales, management, how to run a fundraise) without telling founders to speed up or slow down their spending.
  - **none**: gives founders no advice at all.
- `metrics_named`: from a closed list of fourteen (Appendix A), in three families for H5: **growth** (growth_rate, valuation_multiple, users_or_gmv), **efficiency** (burn_multiple, cac_payback, rule_of_40, runway, burn_rate, gross_margin, profitability, unit_economics, magic_number) and **neutral** (arr, net_retention).
- `confidence`: high, medium or low (the model's own).
- `evidence`: a verbatim quote of at most 15 words supporting the stance; empty for none.

The three stance definitions are exported once, from `lib/adviceStance.ts`. The curated `/concepts` work had not exported definitions when this was registered; the two are to be reconciled there.

### 4.2 The prompt

The full system prompt is Appendix A, version `advice-v1`, SHA-256 `25c4fbe489e16438083193c329466f1cf492d970a959529b52c90b0a674f488a`. A test holds the code's prompt to a hash registered in this file, so the prompt cannot change without a registered version.

**Blinding.** The model sees the title and the text only: not the date, the firm, the author or the source. Its input is the first 1,100 words, then up to four 60-word windows around capital terms later in the post (Appendix B), so a long essay's money section is not cut off.

**Registered post-processing.** (1) An expand or conserve stance makes the post capital-relevant (rule 5 of the prompt). (2) A metric is kept only if the model names it **and** its registered words appear in the model's input (Appendix A), which stops a model listing the whole vocabulary. (3) The evidence quote is clipped to 15 words and checked for being verbatim; the check is reported, not used to drop labels.

### 4.3 Model and settings

- **Local model for every label in the corpus:** `qwen3-coder:30b-128k` (Ollama 0.32.9, digest `8ce1b59142878523d442db4da92113b01e3cb1ffd8b413217907eea67b362446`), through Ollama's `/api/chat` with the JSON schema as structured output, temperature 0, seed 42, at most 400 output tokens, at most two requests in flight. A request sends no context size or keep-alive, so it never reloads or evicts a model another session holds.
- One retry at temperature 0.3 when an answer does not parse; a second failure is recorded as a failure and the post is left unlabelled.
- **Local model for the prefilter's embeddings:** `nomic-embed-text` (digest `0a109f422b47e3a30ba2b10eca18548e944e8a23073ee3f3e947efcf3c45e59f`).
- **Frontier judgment** (the agent that wrote this study) is used for the rubric, the validation labels and the analysis, and for nothing in the bulk labelling.

### 4.4 Pilot, before registration

The prompt was piloted on 44 posts from **outside** the window (Paul Graham essays from 2001–2011 and AVC posts from 2007, 2008 and late 2011). Four revisions followed, each recorded here: the model under-used craft for short how-to posts (rule 6 added); it listed the whole metric vocabulary for one post (the "explicitly mentions" wording and post-processing rule 2 added); it called a runway framework craft (rule 4 now gives a framework the direction it serves); it called a personal essay about owning less "conserve" (the stance line now says "about their company"). After the fourth revision the same runway framework still came back as craft, so borderline framework posts are a known weak point and the validation will show how weak. No in-window post was labelled before this registration.

## 5. Prefilter

Local compute is budgeted at about three hours, so the local model reads a subset chosen by a cheap two-part score, plus a random sample of the rest to measure what the cheap score misses.

1. **Keywords.** `kw` = matches of the capital-term lexicon (Appendix B) per 1,000 words of text.
2. **Embeddings.** `emb` = the highest cosine similarity between the post (`search_document: ` + title + first 300 words) and six anchors (`search_query: ` + each anchor, Appendix B).
3. **Score** = the mean of the post's percentile rank on `kw` and on `emb`, across the corpus.
4. **Candidates:** the top *K* posts by score, with *K* = min(⌊0.30·N⌋, ⌊(2,600 − 0.1·N)/0.9⌋), where *N* is the corpus size after exclusions. The second term keeps the total number of model calls near 2,600.
5. **Sample:** a simple random 10% of the non-candidates (seed 20261009), classified exactly as candidates are.

**Miss rate.** The share of sampled non-candidates labelled capital-relevant (Wilson 95% interval) estimates how many capital-relevant posts the prefilter dropped; with the candidates' own count it gives the prefilter's recall. The hand-labelled non-candidates in §7 check the same number against frontier labels.

**Weights.** Primary analyses use candidates only. Analyses over all posts (H4, R3, R5) weight a candidate 1 and a sampled non-candidate 10, the inverse of its sampling probability, so the sample stands for the non-candidates it was drawn from.

## 6. Analysis plan

### 6.1 Sets, series and weighting

- **Eligible set (primary):** corpus posts classified as `capital_relevant` and addressed to `founders`, candidates only.
- **Firm weighting.** A period's share of a stance is the mean, over firms with at least one eligible post in the period, of each firm's own share. Every firm present counts once, so one prolific writer cannot outweigh a firm that posts quarterly.
- **Monthly and quarterly series** (descriptive, D1): firm-weighted expand, conserve, craft and none shares among eligible posts, with counts of posts and firms per period. The quarterly series is what `/concepts` draws.
- **Net stance:** `net_t` = expand share − conserve share, monthly, firm-weighted.
- Months with fewer than 3 eligible posts are missing in the correlations.
- **Uncertainty:** a moving-block bootstrap over months (blocks of 12 months, 2,000 replicates, seed 20261012) for every interval; a circular-shift permutation (the stance series rotated 12 to 165 months against the record, all 154 shifts) for every p-value, one-sided in the predicted direction. Both keep the months' serial dependence.
- **Multiplicity:** H1–H3 p-values are reported raw and Holm-adjusted.

### 6.2 Hypotheses, statistics and what counts against each

**H1. Among capital-relevant posts addressed to founders, the share prescribing expansion is lower in months when funding pressure is above its line.**
Statistic: the firm-matched difference Δ₁ = mean over firms with at least 3 eligible posts in both sets of (firm's expand share in months with FP > 70 − its share in months with FP ≤ 70). Every firm is compared with itself, so the firms' different start dates cannot move it.
Supported if Δ₁ < 0, its 95% interval lies below 0, and the permutation p < 0.05. **Counts against** if Δ₁ ≥ 0. Inconclusive if Δ₁ < 0 and the interval includes 0. Not testable if fewer than 4 firms qualify.

**H2. The share prescribing conservation rises after funding pressure crosses its line upward, with a lag of 0–12 months.**
For lag *L* = 0…12: Δ₂(L) = firm-weighted conserve share over months [c+L, c+L+11] − the share over [c−12, c−1], with c = 2022-07. Lag estimate *L\** = argmax Δ₂(L).
Null: the same maximum statistic at every pseudo-crossing month c′ from 2013-01 to 2020-07, where funding pressure is at or below its line from c′−12 to c′+23; p = (1 + #{null ≥ observed}) / (1 + number of pseudo-crossings). This accounts for searching thirteen lags.
Supported if Δ₂(*L\**) > 0, p < 0.05 and the bootstrap interval of Δ₂(*L\**) (re-estimating *L\** in every replicate) lies above 0. **Counts against** if the largest Δ₂ over the thirteen lags is ≤ 0. Inconclusive otherwise. *L\** is reported with its bootstrap interval; *L\** = 0 means the rise came without a lag, which counts against the "with a lag" half.
Only one upward crossing has a year of posts after it; the 2026-09 crossing has none. The test is therefore one event against a null of ordinary months, and the result says so.
Secondary, descriptive: lags −12…−1 (advice leading the crossing), the cross-correlation of conserve share with the above-line indicator at lags 0–12, and the downward crossing at 2025-12.

**H3. Net stance tracks funding pressure more closely than risk appetite.**
For each score, the predicted-direction correlation at its best lag in 0–12: R_FP = max_L −corr(net_t, FP_{t−L}); R_RA = max_L corr(net_t, RA_{t−L}). Statistic D₃ = R_FP − R_RA.
Supported if D₃ > 0 and its bootstrap interval (best lags re-selected in every replicate) lies above 0. **Counts against** if D₃ < 0 and the interval lies below 0. Inconclusive otherwise. Also reported: both correlations at lag 0 with permutation p-values, and the standardised coefficients of `net_t ~ FP_t + RA_t`.
Because funding pressure is nearly a step (§1), R_FP mostly measures a before-and-after-2022 contrast and R_RA a month-to-month one. The comparison is of two kinds of driver, and is read that way.

**H4. The share of craft posts does not move with either score.**
Over all classified posts addressed to founders, with the prefilter weights of §5: the firm-matched difference in craft share between FP > 70 and FP ≤ 70 months, and between RA > 50 and RA ≤ 50 months.
Supported if **both** 95% intervals lie within ±5 percentage points. **Counts against** if either interval excludes 0 with a point estimate of 5 points or more in magnitude. Inconclusive otherwise (a wide interval is not evidence of no movement).

**H5 (exploratory). The metrics firms emphasise shift with conditions.**
Among eligible posts that name at least one metric: the firm-matched difference (FP > 70 − FP ≤ 70) in the share naming an efficiency metric and in the share naming a growth metric, and the share naming each of growth_rate, valuation_multiple, burn_multiple, cac_payback and rule_of_40 by year. Reported with intervals, no verdict threshold, labelled exploratory.

### 6.3 Event windows

For each of the seven changes in §2: firm-weighted expand and conserve shares in the 6 months before (c−6…c−1) and the 6 months from the change (c…c+5), with bootstrap intervals. The 2026-09 change has no after-window. Descriptive; the seven are not independent tests.

### 6.4 Base rates

Counts of posts at every stage (indexed, in window, each exclusion, corpus, candidates, sample, classified, eligible), by firm and by year; the share of each stance and audience overall and by firm; the share of months above each line.

### 6.5 Robustness, for H1–H3

- **R1** unweighted: post-level shares, no firm weighting.
- **R2** without the firm with the most eligible posts.
- **R3** all founder-addressed posts, not only capital-relevant ones, with the prefilter weights.
- **R4** quarterly instead of monthly series for H3's correlations (lags in quarters, 0–4).
- **R5** the eligible set plus the sampled non-candidates, weighted 10.
- **R6** high- and medium-confidence labels only.

A hypothesis whose verdict changes under a robustness check is reported with that check named.

## 7. Validation

- **Hand labels.** A sample of 160 classified posts, drawn with seed 20261010: 60 at random from the candidates, 40 at random from the sampled non-candidates, and 60 more candidates stratified by the model's stance (20 each of expand, conserve and craft, or all of a class if it has fewer). The frontier reviewer labels each with this rubric, reading the same input the model read, **without** the model's labels, the date or the firm.
- **Agreement.** Cohen's kappa and a confusion matrix for `stance`, `capital_relevant` and `audience`, over all 160 and over the 100 drawn at random; agreement on whether an efficiency metric and a growth metric are named.
- **Threshold.** If stance kappa over all 160 is below **0.6**, the rubric is revised, every post is re-classified under the new version, agreement is re-scored on the same 160 and on 50 fresh posts (to check the revision did not just fit the sample), and the revision is recorded in §11.
- **Prefilter.** The miss rate of §5, from the model's labels on all sampled non-candidates and from the 40 hand-labelled ones.
- **Spot check.** `docs/research/advice-corpus-spotcheck.csv`: 40 classified posts at random (seed 20261011) with URL, labels and evidence, for the owner to audit by hand.

## 8. Outputs

- `data/advice-corpus/posts.json`: derived metadata for every classified post (no text).
- `data/advice-corpus/monthly.json`: the monthly and quarterly series, generated from `posts.json` by a script with a `--check` mode that a test runs, so the committed series cannot drift from the committed labels.
- `docs/research/advice-corpus-results.md`: every number above with its interval and a plain verdict per hypothesis, including those that fail.
- A short section on `/concepts`: the quarterly expand and conserve shares against funding pressure, with the change months marked and a screen-reader table, stating the measured result and its limits and linking here and to the results.

## 9. Stopping rules

Fetching stops when every source's index has been read once; there is no second pass to find more posts after seeing results. Classification stops when every selected post has a label or a recorded failure. The analysis runs once on the final labels; anything run after that is labelled post hoc.

## 10. What would make this study wrong

Beyond the limits in §1: extraction may miss text on some pages (counted by E2); the local model may read stance differently from a person (measured in §7); the prefilter may drop capital posts unevenly across firms or years (the sample measures the average, not every cell); and a firm's tone may follow its own fundraising cycle rather than the market's.

## 11. Deviations

None at registration. Each entry below gives its date and whether any label or result existed when it was made.

- **D1 (2026-10-09, before any in-window post was classified).** The H2 interval and the event-window intervals (§6.3) resample posts within each month (2,000 replicates, seed 20261012) instead of using the 12-month block bootstrap of §6.1. Those statistics compare fixed 12- or 6-month windows around one date, and a 12-month block drawn from a 12-month window is the window itself, so the block bootstrap cannot vary them. The within-month resampling measures label noise given the months, not serial dependence. H2's test is still the pseudo-crossing p-value, which is unchanged.
- **D2 (2026-10-09, before any in-window post was classified).** §6.1 Holm-adjusts "H1–H3 p-values", but H3's registered statistic has an interval and no single p-value. The Holm set is H1's permutation p, H2's pseudo-crossing p and the permutation p of R_FP (that net stance tracks funding pressure at all).
- **D3 (2026-10-09, before any in-window post was classified; extraction details, not protocol).** Greylock's REST API returned an empty body for every post (its pages are built with a page builder), so each Greylock post's page was fetched for its text; enumeration is unchanged. Sixty Sequoia articles carry their date only in a `<time datetime>` element, which the extractor now reads after JSON-LD and meta tags. Bessemer's 19 investment memos show only the date the page was posted, not the date of the memo, so they stay undated and fall under E1, as do two Atlas posts with no date on the page.
- **D4 (2026-10-09, after the first labelling and its validation, before any analysis was run).** Stance agreement under `advice-v1` missed the registered bar: Cohen's kappa 0.571 over the 160 (70.6% agreement; 0.586 over the 100 drawn at random), so the rubric was revised as §7 requires. Capital relevance agreed at kappa 0.463 and audience at 0.664. The disagreements had four shapes, and each became a rule in `advice-v2` (Appendix A2): the model called growth tactics and round-sizing advice expand when the reviewer called them craft (11 posts; new rule 4, and rule 2 now names sizing a round to the next milestone as craft); it read market reports ("companies are cutting burn") as advice (9; rule 1 now says so); it called interviews, profiles and storytelling or leadership advice none (14; rule 7 now names them as craft); and it tied capital relevance to stance, marking craft and none posts about term sheets, spending benchmarks or venture-market data as not about money (30 of the 40 capital disagreements; the field now says it is independent of the stance). The three stance definitions are unchanged. Every one of the 2,599 posts was labelled again under `advice-v2`; the `advice-v1` labels stay in the local cache and are not used. The reviewer's 160 labels are unchanged: they were made under `advice-v1`'s wording, which `advice-v2` clarifies rather than redefines. Because the new rules were written from those 160, agreement is also scored on 50 fresh posts drawn at random from the classified posts outside the 160 (seed 20261013), labelled blind under `advice-v2`'s wording. Registered now, before the re-labelling finished: there is no third version. If stance kappa under `advice-v2` is still below 0.6, the analysis runs on `advice-v2` and every verdict is reported as resting on labels below the registered bar.
- **D5 (2026-10-09, same time as D4).** The reviewer's instructions differed in one detail between batches: the first 100 random items were labelled with the metric word table as guidance, the 60 stratified and 50 fresh items with an instruction to apply it literally. Only the exploratory H5 uses metrics, so the stance and capital results are unaffected; metric agreement is reported per batch.
- **D6 (2026-10-09, same time as D4).** The 100 random validation items were drawn from the prefilter's selection while the first labelling was still running, so the reviewer could start; the registered draw, run once every post had a label, produced the same 100 posts.
- **D7 (2026-10-09, during the `advice-v2` labelling; no analysis run).** §4.3 says a request sends no context size, "so it never reloads or evicts a model another session holds". That was wrong. A request with no context size asks for the model's default (131,072 tokens a slot), so whenever another session had the model loaded with a smaller context, Ollama reloaded it: the resident context changed from 16,384 to 131,072 tokens a slot during the pilot, most likely because of it, and during the `advice-v2` run the two sessions' requests made Ollama reload twice and then stall for about twenty minutes, in which four requests timed out. From then on each request sends the context size the resident copy was loaded with (4,096 tokens a slot at the time) and waits whenever the model is not resident, so the study no longer reloads anyone's model. Every input fits in 4,096: the longest prompt is about 3,400 tokens, with up to 400 for the answer, and each record from then on carries the prompt's token count. The four timed-out posts were labelled on the resumed run. A label does not depend on the context size it ran in.
---

## Appendix A. System prompt `advice-v1`

SHA-256 `25c4fbe489e16438083193c329466f1cf492d970a959529b52c90b0a674f488a`.

```text
You label blog posts and essays written by venture investors. Read the post and answer with one JSON object.

Fields:
- capital_relevant (boolean): true when a substantial part of the post (its main point, or at least a full paragraph) is about money decisions at a startup or the market for startup capital: fundraising timing, amount, valuation or terms; burn, runway or spending; hiring pace or headcount; growth targets against efficiency; profitability; layoffs; venture or public markets as they bear on startups. False for product, culture, management, technology theses, policy or personal posts that do not dwell on money.
- audience: "founders" when the post is addressed to founders, operators, executives, portfolio companies or startup employees; "lps" when it is addressed to investors (limited partners, fund managers, other VCs) or is about running or investing in funds; "general" when it is for the public, policymakers or readers at large.
- stance: what the post tells founders to do about their company. Advice about personal life, possessions or personal finances is none.
  - "expand": Tells founders to grow faster: hire or spend ahead of revenue, raise more to accelerate, take bigger or more bets, or put growth ahead of efficiency.
  - "conserve": Tells founders to protect cash: cut or hold spending, slow or freeze hiring, extend runway, reach profitability, raise to survive rather than to accelerate, or put efficiency ahead of growth.
  - "craft": Teaches a method (product, hiring practice, sales, management, how to run a fundraise) without telling founders to speed up or slow down their spending.
  - "none": gives founders no advice at all: news, portfolio or hiring announcements, market or policy commentary that prescribes nothing, personal essays, or advice only for investors.
- metrics_named: the business metrics the post explicitly mentions, from this list only: growth_rate, valuation_multiple, users_or_gmv, arr, net_retention, burn_multiple, cac_payback, rule_of_40, runway, burn_rate, gross_margin, profitability, unit_economics, magic_number. Most posts mention none or one or two; never list a metric the text does not mention. Use [] when it names none.
- evidence: a verbatim quote from the post of at most 15 words that best supports the stance. Use "" when the stance is none.
- confidence: "high", "medium" or "low": how sure you are of the stance.

Rules for the stance:
1. Judge what the post tells founders to do, not what it describes. A post that only reports that valuations fell is none unless it says what to do about it.
2. Raising money: raising to accelerate, or raising as much as possible while money is easy, is expand; raising to extend runway or survive is conserve; how to run a raise (pitching, process, terms) is craft.
3. Hiring: hiring ahead or faster is expand; freezing, slowing or cutting is conserve; how to interview, recruit or onboard is craft.
4. If the post weighs both directions, choose the one it recommends on balance. A framework or checklist takes the direction it serves: one for cutting burn or extending runway is conserve, one for accelerating is expand. Only a post that recommends neither direction and offers a way to decide is craft.
5. Expand and conserve are advice about money, so a post with either stance is capital_relevant.
6. Any concrete how-to advice to founders or operators (management, product, hiring practice, marketing, sales, productivity, working with a board, running a fundraise) is craft, however short. Use none only when the post gives founders no advice at all.
7. Ignore anything you know about when the post was written or what markets did afterwards. Judge only the text given.
```

Metric words (a named metric stands only if one of these appears in the model's input; case-insensitive):

| Metric | Words |
| --- | --- |
| growth_rate | growth rate(s); grow/growth/growing (at) N%; month-over-month; year-over-year; YoY; MoM; T2D3; triple, triple |
| valuation_multiple | multiple(s); N× revenue/ARR/sales/forward |
| users_or_gmv | GMV; gross merchandise; DAU/MAU; daily/monthly active; user(s) |
| arr | ARR; annual(ized) recurring revenue; recurring revenue |
| net_retention | net (revenue/dollar) retention; NRR; NDR |
| burn_multiple | burn multiple |
| cac_payback | payback |
| rule_of_40 | rule of 40 / forty |
| runway | runway |
| burn_rate | burn rate; burn(ing) cash/money/through; monthly burn; net burn; cash burn |
| gross_margin | gross margin(s) |
| profitability | profitab…; EBITDA; free cash flow; break-even; operating margin; net income; cash flow positive |
| unit_economics | unit economics; CAC; LTV; lifetime value; customer acquisition cost; contribution margin |
| magic_number | magic number |

## Appendix B. Prefilter lexicon and anchors

Capital-term lexicon (regular expressions, case-insensitive, whole words): `fundrais\w*`, raise money, raising money, raise capital, raising capital, runway, burn rate, burn multiple, burning cash, cash burn, `valuations?`, `down rounds?`, `up rounds?`, `bridge rounds?`, `term sheets?`, `series [abcd]`, `seed rounds?`, venture capital / funding / market, `layoffs?`, laid off, headcount, hiring plan, hire ahead, `profitab\w*`, default alive, `capital efficien\w*`, efficient growth, growth at all costs, `blitzscal\w*`, rule of 40, payback, unit economics, `gross margins?`, `revenue multiples?`, `arr multiples?`, `growth rates?`, cut costs, cost cutting, spend(ing) less, extend (your) runway, downturn, recession, `frugal\w*`, dilution, `ipos?`.

Embedding anchors:

1. Advice to startup founders on fundraising: when to raise, how much to raise, valuation and dilution.
2. Advice to founders on burn rate, runway and cutting costs to survive a downturn.
3. Advice to founders to grow fast, hire ahead, spend aggressively and raise big rounds to win the market.
4. Advice to founders on profitability, capital efficiency, burn multiple, payback and the Rule of 40.
5. How the venture capital market and startup valuations are changing and what it means for founders.
6. Advice on hiring plans, headcount growth, layoffs and how fast a startup should scale its team.

## Appendix A2. System prompt `advice-v2` (deviation D4)

SHA-256 `6cc6c1d6962d583cdcfc671037e321aa6131d4cfb87337e70237a92c00baf071`. Field definitions for expand, conserve and craft are unchanged from `advice-v1`; the capital-relevance definition, the none definition and the stance rules changed.

```text
You label blog posts and essays written by venture investors. Read the post and answer with one JSON object.

Fields:
- capital_relevant (boolean): true when a substantial part of the post (its main point, or at least a full paragraph) is about money at a startup or the market for startup capital: fundraising timing, amount, valuation or terms (term sheets, SAFEs, pro rata, dilution, option pools); burn, runway or spending, including benchmarks of what to spend; hiring pace, headcount or compensation; growth targets against efficiency; profitability; layoffs; venture or public markets as they bear on startups. This field is independent of the stance: a craft post on how to run a fundraise, a spending benchmark, a term-sheet explainer or a post of venture-market data that prescribes nothing is still capital_relevant. False for posts that do not spend a paragraph on money.
- audience: "founders" when the post is addressed to founders, operators, executives, portfolio companies or startup employees; "lps" when it is addressed to investors (limited partners, fund managers, other VCs) or is about running or investing in funds; "general" when it is for the public, policymakers or readers at large.
- stance: what the post tells founders to do about their company. Advice about personal life, possessions or personal finances is none.
  - "expand": Tells founders to grow faster: hire or spend ahead of revenue, raise more to accelerate, take bigger or more bets, or put growth ahead of efficiency.
  - "conserve": Tells founders to protect cash: cut or hold spending, slow or freeze hiring, extend runway, reach profitability, raise to survive rather than to accelerate, or put efficiency ahead of growth.
  - "craft": Teaches a method (product, hiring practice, sales, management, how to run a fundraise) without telling founders to speed up or slow down their spending.
  - "none": gives founders no advice at all: news, portfolio or hiring announcements, a company's results, market or policy commentary that prescribes nothing, personal essays, or advice only for investors.
- metrics_named: the business metrics the post explicitly mentions, from this list only: growth_rate, valuation_multiple, users_or_gmv, arr, net_retention, burn_multiple, cac_payback, rule_of_40, runway, burn_rate, gross_margin, profitability, unit_economics, magic_number. Most posts mention none or one or two; never list a metric the text does not mention. Use [] when it names none.
- evidence: a verbatim quote from the post of at most 15 words that best supports the stance. Use "" when the stance is none.
- confidence: "high", "medium" or "low": how sure you are of the stance.

Rules for the stance:
1. Judge what the post tells founders to do, not what it describes. Reporting what companies or investors are doing (raising bigger rounds, cutting burn, growing fast), market data, valuation analysis and forecasts are none unless the post also tells the reader what to do; advice usually says should, must, need to, don't, or recommends. A company's announcement of its own growth is none.
2. Raising money: raising more than the plan needs in order to accelerate, or raising as much as possible while money is easy, is expand; raising to extend runway or survive is conserve; how to run a raise (pitching, process, terms, sizing a round to reach the next milestone) is craft.
3. Hiring: hiring ahead or faster is expand; freezing, slowing or cutting is conserve; how to interview, recruit, onboard or structure a team is craft.
4. Growth: expand needs money or headcount: spend more, hire ahead, take bigger or more bets, or put growth ahead of efficiency. Advice on how to grow (marketing, sales, customer success, product, pricing, retention) that asks for no extra spending or headcount is craft.
5. If the post weighs both directions, choose the one it recommends on balance. A framework or checklist takes the direction it serves: one for cutting burn or extending runway is conserve, one for accelerating is expand. Only a post that recommends neither direction and offers a way to decide is craft.
6. Expand and conserve are advice about money, so a post with either stance is capital_relevant.
7. Any concrete how-to advice to founders or operators is craft, however short: management, leadership, product, hiring practice, marketing, sales, storytelling, culture, careers, productivity, working with a board, running a fundraise. Interviews, profiles, case studies and Q&As that pass on lessons founders can use are craft. Use none only when the post gives founders no advice at all.
8. Ignore anything you know about when the post was written or what markets did afterwards. Judge only the text given.
```
