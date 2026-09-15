# Monthly refresh loop for high-performing pages

## Trigger criteria
Refresh any page meeting one of:
- Top quartile organic entrances in its cluster for 2 consecutive months.
- CTA conversion rate above cluster median for 2 consecutive months.
- Assisted conversion contribution in top quartile for 2 consecutive months.

## Refresh actions
1. Update thresholds/examples to match current operating context.
2. Refresh metadata (title/description/open graph cues).
3. Verify CTA language and destination still map to current funnel.
4. Re-check internal links and keep at least three canonical links live.

## Changelog policy
Each refreshed page should include a `Changelog` section with:
- refresh date
- summary of changed thresholds/examples
- metadata edits
- rationale for update

This improves trust and recency for boards/operators reviewing the same page repeatedly.

## Automated queue artifact

`bun run seo:weekly-runbook` runs the whole chain — payload artifacts, then metrics,
then the queue — and is the command `docs/programmatic-seo-operations.md` points at.
The two halves also run on their own:

```
bun run seo:page-metrics    # telemetry  → artifacts/seo-refresh/page-metrics.json
bun run seo:refresh-queue   # metrics    → queue.json + status.json
```

Order matters: the queue ranks pages against whatever metrics file is on disk, so
running it first ranks them against last week's numbers, or none.

`seo:refresh-queue` produces the machine-readable outputs for editorial/ops:

- `artifacts/seo-refresh/queue.json` — pages currently queued for refresh, including `noindexNow` for stale pages.
- `artifacts/seo-refresh/status.json` — per-page status ledger with `lastEvaluatedAtIso`, refresh request/refreshed timestamps, `slaDueAtIso`, and `slaState`.
- Input: `artifacts/seo-refresh/page-metrics.json` with `byUrl` metrics (`trafficTier` or `entrances30d`, plus `ctaConversionRate`).

### Where the metrics come from

`seo:page-metrics` (`scripts/seo-page-metrics.ts`) reads the `content-measurement`
telemetry stream out of the `whether_telemetry` Analytics Engine dataset and folds it
into per-URL entrances and CTA conversions (`lib/seo/pageMetricsFromTelemetry.ts`).

Until 2026-09-10 nothing wrote `page-metrics.json`. The trigger criteria above are
stated in organic entrances and CTA conversion rate, `ContentMeasurementTracker` was
firing an event for both on every visit, and `writeAnalytics` was storing them — but
no step connected the two, so every refresh decision was being made without the
numbers the policy is written in. If you are wondering why the queue looks
undifferentiated, check whether this step ran.

Requires `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` (Account Analytics: Read).
Optional overrides: `WHETHER_METRICS_WINDOW_DAYS` (default 30),
`WHETHER_METRICS_ROW_LIMIT` (default 100,000), `WHETHER_TELEMETRY_DATASET`.

**It refuses to write rather than write something wrong.** `seo-refresh-queue.mjs`
reads a *missing* metrics file as "no metrics yet" and any file it finds as
authoritative, so a bad file is worse than none:

| Condition | Result | Why |
| --- | --- | --- |
| No credentials | `skipped` | The state this repo has been in all along. The weekly runbook continues, but ranks pages **without metrics** — it points the queue at a path that is never written rather than letting it reuse a `page-metrics.json` left in the worktree by an earlier credentialed run. The standalone command exits 1. |
| Query error, or a payload that does not parse | `failed` | An unreachable API is not a reading of zero traffic. |
| Zero events in the window | `failed` | An empty file marks every page "low traffic, underperforming" and queues the whole site. |
| A slice under 15 minutes still at `WHETHER_METRICS_ROW_LIMIT` | `failed` | A window denser than one query is **paged**, not refused: Analytics Engine has no cursor, so the next page is a narrower time range, and a clipped slice is re-read as four shorter ones. Only below a quarter of an hour is the cap, rather than the window, the constraint. |

On `failed`, `seo:weekly-runbook` stops before generating the queue rather than
ranking pages against metrics it could not refresh — the same defect
`freezeWeeklyBrief` shipped a stale published week on.

**Entrances are split by acquisition, since 2026-09-15.** `ContentMeasurementTracker`
used to fire `organic_entrance` without checking referrer, campaign parameters, or
navigation source, so direct, paid and social visits were all counted as organic —
inflating the traffic tier and the conversion target each page was judged against.
It now classifies `document.referrer` into five coarse buckets (`search`, `social`,
`referral`, `direct`, `internal`) and sends **only the bucket**: the referring URL,
its path, and any campaign parameters stay in the browser, because this product
tells readers it runs no trackers and the loop needs nothing finer.

The artifact carries three numbers per URL, and `entranceDefinition` states what
each means:

| Field | Meaning |
| --- | --- |
| `entrances30d` | Every first-visit entrance. This is what the queue tiers on, and what `organicEntrances30d` always actually held. |
| `organicSearchEntrances30d` | The ones a search engine referred. |
| `entrancesBySource` | The full split, including `unclassified`. |

Rows written before the change land in `unclassified`, so a window spanning it
under-reports every classified bucket rather than assuming they were all search.
The queue still tiers on the total: reading the genuinely-organic field there would
silently demote every page the moment the field appeared.

Aggregation happens in JS rather than in SQL because `writeAnalytics` stores each
event as a JSON blob in `blob2` and the Analytics Engine SQL dialect cannot reach
inside it. The upside is that this works against telemetry already collected — no
change to the write path, no waiting for new data to accumulate.

The script deliberately does not emit `trafficTier`. `seo-refresh-queue.mjs` derives
one from `entrances30d` when the field is absent, and those thresholds are the
policy; a second copy is how two numbers that must agree start disagreeing.
