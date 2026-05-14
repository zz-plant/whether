# SEO content quality gates

All new SEO content must pass the following gates before publish.

## Required gates
- Must pass bounded-decision completeness:
  - current call,
  - immediate action,
  - trigger threshold,
  - reversal condition,
  - evidence present.
- Must pass freshness and trust checks:
  - freshness window valid,
  - no fallback/degraded provenance labels,
  - provenance links, confidence label, and fallback label present.
- Must pass anti-duplication and thin-page checks:
  - distinct datapoint and/or interpretation vs sibling pages in cluster,
  - section completeness and minimum decision value.
- Launch-readiness runs now enforce additional checklist gates:
  - decision transmission (scan/resolve in <=60s),
  - artifact readiness (decision bullets + copyable decision text),
  - canonical progression (links to `/` and `/resolve` or `/planning`).

## Metadata and reporting gates
- Content entry must include cluster classification + intent tag.
- Page should emit/attach measurement attributes for conversion and internal-link path analysis.
- Failed launch-readiness checks should be treated as `noindex` until corrected.

## QA checklist (copy/paste)
- [ ] Bounded-decision contract complete (action, threshold, reversal, evidence).
- [ ] Freshness + provenance + confidence + fallback labels pass.
- [ ] Distinct intent/value vs sibling pages in cluster.
- [ ] Decision transmission <=60s.
- [ ] Decision bullets and copyable decision text present.
- [ ] Canonical links to `/` and `/resolve` or `/planning`.
- [ ] Measurement attributes verified.
