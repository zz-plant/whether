---
name: system-skill-router
description: Deterministically route skill-management requests to `skill-installer` (list/install) and/or `skill-creator` (create/update), with explicit sequencing, output contract, and fallback behavior.
---

# System Skill Router

Route requests about Codex skill management to the correct built-in system skill.

## When to use

Use this skill when a request includes any of the following intents:
- discovering available skills,
- installing skills from curated catalogs or GitHub paths,
- creating a new skill,
- editing/refactoring an existing skill,
- improving skill trigger quality or output contracts.

## Deterministic routing table

| User intent | Use skill | Notes |
| --- | --- | --- |
| “What skills can I install?” | `skill-installer` | List curated/available skills first. |
| “Install <skill>” or “install from GitHub” | `skill-installer` | Prefer helper scripts from the installer workflow. |
| “Create a skill” | `skill-creator` | Follow skill anatomy and progressive-disclosure structure. |
| “Update/refactor this skill” | `skill-creator` | Tighten triggers, guardrails, and output contract. |
| “Install then customize” | `skill-installer` then `skill-creator` | Always sequence install/discovery before authoring changes. |

## Required execution sequence

1. **Classify intent** into install/discovery vs create/update.
2. **Declare skill usage** in one line at the top of your response.
3. **Run selected skill workflow** (or both in order when mixed intent).
4. **Return contract-compliant output** (see below).
5. **Close with next action** (for installs: remind to restart Codex).

## Output contract (always include)

1. **Skill(s) used and why** (single sentence)
2. **Actions taken** (listed/installed/created/updated)
3. **Result** (what changed, where)
4. **Follow-up** (next command/user step)
5. **Fallback note** (only when blocked)

## Quality checks before finalizing

- Triggers are specific (avoid vague terms like “help with skills”).
- If both intents exist, ordering is `skill-installer` → `skill-creator`.
- No custom installer logic when `skill-installer` already covers it.
- No generic boilerplate skill drafts when `skill-creator` structure applies.
- Install responses include: “Restart Codex to pick up new skills.”

## Fallback behavior

If a required system skill is unavailable or fails:
- state the exact blocker,
- provide best-effort manual fallback,
- keep the same output contract sections.

## Non-goals

- Acting as a replacement for `skill-installer` or `skill-creator` internals.
- Expanding into unrelated coding/product implementation tasks.
- Creating broad “meta guidance” without a concrete skill-management action.

## Maintenance

- Last reviewed: 2026-03-06
- Refresh triggers and output contract quarterly against:
  - MCP docs: https://modelcontextprotocol.io/introduction
  - Anthropic skills docs: https://docs.anthropic.com/en/docs/claude-code/skills
  - OpenAI docs: https://platform.openai.com/docs
