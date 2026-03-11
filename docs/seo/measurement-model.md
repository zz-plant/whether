# Content measurement model

Analytics model lives in `lib/contentMeasurement.ts`.

## Event schema
- `pagePath`
- `cluster`: `authority | pain | tool | vc`
- `intent`: `cfo | board | vp-product | vc-partner`
- `type`: `organic_entrance | cta_conversion | assisted_conversion | decision_block_view | weekly_brief_handoff | operations_handoff | artifact_interaction`
- optional: `ctaId`
- optional: `internalPath` (for assisted conversion path reporting)
- optional: `artifactAction`: `copy | screenshot | export`
- optional: `indexEligible`: `true | false`
- optional: `refreshOnSchedule`: `true | false`

## Reporting outputs
- Organic entrances by cluster.
- CTA conversions by page.
- CTA conversions by cluster.
- Assisted conversions by internal link path.
- Event volume by intent tag.
- Decision-ready sessions (sessions with `decision_block_view` + handoff event).
- SERP-to-brief handoff rate (`weekly_brief_handoff / organic_entrance`).
- Operations handoff rate (`operations_handoff / organic_entrance`).
- Artifact interaction rate (`artifact_interaction / organic_entrance`).
- Indexed-quality ratio (`indexed pages passing all gates / generated pages`).
- Refresh compliance (`top-quartile pages refreshed on schedule / top-quartile pages due`).

## Use in dashboards
- Break down performance by cluster first, then by intent within cluster.
- Prioritize refreshes where entrance volume is high but CTA conversion is low.
- Use assisted path output to identify high-value internal links to preserve during rewrites.
- Pair traffic trends with decision-readiness metrics to avoid optimizing thin informational volume.

## Formula notes
- **Decision-ready sessions**: distinct sessions that include both `decision_block_view` and at least one handoff (`weekly_brief_handoff` or `operations_handoff`).
- **SERP-to-brief handoff rate**: `weekly_brief_handoff / organic_entrance` for each page/cluster window.
- **Indexed-quality ratio**: computed from sitemap/index pipeline audits, not user events.
- **Refresh compliance**: computed from refresh queue + changelog completion state.
