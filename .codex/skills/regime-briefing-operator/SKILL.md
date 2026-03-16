---
name: regime-briefing-operator
description: Produce a decision-ready weekly or regime briefing from Whether artifacts, focused on what changed, what actions to take now, and what would flip the call.
allowed-tools:
  - Read
  - Grep
  - Bash
---

# Regime briefing operator

Produce a delta-first operating brief from existing Whether artifacts.

## Use this skill when

- asked for a weekly operating brief or a concise what-changed summary
- asked to translate Whether signals into product, engineering, finance, or leadership actions
- preparing a meeting-ready decision posture from current repo artifacts

## Do not use this skill when

- the task is macro education without operating decisions
- required signal data is unavailable or unverified
- the user needs a deep methodology walkthrough instead of a bounded brief

## Required inputs

- the current regime or weekly artifact
- freshness markers and comparison point if available
- the audience and time horizon

## Repo anchors

- `docs/one-screen-weekly-brief-spec.md`
- `docs/feature-specs-current.md`
- `lib/report/homeBriefModel.ts`
- `lib/report/reportData.ts`
- `lib/report/decisionKnobs.ts`

## Workflow

1. Collect the current regime snapshot and freshness markers.
2. Identify the material delta versus the prior state or baseline.
3. Translate the delta into bounded actions with owners and time horizon.
4. Name the top risks and the flip conditions.
5. End with assumptions, confidence, and unknowns.

## Output contract

Return in this order:

1. **Skill used + why**
2. **Regime snapshot**
3. **What changed**
4. **Recommended actions now**
5. **Decision risks**
6. **Flip conditions**
7. **Assumptions and confidence**
8. **Unknowns or next data needed**
9. **Fallback note** only if freshness or provenance gaps constrain confidence

## Quality checks before finalizing

- The brief leads with delta, not generic posture explanation.
- Every recommended action is bounded by owner, trigger, or horizon.
- Risks and flip conditions are concrete enough to test.
- Unknowns are separated from facts and recommendations.

## Guardrails

- Separate extracted facts from interpretation.
- Prefer canonical repo data over inferred values.
- Keep language concise and operator-facing.

## Maintenance notes

- Last reviewed: 2026-03-16
- Refresh when brief semantics, regime language, or bounded-decision rules change.
