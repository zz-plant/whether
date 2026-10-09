# Data sourcing & platform readiness

## Data and provenance requirements
- Surface freshness (timestamp) and source metadata for fetched series.
- Distinguish live, snapshot-backed, and fallback/degraded source modes instead of collapsing all non-live data into one state.
- Prefer explicit source URLs in metadata objects and/or comments.
- Avoid silent fallbacks; return debuggable errors when data is missing.
- Keep snapshots/cache artifacts clearly named and documented in nearby docs.

## Platform readiness guidance
- Isolate external API calls behind small client interfaces.
- Refresh materialized signal models by per-signal cadence when they are missing or due, not only on cold start.
- Keep transform logic runtime-portable (Node today, edge/serverless-friendly tomorrow).
- Avoid Node-only APIs in shared logic unless intentionally server-only.

## FRED: API path and vintages

`lib/fred.ts` reads FRED two ways. Without a key it fetches the chart export
(`fredgraph.csv`), as it always has. With `FRED_API_KEY` (a Worker secret or an environment
variable) `fetchFredRows` asks the FRED API for JSON, and can ask for a **vintage**:
`fetchFredRows(fetcher, "UNRATE", { asOf: "2024-03-31" })` returns the series as it was known on
that date (ALFRED `realtime_start`/`realtime_end`). A vintage request without a key throws rather
than returning today's revision, because a revised number presented as what was known then is
the one provenance error this product cannot afford. An API failure on a non-vintage read falls
back to the CSV export with one redacted warning; the key never appears in a URL that is logged
or an error that is thrown.

The two paths mark a missing observation differently, and the CSV export changed its mark. The
API sends `"."`; the export used to, and now leaves the field empty. `isMissingFredValue` in
`lib/fred.ts` is the one guard, and every parser — the client's CSV and API readers and the
archive generators' shared `parseSeries` in `scripts/regimeArchiveContext.ts` — goes through it,
because `Number("")` is `0` and a parser that only checks for `"."` reads a market holiday as a
zero print. That is how seven month-end Treasury records shipped with every yield at 0, and ~160
holiday VIX closes sat at 0 in the veto's trailing mean, until 2026-09-14. A holiday stays in a
generator's series as a null point, so a period that ends on one resolves to the last real close.

Vintages are not yet stored. The time machine still reconstructs months from today's series;
the next step is a design note on carrying a vintage date per observation so `/history` can say
what a month's call was made on.

## Market data provider

`lib/saasMultiples.ts` computes the SaaS comps median (`/comps`, `/api/comps`, the `get_comps` tool)
from a chain of providers, each behind a small client in `lib/marketData/`. The first to read at
least half the basket answers, and the snapshot's `source` names it; that is the provider the page's
"As of [date], from [source]" line credits.

1. **Alpha Vantage** (`ALPHA_VANTAGE_API_KEY` set). OVERVIEW reports EV/Revenue and growth directly,
   but the free tier allows 5 requests a minute and 25 a day
   (`docs/research/2026-09-03-alternative-data-endpoints.md`), so it refuses most of a basket fetched
   at once and hands over to EDGAR. Unset in production.
2. **SEC EDGAR filings and Cboe delayed prices** (`sec-cboe`, the default). `secEdgar.ts` reads each
   company's XBRL company facts (`data.sec.gov/api/xbrl/companyfacts/CIK##########.json`, with a
   User-Agent naming the site and a contact, as SEC's fair-access policy asks) and derives trailing
   four-quarter revenue, latest-quarter growth year on year, cash with short-term investments, debt
   (convertible notes included, leases not) and shares outstanding. A fiscal fourth quarter is the
   10-K's year less its three quarters; a company whose latest quarter is more than 200 days old has
   stopped filing and reads as missing. `cboe.ts` prices each company from Cboe's public
   delayed-quote file (`cdn.cboe.com/api/global/delayed_quotes/quotes/<SYMBOL>.json`), no key.
   EV/Revenue is (price × shares + debt − cash) / trailing revenue. Checked against Yahoo's own
   figures on 2026-10-09: revenue, growth and cash matched for all fourteen companies, and the basket
   median was 8.9x on both.
3. **Yahoo Finance** (`yahoo.ts`). quoteSummary now answers 429 to a request without a browser user
   agent and 401 "Invalid Crumb" without a session, so the client mints one — the cookie
   `fc.yahoo.com` sets, then a crumb from `query2.finance.yahoo.com/v1/test/getcrumb` — caches it in
   KV for twelve hours, and on a 401 mints one fresh session and retries only the refused symbols.
   Market cap is Yahoo's `marketCap`, which covers every share class; `sharesOutstanding` counts one,
   which understated Atlassian by a third.

