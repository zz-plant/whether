# Agent docs hub

Task-focused guidance for AI agents and code assistants working in this repository.

The goal is not to read every guide. The goal is to read the minimum set that lets you ship a correct change without drifting from the product loop:

`signals -> posture -> decision -> artifact`

## AX fast path

Start here when you want the fastest correct repo orientation:

1. read `../../AGENTS.md`
2. read this file
3. open exactly one task-specific guide from the router below
4. find the canonical module or doc before broad search
5. run the smallest meaningful validation for the touched surface

If you will delegate work to a subagent, also read the delegation packet in `mcp-and-skills-playbook.md` before handing work off.

Long-form reasoning behind repo rules lives in `lessons/` (toolchain and gates, automation and the
deploy gate, tests and copy, dead features and honesty, regime scoring); `hot-files.md` lists the
files most work lands in. Open the one that matches the task.

Useful helpers:
- `bun run agent:doctor`
- `bun run agent:route -- "<task>"`
- `bun run agent:route -- --local "<task>"`
- `bun run agent:handoff -- --job "<job>"`
- `bun run agent:index`
- `bun run agent:prewarm`

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
bun run cli:whether -- agent --compact --json
```

Notes:
- If `bun run dev` shifts off `http://localhost:3000`, the CLI will auto-discover a healthy local Whether API on nearby localhost ports by default.
- Use `bun run cli:whether -- doctor --json` to confirm the configured vs resolved API base URL and auth source.

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
- `../../.claude/skills/README.md` — the canonical skill index; `.codex/skills/` is generated from
  `.claude/skills/` for the Codex runtime by `bun run skills:sync` (edit only the canonical side)
- `../../.roomodes` if you are using Roo workspace modes

### If you plan to delegate

Do this before spawning or briefing a subagent:

- shape the task locally first; do not outsource initial ambiguity
- limit the handoff to one bounded job with a clear done condition
- pass only the relevant file paths, repo anchors, constraints, and checks
- require changed files, validation, and open risks in the return

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
- `mcp-and-skills-playbook.md` — practical MCP + repo-skill workflows, including the canonical subagent handoff packet
- `agent-interface.md` — HTTP and MCP entrypoints for agentic integrations

If you are using Roo, repo-scoped workspace modes live in `../../.roomodes` and route common Whether jobs to the matching repo-local skills.

## Decision checklist for every task

- **Scope:** is the change tightly aligned with the request?
- **Decision transmission:** does the change make the output faster to scan, decide on, or share?
- **Trust:** are provenance, freshness, and fallback behaviors preserved?
- **Validation:** did you run the smallest meaningful checks?
- **Delegation:** if work was handed off, was the task packet bounded enough to review fast?
- **Documentation:** if behavior or workflow changed, did the canonical doc change too?

## Scope note

These files are contributor-operational guidance. Product and strategy docs are indexed in [docs/README.md](../README.md).

## Keep agent entrypoints in sync

If you add, remove, or rename an agent guide here:

1. Update this README index.
2. Update `../README.md` if canonical routing changes.
3. Update `../../README.md` when contributor onboarding paths change.
