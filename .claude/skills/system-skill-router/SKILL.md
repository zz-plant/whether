---
name: system-skill-router
description: Deterministically route skill-management requests to the right built-in mechanism for create/update work, with explicit sequencing and fallback behavior.
---

# System skill router

Route skill-management requests to the correct built-in mechanism without inventing parallel logic.

**Runtime note:** this skill was originally written for Codex, where `skill-installer` and
`skill-creator` are built-in system skills. Claude Code has no `skill-installer` equivalent — there is
no curated skill marketplace to install from here. For create/update work in this repo, use
`agent-skill-architect` (repo-local) or the global `anthropic-skills:skill-creator` skill if it's
available. Do not tell the user to "restart Codex" in a Claude Code session.

## Use this skill when

- a request is about creating, updating, or refactoring a repo-local skill
- a request is about discovering which repo-local skills already exist (point at
  `.claude/skills/README.md`)

## Do not use this skill when

- the task is about using an already-installed repo-local skill for normal work
- the task is a general product or engineering request with no skill-management action

## Deterministic routing (Claude Code)

- discovery intent -> read `.claude/skills/README.md`
- create or update intent -> `agent-skill-architect`, or the global `anthropic-skills:skill-creator`
  skill if the user wants a non-repo-local skill

## Workflow

1. Classify the request as install or discovery, create or update, or both.
2. Declare which system skill or skills are being used and in what order.
3. Run the selected workflow.
4. Return the required output contract.
5. End with the next user action.

## Output contract

Return in this order:

1. **Skill or skills used and why**
2. **Actions taken**
3. **Result**
4. **Follow-up**
5. **Fallback note** only if blocked

## Quality checks before finalizing

- Trigger classification is specific, not vague.
- Create/update work goes through `agent-skill-architect` (or `anthropic-skills:skill-creator` for
  non-repo-local skills) rather than inventing custom logic.
- Discovery requests point at `.claude/skills/README.md`, not a fabricated install flow.

## Fallback behavior

If a required skill or mechanism is unavailable or fails:

- state the exact blocker
- provide the best manual fallback you can
- keep the same output contract

## Guardrails

- Do not replace the internals of the system skills.
- Do not expand into unrelated implementation work.
- Keep routing logic explicit and minimal.

## Maintenance notes

- Last reviewed: 2026-03-16
- Refresh when system skill capabilities or repo-local skill workflows change.
