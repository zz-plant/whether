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

Two steps, in order:

```
bun run seo:page-metrics    # telemetry  → artifacts/seo-refresh/page-metrics.json
bun run seo:refresh-queue   # metrics    → queue.json + status.json
```

`seo:refresh-queue` produces the machine-readable outputs for editorial/ops:

- `artifacts/seo-refresh/queue.json` — pages currently queued for refresh, including `noindexNow` for stale pages.
- `artifacts/seo-refresh/status.json` — per-page status ledger with `lastEvaluatedAtIso`, refresh request/refreshed timestamps, `slaDueAtIso`, and `slaState`.
- Input: `artifacts/seo-refresh/page-metrics.json` with `byUrl` metrics (`trafficTier` or `organicEntrances30d`, plus `ctaConversionRate`).

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
Both are refused loudly rather than defaulted, and the script also refuses to write a
file when the window returned no events: `seo-refresh-queue.mjs` reads a *missing*
file as "no metrics yet" and an *empty* one as "every page has zero traffic", which
would queue the entire site. Optional overrides: `WHETHER_METRICS_WINDOW_DAYS`
(default 30), `WHETHER_METRICS_ROW_LIMIT` (default 100,000),
`WHETHER_TELEMETRY_DATASET`.

Aggregation happens in JS rather than in SQL because `writeAnalytics` stores each
event as a JSON blob in `blob2` and the Analytics Engine SQL dialect cannot reach
inside it. The upside is that this works against telemetry already collected — no
change to the write path, no waiting for new data to accumulate.

The script deliberately does not emit `trafficTier`. `seo-refresh-queue.mjs` derives
one from `organicEntrances30d` when the field is absent, and those thresholds are the
policy; a second copy is how two numbers that must agree start disagreeing.
