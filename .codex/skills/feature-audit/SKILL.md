---
name: feature-audit
description: Audit product features against repo UX/content standards and return a prioritized remove-move-modify plan.
allowed-tools:
  - Read
  - Grep
  - WebFetch
---

# Feature audit skill (Whether)

Use this skill for UX/content/behavior audits of existing product surfaces.

## Inputs expected

- Target surface (page/flow/component)
- Audit scope (mobile, desktop, copy, IA, accessibility, performance)
- Reference standards (from `docs/agents/ui-ux-standards.md` and related docs)

## Workflow

1. Define audit scope and constraints in 3-5 bullets.
2. Capture current behavior from source files and available docs.
3. Compare observed behavior with repo standards.
4. Propose changes in a remove/move/modify matrix.
5. Prioritize with severity and implementation effort.

## Output contract

Return sections in this order:

1. **Audit target + scope**
2. **Observed issues** (grouped by area)
3. **Remove / Move / Modify matrix** with columns:
   - Item
   - Recommendation (`remove` / `move` / `modify`)
   - Why
   - Severity (`high` / `medium` / `low`)
   - Effort (`S` / `M` / `L`)
4. **Top 3 next actions**
5. **Risks / regressions to watch**

## Guardrails

- Prefer improvements that reduce cognitive load and visual clutter.
- Avoid introducing recommendations that conflict with established repo standards.
- Cite relevant source files used for observations.
