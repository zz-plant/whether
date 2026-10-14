# Do investors' dated predictions come true? Pre-registration

**Status:** registered 2026-10-13, before any in-window post was split into sentences, proposed or reviewed. This file is the first commit of branch `research/advice-predictions`.
**Repository:** `zz-plant/whether`. The extraction, data, validation and results follow in later commits, so `git log` shows the order.
**Deviations** from anything below go in §12 with a reason and a date. The text above §12 is not edited after the registration commit.

## 1. Question

When venture investors publishing for founders make a **dated, checkable claim** about the market (deal activity, interest rates, public tech stocks, market stress), how often does it come true, and does any firm do better than a forecaster with no insight?

The advice corpus study (`docs/research/advice-corpus-preregistration.md`, results in `docs/research/advice-corpus-results.md`) asked whether advice moves with conditions. It found no shift in the predicted direction, and its stance labels missed their agreement bar. This study asks a different question of the same posts. It does not label stance; it reads what investors said would happen, and checks it against what did.

**What the design can show.** For each firm, how many checkable claims it made, how many came true, and whether that beats a no-insight baseline on the same claims. It can also show whether claims are rare. That is the expected finding: most published advice is worded so that it cannot be wrong.

**What it cannot show.** Whether following a firm's *advice* helped founders: no outcome data for founders exists here. Whether a firm's investors are good at investing: a blog is not a fund's returns. Whether a firm "is right" in general: only the claims it put in writing, about the variables registered in §4, are scored. A firm that never makes a checkable claim gets no score, which is not a bad score.

## 2. Posts

The corpus of the advice corpus study, as committed on main in `data/advice-corpus/posts.json`: 8,777 posts from twelve archives at ten firms, January 2012 to September 2026, after that study's exclusions E1–E4. The firm is the unit, as there: Paul Graham's essays and the YC blog are Y Combinator; AVC and usv.com are Union Square Ventures.

All 8,777 are searched, not the 407 the corpus study found eligible. A prediction can appear in a post about anything, and the corpus study's capital and audience labels are not used here.

Text comes from the local cache the corpus study built (`.cache/advice-corpus/`, gitignored). No archive is fetched again. **No post text is committed**: committed files carry the post's URL, firm, author and month, and for each claim a quote of at most 15 words with the normalized fields of §4.

## 3. Finding the claims

### 3.1 Candidate sentences

Each post's text is split into sentences: single line breaks are joined first, because several archives wrap lines in the middle of a sentence, then the text is split at sentence-ending punctuation and at blank lines. A sentence is a **candidate** if it contains a forecast term and a market term (Appendix B) within 25 words of each other. A lexicon is cheaper and easier to audit than embeddings, and a missed sentence costs recall, which §7.1 measures.

### 3.2 The local model proposes, the reviewer decides

**Proposal.** Each candidate sentence goes to the local model with the sentence before it and the sentence after it, and the prompt in Appendix A (`predictions-v1`). The model fills in the fields of §4.1 and then decides whether the sentence is a claim: a statement, made or reported in the post, that something about the market will or will not happen. The schema asks for the verdict **last**, after the fields; in the pilot, a verdict asked for first contradicted the fields the model filled in after it.

**Decision.** The reviewer reads every sentence the model calls a claim, with the same two neighbouring sentences and without the model's verdict or fields, the date, the firm, the author or the title. It applies §4.3 and fills in §4.1 itself. **Only claims the reviewer confirms are counted or scored**, with the reviewer's fields. The local model's job is recall: to bring the few forecasts in 8,777 posts to a reader. In the pilot, three of the seven sentences it called claims were advice, a general truth or a quoted remark, so its verdict alone is not used. If the model calls more than 2,000 sentences claims, the reviewer decides a random 600 of them (seed 20261018) and the counts are estimated from that sample with intervals.

**Blinding.** Neither the model nor the reviewer sees the date, the firm, the author or the title. The date matters for scoring (§5), and a reader who saw it could lean on what happened next.

**Quote.** The committed quote is at most 15 words of the sentence, chosen by the reviewer to carry the forecast.

### 3.3 Model and settings

