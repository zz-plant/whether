---
name: agent-skill-architect
description: Create or upgrade Whether repo-local skills when users ask to add/update SKILL.md files, codify best practices, tighten triggers, or improve output contracts and guardrails.
allowed-tools:
  - Read
  - Grep
  - WebFetch
  - Bash
---

# Agent skill architect (Whether)

## Use this skill when

- A task asks to create a new skill in `.codex/skills/*`.
- A skill is too generic, overlapping, or hard to trigger correctly.
- A reviewer asks for stronger output contracts, safety limits, or maintenance guidance.

## Inputs expected

- Task goal and target audience.
- Existing skills that may overlap.
- Repo conventions from `AGENTS.md` and `docs/agents/*`.

## Workflow

1. Define one job-to-be-done in one sentence.
2. Check overlap with existing skills; extend instead of duplicating when possible.
3. Write frontmatter that is trigger-specific (`name`, `description`, and repo-used `allowed-tools`).
4. Draft sections in fixed order (below) with explicit required outputs.
5. Add guardrails and non-goals to prevent overreach.
6. Add maintenance notes (`last reviewed`, key references, drift risks).
7. Run a trigger test with 2 should-use + 2 should-not-use prompts.

## Output contract

Return in this order:

1. **Skill intent statement**
2. **Skill spec** (ready to paste in `SKILL.md`)
3. **Trigger test** (2 positive, 2 negative)
4. **Risk notes** (overlap, stale guidance, tool permissions)
5. **Validation checklist**

## Guardrails

- Keep one skill focused on one repeatable workflow.
- Prefer least-privilege tools; add mutation tools only when required.
- Make evidence requirements explicit for research-heavy skills (URL + retrieval date + confidence).
- Do not claim checks were run unless they were actually executed.

## Non-goals

- Building product features.
- Rewriting unrelated docs.
- Creating broad catch-all “meta skills”.

## Maintenance notes

- Last reviewed: 2026-02-23
- Refresh quarterly against:
  - MCP docs: https://modelcontextprotocol.io/introduction
  - Anthropic skills docs: https://docs.anthropic.com/en/docs/claude-code/skills
  - OpenAI docs: https://platform.openai.com/docs
