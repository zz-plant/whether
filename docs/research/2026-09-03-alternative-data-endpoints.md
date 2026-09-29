# Alternative data endpoints for the signal pipeline

**Date:** 2026-09-03 · **Skill:** `research-brief`

## Skill used + why

`research-brief`: the question is "what else could serve these series", which needs external
evidence about third-party interfaces, and the answer is a sourcing decision rather than an
implementation.

## Question and decision owner

**Question:** Which alternative endpoints could serve Whether's macro and capital series, and
which of today's five upstreams should be replaced?

**Decision owner:** repo owner — this changes the egress allowlist the scheduled routines depend
on, and the provenance claims `/history` and the weekly brief make.

**Time-sensitivity:** medium-high. Two of the five legs are undocumented interfaces that can
change without notice, and one of them has already caused a production incident (below). Nothing
is on fire today; nothing guarantees that holds.

## Executive summary

Five hosts, and **two of the five legs are not APIs at all**:

- `fred.stlouisfed.org/graph/fredgraph.csv` is the chart export behind FRED's graph page.
- `query1.finance.yahoo.com/v10/finance/quoteSummary/` is an internal endpoint of Yahoo's web
  app. Yahoo's public API was withdrawn in 2017 and never replaced.

Both work until they don't, and this repo has already paid once: `lib/treasury/treasuryClient.ts`
records `/current/all` answering **200 with a zero-byte body** — an empty object cached at the CDN
rather than an error — after which the client fell through to FRED, FRED refused the
Worker-originated request, and production served a June snapshot into late August.

Three findings, in descending value-per-unit-of-work:

1. **Treasury publishes a documented XML feed on the host already in the allowlist.** Swapping the
   undocumented CSV view export for it costs no new egress permission and no new dependency.
2. **The FRED chart export can be dropped entirely** in favour of `api.stlouisfed.org`, which the
   code already speaks (`fetchFredApiRows`). That removes an undocumented interface *and* takes the
   allowlist from five hosts to four.
3. **The market-data leg has no free official replacement.** Alpha Vantage's free tier is 25
   requests/day and the basket already uses 15. This one needs a budget decision, not a code change.

Two further findings, both negative and both worth recording so nobody spends a day on them:

- **The Fiscal Data API is not a yield-curve source.** Its interest-rate dataset is the average
  rate on the debt.
- **DFF is not part of the pipeline, but the product says it is.** The constant exists, nothing
  fetches it, no snapshot carries it — so the base rate is always the 1-month bill — while
  `TREASURY_SOURCE_LABEL` and the trust page's formula reference both name DFF as a source. That
  is a provenance defect rather than a sourcing one, and it is cheap to fix in either direction:
  fetch DFF, or stop claiming it.

## Evidence table

