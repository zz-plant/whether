# `lib/report` agent guide

This directory owns the canonical translation from signals into posture, bounded decisions, trust state, and export-ready semantics.

Use this guide when editing:
- posture or readiness labels
- bounded decision wording
- trust, freshness, provenance, or fallback state
- weekly brief model shape
- export payload semantics that downstream UI renders

## What this directory owns

- Canonical report semantics and typed contracts
- Decision transmission copy that should stay consistent across `/`, `/operate`, `/answer`, exports, and SEO surfaces
- Trust-state labels and degraded/fallback behavior
- Home-brief model assembly and view-model contracts
- Shared formatting helpers for bounded decision phrasing

## What this directory must not own

- Route-specific layout choices
- Local UI-only copy tweaks that are not meant to propagate
- Ad hoc labels assembled inside components to bypass shared formatters
- Parallel export semantics that disagree with the homepage brief

## Canonical upstream and downstream files

Prefer editing these sources before changing consumers:
- `lib/report/homeBriefModel.ts`
- `lib/report/homeBrief/builders.ts`
- `lib/report/reportData.ts`
- `lib/report/reportFormatting.ts`
- `lib/report/trustStatus.ts`
- `lib/report/decisionTransmissionCopy.ts`
- `lib/report/canonicalDecisionCopy.ts`
- `lib/report/operatingCalls.ts`
- `lib/report/decisionKnobs.ts`

Typical downstream renderers:
- `app/page.tsx` (top fold: `DecisionHero`, `ThreeWhethersCard`)
- `app/components/home/*`
- `app/operate/components/*`

## Working rules

- If a label should mean the same thing across more than one surface, define or update it here.
- If a component needs to display `Action`, `Threshold`, `Reversal`, `Pause if`, or `Change course if`, route that phrasing through shared report/export formatting instead of custom string assembly.
- Keep translation-only layers translation-only. Interpretation layers may change explanatory bullets, but they must not mutate canonical posture, confidence, readiness, or threshold semantics.
- Keep fallback behavior explicit and non-fatal. Historical or degraded modes must remain renderable with a compact operating implication.
- Preserve contract stability where possible. If you change a type or semantic contract here, update all affected consumers in the same change.

## When to edit models vs UI

- Edit `lib/report/*` when the meaning, label, threshold, trust rule, or payload contract changes.
- Edit UI components only when the meaning is stable and the job is hierarchy, layout, emphasis, or disclosure behavior.
- If a UI change requires several components to redefine the same copy, the copy belongs here instead.

## Required follow-through

When semantics change, update:
- relevant tests in `tests/*` covering weekly brief composition, layout contracts, or decision transmission
- `docs/feature-specs-current.md`
- `docs/one-screen-weekly-brief-spec.md` when top-fold or weekly brief contract changes

## Anti-patterns seen in this repo

- Rewording the same decision labels independently in `/`, `/planning`, and export builders
- Moving trust language into multiple parallel summaries
- Letting components invent local “friendlier” labels that drift from canonical decision semantics
- Treating exports as a separate brief instead of a transmission layer of the same call
