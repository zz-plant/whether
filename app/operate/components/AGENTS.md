# `app/operate/components` agent guide

This directory owns the planning and artifact checkpoint after the weekly call.

Use this guide when editing planning stepper content, guardrail approval, share/export flows, or decision-memory and delivery panels.

## What this directory owns

- Planning translation of the weekly call into this week's executable plan
- Guardrail and approval sequencing
- Artifact packaging and delivery after the plan is settled
- Company-specific exceptions and follow-through controls that happen after the canonical brief

## What this directory must not own

- A second canonical weekly brief
- Alternate posture/trust semantics
- New standalone workflow branches that should remain subordinate to Planning
- Rephrasing bounded decision semantics independently from shared report/export builders

## Planning and export rules

- `/planning` is downstream of the weekly call. It should sharpen execution, not reopen the whole macro narrative by default.
- Exports are transmission surfaces, not parallel interpretations.
- Every primary artifact should inherit the same bounded decision contract: action, threshold, and reversal or flip condition.
- One default routine path should lead. Heavier packaging, governance formats, and company-specific overrides should remain clearly secondary.
- Proof and trust can be linked from Planning, but they should not dominate the export checkpoint.

## Canonical upstream sources

Treat these as upstream when changing semantics:
- `lib/export/briefBuilders.ts`
- `lib/export/weeklyOperatorBrief.ts`
- `lib/export/explainerBrief.ts`
- `lib/report/canonicalDecisionCopy.ts`
- `lib/report/decisionTransmissionCopy.ts`
- `lib/report/homeBriefModel.ts`

## Working rules

- Keep step sequencing explicit: weekly plan, guardrails, finance or execution stance, share artifact.
- Do not split export semantics across local component-specific builders if a shared builder can carry the change.
- Keep override controls separate from the default artifact path so the baseline transmission stays clean.
- If a planning surface adds explanation, pair it with an explicit action and a reopen or reverse condition.
- Delivery controls and memory recall are support functions. They should not bury the main artifact path.

## Tests and docs to update

When planning/export semantics or order change, update:
- tests covering operations flow and artifact generation
- any affected export-builder tests
- `docs/feature-specs-current.md`
- relevant export or integration docs when output contracts change

## Anti-patterns seen in this repo

- Export panels drifting into their own vocabulary
- Share actions competing equally with board/governance exception paths
- Planning pages re-explaining the weekly call instead of advancing it into execution
