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
Run `bun run seo:refresh-queue` (or the scheduled GitHub workflow) to produce machine-readable outputs for editorial/ops:

- `data/seo-refresh/queue.json` — pages currently queued for refresh, including `noindexNow` for stale pages.
- `data/seo-refresh/status.json` — per-page status ledger with `lastEvaluatedAtIso`, refresh request/refreshed timestamps, `slaDueAtIso`, and `slaState`.
- Optional input: `data/seo-refresh/page-metrics.json` with `byUrl` metrics (`trafficTier` or `organicEntrances30d`, plus `ctaConversionRate`).
