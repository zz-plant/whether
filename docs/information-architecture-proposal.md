# Information architecture proposal

> **Implementation note (2026-08-02):** the primary IA below is implemented in
> `lib/navigation/informationArchitecture.ts`, which is the single source of truth for
> hub order, labels, header next-step cues, and report-shell route detection. Change the
> loop there, not in header components.

## Goal
Align navigation to the operator loop so leaders can move from posture to decision to execution without competing top-level choices.

## Rationalized primary IA
- **Weekly Brief** (`/`) for the canonical weekly call, bounded decision delta, and share artifact.
- **Evidence** (`/signals`) for evidence depth, thresholds, and historical replay.
- **Planning** (`/operate`) for execution guardrails, finance posture, and export actions.
- **Resolve** (`/answer`) for role, situation, and utility-based decision translation.
- **Trust** (`/trust`) for trust, sources, formulas, and confidence limits.

Recommended in-product sequence:
`/` → `/signals` only if proof is needed → `/operate` to approve the live plan → `/answer` only if one owner-specific edge case remains → `/trust` when the call needs a trust audit.

## Supporting surfaces
- **Toolkits** (`/toolkits`) is a supporting instrument library under **Resolve**, not a peer workflow hub.
- **Learn** (`/learn`) is a supporting reference library under **Trust**, not a peer workflow hub.
- **Guides**, **Resources**, **Answers**, **Solutions**, **Concepts**, and **Startup Macro Posture** remain secondary discovery, SEO, or long-form distribution surfaces.

## Shared secondary-surface contract
Every secondary root should declare and render the same contract:
- **Intent label:** what downstream helper job the page serves.
- **Canonical parent hub:** the primary workflow hub this surface feeds (`/answer`, `/operate`, or `/trust`).
- **Return CTA:** explicit "Start from Weekly Brief" and "Return to parent hub" actions at the top of the page.

This contract keeps secondary pages indexable/discoverable while reinforcing the canonical operator loop:
`weekly brief → primary hub workflow → secondary helper`.

## Rationale
- The product loop is `signals → posture → decision → artifact`; primary IA should mirror that loop instead of exposing every supporting library as an equal first choice.
- `Toolkits` and `Learn` are both downstream surfaces by design: one executes a chosen path, the other supplies optional background.
- Secondary surfaces should stay searchable and indexable when they earn it, but they should not weaken decision transmission on the primary nav.

## Implementation notes
- Keep the global nav limited to the five primary hubs.
- Order the workflow hubs to match the action-first operator loop users are asked to follow in-product: **Weekly Brief → Planning → Evidence → Resolve → Trust**. Evidence is the exception path for pressure-testing a settled call, not a required checkpoint before planning.
- Surface helper-library discovery inside the parent hubs first:
  - `/answer` should expose fast tools, direct answers, and one curated translation layer before users ever need the full role or situation library.
  - Full role and situation browse inside `/answer` should stay collapsed behind a secondary “open library” affordance.
  - `/operate` should expose the live approval sequence first and keep governance-resource discovery behind an explicit “need deeper board material?” gate.
- Use supporting-surface copy to point back to the parent hub (`Toolkits` → `Resolve`, `Learn` → `Trust`).
- Prefer search result grouping by operator job (`check`, `approve`, `resolve`, `diagnose`, `trust`) instead of by content type.
- Keep first-party CTAs pointed at primary hubs unless the user already needs a supporting surface.
- Use sitemap and metadata to distinguish canonical workflow hubs from supporting or distribution pages.
