# Information architecture proposal

## Goal
Align navigation to the operator loop so leaders can move from posture to decision to execution without competing top-level choices.

## Rationalized primary IA
- **Weekly Brief** (`/`) for the canonical weekly call, bounded decision delta, and share artifact.
- **Signals** (`/signals`) for evidence depth, thresholds, and historical replay.
- **Decide** (`/decide`) for role, situation, and utility-based decision translation.
- **Operations** (`/operations`) for execution guardrails, finance posture, and export actions.
- **Method** (`/method`) for trust, sources, formulas, and confidence limits.

## Supporting surfaces
- **Toolkits** (`/toolkits`) is a supporting instrument library under **Decide**, not a peer workflow hub.
- **Learn** (`/learn`) is a supporting reference library under **Method**, not a peer workflow hub.
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
- Use supporting-surface copy to point back to the parent hub (`Toolkits` → `Decide`, `Learn` → `Method`).
- Keep first-party CTAs pointed at primary hubs unless the user already needs a supporting surface.
- Use sitemap and metadata to distinguish canonical workflow hubs from supporting or distribution pages.
