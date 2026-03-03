# Agent interface: MCP + skill-aligned handoff

This repo now exposes a dedicated interface for agentic LLM workflows, with two complementary paths:

1. **HTTP endpoint** for generic tool-calling agents.
2. **MCP server** for Model Context Protocol-compatible runtimes.

## Why this approach

Based on the repo playbook (`mcp-and-skills-playbook.md`) and MCP guidance, the practical baseline is:

- keep the interface read-mostly,
- reuse existing summaries and provenance,
- provide structured outputs that map to explicit agent skills,
- avoid introducing parallel business logic.

The implementation therefore wraps existing report pipelines (`weekly/monthly/quarterly/yearly`) and the existing `agentHandoff` payload.

## Option A: HTTP interface

Route: `GET /api/agent?cadence=<weekly|monthly|quarterly|yearly>`

- Defaults to `weekly`.
- Returns summary copy, provenance, and `agentHandoff` (`payload` + `prompt`).
- Returns HTTP 400 for invalid cadence values.
- Includes read-only CORS headers for browser-based tool clients.
- Supports `OPTIONS /api/agent` preflight with `204`.

Machine-discovery routes:

- `GET /llms.txt` provides a plain-text integration guide for autonomous agents.
- `GET /.well-known/whether-agent.json` provides a machine-readable JSON manifest (endpoints, cadences, MCP tools).

### Example

```bash
curl "http://localhost:3000/api/agent?cadence=weekly"
```

## Option B: MCP interface

Script entrypoint:

```bash
bun run mcp:whether
```

This starts a stdio MCP server with tools:

- `get_agent_brief(cadence?)`
  - returns the same structured agent brief as `/api/agent`
- `list_agent_skills()`
  - returns the current Whether skill contract used in payloads
- `pull_recent_site_info(cadence?, siteUrl?)`
  - fetches the latest `/api/agent` payload from the site so an agent can pull recent live context

### Example MCP client config (shape)

```json
{
  "mcpServers": {
    "whether": {
      "command": "bun",
      "args": ["run", "mcp:whether"]
    }
  }
}
```

## Skills contract alignment

The returned payload includes `skills` from `lib/agentSkills.ts`, so agent runtimes can:

- map expected outputs by skill id,
- preserve output order for deterministic downstream processing,
- keep prompting concise while maintaining structure.

## Recommended usage pattern for agent builders

1. Call `list_agent_skills` once per session (or cache by commit hash).
2. Call `get_agent_brief` per cadence needed.
3. Generate outputs in the order declared by `skills`.
4. Keep provenance and source URLs attached in any user-facing response.

## Production monitoring endpoints

- `GET /api/health` exposes monitor-friendly service status for synthetic probes.
  - Returns `200` for `ok` and `503` for `degraded`/`down`.
  - Includes treasury data freshness metadata (`fetchedAt`, `ageHours`, `staleAfterHours`).
- `scripts/prod-synthetic-smoke.mjs` runs baseline route + schema assertions against a deployed site.
  - CI schedule: `.github/workflows/prod-synthetic-smoke.yml` (every 10 minutes + manual dispatch).
