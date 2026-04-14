# `app/signals` agent guide

This directory owns the evidence surface for the weekly call.

Use this guide when editing `/signals`, evidence-mode routing, threshold tuning, replay, or signal diagnostics.

## What this directory owns

- Evidence depth for why the call moved
- Threshold, replay, and signal diagnostic tools
- Compact implication-first summaries that support the canonical weekly call

## What this directory must not own

- The canonical operating call itself
- New trust-audit surfaces that belong to `/method`
- Planning/export behavior that belongs to `/operations`
- Long-form educational content that weakens the evidence job

## Evidence rules

- `/signals` should answer: what moved, how close are we to the watch lines, and what would change if the evidence crossed them.
- Explanation should support action. It should not become a parallel recommendation engine.
- Threshold and replay tools should stay explicitly subordinate to the current weekly call.
- Advanced controls are allowed, but implication-first reading should remain viable for a first pass.

## Canonical upstream sources

Treat these as upstream:
- `lib/report/reportData.ts`
- `lib/report/trustStatus.ts`
- `lib/report/homeBrief/signalIndicators.ts`
- `lib/report/decisionKnobs.ts`
- `app/signals/signalsPageModel.ts`

## Working rules

- Lead with what changed now before deeper diagnostics.
- Preserve explicit freshness, fallback, and provenance cues near the evidence they qualify.
- Keep threshold edits and advanced diagnostics measurable. Avoid vague cautionary prose.
- When adding a new signal view, make clear how it changes confidence, watch distance, or operating implication.
- Replay and inversion views should help pressure-test the current call, not distract from it.

## Tests and docs to update

When evidence hierarchy or threshold semantics change, update:
- tests covering signals page model or diagnostics rendering
- any threshold or replay tests touched by the change
- `docs/feature-specs-current.md`

## Anti-patterns seen in this repo

- Turning evidence panels into general macro commentary
- Burying watch-line implications under chart polish
- Duplicating trust or planning summaries instead of linking to their canonical routes
