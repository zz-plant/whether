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

`lib/saasMultiples.ts` computes the SaaS comps median through one seam. Without a key it reads
Yahoo Finance's unofficial quote endpoint, which rate-limits and blocks without notice. With
`ALPHA_VANTAGE_API_KEY` it reads Alpha Vantage's documented OVERVIEW endpoint, which reports
EV/Revenue and revenue growth directly; the snapshot's `source` field says which one answered.
The per-company detail route keeps Yahoo either way, because OVERVIEW carries no balance sheet.

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
