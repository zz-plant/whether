# Whether

Whether turns public macro signals into a weekly operating posture for startup and product leaders.
Each week it answers, fast: what should change right now, how sure we are, and what would flip the call.

The core product loop is:

`signals -> posture -> decision -> artifact`

Everything in this repo should make that loop faster to understand, easier to trust, and easier to share.

---

## Quickstart

### 1) Run locally

```bash
bun install
bun run dev
```

Then open `http://localhost:3000`.

### 2) Validate a change

```bash
bun run lint
bun run test
```

Use `bun run check` for broad or cross-cutting changes.

### 3) Pull a machine-readable weekly brief

```bash
curl -s "http://localhost:3000/api/agent?cadence=weekly" \
  | jq '{cadence, generatedAt, recordDateLabel, summaryHash}'
```

See [docs/developer/quickstart.md](docs/developer/quickstart.md) for the full integration flow.

---

## Product intent

### What Whether does

- Converts macro market signals into a current operating posture.
- Compresses posture into bounded decisions (action, threshold, reversal condition) for startup and product leaders.
- Produces artifacts that can be pasted into Slack, meetings, and planning reviews.
- Preserves trust with provenance, freshness markers, and degraded-state behavior.

### What Whether is not

- A macro blog.
- A prediction engine.
- A substitute for leadership judgment.
- A platform for explanation-first dashboards.

---

## Development commands

| Task | Command |
| --- | --- |
| Install dependencies | `bun install` |
| Start local dev server | `bun run dev` |
| Build production bundle | `bun run build` |
| Lint | `bun run lint` |
| Typecheck | `bun run typecheck` |
| Test | `bun run test` |
| Full checks | `bun run check` |

Runtime expectations:

- Bun `1.3.x`
- Node `>=22`

---

## Contributor paths

- Human workflow: [CONTRIBUTING.md](CONTRIBUTING.md)
- Agent workflow: [AGENTS.md](AGENTS.md)
- Documentation map: [docs/README.md](docs/README.md)

## README guide

Use these README files as entrypoints, then move to the linked canonical docs:

- `README.md` (this file): repo mission, local commands, and high-signal code areas.
- `docs/README.md`: canonical documentation map and source-of-truth boundaries.
- `docs/agents/README.md`: task-routed instructions for coding agents.
- `docs/developer/README.md`: external integration path for API and delivery workflows.

---

## High-signal repo areas

- [app/](app/) for routes, UI, and primary product surfaces
- [lib/report/homeBriefModel.ts](lib/report/homeBriefModel.ts) for weekly brief modeling
- [lib/report/reportData.ts](lib/report/reportData.ts) for report assembly and sourcing
- [lib/report/decisionKnobs.ts](lib/report/decisionKnobs.ts) for bounded operating rules
- [lib/playbook.ts](lib/playbook.ts) for playbook logic
- [app/operations/components/](app/operations/components/) for export and artifact surfaces

---

## Documentation entry points

- [docs/README.md](docs/README.md) for the canonical docs map
- [docs/development-playbook.md](docs/development-playbook.md) for engineering workflow
- [docs/architecture.md](docs/architecture.md) for system boundaries
- [docs/one-screen-weekly-brief-spec.md](docs/one-screen-weekly-brief-spec.md) for the core brief contract
- [docs/developer/README.md](docs/developer/README.md) for integration docs
- [docs/agents/README.md](docs/agents/README.md) for agent-specific guidance

---

## Product and platform notes

- Whether provides operating guidance, not investment advice.
- Preserve provenance, freshness, and fallback markers whenever extending data or export surfaces.
- Prefer strengthening existing decision artifacts over creating adjacent product surfaces.
