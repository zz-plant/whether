# Information architecture proposal

## Goal
Align navigation to the operator loop so leaders can move from posture to decision to execution without competing top-level choices.

## Rationalized primary IA
- **Weekly Brief** (`/`) for the canonical weekly call, bounded decision delta, and share artifact.
- **Evidence** (`/signals`) for evidence depth, thresholds, and historical replay.
- **Planning** (`/operations`) for execution guardrails, finance posture, and export actions.
- **Decision Tools** (`/decide`) for role, situation, and utility-based decision translation.
- **Trust** (`/method`) for trust, sources, formulas, and confidence limits.

Recommended in-product sequence:
`/` → `/signals` only if proof is needed → `/operations` to approve the live plan → `/decide` only if one owner-specific edge case remains → `/method` when the call needs a trust audit.

## Supporting surfaces
- **Toolkits** (`/toolkits`) is a supporting instrument library under **Decision Tools**, not a peer workflow hub.
- **Learn** (`/learn`) is a supporting reference library under **Trust**, not a peer workflow hub.
- **Guides**, **Resources**, **Answers**, **Solutions**, **Concepts**, and **Startup Macro Posture** remain secondary discovery, SEO, or long-form distribution surfaces.

## Shared secondary-surface contract
Every secondary root should declare and render the same contract:
- **Intent label:** what downstream helper job the page serves.
- **Canonical parent hub:** the primary workflow hub this surface feeds (`/decide`, `/operations`, or `/method`).
- **Return CTA:** explicit "Start from Weekly Brief" and "Return to parent hub" actions at the top of the page.

This contract keeps secondary pages indexable/discoverable while reinforcing the canonical operator loop:
`weekly brief → primary hub workflow → secondary helper`.

## Rationale
- The product loop is `signals → posture → decision → artifact`; primary IA should mirror that loop instead of exposing every supporting library as an equal first choice.
- `Toolkits` and `Learn` are both downstream surfaces by design: one executes a chosen path, the other supplies optional background.
- Secondary surfaces should stay searchable and indexable when they earn it, but they should not weaken decision transmission on the primary nav.

## Implementation notes
- Keep the global nav limited to the five primary hubs.
- Order the workflow hubs to match the operator loop users are asked to follow in-product: **Weekly Brief → Evidence → Planning → Decision Tools → Trust**.
- Surface helper-library discovery inside the parent hubs first:
  - `/decide` should expose role guides, stage guides, direct answers, and toolkit shortcuts before users need `/guides` or `/answers`.
  - `/operations` should expose board-ready artifact and governance-resource discovery before users need `/resources`.
- Use supporting-surface copy to point back to the parent hub (`Toolkits` → `Decision Tools`, `Learn` → `Trust`).
- Keep first-party CTAs pointed at primary hubs unless the user already needs a supporting surface.
- Use sitemap and metadata to distinguish canonical workflow hubs from supporting or distribution pages.
