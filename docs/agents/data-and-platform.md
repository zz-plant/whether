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