- **Local model for every extraction:** `qwen3-coder:30b-128k` on the owner's Ollama, through `/api/chat` with the JSON schema as structured output, temperature 0, seed 42, at most 300 output tokens, a context of 8,192 tokens, at most two requests in flight.
- **Shared machine.** The run waits while another session has a different model resident, and sends the same context size on every request. The corpus study's deviation D7 is why: a request with a different context size reloads a copy another session is using. The pilot waited about five hours for this reason.
- One retry at temperature 0.3 when an answer does not parse; a second failure is recorded, and the sentence is recorded as unjudged.
- **Frontier judgment** (the agent that writes the study) is the reviewer of §3.2 and §7, and writes the rubric and the analysis. It does not read candidate sentences the model rejected, except the recall sample of §7.1.
- **Budget.** The pilot found 30 candidate sentences in 44 posts at about 2 seconds each. At that rate, 8,777 posts give about 6,000 candidates and 3–4 hours of local compute. Over 8 hours, the run stops and the owner decides whether to continue.

## 4. What counts as a checkable claim

### 4.1 Fields

| Field | Values |
| --- | --- |
| `quote` | the claim in the author's words, at most 15 words |
| `variable` | one of the registered targets in §4.2, or `other` |
| `direction` | `up`, `down`, `above`, `below`, `no_change` |
| `threshold` | a number with its unit, if the claim names one ("below 2%", "half of 2021") |
| `horizon` | the deadline as the text gives it: a year ("by 2024"), a span ("over the next 12 months", "next year"), or `none` |
| `hedge` | `firm` ("will"), `hedged` ("likely", "probably", "I expect"), `possible` ("could", "might") |
| `condition` | the condition, if the claim has one ("if rates stay high, …") |
| `voice` | `author` or `reported` (someone else's forecast, quoted or summarized) |

### 4.2 Registered targets and how each is measured

| Target | Series | Source |
| --- | --- | --- |
| U.S. venture deal value | quarterly, $B | `data/research/venture-fundraising-quarterly.json` (PitchBook-NVCA, mature vintage) |
| U.S. venture deal count | quarterly | same |
| Federal funds rate | effective rate, monthly mean | FRED `DFF` |
| Short-term Treasury rates | 3-month bill, monthly mean | FRED `DGS3MO` |
| Long-term Treasury rates | 10-year yield, monthly mean | FRED `DGS10` |
| Public tech stocks | Nasdaq Composite, month-end | FRED `NASDAQCOM` |
| Market stress | VIX, monthly mean | FRED `VIXCLS` |
| Financial conditions | Chicago Fed NFCI, monthly mean | FRED `NFCI` |

Missing FRED values go through `isMissingFredValue` (`lib/fred.ts`), so a holiday is not read as a zero.

Startup valuations, exits and IPO counts, layoffs, fund sizes, private multiples and any named company are **not** registered targets: no public series with stable definitions covers 2012–2026 in this repository. Claims about them are counted as `other` and reported by topic, but not scored.

### 4.3 A claim is scored only if all hold

1. `voice` is `author`.
2. `variable` is a registered target.
3. `direction` is not null.
4. `horizon` resolves to a date (§5.1). A claim with no horizon is counted as **undated** and not scored. Undated claims are reported as their own figure, because "the market will turn" with no date is the unfalsifiable form this study expects to find.
5. If it has a `condition`, the condition is itself a registered target with a direction, and it was met by the deadline. A conditional claim whose condition was not met is **void**, not wrong.
6. Its deadline is on or before the last date its series covers: 2025Q3 for deal value and count (the newest mature quarter), August 2026 for FRED series. Later claims are **pending**, frozen in the data file and scored when their data matures (§10).

## 5. Scoring

### 5.1 Deadlines

The horizon is converted to a deadline using the post's month, by script, after extraction. "By 2024" is December 2024. "Next year" is December of the post's year plus one. "Over the next N months" is the post's month plus N. "This year" is December of the post's year. Quarterly targets use the quarter containing the deadline.

### 5.2 Outcomes

The script compares the target at the deadline with its value in the post's month (for deal data, the quarter before the post's quarter, the last one published when the post was written):

- `up` / `down`: the change has the claimed sign and is larger than a dead band: 5% for deal value, deal count, the Nasdaq and the VIX, and 25 basis points for rates. A smaller move is **unresolved**: neither right nor wrong, reported as its own count.
- `above` / `below` a threshold: the value at the deadline is on the claimed side.
- `no_change`: the move is inside the dead band.

No outcome is judged by a model or a person. Every claim's fields are fixed by the extraction and the reviewer's normalization (§7.2) before any outcome is computed, and the script reads only those fields.

### 5.3 The no-insight baselines

Being right about deal activity in 2023 took no foresight if it had already been falling for a year. A firm is scored against two forecasters that know only the past, on the **same claims**, the same deadlines and the same dead band:

