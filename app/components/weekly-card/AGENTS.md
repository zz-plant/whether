# `app/components/weekly-card` agent guide

This directory used to hold the canonical weekly-card presentation layer. The homepage top fold
now renders directly from `app/page.tsx` (`DecisionHero`, `ThreeWhethersCard`, the weekly top-fold
contract section), and the unused card tree was deleted in Aug 2026. What remains here:

- `DiagnosticsSection.tsx` — signal diagnostics disclosure, rendered on `/evidence`
- `decisionSupport.ts` — role-aware decision-support copy used by `/api/weekly` and `/api/monthly`
- `shared/`, `types.ts` — presentation helpers and view-model types for the above

Do not add new homepage presentation here; extend `app/page.tsx` and `app/components/home/*`
instead (see `app/components/home/AGENTS.md`).

## Non-negotiable contract (now enforced on `app/page.tsx`)

Preserve the one-screen weekly brief contract from `docs/one-screen-weekly-brief-spec.md`:
- one dominant weekly decision block
- action-first scan path
- compact trust/readiness
- bounded `What changed` / guardrail / reversal semantics
- screenshot-safe hierarchy at common desktop widths and usable mobile compression

If something must be cut for space, cut in this order:
1. extra explanation
2. secondary chips or duplicate metadata
3. expanded support detail

Do not cut:
- current call
- action now
- bounded guardrail / flip logic
- compact trust/readiness verdict

## Tests and docs to update

When the homepage top fold or these surviving pieces change, update:
- `tests/homeRouteDecisionTransmissionContract.test.tsx`
- `tests/weeklyCardSectionDiagnostics.test.tsx`
- `docs/one-screen-weekly-brief-spec.md`
- `docs/feature-specs-current.md`

## Anti-patterns seen in this repo

- Equal visual weight for every panel in the top fold
- Reintroducing explanation ahead of the decision delta
- Surfacing trust as a separate competing card instead of compact inline state
- Adding more share/help/navigation chrome before the weekly call is settled
