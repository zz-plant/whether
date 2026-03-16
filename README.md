# Whether

Whether turns public macro signals into a weekly operating posture for startup and product leaders.

The product loop is:

`signals -> posture -> decision -> artifact`

Everything in this repo should make that loop faster to understand, easier to trust, and easier to share.

## Choose your path

### I need to run the product locally

```bash
bun install
bun run dev
```

Open `http://localhost:3000`.

### I need to validate a change

```bash
bun run lint
bun run test
```

Use `bun run check` for broad or cross-cutting work.

### I need a machine-readable weekly brief

```bash
curl -s "http://localhost:3000/api/agent?cadence=weekly" | jq '{cadence, generatedAt, recordDateLabel, summaryHash}'
```

See [docs/developer/quickstart.md](docs/developer/quickstart.md) for the full integration flow.

### I need contributor guidance

- Human workflow: [CONTRIBUTING.md](CONTRIBUTING.md)
- Agent workflow: [AGENTS.md](AGENTS.md)
- Documentation map: [docs/README.md](docs/README.md)

## What Whether does

- Converts macro market signals into a current operating posture.
- Compresses that posture into bounded decisions for startup leaders.
- Produces artifacts that can be pasted into Slack, meetings, and planning reviews.
- Preserves trust with provenance, freshness markers, and degraded-state handling.

## What Whether is not

- A macro blog.
- A prediction engine.
- A substitute for leadership judgment.
- A platform for explanation-first dashboards.

## Local development

- Runtime: Bun `1.3.x`
- Node: `>=22`
- Install: `bun install`
- Dev: `bun run dev`
- Build: `bun run build`
- Lint: `bun run lint`
- Typecheck: `bun run typecheck`
- Test: `bun run test`
- Full checks: `bun run check`

## High-signal repo areas

- [app/](app/) for routes, UI, and primary user surfaces
- [lib/report/homeBriefModel.ts](lib/report/homeBriefModel.ts) for the homepage brief model
- [lib/report/reportData.ts](lib/report/reportData.ts) for shared report assembly
- [lib/report/decisionKnobs.ts](lib/report/decisionKnobs.ts) for bounded operating rules
- [lib/playbook.ts](lib/playbook.ts) for playbook logic
- [app/operations/components/](app/operations/components/) for export and artifact surfaces

## Documentation entry points

- [docs/README.md](docs/README.md) for the canonical map
- [docs/development-playbook.md](docs/development-playbook.md) for engineering workflow
- [docs/architecture.md](docs/architecture.md) for system boundaries
- [docs/one-screen-weekly-brief-spec.md](docs/one-screen-weekly-brief-spec.md) for the core brief contract
- [docs/developer/README.md](docs/developer/README.md) for integration docs
- [docs/agents/README.md](docs/agents/README.md) for agent-specific guidance

## Product and platform notes

- Whether provides operating guidance, not investment advice.
- Preserve provenance, freshness, and fallback markers whenever you extend data or export surfaces.
- Prefer strengthening existing decision artifacts over creating adjacent surfaces.
