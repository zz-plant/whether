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
