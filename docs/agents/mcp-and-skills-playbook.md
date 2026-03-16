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

## When to use a repo-local skill

Use a skill when the task has a repeatable workflow and a stable review shape.

Good candidates:

- research briefs with citations and confidence
- feature or UX audits with a fixed triage matrix
- pre-PR validation and summary generation
- provenance audits with pass or warn criteria
- executive brief generation from existing Whether artifacts

Do not create or invoke a skill just because the task is complicated. If the workflow is one-off, direct reasoning is usually better.

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
