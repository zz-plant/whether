# SEO content quality gates

All new SEO content must pass the following gates before publish.

## Required gates
- Must map to one of the four target personas:
  - `cfo`
  - `board`
  - `vp-product`
  - `vc-partner`
- Must include governance framing + reversibility language.
- Must include at least **3 internal links** to canonical/core pages.
- Must include:
  - one conversion CTA (`download`, `request`, or `demo/contact`)
  - one board-forwardable block.

## Programmatic decision-contract gates (index eligibility)
For programmatic templates, indexing is blocked unless all of the following pass:

- **Decision completeness gate**
  - `currentCall` present.
  - `immediateAction` present.
  - `triggerThreshold` present.
  - `reversalCondition` present.
- **Evidence gate**
  - At least one evidence item is rendered in the evidence strip.
- **Freshness gate**
  - Source timestamp is present and inside allowed freshness window.
  - Stale or unknown freshness defaults to `noindex` until refreshed.
- **Trust/provenance gate**
  - Provenance status is visible and non-degraded.
  - Fallback/cached/simulated states default to `noindex`.
- **Uniqueness gate**
  - Page includes at least one unique data point or interpretation versus sibling templates.
- **Thin-page gate**
  - Block indexing if bounded decision, citeable summary, or weekly brief link-back is missing.

Canonical rule: pages may still render for users when degraded/incomplete, but must not index until all gates pass.

## Metadata and reporting gates
- Content entry must include cluster classification: `authority | pain | tool | vc`.
- Content entry must include an intent tag in frontmatter/CMS-equivalent fields.
- Page must emit/attach measurement attributes for conversion and internal-link path analysis.

## QA checklist (copy/paste)
- [ ] Persona tag selected.
- [ ] Cluster selected.
- [ ] Governance + reversibility language included.
- [ ] >=3 internal links to core canonical pages.
- [ ] One conversion CTA present.
- [ ] One board-forwardable block present.
- [ ] Measurement attributes verified.
- [ ] `currentCall` + `immediateAction` + `triggerThreshold` + `reversalCondition` present.
- [ ] Evidence strip includes at least one source-backed point.
- [ ] Freshness timestamp present and inside allowed window.
- [ ] Provenance visible and non-degraded.
- [ ] At least one page-specific unique data point/interpretation is present.
- [ ] Link-back to `/` weekly brief is present.
- [ ] If any gate fails: metadata + sitemap state set to `noindex`.
