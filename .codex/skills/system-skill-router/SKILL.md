---
name: system-skill-router
description: Deterministically route skill-management requests to `skill-installer` for list or install work and or `skill-creator` for create or update work, with explicit sequencing and fallback behavior.
---

# System skill router

Route skill-management requests to the correct built-in system skill without inventing parallel logic.

## Use this skill when

- a request is about listing installable skills
- a request is about installing a curated skill or a skill from GitHub
- a request is about creating, updating, or refactoring a skill
- a request mixes installation with later customization

## Do not use this skill when

- the task is about using an already-installed repo-local skill for normal work
- the task is a general product or engineering request with no skill-management action

## Deterministic routing

- discovery or install intent -> `skill-installer`
- create or update intent -> `skill-creator`
- install then customize -> `skill-installer` first, then `skill-creator`

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
- Mixed requests use `skill-installer` before `skill-creator`.
- No custom installer logic is invented when `skill-installer` already covers the job.
- Install flows remind the user to restart Codex.

## Fallback behavior

If a required system skill is unavailable or fails:

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
