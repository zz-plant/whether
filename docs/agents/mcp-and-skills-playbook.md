# MCP and agent skills playbook

Practical guidance for using MCP tools and repo-local skills in Whether without creating tool sprawl or vague skill behavior.

## What matters in this repo

Tools and skills should strengthen one of these outcomes:

- faster access to the right repo or external context
- clearer, more repeatable task execution
- more reviewable outputs with explicit evidence and risk handling

They should not create parallel systems, duplicate existing docs, or encourage broad speculative work.

## Default tool posture

Start small and expand only when the task actually needs more capability.

Recommended baseline:

- `filesystem` for repo-scoped reads and writes
- `github` for issue and PR metadata
- `playwright` for browser validation or screenshot work
- one trusted `fetch` or `search` tool for external research

Guardrails:

- prefer read-only access first
- use env-based auth only
- keep host allowlists narrow
- avoid mutating tools unless the task needs them

## Decide the execution mode first

Pick the lightest mechanism that still gives a reliable result:

- use direct reasoning for one-off work, tightly coupled edits, or ambiguous discovery
- use a repo-local skill for repeatable jobs with a stable output contract
- use a subagent for bounded work that can run in parallel with clear ownership

Do not use delegation as a substitute for task shaping.
Do not use a skill when the job has no stable review shape.

If a delegated subtask also matches a repo-local skill, name that skill in the handoff so the subagent preserves the expected output contract.

## When to use a repo-local skill

Use a skill when the task has a repeatable workflow and a stable review shape.

Good candidates:

- research briefs with citations and confidence
- feature or UX audits with a fixed triage matrix
- pre-PR validation and summary generation
- provenance audits with pass or warn criteria
- executive brief generation from existing Whether artifacts

Do not create or invoke a skill just because the task is complicated. If the workflow is one-off, direct reasoning is usually better.

## Main-agent vs subagent responsibilities

Keep these boundaries explicit:

- the main agent owns scope, product intent, conflict resolution, and final synthesis
- the subagent owns a bounded slice of execution inside a declared scope
- the main agent decides whether the result is integrated, revised, or discarded

Subagents should not invent new product surfaces, reinterpret core semantics, or expand scope unless the handoff explicitly allows it.

## Current first-party skills

See [../../.codex/skills/README.md](../../.codex/skills/README.md) for the current index.

Core roles:

- `research-brief` for source-grounded external research
- `feature-audit` for remove or move or modify product audits
- `pr-hygiene` for verification depth and PR-ready summaries
- `regime-briefing-operator` for weekly or regime decision briefs
- `signal-provenance-audit` for trust, freshness, and formula audits
- `executive-brief-pack` for citation-backed leadership artifacts
- `agent-skill-architect` for creating or upgrading repo-local skills

## Skill quality bar

Every first-party skill should define:

- clear should-use and should-not-use boundaries
- required inputs and repo anchors
- a fixed workflow
- an output contract in a stable order
- quality checks before finalizing
- guardrails and fallback behavior
- maintenance metadata so stale skills are easy to spot

## Canonical subagent handoff packet

Use this structure when handing work to a subagent:

```text
Job
- one sentence on the exact task

Why now
- why this matters to the current user request

Done when
- observable completion condition

Out of scope
- what the subagent must not change or decide

Write scope
- files or directories it may edit

Read anchors
- the 2-5 docs or modules it must use to avoid drift

Constraints
- product rules, terminology, UX, or implementation constraints

Verification
- the minimum commands or checks to run

Return contract
- changed files
- commands run and outcomes
- open risks, drift, or follow-ups
```

This is the default Whether handoff shape because it keeps delegated work reviewable and prevents vague “go explore” tasks.

Helper commands:

