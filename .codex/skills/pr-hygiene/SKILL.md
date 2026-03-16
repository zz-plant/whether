---
name: pr-hygiene
description: Enforce Whether validation and PR quality expectations with a repeatable pre-commit or pre-PR checklist, explicit verification logging, and doc-drift checks.
allowed-tools:
  - Read
  - Grep
  - Bash
---

# PR hygiene

Prepare a change for review by matching validation depth to scope and making the review surface explicit.

## Use this skill when

- preparing a branch for commit or PR
- checking whether tests, docs, and validation match the scope of a change
- drafting a reviewer-ready summary with risk and follow-up notes

## Do not use this skill when

- the task is pure research with no intended repo change
- work is still in early exploration and validation would be misleading

## Required inputs

- changed-file scope
- expected user-facing or contract-facing impact
- known environment limits that may block checks

## Repo anchors

- `AGENTS.md`
- `docs/agents/quality-and-pr.md`
- `docs/agents/documentation.md`
- `docs/development-playbook.md`

## Workflow

1. Confirm the changed-file scope is intentional.
2. Choose the smallest meaningful verification set based on risk.
3. Check whether docs and tests changed where contracts or behavior changed.
4. Record command outcomes exactly as run.
5. Draft a concise PR summary with risks and follow-ups.

## Verification baseline

Start with:

- `bun run lint`
- `bun run test`

Escalate to `bun run check` for broad, high-risk, or cross-cutting changes.

## Output contract

Return in this order:

1. **Skill used + why**
2. **Change scope**
3. **Validation run log**
4. **Docs and test coverage check**
5. **PR summary draft**
6. **Release impact line**
7. **Fallback note** only if environment limits blocked expected checks

## Quality checks before finalizing

- No command is reported unless it was actually executed.
- Validation depth matches change risk.
- Missing docs or tests are called out explicitly.
- Risks and follow-ups are concrete.

## Guardrails

- Keep the review surface concise and factual.
- Do not overstate confidence when checks were partial.
- Prefer targeted verification over cargo-cult full-suite runs.

## Maintenance notes

- Last reviewed: 2026-03-16
- Refresh when repo scripts, PR expectations, or docs-update rules change.
