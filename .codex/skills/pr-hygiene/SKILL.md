---
name: pr-hygiene
description: Enforce Whether repo validation and PR quality expectations with a repeatable pre-merge checklist.
allowed-tools:
  - Read
  - Grep
  - Bash
---

# PR hygiene skill (Whether)

Use this skill when preparing or reviewing a change before commit/PR.

## Workflow

1. Confirm changed files are in scope and intentional.
2. Run the smallest meaningful verification set for the change.
3. Verify docs/tests were updated when behavior or interfaces changed.
4. Prepare a PR summary that includes what, why, validation, and risks.

## Verification baseline

Start with:

- `bun run lint`
- `bun test`

Escalate to `bun run check` for broad/refactor changes.

## Output contract

Return sections in this order:

1. **Change scope**
2. **Validation run log** (command + pass/fail/warn)
3. **PR summary draft**
   - What changed
   - Why it matters
   - Validation
   - Risks / follow-ups
4. **Release impact line** (`none`, `low`, `medium`, `high`)

## Guardrails

- Do not claim tests were run if they were not executed.
- Flag environment limitations explicitly.
- Keep final summaries concise and reviewer-friendly.
