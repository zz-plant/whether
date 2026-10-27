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
- Agent preflight doctor: `bun run agent:doctor`
- Agent task router: `bun run agent:route -- "<task>"`
- Subagent handoff packet generator: `bun run agent:handoff -- --job "<job>"`
- Agent repo index builder: `bun run agent:index`

## Other scripts

Commands no gate runs and no other guide covers. None of them deploys or sends anything.

| Command | What it does |
| --- | --- |
| `bun run clean` | Deletes `.next`, `.wrangler`, `out` and the contents of `dist/`, plus stray `dist 2`-style copies. |
| `bun run build:fresh` | `clean`, then `build`: rules out a stale artifact when a build behaves oddly. |
| `bun run lint:fix` | `oxlint --fix`: applies oxlint's safe fixes in place. Review the diff before committing. |
| `bun run ui:shots:list` | The capture targets `ui:shots` knows, one per line (id, label, path). |
| `bun run eval:cold-reader` | A local model with no context reads `/` and the answer pages as a first visitor; its answers are checked against `/api/agent?view=state`. Uses a model already resident in Ollama (never loads one) and a running dev server; `-- --allow-missing` exits 0 when either is absent. Exit 1 means a page failed to say what it meant to. Advisory. |
| `bun run assets:visuals` | Regenerates the visual kit under `public/visual-assets/` offline; `-- --check` reports drift without writing. Needs `rsvg-convert` (Homebrew librsvg). |
| `bun run assets:video` | Renders the MP4, poster and captions for a frozen week (`-- --week YYYY-wNN`, default the latest) into `public/videos/briefs/` and records it in `data/brief_videos.json`. Needs `ffmpeg`. |
| `bun run advice-corpus:extract` / `:prefilter` / `:classify` | The advice-corpus stages between `:discover` and `:validate`. They read the fetched archives (and `:classify` the local model) into an uncommitted cache. Protocol: `docs/research/advice-corpus-results.md`. |
| `bun run advice-corpus:data` | Regenerates `data/advice-corpus/monthly.json` from `posts.json` (`-- --from-labels` rebuilds `posts.json` from the cache first); `advice-corpus:check` is its `--check`. |
| `bun run reviewed-cases:list` | Lists the human labels `reviewed-cases:add` recorded; see `docs/developer/decision-models.md`. |
| `python3 scripts/perf/audit_page_load_times.py` | curl timings (DNS, TLS, TTFB, total) for production routes, seven runs each, printed as JSON. No package script. Seven of its eight URLs (`/evidence`, `/planning/*`, `/methodology`, `/guides`, `/solutions`) are renamed routes that now redirect, and curl without `-L` times the redirect, so update `URLS` before trusting a number. |

## IDE workspace defaults
- Repo-local VS Code compatible workspace settings live under `.vscode/`.
- `settings.json` pins the editor to the workspace TypeScript version, runs the oxlint fixer (the oxc extension) on save, and excludes generated artifacts (`.next`, `output`, deploy/build folders) from the default explorer/search/watch loops.
- `tasks.json` exposes the common repo commands (`dev`, `lint`, `typecheck`, `test`, `check`, `build:cloudflare`, `ui:shots`, `mcp:whether`) in the task runner.
- `extensions.json` recommends the baseline extension set for this repo: oxc (oxlint), Bun, Tailwind CSS, Playwright, and GitLens. The repo moved from ESLint to oxlint on 2026-09-02.
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
export WHETHER_API_URL="https://whether.work"
export WHETHER_API_KEY="<whether-api-key>"

# Preflight (machine-readable)
bun run cli:whether -- auth status --json
bun run cli:whether -- doctor --json
```

CLI ergonomics notes:
- `whether status --compact` is the fastest shell read for the current operating call.
- `whether agent --compact --json` gives agents a smaller structured handoff than the full `/api/agent` payload.
- Local CLI runs auto-discover a healthy Whether API on common localhost dev ports when the default `http://localhost:3000` is unavailable.
- `bun run agent:index` refreshes `artifacts/agent/file-map.json`, `artifacts/agent/skills-map.json`, and `artifacts/agent/test-map.json` for faster routing.

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
- `subagent-handoff` → bounded delegation packets with read anchors, checks, and return shape
- `regime-briefing-operator` → decision-ready weekly/regime briefings
- `signal-provenance-audit` → source URL/timestamp/formula provenance audits
- `executive-brief-pack` → leadership-ready strategy/export brief outputs
- `system-skill-router` → routes skill-management tasks with deterministic sequencing and standardized output sections
- `vercel-react-best-practices` → React/Next.js performance rules for rendering, bundling, server, and async code
- `whether-ui-loop` → screenshot-driven UI iteration with `bun run ui:iterate`
- `whether-ui-standards` → UI/UX rules for anything that renders under `app/`

Repository path convention (runtime-dependent — see below):
- Claude Code: `.claude/skills/<skill-name>/SKILL.md`, index at `.claude/skills/README.md` — canonical
- Codex: `.codex/skills/<skill-name>/SKILL.md`, index at `.codex/skills/README.md` — generated

Edit skills under `.claude/skills/` only, then run `bun run skills:sync`, which regenerates
`.codex/skills/` from it plus the per-runtime overlay in `.codex/skills-overlay/` (the Codex
`system-skill-router`, which routes to Codex's built-in installer, and `web-design-guidelines`,
which Claude Code already gets from a global plugin). `tests/skillsMirror.test.ts` fails when
`.codex/skills/` has drifted from what the sync writes.

Usage (tool/runtime dependent):
- invoke by skill name (for example `research-brief`) when the task matches the skill description
- if direct slash invocation is supported by your runtime, use `/research-brief`, `/feature-audit`, `/pr-hygiene`, `/subagent-handoff`, `/regime-briefing-operator`, `/signal-provenance-audit`, `/executive-brief-pack`, `/system-skill-router`, or `/vercel-react-best-practices`

When using skill outputs in a deliverable, preserve each skill's output-contract sections so reviewers can verify completeness quickly.

For skill-management requests, start with `system-skill-router` to enforce intent classification, explicit skill declaration, and consistent follow-up guidance.
