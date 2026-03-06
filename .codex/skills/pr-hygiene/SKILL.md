---
name: pr-hygiene
description: Enforce Whether validation and PR quality expectations with a repeatable pre-commit/pre-PR checklist and explicit verification logging.
allowed-tools:
  - Read
  - Grep
  - Bash
---

# PR hygiene skill (Whether)

## Use this skill when

- Preparing a branch for commit/PR.
- Reviewing if checks/docs/tests match the scope of a change.
- Standardizing a PR summary for reviewer efficiency.

## Do not use this skill when

- The task is pure research and no code/docs changes are being proposed.

## Workflow

1. Confirm changed-file scope is intentional.
2. Run the smallest meaningful verification set.
3. Confirm docs/tests changed when behavior/contracts changed.
4. Draft a reviewer-ready PR summary with risks/follow-ups.

## Verification baseline

Start with:
- `bun run lint`
- `bun run test`

Escalate to `bun run check` for broad or cross-cutting changes.

## Output contract (required order)

1. **Skill used + why**
2. **Change scope**
3. **Validation run log** (command + pass/fail/warn)
4. **PR summary draft**
   - What changed
   - Why it changed
   - Validation run
   - Risks / follow-ups
5. **Release impact line** (`none`, `low`, `medium`, `high`)
6. **Fallback note** (only if environment limitations block checks)

## Quality checks before finalizing

- No check is reported unless actually executed.
- Command names match repo conventions.
- Validation depth matches change risk.
- Risks/follow-ups are explicit, not generic.

## Guardrails

- Flag environment limitations clearly.
- Keep summary concise and reviewer-actionable.

## Maintenance

- Last reviewed: 2026-03-06
