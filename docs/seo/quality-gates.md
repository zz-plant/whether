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
  - canonical progression (links to `/` and `/answers/<slug>` or `/operate`).

## Metadata and reporting gates
- Content entry must include cluster classification + intent tag.
- Page should emit/attach measurement attributes for conversion and internal-link path analysis.
- Failed launch-readiness checks should be treated as `noindex` until corrected.

## Semantic gates (2026-11-18)
The owner asked for better semantic SEO throughout. No new pages: the thin-page rule stands. Every
existing page states what it is about in a form a search or answer engine can read without
guessing.
- **Questions as people ask them.** A section that answers a question is headed by that question,
  phrased as a reader would say it or type it in Slack (`docs/editorial-guardrails.md`, "Questions
  and answers, as people say them"). Its first sentence is the answer, short enough to quote whole.
- **Structured data mirrors what is visible.** A page whose sections are questions and answers
  carries them as `Question` / `acceptedAnswer` nodes with the same words. Nothing is marked up
  that the page does not show. A node's numbers come from the same object as the visible sentence.
- **Datasets say what they hold.** The month-end record and this week's reading are `Dataset`
  nodes. Each names its two scores in `variableMeasured`, with 0–100 bounds, its temporal coverage
  and its download or API `distribution`.
- **Entities are named once and linked.** The vocabulary's terms (the two scores, Room to move,
  Room before a change, the four conditions) live in one `DefinedTermSet` on the method page that
  defines them. Pages that use them point at those ids. Market concepts (the Federal Reserve, the
  federal funds rate, Treasury bills, the yield curve, venture capital) carry their Wikipedia
  `sameAs` through `wikipediaTopic`. There is no glossary page (feature log §1.5).
- **Dates are machine-readable.** Every printed date that a reading or brief belongs to sits in
  `<time dateTime>`.
- **Links say where they go.** Anchor text, or the accessible name where the visible text must
  stay short, names the destination. A bare "Why", "here" or "→" is not a name.
- **One outline.** One `h1`, no skipped levels, section ids unchanged when headings change (they
  are link contracts). A view state carried in the query (`?decision=`, `?compare=`, a what-if)
  never becomes an indexable variant: the canonical URL drops it.

## QA checklist (copy/paste)
- [ ] Bounded-decision contract complete (action, threshold, reversal, evidence).
- [ ] Freshness + provenance + confidence + fallback labels pass.
- [ ] Distinct intent/value vs sibling pages in cluster.
- [ ] Decision transmission <=60s.
- [ ] Decision bullets and copyable decision text present.
- [ ] Canonical links to `/` and `/answers/<slug>` or `/operate`.
- [ ] Measurement attributes verified.