- **Momentum.** The target moves the way it moved over the 12 months before the post.
- **Base rate.** The direction the target moved most often over all windows of the same length from 2002 to the month before the post. That uses the FRED series back to 2002. Deal data goes back only to 2010Q1, the earliest year-earlier quarter in the committed dataset, so for posts before 2013 the deal base rate rests on fewer than three years and is flagged.

**Skill** = the firm's hit rate − momentum's hit rate on the same claims. Skill is the primary figure; the base-rate comparison is reported beside it.

## 6. Hypotheses

**Q1. Checkable claims are rare.** Fewer than 1 scored claim per 100 corpus posts, and fewer than half the ten firms reach the ranking minimum of §6.4. Descriptive: reported with its counts. Undated claims are expected to outnumber dated ones.

**Q2. Pooled, the claims beat momentum.**
Statistic: pooled skill over every scored claim, firm-weighted (each firm's skill, averaged over firms with at least 3 scored claims), with a 95% interval from a bootstrap that resamples firms, then claims within firms (10,000 resamples, seed 20261014).
**Supported** if skill > 0 and its interval lies above 0. **Counts against** if skill ≤ 0. **Inconclusive** if skill > 0 and the interval includes 0.

**Q3. Firms differ.**
Statistic: the variance of firm-level skill across firms with at least 10 scored claims, against its distribution when claims are shuffled among those firms (10,000 permutations, seed 20261015).
**Supported** if p < 0.05 and at least 3 firms qualify. **Not testable** if fewer than 3 firms qualify. Otherwise **not supported**.

**Q4 (exploratory). Firm claims do better than hedged ones.** Hit rate and skill by `hedge`, with intervals, no verdict.

**Q5 (exploratory). Claims cluster near turning points.** The count of scored claims in the 6 months either side of each of the seven changes in conditions on the record, against the count in quiet months. Reported with no verdict.

### 6.4 When firms are ranked

A ranking of firms is published only if all of these hold:

1. The extraction meets its bars (§7.1 and §7.2).
2. Q3 is supported.
3. Each ranked firm has at least **10** scored claims.

Otherwise no ranking is published, on `/concepts` or anywhere. The results give each firm's scored, pending, void, unresolved and undated counts, its hit rate, its skill with an interval, and its claims, **in alphabetical order**, with a sentence saying why no ranking is drawn. A firm under 10 scored claims is shown with its counts only.

Authors are not ranked. Most archives have one main writer, so a firm's figure is largely that person's; the results name the authors, but the unit stays the firm.

## 7. Validation

### 7.1 Recall

Because the reviewer decides every claim the model proposes (§3.2), the model cannot add a false claim. It can still miss one, in two places, and both are measured.

- **The model.** 300 candidate sentences the model rejected, drawn at random (seed 20261016), read by the reviewer blind, as in §3.2. The share the reviewer calls claims is the model's miss rate, with a 95% Wilson interval.
- **The lexicon.** 100 posts with no candidate sentence, drawn at random (seed 20261019), read in full by the reviewer for any claim that passes §4.3 rules 1–3. The share with one is the lexicon's miss rate.

**Bar:** the model's miss rate among rejected candidates is below 5%, or the misses it implies are fewer than a quarter of the claims the reviewer confirms. Claims found in either sample are listed and **not** scored, so the scored set comes from one rule.

### 7.2 Normalizing claims

The reviewer's fields are the ones scored (§3.2). For every confirmed claim, the model's fields are compared with the reviewer's.

**Bar:** they agree on `variable` and `direction` together for at least 80% of confirmed claims, and on `horizon` for at least 80%. Disagreements are listed in the results. Both versions are scored, and a verdict that differs between them is reported as fragile.

### 7.3 If a bar is missed

One revision of the prompt is allowed, as the advice corpus study allowed (its D4). Every candidate sentence is proposed again, the reviewer decides the new proposals, and recall is rechecked on the same samples plus 100 fresh rejected candidates. If a bar is still missed, the analysis runs on the revised proposals, every verdict says it rests on extraction below the bar, and **no ranking is published** whatever Q3 shows.

### 7.4 The reviewer knows history

The frontier reviewer knows what happened in 2012–2026, and the local model may too. Withholding the date limits that knowledge, but does not remove it. The scoring rule is mechanical (§5.2), so knowing history can only bias how a claim is *read*, not how it is scored. Two checks: §7.2's agreement between the model's fields and the reviewer's, and a count of the reviewer's fields that differ from the model's in the direction that turned a claim right, against the direction that turned one wrong. A lopsided count is reported as a sign of bias.

## 8. Outputs

- `data/advice-predictions/claims.json`: every claim with its post URL, firm, author, month, quote (≤ 15 words), the model's fields, the reviewer's fields, its status (scored, pending, void, unresolved, undated, other, reported) and, for scored claims, the values at the post month and the deadline, the outcome and both baselines' outcomes.
- `docs/research/advice-predictions-results.md`: the counts at every stage, the agreement figures, Q1–Q5, the per-firm table and the deviations.
- `scripts/advice-predictions/`: the sentence splitter and lexicon, the proposals, the reviewer's decisions, scoring and analysis, with `--check` on the scoring and analysis, so every number reproduces offline from the committed claims and data.
- `/concepts`: one paragraph and the per-firm table in the "Every post, not the famous ones" section, after its existing text, only after the results are committed. Served documents go through `scripts/research/publishResearchDocs.ts`, as the other two studies' do, because the repository is private.

## 9. Stopping rules

- The study ends with the results file, whatever it shows. A null result is the expected result for Q2 and Q3, and is published the same way.
- No variable, dead band, baseline or ranking minimum is changed after any outcome is computed. Changes before then go in §12.
- If fewer than 30 claims are scored in total, Q2 and Q3 are reported as not testable, Q1 is reported, and the study stops there.

## 10. The forward record

Scoring past claims has a ceiling: few firms will reach 10 dated claims, and the reviewer's knowledge of history can never be fully removed. The forward record has neither problem, so it starts with this study and runs after it ends.

- **Each quarter**, starting with posts from October 2026, the twelve archives are read for new posts, and the same candidate sentences, proposals and review run. The new claims are committed, with their fields fixed, in a commit dated before any of their deadlines. The commit date is the proof that the claim was frozen before its outcome existed.
- Pending claims from §4.3 rule 6 join the forward record as they are.
- A claim is scored by the same script when its series covers its deadline.
- A firm's forward figure is first reported when it has 10 scored forward claims. Forward claims are scored apart from past ones, and they settle any disagreement between the two.
- The quarterly run is a scheduled job, which the owner sets up after the results are reviewed. Nothing in this study creates it.

## 11. What would make this study wrong

- **The lexicon or the model misses most claims.** §7.1 measures both. A combined miss rate above 50% is reported in the first paragraph of the results.
- **The model invents or bends claims.** The reviewer decides every claim and fills in its fields (§3.2), so the model's errors cannot reach the score; §7.2 reports how often the two differed.
- **The baselines are too weak.** Momentum and base rate are the simplest forecasters with no insight; a firm can beat them by repeating a consensus forecast published elsewhere. Skill here means "better than extrapolation", not "better than the consensus". No consensus series is registered, because none covers 2012–2026 for these targets in this repository.
- **The firms say different kinds of things.** One firm may write about rates and another about deal counts, which are not equally hard to call. Per-target hit rates for each firm are reported beside the pooled figure.
- **Survivorship.** The archives are the ones still online, and a firm can delete a post that aged badly. Deletion cannot be measured from what remains. The Wayback Machine is not used for past claims, as in the corpus study. The forward record keeps its own copy of each claim, so a later deletion cannot remove it.

## 12. Deviations

None at registration.

## Appendix A. System prompt `predictions-v1`

The user message is three lines: `BEFORE: <sentence>`, `SENTENCE: <sentence>`, `AFTER: <sentence>`. The response schema lists the fields in the order below, with `is_claim` last.

```
You read one SENTENCE from a post written by a venture investor, with the sentences BEFORE and
AFTER it for context. Decide whether the SENTENCE claims that something about the market WILL or
WILL NOT happen in the future. Judge the SENTENCE only; use BEFORE and AFTER only to understand it.

The market means: venture funding and deal activity, interest rates and the Federal Reserve,
public stock markets, volatility and market stress, financial conditions, and also startup
valuations, exits, IPOs, layoffs and fund sizes.

is_claim is false when the SENTENCE is:
- advice about what a founder or investor should do ("raise now", "cut burn"), even if it implies
  a forecast.
- a description of the present or the past ("funding is down 40%", "the IPO market was dead").
- a general truth with no time ("markets are cyclical"), or about how people usually behave
  ("VCs generally expect to help").
- a forecast about one company, a product or a person rather than the market.
- a question, or possibilities the author does not choose between.

First fill in these fields as if the SENTENCE were a claim, then decide is_claim:
- variable, from this list only:
  - deal_value: how much venture money is invested, or how easy it is to raise venture money.
  - deal_count: how many venture rounds or deals are done. NEVER IPOs, NEVER exits.
  - fed_funds: the Federal Reserve's policy rate.
  - short_rates: Treasury bills and other short-term rates.
  - long_rates: the 10-year Treasury and other long-term rates, mortgage rates.
  - tech_stocks: public stock prices, tech stocks, the Nasdaq, "the equity markets".
  - volatility: market volatility, the VIX, market stress.
  - financial_conditions: credit, lending, liquidity in the financial system.
  - other: anything else. IPOs, exits, startup valuations, layoffs and fund sizes are ALWAYS other.
- other_topic: if variable is other, a word or two for the topic; else null.
- direction: up, down, above, below, no_change, or null if the sentence does not say. "Hard to
  raise" is deal_value down; "suppress valuations in the equity markets" is tech_stocks down;
  "VC funds will be squeezed" is other (fund economics).
- threshold: a number with its unit if the sentence names one, else null.
- horizon: the deadline exactly as the sentence gives it ("by 2024", "next year", "over the next
  18 months", "in the next few years"). Vague timing ("for some time", "going forward",
  "eventually", "soon") is "none".
- hedge: firm (will, won't, going to), hedged (likely, probably, I expect, I think, I believe),
  possible (could, might, may).
- condition: the condition in the author's words if there is one ("if rates stay high"), else null.
- voice: author if the author makes the claim; reported if the sentence quotes or summarizes
  someone else's forecast.

Last, set is_claim: true if the SENTENCE is a forecast about the market by the author or reported by them, false if any rule above excludes it. A forecast about IPOs or exits is a claim, with variable other.
Do not use anything you know about what happened after the post was written.
```

### Pilot, before registration

Piloted on 2026-10-13 on the 44 out-of-window posts the corpus study piloted on (Paul Graham's essays from 2001–2011, AVC posts from 2007, 2008 and late 2011), on Ollama 0.40.3, which another session had installed that day; the corpus study ran on 0.32.9, and the model's digest is unchanged. No in-window post was searched or extracted. Four drafts:

1. **Whole post, every claim at once.** 10 claims from 2 posts. Present and past descriptions came back as claims ("few startups go public now", "the IPO market was practically dead"), IPO claims were filed under deal count, and a piece of advice ("let founders cash out partially in the Series A") came back as a claim.
2. **Whole post, with variable definitions and a check that each quote carries a future word and appears in the input.** One claim from one post. Precision was fixed and recall lost: the model missed "In the next few years, venture capital funds will find themselves squeezed" (Graham, 2005), "This is going to suppress valuations in the equity markets" (AVC, October 2008), and a quoted "more cash will be hard to come by" (AVC, October 2008).
3. **One sentence at a time, verdict first.** 23 candidate sentences. Graham's 2005 forecast and the equity-markets forecast were caught. The quoted forecast was not a candidate, because the archive wraps lines inside sentences and the splitter broke it in two. "I believe we will see a bunch of IPOs next year" came back as not a claim, with its fields (IPOs, next year, hedged) filled in, a contradiction of the verdict.
4. **One sentence at a time, wrapped lines joined, verdict last** (registered). 30 candidate sentences, 7 called claims. All four forecasts above were caught. Three of the seven were not forecasts: "just assume it's not going to happen" (advice), "The VCs who say they're going to invest in you aren't" (a general truth) and a VC's quoted "I don't know what we're going to do". And the quoted cash forecast was marked as the author's own. That is why the reviewer decides every proposed claim (§3.2) instead of the model.

## Appendix B. Lexicon

**Forecast terms** (case-insensitive, word boundaries): will, won't, going to, gonna, expect, expects, expected to, predict, predicts, prediction, forecast, bet, we'll see, likely to, unlikely to, next year, next quarter, this year, in the coming, over the next, within the next, by 20\d\d, in 20\d\d.

**Market terms:** funding, fundraising, venture, VC, VCs, valuation, valuations, multiple, multiples, rate, rates, interest rate, the Fed, Federal Reserve, inflation, recession, downturn, correction, bubble, IPO, IPOs, exit, exits, public market, public markets, the market, markets, stock, stocks, equity, equities, Nasdaq, S&P, volatility, VIX, deal, deals, round, rounds, down round, layoffs, credit, liquidity, cash, capital, money.

A sentence is a candidate when a forecast term and a market term occur within 25 words of each other in it.