When no provider answers, `fetchSaaSValuations` throws `QuoteSourceUnavailableError` with each
provider's reason and `/api/comps` answers its documented 503. A provider that knows none of the
companies counts as down, not as an empty basket.

**Caches, all in `WHETHER_DURABLE_KV`.** The basket snapshot for an hour (`comps:basket:v1`), so the
page, the API and the tool share one upstream read; each company's derived filing figures for twelve
hours (`comps:sec:v1:<cik>`), not the multi-megabyte filing; the Yahoo session for twelve hours.
A refusal is never cached.

**Why not Yahoo first, and why not Stooq (checked 2026-10-09).** From a remote Worker session on
Cloudflare's network, EDGAR, Cboe and Yahoo's cookie-and-crumb flow all answered for the whole
basket; from a residential connection Yahoo refused the crumb itself with 429. Yahoo is unofficial
and blocks by address without notice, so it is the fallback. Stooq's CSV quote endpoint answers 404
and its history download now serves a JavaScript proof-of-work page, so it is not a source.

**The basket lost Confluent.** IBM's acquisition closed and Confluent deregistered (Form 15, March
2026); no provider had a quote for it, and the page was listing a company that no longer trades.

## Ingest coordinator (trial)

`worker/ingestCoordinator.ts` is a SQLite-backed Durable Object that owns the materialized
model, the refresh lock, and an hourly alarm that ingests due families. It replaces KV's
best-effort lock (two isolates can win the same expired lock) with real mutual exclusion and
moves refresh off the request path entirely. It is on for the preview lane only
(`WHETHER_INGEST_COORDINATOR=1`); `lib/ingestion/durableStorageStore.ts` is the store the object
runs against and `lib/ingestion/coordinatorStore.ts` the Worker-side client. Invariants 1, 1b,
and 1c describe the behavior it must keep.

## Regime history Workflow (trial)

`worker/workflows/regimeHistoryRefresh.ts` records the KV month in progress into
`data/summary_monthly_regime_history.json` behind a pull request, in retried steps that fail
visibly instead of reporting success without a PR. It merges over the file on the base branch as
it stands at run time, never the series bundled into the running deployment, so a preview built
from an older commit cannot undo months that reached `main` after it was built. It adds only what the Worker observed: no
backfill, no regenerated history — the canonical series is still the generator scripts' job.
On for the preview lane only (`WHETHER_HISTORY_WORKFLOW=1`); needs `GITHUB_TOKEN`.

## Brief freeze Workflow (trial)

`worker/workflows/weeklyBriefFreeze.ts` appends this week's brief to `data/published_briefs.json`
behind a pull request, from inside Cloudflare. The routine it stands in for ran in a sandbox whose
egress proxy denies FRED, so every run failed before it had a week to write. The record comes from
`lib/report/publishedBriefRecord.ts`, which `scripts/freezeWeeklyBrief.ts` also uses, and passes
`assessPublishReadiness` before anything is built; a week that is not publishable makes the first
step throw, and the platform retries it hourly up to five times. The archive is append-only at the
merge: a slug the base branch already carries is left exactly as it is. On for the preview lane
only (`WHETHER_BRIEF_FREEZE_WORKFLOW=1`); needs `GITHUB_TOKEN`, which it checks before the live
read rather than after it, so the flag and the secret can be set in either order when the lane is
promoted. Checklist: `docs/cloudflare-deployment-runbook.md`, "Promoting the brief freeze to
production".

## Reading telemetry back

The Analytics Engine binding is write-only from a Worker. `lib/telemetry/runHistory.ts` reads the
`cron-step` stream through the SQL API with `CLOUDFLARE_ACCOUNT_ID` and
`CLOUDFLARE_ANALYTICS_READ_TOKEN`, and `/trust` renders it as "Scheduled runs": one row per cron
step with runs, failures, and last success over 30 days. Unconfigured renders nothing; a failed
read renders its reason. Every scheduled step writes that stream, including the signal refresh
itself since 2026-09-14, so an empty window means the cron did not fire, not that nothing was
measured.

The activation funnel is the second read. `lib/telemetry/activationFunnelReport.ts` counts the
`activation` stream's four steps per completed ISO week — never the week in flight — and the
Monday cron records the result to KV (`lib/telemetry/recordActivationFunnel.ts`) so `/trust` can
render "Reader returns" from one KV get instead of a paged SQL query on the render path. An
unconfigured or failed read writes nothing, so absent credentials never overwrite last week's
counts with zeros.
