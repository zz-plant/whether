---
name: subagent-handoff
description: Generate a bounded Whether subagent handoff packet with explicit write scope, repo anchors, verification, and return contract.
---

# Subagent handoff

Create a delegation packet that a Whether subagent can execute without rediscovering scope or drifting from repo policy.

## Use this skill when

- a task should be delegated to a subagent
- the main agent already understands the target surface and needs a clean handoff
- a delegated task needs a stable packet with write scope, checks, and return shape

## Do not use this skill when

- the task is still ambiguous and the main agent has not shaped it yet
- the work is tightly coupled enough that the main agent should keep it local
- the request is about creating or editing a skill rather than handing work off

## Required inputs

- one-sentence job
- why the delegated work matters now
- observable done condition
- exact write scope
- relevant repo anchors
- minimum verification
- out-of-scope boundaries

## Repo anchors

- `AGENTS.md`
- `docs/agents/README.md`
- `docs/agents/mcp-and-skills-playbook.md`
- `.codex/skills/README.md`

## Workflow

1. Confirm the task is already shaped and bounded.
2. Choose the lightest execution mode: direct reasoning, skill, or subagent.
3. If delegation is still warranted, write the packet in the canonical Whether order:
   - Job
   - Why now
   - Done when
   - Out of scope
   - Write scope
   - Read anchors
   - Constraints
   - Verification
   - Return contract
4. If the work matches a repo-local skill, name that skill and preserve its output contract.
5. Keep read anchors to the minimum set that prevents drift.

## Output contract

Return in this order:

1. **Delegation decision**
2. **Task profile**
3. **Handoff packet**
4. **Open risks**

## Quality checks before finalizing

- The packet gives the subagent one job, not multiple jobs.
- The write scope is explicit.
- The done condition is observable.
- Verification is specific.
- The return contract names changed files, command outcomes, and open risks.

## Guardrails

- Do not delegate initial ambiguity.
- Do not broaden scope beyond the shaped task.
- Do not omit repo anchors when semantics could drift.
- Do not invent a custom packet shape when the canonical Whether packet works.

## Maintenance notes

- Last reviewed: 2026-04-14
- Refresh when delegation rules, repo anchors, or helper scripts change.
