# Setup commands

## Toolchain
- Node.js 20+ (`.nvmrc`)
- Bun 1.3.x (`packageManager` in `package.json`)

## Core commands
- Install dependencies: `bun install`
- Start dev server: `bun run dev`
- Start dev server (Turbopack): `bun run dev:turbo`
- Build for production: `bun run build`
- Run full quality checks: `bun run check`
- Run lint checks: `bun run lint`
- Run type checks: `bun run typecheck`
- Run tests: `bun test`
- Run tests in watch mode: `bun run test:watch`
- Run Whether MCP server (stdio): `bun run mcp:whether`

## MCP starter profile (contributor baseline)

Use a small MCP set first and expand only when there is a repeated workflow need.

Recommended initial servers:
- `filesystem` (repo-scoped only)
- `github` (issues/PR metadata)
- `playwright` (browser validation/screenshots)
- one trusted `fetch`/`search` server for external research

### Auth and security
- Use environment variables for credentials; do not commit tokens or secrets.
- Prefer read-only scopes first; require explicit opt-in for mutating tools.
- Keep server allowlists narrow (only required hosts/repos).

### Example env vars
Set only what your MCP client/server combination needs:

```bash
export GITHUB_TOKEN="<token-with-minimum-required-scopes>"
export BRAVE_API_KEY="<optional-search-provider-key>"
```

### Suggested verification after setup
- `bun run lint`
- `bun test`

If MCP-backed research is used in a deliverable, include URL + retrieval date + confidence in the final write-up.



## Repo-local skills quick start

Available starter skills:
- `research-brief` → structured external research synthesis
- `feature-audit` → remove/move/modify UX/content audits
- `pr-hygiene` → pre-commit and pre-PR validation checks
- `agent-skill-architect` → create/upgrade repo-local skills with clear contracts
- `regime-briefing-operator` → decision-ready weekly/regime briefings
- `signal-provenance-audit` → source URL/timestamp/formula provenance audits
- `executive-brief-pack` → leadership-ready strategy/export brief outputs

Repository path convention:
- `.codex/skills/<skill-name>/SKILL.md`

Usage (tool/runtime dependent):
- invoke by skill name (for example `research-brief`) when the task matches the skill description
- if direct slash invocation is supported by your agent runtime, use `/research-brief`, `/feature-audit`, `/pr-hygiene`, `/regime-briefing-operator`, `/signal-provenance-audit`, or `/executive-brief-pack`

When using skill outputs in a deliverable, preserve the skill's output contract sections so reviewers can quickly verify completeness.
