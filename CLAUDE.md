# CLAUDE.md

Operational entrypoint. **Read [AGENTS.md](AGENTS.md) before non-trivial work** — it holds the
product stance, hard rules, and decision framework that govern what a *good* change looks like here.
This file only covers mechanics: commands, costs, and where things live.

## Commands and what they cost

| Command | Time | When |
| --- | --- | --- |
| `bun run test <path>` | ~0.2s | Default loop. Runs only that file. |
| `bun run test -t "<name>"` | ~1s | Filter by test name across the suite. |
| `bun run test` | ~40s | 800 tests / 166 files. Before commit, not per-edit. |
| `bun run typecheck` | ~9s | Cheap. Run after any type-surface change. |
| `bun run lint` | ~24s | Before commit. |
| `bun run check` | ~40s | lint + typecheck + test + assets + preflight, run concurrently. Pre-merge only. |

Package manager is `bun`. Dev server: `bun run dev`. Prefer the targeted test + `typecheck`
pair while iterating; save `bun run check` for pre-merge. `check` runs its tasks concurrently and
reports every failure in one pass; add `--serial` for fail-fast sequencing when debugging it.

`check` also runs automatically on `git push` via `.husky/pre-push`, because GitHub Actions is not
a guaranteed backstop — it goes dark whenever the account hits a billing hold, taking every
workflow with it. Skip it with `SKIP_PREPUSH=1 git push` or `git push --no-verify`. Note that this
worktree is often shared with other sessions, so a pre-push failure may be someone else's in-flight
edit rather than yours — check `git status` first.

### Agent-workflow tooling (`scripts/agent-workflow.mjs`)

| Command | What it does |
| --- | --- |
| `bun run agent:doctor` | Preflight: branch, dirty-worktree, relevant `AGENTS.md`, task-profile check. |
| `bun run agent:route -- "<task>"` | Recommends docs, first files, and minimum checks for a task. |
| `bun run agent:handoff -- --job "<job>"` | Generates a canonical subagent handoff packet with repo defaults. |
| `bun run agent:index` | Refreshes the repo cache under `artifacts/agent/`. |
| `bun run agent:prewarm` | Checks LM Studio, warms the fast local model role, refreshes the repo cache. |

Details: [docs/agents/mcp-and-skills-playbook.md](docs/agents/mcp-and-skills-playbook.md).

### UI capture / mockups

| Command | What it does |
| --- | --- |
| `bun run ui:iterate` | Screenshot-driven UI loop — starts dev server if needed, captures targets, writes a gallery to `artifacts/ui/`. Use with `-- --only <targets>` to narrow. |
| `bun run ui:iterate:list` | Lists available capture targets. |
| `bun run ui:shots` | Raw capture only (skips dev-server management) — use if you already have one running. |
| `bun run ui:mockups` | Prints mockup URLs for local exploration. |

Use the `whether-ui-loop` skill instead of running these ad hoc — it sequences capture, review, and
recapture correctly.

### Review and agent-interface tooling

| Command | What it does |
| --- | --- |
| `bun run review:hotspot-preflight` | Runs as part of `bun run check`; flags high-risk files needing extra review. |
| `bun run review:comment-trends` | Summarizes recurring PR review comment patterns from GitHub. |
| `bun run mcp:whether` | Starts a stdio MCP server (`get_agent_brief`, `list_agent_skills`, `pull_recent_site_info`) — see [docs/agents/agent-interface.md](docs/agents/agent-interface.md). |
| `bun run smoke:prod` | Runs post-deploy synthetic smoke checks against the production site. |

## Where things live

Canonical modules — extend these before creating new ones:

- **Weekly brief / homepage** — `app/page.tsx`, `app/components/DecisionHero.tsx`,
  `lib/report/homeBriefModel.ts`, `lib/report/reportData.ts`, `lib/report/decisionKnobs.ts`
- **Bounded rules / playbooks** — `lib/playbook.ts`, `lib/report/operatingCalls.ts`,
  `lib/thresholds.ts`, `lib/regimeEngine.ts`
- **Trust / continuity** — `lib/report/trustStatus.ts`, `lib/report/reportFormatting.ts`,
  `lib/timeMachine/*`
- **Operator-domain catalog** — `lib/decisionDomainCatalog.ts`
- **Navigation IA** — `lib/navigation/informationArchitecture.ts`

Layout: `app/` routes + UI, `lib/` logic, `tests/` suites, `scripts/` tooling, `data/` fallback
snapshots, `docs/` specs.

## Nested AGENTS.md — check before editing these

`lib/report/` · `app/components/weekly-card/` · `app/components/home/` ·
`app/planning/components/` · `app/evidence/`

## Docs routing

`docs/agents/README.md` routes by task type. Open **one** guide that matches the task rather than
reading the set. Product specs live in `docs/`.

## Repo gotchas

- **Keep the root clean.** One-off QA dumps (`*.png` / `*.yml`, `output/`, `scratch/`,
  `.playwright-cli/`) are gitignored and were purged in Aug 2026 — don't recreate them. Write
  scratch output to a temp dir, not the repo root.
- **Architectural invariants** (read deadlines, cron not self-fetching, materialized history) are
  listed in AGENTS.md and are load-bearing. Don't relax them casually.
- **UI work** has dedicated skills: `whether-ui-loop` (screenshot iteration) and
  `whether-ui-standards`. Use them instead of editing CSS blind.
- **Other repo-local skills** live under `.claude/skills/` — see
  [.claude/skills/README.md](.claude/skills/README.md) for the full index (research briefs, feature
  audits, PR hygiene, provenance audits, executive briefs, skill authoring, subagent handoffs, React/
  Next.js performance rules). These are mirrored at `.codex/skills/` for the Codex runtime; keep both
  in sync when editing.
- Use `rg` for discovery; avoid `ls -R` and `grep -R`.
