---
name: regime-briefing-operator
description: Produce a decision-ready weekly/regime briefing from Whether artifacts, focused on what changed, what actions to take now, and what would flip the call.
allowed-tools:
  - Read
  - Grep
  - Bash
---

# Regime briefing operator (Whether)

## Use this skill when

- Asked for a weekly operating brief or “what changed” summary.
- Asked to translate signals into product/engineering operating actions.
- Preparing leadership-ready decision posture from existing repo artifacts.

## Do not use this skill when

- The task is deep macro education without operational decisions.
- Required signal data is unavailable and cannot be verified.

## Workflow

1. Collect current regime snapshot and freshness markers.
2. Identify delta vs prior state (what changed materially).
3. Translate delta into bounded actions (`start`/`stop`/`fence`).
4. Name top risks and flip conditions.
5. Summarize assumptions, confidence, and unknowns.

## Output contract (required order)

1. **Skill used + why**
2. **Regime snapshot** (regime, scores, timestamp)
3. **What changed** (3–6 bullets)
4. **Recommended actions now**
   - `start` / `stop` / `fence`
   - owner + time horizon
5. **Decision risks** (top 3)
6. **Flip conditions** (what would change the recommendation)
7. **Assumptions + confidence**
8. **Unknowns / next data needed**
9. **Fallback note** (only if freshness/provenance gaps constrain confidence)

## Quality checks before finalizing

- “What changed” is explicit, not generic posture explanation.
- Every recommended action has owner + horizon.
- Risks and flip conditions are concrete and testable.
- Freshness uncertainty is called out explicitly when present.

## Guardrails

- Separate extracted facts from interpretation.
- Prefer canonical repo data/docs over inferred values.
- Keep language concise and operator-facing.

## Maintenance

- Last reviewed: 2026-03-06
- Primary internal references: `docs/feature-specs-current.md`, `data/recommendations.ts`, report section components.
