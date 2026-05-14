# `app/components/weekly-card` agent guide

This directory owns the canonical weekly brief presentation layer.

Use this guide when editing the homepage top fold, weekly decision card hierarchy, bounded-rule presentation, or supporting disclosures that appear inside the main weekly brief.

## What this directory owns

- Presentation of the canonical weekly call on `/`
- Top-fold hierarchy and scan order
- Screenshot-safe compaction of decision content
- Disclosure boundaries between first-scan content and supporting detail

## What this directory must not own

- Canonical posture, trust, or threshold semantics
- Export-specific behavior
- Alternate workflow routing logic that belongs to home orchestration
- Long-form explanatory copy that belongs in `/evidence` or `/trust`

## Non-negotiable contract

Preserve the one-screen weekly brief contract from `docs/one-screen-weekly-brief-spec.md`:
- one dominant weekly decision card
- action-first scan path
- compact trust/readiness
- bounded `What changed` / `Pause if` / `Change course if` semantics
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

## Canonical inputs

Treat these as upstream:
- `lib/report/homeBriefModel.ts`
- `lib/report/reportFormatting.ts`
- `lib/report/trustStatus.ts`
- `lib/report/decisionTransmissionCopy.ts`

The weekly card renders those contracts. It should not redefine them.

## Working rules

- Keep the operator-facing call visible once. Avoid duplicate call summaries in adjacent blocks.
- The top strip is metadata, not a second decision block.
- Supportive sections should explain the current call, not compete with it.
- Use disclosures for continuity, trajectory, confidence detail, and rationale that are not required in the first scan.
- Mobile compaction should preserve actionability first; do not let equal-weight card grids flatten the hierarchy.
- If a new block cannot justify its place in a screenshot, it probably belongs below the fold or on another route.

## Tests and docs to update

When hierarchy, ordering, or weekly-card labels change, update:
- `tests/weeklyDecisionCardLayout.test.tsx`
- `tests/weeklyDecisionCardSections.test.tsx`
- `tests/weeklyDecisionCardDecisionTransmissionContract.test.tsx`
- `tests/homeWeeklyComposition.test.tsx` when homepage composition changes
- `docs/one-screen-weekly-brief-spec.md`
- `docs/feature-specs-current.md`

## Anti-patterns seen in this repo

- Equal visual weight for every panel in the top fold
- Reintroducing explanation ahead of the decision delta
- Surfacing trust as a separate competing card instead of compact inline state
- Adding more share/help/navigation chrome before the weekly call is settled
