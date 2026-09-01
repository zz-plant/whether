# `app/components/home` agent guide

This directory owns homepage orchestration after the canonical weekly call.

Use this guide when editing the home route shell, workspace bands, route handoffs, or homepage-only fallback/loading behavior.

## What this directory owns

- The homepage as the canonical weekly workspace
- Post-brief handoff sequencing
- The relative emphasis of Planning vs exception paths
- Homepage-specific fallback/loading states that should still feel like the weekly brief product

## What this directory must not own

- The canonical weekly-call semantics themselves
- Deep evidence/trust workflows that belong on `/signals` or `/trust`
- Export payload semantics that belong in `lib/report/*` or `/planning`
- Standalone surfaces that duplicate the weekly brief loop

## Homepage sequencing rules

The homepage should read as:
1. settle the weekly call
2. turn the call into this week's plan
3. open proof, trust, or deeper tools only if challenged

Planning is the default next step.
Evidence, trust, replay, and tools are exception paths.

## Canonical upstream sources

Prefer changing these before changing home presentation:
- `app/page.tsx`
- `lib/report/homePageAssembler.ts`
- `lib/report/home/workspaceModel.ts`
- `lib/report/home/contracts.ts`
- `lib/report/homeBriefModel.ts`

## Working rules

- Keep one primary CTA in the home handoff. Support routes should stay visibly subordinate.
- Use home bands to route work, not to recreate downstream pages inline.
- Route copy should stay plain-English and job-focused. Avoid internal framework language.
- If a section starts reading like a second dashboard, compress it.
- Fallback states should preserve the same ritual sequence as the resolved homepage: call first, then plan, then exceptions.
- Home-specific helper copy should reinforce the five-surface loop rather than invent local taxonomy.

## Tests and docs to update

When home orchestration or section order changes, update:
- `tests/homeWeeklyComposition.test.tsx`
- `tests/homeWorkspaceBandsSections.test.tsx`
- `tests/reportShellSections.test.tsx` if shell behavior changes
- `docs/feature-specs-current.md`

## Anti-patterns seen in this repo

- Letting the lower homepage band compete with the weekly decision card
- Treating tools, replay, or glossary flows as peers to planning
- Expanding route chooser/navigation chrome until the homepage feels like a portal instead of a ritual brief
