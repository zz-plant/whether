# Setup commands

## Toolchain
- **Runtime policy:** Bun is the primary runtime/package manager, and Node.js `>=22` is required for Vinext build/deploy commands.
- Bun 1.3.x (`packageManager` + `engines.bun` in `package.json`)
- Node.js `>=22` (`engines.node` in `package.json`; required by `scripts/vinext-run.mjs`)

## Core repo commands
- Install dependencies: `bun install`
- Start dev server: `bun run dev`
- Build for production: `bun run build`
- Run full quality checks: `bun run check`
- Run lint checks: `bun run lint`
- Run type checks: `bun run typecheck`
- Run tests: `bun run test`
- Run tests in watch mode: `bun run test:watch`
- Test runtime contract: `bun run test` delegates to Bun's native test runner over `./tests` with recursive `.test.ts`/`.test.tsx` discovery; `node:test` and `node:assert/strict` imports are supported via Bun Node compatibility.
- Run Whether MCP server (stdio): `bun run mcp:whether`
- Refresh checked-in fallback snapshots: `bun run data:refresh-fallbacks`

## IDE workspace defaults
- Repo-local VS Code compatible workspace settings live under `.vscode/`.
- `settings.json` pins the editor to the workspace TypeScript version, enables Bun-aware ESLint defaults, and excludes generated artifacts (`.next`, `output`, deploy/build folders) from the default explorer/search/watch loops.
- `tasks.json` exposes the common repo commands (`dev`, `lint`, `typecheck`, `test`, `check`, `build:cloudflare`, `ui:shots`, `mcp:whether`) in the task runner.
- `extensions.json` recommends the baseline extension set for this repo: ESLint, Bun, Tailwind CSS, Playwright, and GitLens.
- `whether-skills.code-snippets` adds repo-local snippets for drafting first-party skills and trigger-test blocks directly in the editor.
- `.roomodes` adds repo-scoped Roo modes that route common Whether work to the right repo-local skills:
  - `whether-briefing`
  - `whether-audit`
  - `whether-research`
  - `whether-skills`

## Default execution profile for agents

Use a minimal tool set first and expand only when a repeated workflow requires it.

Recommended starter MCP servers:
- `filesystem` (repo-scoped only)
- `github` (issues/PR metadata)
- `playwright` (browser validation/screenshots when applicable)
- one trusted `fetch`/`search` server for external research

### Auth and security
- Use environment variables for credentials; never commit tokens or secrets.
- Prefer read-only scopes first; require explicit need before enabling mutating tools.
- Keep allowlists narrow (only required hosts/repos).

### Example env vars
Set only what your MCP client/server combination needs:

```bash
export GITHUB_TOKEN="<token-with-minimum-required-scopes>"
export BRAVE_API_KEY="<optional-search-provider-key>"

# Whether CLI auth for agents/CI
export WHETHER_API_URL="https://api.whether.app"
export WHETHER_API_KEY="<whether-api-key>"

# Preflight (machine-readable)
bun run cli:whether -- auth status --json
```

## Baseline verification after setup
- `bun run lint`
- `bun run test`

If MCP-backed research appears in a deliverable, include URL + retrieval date + confidence.

## Repo-local skills quick start

Available starter skills:
- `research-brief` → structured external research synthesis
- `feature-audit` → remove/move/modify UX/content audits
- `pr-hygiene` → pre-commit and pre-PR validation checks
- `agent-skill-architect` → create/upgrade repo-local skills with clear contracts
- `regime-briefing-operator` → decision-ready weekly/regime briefings
- `signal-provenance-audit` → source URL/timestamp/formula provenance audits
- `executive-brief-pack` → leadership-ready strategy/export brief outputs
- `system-skill-router` → routes skill-management tasks with deterministic sequencing and standardized output sections

Repository path convention:
- `.codex/skills/<skill-name>/SKILL.md`
- skill index: `.codex/skills/README.md`

Usage (tool/runtime dependent):
- invoke by skill name (for example `research-brief`) when the task matches the skill description
- if direct slash invocation is supported by your runtime, use `/research-brief`, `/feature-audit`, `/pr-hygiene`, `/regime-briefing-operator`, `/signal-provenance-audit`, `/executive-brief-pack`, or `/system-skill-router`

When using skill outputs in a deliverable, preserve each skill's output-contract sections so reviewers can verify completeness quickly.

For skill-management requests, start with `system-skill-router` to enforce intent classification, explicit skill declaration, and consistent follow-up guidance.