| # | Claim | Source | Type | Confidence |
| --- | --- | --- | --- | --- |
| 1 | Pipeline reaches 5 hosts: `fred.stlouisfed.org`, `api.stlouisfed.org`, `home.treasury.gov`, `query1.finance.yahoo.com`, `www.alphavantage.co` | repo grep; `docs/agents/lessons/automation-and-deploy-gate.md` egress list | primary | high |
| 2 | **10** series pulled: DGS1MO, DGS3MO, DGS2, DGS10, BAA10Y, BAMLH0A0HYM2, CPIAUCSL, UNRATE, NFCI, VIXCLS | `lib/ingestion/families.ts` | primary | high |
| 2b | **DFF is never fetched.** `TREASURY_ENDPOINTS.fedFunds` is declared but absent from the endpoints object the client actually builds, and no bundled snapshot carries a `fedFunds` value — so `getBaseRate`'s `"FED"` branch is unreachable and the base rate is always the 1-month bill | `lib/treasury/treasuryClient.ts:32,395-400`; `lib/regimeEngineCore.ts:238-248`; `grep fedFunds data/*.json` → no match | primary | high |
| 2c | Two user-facing strings nonetheless name DFF as a source: `TREASURY_SOURCE_LABEL` and the trust page's formula reference | `lib/regimeEngineCore.ts:160`; `app/trust/formulaReference.tsx:97-101` | primary | high |
| 3 | The "Treasury" client reads **4** rate series (DGS1MO, DGS3MO, DGS2, DGS10) from **FRED's chart export**, not Treasury | `lib/treasury/treasuryClient.ts:31-37,395-400` | primary | high |
| 4 | `/current/all` returned 200 + zero-byte body; fallback chain ended in a June snapshot served into late August | `lib/treasury/treasuryClient.ts:22-27` | primary | high |
| 5 | Treasury publishes a **documented** XML feed: base `home.treasury.gov`, path `/resource-center/data-chart-center/interest-rates/pages/xml`, params `?data=daily_treasury_yield_curve&field_tdr_date_value=YYYY`; values include `daily_treasury_yield_curve`, `daily_treasury_bill_rates`, `daily_treasury_long_term_rate`, `daily_treasury_real_yield_curve` | [Treasury Daily Interest Rate XML Feed](https://home.treasury.gov/treasury-daily-interest-rate-xml-feed) | primary (via search) | medium-high — see fallback note |
| 6 | Fiscal Data API's interest-rate dataset is `avg_interest_rates` (average rate on the debt), a different series from the par yield curve | [Fiscal Data API docs](https://fiscaldata.treasury.gov/api-documentation/) | primary (via search) | medium — absence of the curve is inferred, not stated |
| 7 | Par yields come from NY Fed quotations at ~3:30 PM ET each trading day | [Treasury Interest Rate Statistics](https://home.treasury.gov/policy-issues/financing-the-government/interest-rate-statistics) | primary (via search) | high |
| 8 | FRED API: ~120 req/min with a key; keyless materially lower; 429 on exceed; free self-service key | [FRED API guide](https://econindx.com/guides/getting-started-fred/) | secondary | medium |
| 9 | Yahoo's public API was shut down in 2017; no official API as of 2026; wrappers scrape internal endpoints that Yahoo can change, rate-limit or block without notice; 429s and multi-day IP blocks are routine | [edgeful](https://www.edgeful.com/blog/posts/yahoo-finance-api-alternatives), [Scrapfly](https://scrapfly.io/blog/posts/guide-to-yahoo-finance-api) | secondary | high — consistent across sources and with the repo's own note |
| 10 | Alpha Vantage free tier: 25 requests/day, 5/min. Premium from $49.99/mo removes the daily cap; real-time US equities start at $99.99 | [Alpha Vantage premium](https://www.alphavantage.co/premium/), [Macroption](https://www.macroption.com/alpha-vantage-api-limits/) | primary + secondary | high |
| 11 | The basket is 15 tickers and the code already targets that cap | `lib/saasMultiples.ts:21-22,147` | primary | high |
| 12 | SEC EDGAR (`data.sec.gov`): free, no key, User-Agent required, 10 req/s, CompanyFacts returns revenue and shares outstanding | [SEC EDGAR APIs](https://www.sec.gov/search-filings/edgar-application-programming-interfaces) | primary (via search) | high |
| 13 | DBnomics: free, no key, documented OpenAPI at `api.db.nomics.world/v22/`, mirrors FRED among other providers | [DBnomics Web API docs](https://docs.db.nomics.world/web-api/) | primary (via search) | medium-high |

## Implications for Whether

**Provenance is the product, and two legs can't carry it.** `docs/agents/data-and-platform.md`
requires explicit source URLs and forbids silent fallbacks. A chart-export CSV and a reverse-
engineered web endpoint can't be cited the way a documented feed can, and neither publishes a
change policy — so "the number moved because the endpoint changed shape" is indistinguishable from
"the number moved."

**The egress allowlist is the real operational constraint.** `docs/agents/lessons/automation-and-deploy-gate.md` records three routines all
reporting FAILED on `connect_rejected`. Every host is a permission that has to exist in every
environment. Dropping `fred.stlouisfed.org` is worth more than the code change suggests: it is one
fewer thing to get wrong per environment, and it retires an interface with no stability contract.

**Alpha Vantage is not headroom, it's a ceiling — and the basket does not pace itself against it.**
15 of 25 daily requests, and the basket cannot grow past 25 tickers without paying. But
`fetchSaaSValuations` issues all fifteen through one `Promise.all` with no throttling
(`lib/saasMultiples.ts:253-255`), deliberately, to bound edge request budget. Against a documented
5-requests/minute limit that is a burst three times the ceiling, and the failure is quiet: the
function throws only when *every* symbol is unavailable, so a run where most calls are declined
still computes a median — from whichever subset answered, with no record in the snapshot of how
many that was. For a product that publishes its sourcing, a median over an unknown subset is the
worse half of this finding; the daily cap is only the budget half. Any move here should add
throttling or record the responding-symbol count, not just buy more requests.

**Yahoo can't be fixed by finding a better free endpoint,** because there isn't one. SEC EDGAR is
official, free and keyless, but CompanyFacts carries revenue and shares outstanding and **not
price** — so it cannot produce EV/Revenue on its own. It is a genuine upgrade for the
revenue-growth half and a strong provenance anchor; it is not a Yahoo replacement.

## Recommended next actions

1. **Swap the Treasury CSV view for the documented XML feed.** Same host, no allowlist change, no
   new dependency. Verify the feed's shape against a live response first (blocked here — see
   fallback note), keep the year-scoping that the `/current/all` incident forced, and keep the CSV
   as fallback for one release. *Small, testable, highest value per unit of work.*
2. **Make `api.stlouisfed.org` primary for all ten series and retire the chart export.** The code
   already has `fetchFredApiRows` and key handling — but this is **not** mostly deleting a path.
   `fetchFredRows` catches an API failure and retries through the CSV export by design, so a
   revoked key degrades to the path the site ran on for years, and **without a key the CSV export
   is the only path** (`lib/fred.ts:389-419`). Retiring the chart host therefore costs a live
   fallback for all ten series and breaks keyless environments outright. So this action is
   conditional: it needs a key provisioned everywhere the pipeline runs *and* a replacement
   degradation path (the Treasury XML feed covers the four rate series; the other six would have
   none), or an explicit decision to accept the resilience loss. Confirm too whether the repo's
   "FRED refuses Worker-originated requests" note applies to the API host or only to the chart
   export.
3. **Put the market-data decision to the owner with numbers**, rather than changing code: pay Alpha
   Vantage $49.99/mo to remove the daily cap, or migrate the basket to Twelve Data / Finnhub / FMP.
   Either beats depending on an endpoint whose failure mode is a multi-day IP block.
4. **Do not migrate the yield curve to the Fiscal Data API.** Different series.
5. **Consider DBnomics only as a keyless fallback, not a primary.** It removes the key dependency
   but adds a third-party hop between Whether and the issuing institution, which is the wrong
   trade for a product that cites its sources.

## Open questions or unknowns

- Does FRED refuse Worker-originated requests on `api.stlouisfed.org`, or only on the chart export?
  The repo comment doesn't distinguish, and action 2 depends on the answer.
- Can hosts be added to the routine sandbox's allowlist at all, or is the policy fixed? If fixed,
  every recommendation that adds a host is dead and consolidation is the only lever.
- Does the XML feed carry the same columns the CSV parser expects, and does it have the same
  same-day publication time (~3:30 PM ET)?
- Is a third-party mirror (DBnomics) acceptable under the editorial guardrails, given `/history`
  shows sourcing to visitors?
- Was DFF meant to be fetched and lost along the way, or was the label written ahead of the
  implementation? The fix differs: restore the fetch, or correct two strings.
- How often does the Alpha Vantage path actually compute a median over a partial basket? Nothing
  in the snapshot records it today, so the honest answer is that nobody can tell from the data.

## Fallback note

**No endpoint in this brief was verified by calling it.** This sandbox's egress proxy denies all
five current hosts plus every candidate — `api.fiscaldata.treasury.gov`, `data.sec.gov`,
`markets.newyorkfed.org` all fail to connect, and `WebFetch` returns `EGRESS_BLOCKED`. That is the
same policy the scheduled routines hit, so it is evidence about the constraint, but it means
endpoint URLs, parameter names and response shapes here come from documentation quoted in search
results rather than from a response I saw.

Treat every URL as needing one live confirmation before code is written against it. The claim most
worth confirming first is #5 (the XML feed's exact parameters), because action 1 rests on it, and
the claim most likely to be wrong is #6, where the *absence* of the yield curve from the Fiscal
Data API is inferred from what its documentation lists rather than from an explicit statement.
