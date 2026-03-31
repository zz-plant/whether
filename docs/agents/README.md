# Agent docs hub

Task-focused guidance for AI agents and code assistants working in this repository.

The goal is not to read every guide. The goal is to read the minimum set that lets you ship a correct change without drifting from the product loop:

`signals -> posture -> decision -> artifact`

## Fast start

### Minimal setup

```bash
bun install
bun run lint
bun run test
```

### Non-interactive CLI bootstrap

```bash
bun run cli:whether -- install --ci --api-base-url "${WHETHER_API_URL:-http://localhost:3000}" --token "${WHETHER_TOKEN:-}"
```

If config writes are blocked, skip install and use env vars:

```bash
export WHETHER_API_URL="${WHETHER_API_URL:-http://localhost:3000}"
export WHETHER_TOKEN="${WHETHER_TOKEN:-}"
```

### Smoke test

```bash
bun run cli:whether -- --version
bun run cli:whether -- ping --json
bun run cli:whether -- brief --json
```

## Read only what matches the task

### Product-facing UI or decision-flow changes

Read:
- `../../AGENTS.md`
- `project-layout.md`
- `engineering-principles.md`
- `ui-ux-standards.md`
- the relevant product spec from `../`

Usually also inspect:
- `../one-screen-weekly-brief-spec.md`
- `../feature-specs-current.md`

### Data, provenance, or trust changes

Read:
- `../../AGENTS.md`
- `project-layout.md`
- `data-and-platform.md`
- `quality-and-pr.md`

Usually also inspect:
- `../architecture.md`
- `../feature-specs-current.md`

### Docs-only or workflow changes

Read:
- `../../AGENTS.md`
- `documentation.md`
- `quality-and-pr.md`

### Visual iteration or mockup work

Read:
- `../../AGENTS.md`
- `ui-ux-standards.md`
- `../ui-iteration-workflow.md`

Fast path:
- `bun run ui:iterate -- --only operator-brief-mobile,operator-brief-desktop`

### Skill or MCP workflow changes

Read:
- `../../AGENTS.md`
- `mcp-and-skills-playbook.md`
- `documentation.md`

Usually also inspect:
- `../../.codex/skills/README.md`

## Common blockers

- **403/WAF**: verify `"$WHETHER_API_URL/api/health"`; if edge policy blocks CLI routes, use `GET /api/agent?cadence=weekly` from `agent-interface.md`.
- **Missing PATH**: run `bun run cli:whether -- <command>` instead of relying on global `whether`.
- **No package install**: skip CLI bootstrap and pull briefing data directly:
  - `curl -fsS "${WHETHER_API_URL:-http://localhost:3000}/api/agent?cadence=weekly"`

## Guide index

- `setup.md` — local setup commands, quality checks, and MCP baseline
- `project-layout.md` — key directories and ownership boundaries
- `engineering-principles.md` — coding conventions and implementation posture
- `documentation.md` — doc lifecycle, source-of-truth ownership, and update triggers
- `data-and-platform.md` — provenance and platform readiness constraints
- `quality-and-pr.md` — validation depth, commit hygiene, and PR quality bar
- `ui-ux-standards.md` — accessibility, visual consistency, and interaction standards
- `mcp-and-skills-playbook.md` — practical MCP + repo-skill workflows
- `agent-interface.md` — HTTP and MCP entrypoints for agentic integrations

## Decision checklist for every task

- **Scope:** is the change tightly aligned with the request?
- **Decision transmission:** does the change make the output faster to scan, decide on, or share?
- **Trust:** are provenance, freshness, and fallback behaviors preserved?
- **Validation:** did you run the smallest meaningful checks?
- **Documentation:** if behavior or workflow changed, did the canonical doc change too?

## Scope note

These files are contributor-operational guidance. Product and strategy docs are indexed in [docs/README.md](../README.md).

## Keep agent entrypoints in sync

If you add, remove, or rename an agent guide here:

1. Update this README index.
2. Update `../README.md` if canonical routing changes.
3. Update `../../README.md` when contributor onboarding paths change.