- `bun run agent:route -- "<task>"` for the recommended docs, first files, and minimum checks
- `bun run agent:route -- --local "<task>"` to let the local LM Studio model pick a known task profile using the cached repo index, with deterministic fallback
- `bun run agent:doctor` for branch, dirty-worktree, relevant `AGENTS.md`, and task-profile preflight
- `bun run agent:handoff -- --job "<job>"` to generate the canonical packet with repo defaults
- `bun run agent:index` to refresh the repo cache under `artifacts/agent/`
- `bun run agent:prewarm` to check LM Studio, warm the fast local model role, and refresh the repo cache

The task profiles these route to (docs, first files and checks per profile) live in
`scripts/agent-workflow.config.mjs`; the routing engine in `scripts/agent-workflow-lib.mjs` names
nothing about this repo. `--skill <name>` anchors `.claude/skills/<name>/SKILL.md`, the canonical
skills directory, and the index lists the skills found there.

## Context compression rules for delegation

Pass enough context to prevent drift, but not so much that the subagent has to re-orient from scratch.

- prefer canonical file paths over long prose summaries
- pass the target surface, not the whole repo map
- include the relevant constraint or product rule verbatim if it is easy to misapply
- cap read anchors to the minimum set that makes incorrect work unlikely
- name assumptions explicitly instead of hiding them in a long brief

Avoid:

- dumping broad repo history
- asking the subagent to rediscover the target file
- mixing multiple unrelated jobs into one handoff
- leaving verification or return shape unspecified

## Good and bad delegation patterns

Bad:

- “Look through the report pipeline and decide what to improve.”
- “Fix whatever is wrong with the homepage.”
- “Review these docs and make them better.”

Better:

- “Tighten `docs/agents/README.md` so a new agent can find the right guide in under a minute; do not add new docs; verify links manually and report changed files plus risks.”
- “Update `.codex/skills/README.md` to clarify overlap between `feature-audit` and `research-brief`; do not change any `SKILL.md`; return the exact wording changes and any remaining ambiguity.”

## Skill design rules for Whether

### 1) Optimize for decision transmission

If a skill produces a long explanation without helping someone decide what to do next, the skill is under-specified.

### 2) Prefer bounded outputs

Outputs should include actions, thresholds, reversals, evidence, or release recommendations where appropriate. Avoid generic advisory language.

### 3) Use repo anchors

Skills should point at the canonical docs or modules they rely on. This reduces drift and makes review faster.

### 4) Keep triggers narrow

A skill that triggers on every vaguely similar task is a maintenance bug.

### 5) Separate evidence from interpretation

Research and audit skills should make it obvious which statements are observed facts and which are recommendations or inference.

## How to improve an existing skill

1. Confirm the skill solves one repeatable job.
2. Check for overlap with another skill before adding new scope.
3. Tighten the trigger language using positive and negative examples.
4. Strengthen the output contract so reviewers can compare runs quickly.
5. Add repo anchors and verification expectations.
6. Record maintenance notes and likely drift risks.

If the workflow now covers two distinct jobs, split the skill instead of expanding it indefinitely.

## Common failure modes

- vague trigger language that over-fires
- output contracts that allow inconsistent deliverables
- missing repo anchors, causing policy or terminology drift
- skills that say to run checks but never define which checks
- skills that duplicate docs instead of routing to the right canonical doc
- subagent handoffs with no write scope, no done condition, or no return contract
- delegated tasks that should have stayed with the main agent because they were still ambiguous

## Maintenance loop

Review first-party skills when:

- a PR review surfaces repeated output-quality issues
- a workflow changes in `AGENTS.md` or `docs/agents/*`
- a skill produces repeated overlap or routing confusion
- canonical product language changes

When you update a skill, also update:

- [../../.codex/skills/README.md](../../.codex/skills/README.md) if discovery guidance changed
- [README.md](README.md) if the recommended read path changed
- [documentation.md](documentation.md) if doc ownership or update triggers changed

When you update delegation guidance, also update:

- [../../AGENTS.md](../../AGENTS.md) if repo-wide agent rules changed
- [README.md](README.md) if the fast-path routing changed
