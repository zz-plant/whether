# Content measurement model

Analytics model lives in `lib/contentMeasurement.ts`.

## Event schema
- `pagePath`
- `cluster`: `authority | pain | tool | vc`
- `intent`: `cfo | board | vp-product | vc-partner`
- `type`: `organic_entrance | cta_conversion | assisted_conversion`
- optional: `ctaId`
- optional: `internalPath` (for assisted conversion path reporting)

## Reporting outputs
- Organic entrances by cluster.
- CTA conversions by page.
- CTA conversions by cluster.
- Assisted conversions by internal link path.
- Event volume by intent tag.

## Use in dashboards
- Break down performance by cluster first, then by intent within cluster.
- Prioritize refreshes where entrance volume is high but CTA conversion is low.
- Use assisted path output to identify high-value internal links to preserve during rewrites.

## Decision-topic review

The priority map in `roadmap.md` is the editorial grouping for the eight decision topics. Keep the
existing telemetry `cluster` enum unchanged: its authority/pain/tool/vc values describe content
format, not these topics. Join by canonical `pagePath` when reviewing a topic.

For each priority cluster, record a dated 28-day baseline and compare like-for-like windows:

1. From Search Console: actual queries, landing pages, impressions, clicks and average position.
   Group query variants by the decision they ask about; do not invent volume estimates.
2. From the existing page-metrics artifact: `organicSearchEntrances30d`, all entrances, acquisition
   buckets and copy CTA activations. Keep its 30-day window explicit rather than combining counts
   with the 28-day Search Console window as if they were one denominator.
3. From assisted-conversion events: paths into the weekly brief and planning. A click is not proof
   that a decision was adopted. A copy activation is not proof of successful pasting or sharing.
4. Review subscription and repeat-use evidence only if it can be attributed with the existing
   privacy-preserving telemetry. The current content events do not establish those outcomes;
   report unavailable attribution as unknown rather than estimating it.

Search Console access is an external prerequisite; no query baseline has been collected by this
change. Analytics credentials are required for `bun run seo:page-metrics`. Never treat a skipped
collection or an empty window as zero demand. Keep `/resolve` and the answer pages on their existing
trackers, and preserve source classification when interpreting organic acquisition.

Expand a cluster when real query evidence and useful downstream actions support it. When impressions
exist but clicks are weak, review query fit and snippets; when visits arrive without useful actions,
review the answer and artifact before adding more pages.
