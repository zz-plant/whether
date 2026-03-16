# Documentation map

Use this file to find the current source of truth without reading the whole `docs/` tree.

## Read this first

### If you are changing product behavior

- `one-screen-weekly-brief-spec.md` for the primary brief contract
- `feature-specs-current.md` for shipped product intent
- `architecture.md` for system boundaries and extension points

### If you are changing contributor workflow

- `development-playbook.md` for engineering workflow
- `cli-command-reference.md` for CLI contracts
- `cloudflare-deployment-runbook.md` for deploy behavior

### If you are changing agent workflow or skills

- `../AGENTS.md` for instruction priority and repo constraints
- `agents/README.md` for task-based agent routing
- `agents/mcp-and-skills-playbook.md` for MCP and skill maintenance

### If you are integrating with Whether externally

- `developer/README.md` for the external docs entrypoint
- `developer/quickstart.md` for first integration
- `developer/api-reference.md` for endpoint contracts

## Document types

Use these labels mentally when deciding what to read or update:

- `Canonical`: current source of truth for shipped behavior or workflow
- `Working`: active plan, proposal, or prioritized backlog
- `Evidence`: generated logs, audits, or research snapshots that support decisions but do not define behavior
- `Historical`: older context that may explain why something exists but should not override canonical docs

If a document is not obviously canonical, confirm it against the relevant canonical file before implementing from it.

## Canonical docs by outcome

### Product behavior

- `one-screen-weekly-brief-spec.md` — primary weekly brief contract
- `feature-specs-current.md` — current product surface intent
- `policy-spec-alignment-plan.md` — current policy/spec reconciliation plan
- `editorial-guardrails.md` — copy, claims, and long-form guardrails

### Engineering workflow

- `development-playbook.md` — day-to-day engineering workflow and validation depth
- `architecture.md` — modules, data flow, and extension points
- `stack-compatibility-matrix.md` — runtime and platform constraints
- `domain-and-deployment.md` — deployment topology and domain model
- `cloudflare-deployment-runbook.md` — deploy expectations and evidence capture

### Developer integrations

- `developer/README.md` — outcome-based entrypoint
- `developer/quickstart.md` — first decision-artifact pull
- `developer/api-reference.md` — endpoint catalog and contract notes
- `developer/integrations.md` — operational integration patterns
- `developer/cli-fallback.md` — curl-first fallback flow

### Agent workflow

- `agents/README.md` — minimal read path by task
- `agents/setup.md` — install/run/check commands and MCP baseline
- `agents/project-layout.md` — directory ownership boundaries
- `agents/documentation.md` — documentation lifecycle and update triggers
- `agents/quality-and-pr.md` — validation depth and PR hygiene
- `agents/mcp-and-skills-playbook.md` — skill usage and maintenance rules
- `../.codex/skills/README.md` — repo-local skill index and overlap guide

## Working and planning docs

Use these when shaping follow-on work, not as sole implementation truth:

- `frontend-v2-spec.md`
- `prd-next-level.md`
- `specs-next-level.md`
- `design-improvements-priority.md`
- `agent-accelerated-prioritization-spec.md`
- `information-architecture-proposal.md`
- `implementation-status.md`
- `premium-launch-readiness.md`
- `seo/roadmap.md`
- `seo/quality-gates.md`
- `seo/measurement-model.md`
- `seo/refresh-loop.md`

## Evidence and research docs

Use these to explain why a decision was made or to support a new proposal:

- `research/*.md`
- `evidence/**`
- audits such as `frontend-inefficiencies-audit.md`, `outstanding-issues-audit.md`, and similar review notes

If you promote a finding from one of these documents into product or workflow behavior, update the relevant canonical doc in the same change.

## Maintenance rules

- Prefer updating an existing canonical doc over creating a near-duplicate.
- Link every new active doc from this file and the most relevant audience entrypoint.
- Collapse or delete stale proposal docs once their decisions are absorbed elsewhere.
- Keep evidence logs clearly separate from behavioral guidance.
- When in doubt, optimize for shorter paths to the right document, not more documentation volume.
