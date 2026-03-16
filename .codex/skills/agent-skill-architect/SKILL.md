---
name: agent-skill-architect
description: Create or upgrade Whether repo-local skills when users ask to add or update SKILL.md files, tighten triggers, reduce overlap, or improve output contracts and maintenance guidance.
allowed-tools:
  - Read
  - Grep
  - WebFetch
  - Bash
---

# Agent skill architect

Improve first-party Whether skills so they are easier to trigger correctly, easier to review, and less likely to drift from repo policy.

## Use this skill when

- a task asks to create a new skill in `.codex/skills/*`
- a current skill is too broad, too vague, or overlapping another skill
- a reviewer asks for stronger output contracts, guardrails, or maintenance guidance
- the repo needs a better skills index or skill discovery aid

## Do not use this skill when

- building a product feature
- rewriting broad contributor docs without changing skills
- creating a catch-all meta skill instead of tightening current coverage

## Required inputs

- the job to be done in one sentence
- the target user or operator of the skill
- overlapping repo-local skills, if any
- repo constraints from `AGENTS.md` and `docs/agents/*`

## Repo anchors

- `AGENTS.md`
- `docs/agents/README.md`
- `docs/agents/documentation.md`
- `docs/agents/mcp-and-skills-playbook.md`
- `.codex/skills/README.md`

## Workflow

1. Define the skill's single repeatable job.
2. Check current repo-local skills for overlap before creating new scope.
3. Write trigger-specific frontmatter with least-privilege tool access.
4. Draft the skill in a fixed order:
   - use this skill when
   - do not use this skill when
   - required inputs
   - repo anchors
   - workflow
   - output contract
   - quality checks
   - guardrails
   - maintenance notes
5. Add trigger tests with at least two should-use and two should-not-use prompts.
6. Update `.codex/skills/README.md` if discovery guidance changed.

## Output contract

Return in this order:

1. **Skill used + why**
2. **Intent statement**
3. **Overlap check**
4. **Skill spec**
5. **Trigger test**
6. **Risk notes**
7. **Validation checklist**

## Quality checks before finalizing

- The skill covers one repeatable workflow, not multiple jobs.
- Trigger language is specific enough to avoid accidental activation.
- Output sections are fixed and reviewable.
- Repo anchors point to current canonical docs.
- Tool permissions are no broader than necessary.

## Guardrails

- Prefer extending or tightening an existing skill over creating a near-duplicate.
- Make evidence requirements explicit for research-heavy workflows.
- Do not claim checks were run unless they were actually executed.
- Do not use a skill to hide missing repo documentation; fix the docs too when needed.

## Maintenance notes

- Last reviewed: 2026-03-16
- Refresh when agent workflow, docs routing, or repo-local skill coverage changes.
