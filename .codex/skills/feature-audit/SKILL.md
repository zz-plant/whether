---
name: feature-audit
description: Audit product features against Whether UX/content standards and return a prioritized remove-move-modify plan with concrete next actions.
allowed-tools:
  - Read
  - Grep
  - WebFetch
---

# Feature audit skill (Whether)

## Use this skill when

- Auditing existing UX/content/behavior on a page, flow, or component.
- A reviewer asks for structured improvement recommendations.
- A task needs a severity/effort triage matrix.

## Do not use this skill when

- Building a new feature from scratch.
- Debugging a narrow implementation bug without product/UX evaluation.

## Workflow

1. Define target surface and audit scope.
2. Capture observed behavior from source files/docs.
3. Compare behavior to repo standards.
4. Produce remove/move/modify recommendations.
5. Prioritize by severity and effort.

## Output contract (required order)

1. **Skill used + why**
2. **Audit target + scope**
3. **Observed issues** (grouped by area)
4. **Remove / Move / Modify matrix**
   - Item
   - Recommendation (`remove` / `move` / `modify`)
   - Why
   - Severity (`high` / `medium` / `low`)
   - Effort (`S` / `M` / `L`)
5. **Top 3 next actions**
6. **Risks / regressions to watch**
7. **Fallback note** (only if scope/evidence limits block complete audit)

## Quality checks before finalizing

- Every recommendation maps to an observed issue.
- High-severity items include a specific next action.
- Findings cite relevant files or artifacts.
- Proposed changes reduce cognitive load instead of adding complexity.

## Guardrails

- Align recommendations with existing repo standards.
- Prefer smallest viable changes over broad redesign proposals.

## Maintenance

- Last reviewed: 2026-03-06
