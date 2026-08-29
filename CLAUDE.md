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
| `bun run check` | ~40s | lint + typecheck + test + assets + audit + preflight, concurrently. Pre-merge only. |
| `bun run audit` | ~2s | `bun audit --audit-level=critical`. Highs are dev-only transitives; see `run-checks.mjs`. |

Package manager is `bun`. Dev server: `bun run dev`. Prefer the targeted test + `typecheck`
pair while iterating; save `bun run check` for pre-merge. `check` runs its tasks concurrently and
reports every failure in one pass; add `--serial` for fail-fast sequencing when debugging it.

`check` also runs automatically on `git push` via `.husky/pre-push`, and since 2026-08-22 that hook
is the check gate rather than a mirror of one: the GitHub workflows are manual-only, because this
private repo's Actions minutes are billed and the account stopped paying for them. Skipping the hook
means pushing unverified. Skip it with `SKIP_PREPUSH=1 git push` or `git push --no-verify`. Note that
this worktree is often shared with other sessions, so a pre-push failure may be someone else's
in-flight edit rather than yours — check `git status` first. The hook covers lint, typecheck, test,
assets, and `hotspot-preflight`, and deliberately omits `audit`, which needs the network — run
`bun run check` before a merge to pick that one up. Cloudflare Workers Builds still builds and
deploys every push, which is the only remote gate left.

### Scheduled automation

The recurring data jobs run as scheduled Claude Code routines, not GitHub Actions. Each one runs
the same scripts the old workflow did, opens a PR, and never merges it.

| Routine | Cadence (UTC) | Produces |
| --- | --- | --- |
| Whether — regime history refresh | Mon 12:00 | `data/summary_archive.json`, `summary_monthly_regime_history.json`, `monthly_summaries_2012_2025.json` |
| Whether — weekly Slack brief refresh | Mon 13:00 | `docs/briefs/latest-weekly-slack-brief.md` |
| Whether — weekly brief freeze | Thu 13:00 | the week appended to `data/published_briefs.json` |

The site no longer waits on any of them to show a current month. The Worker cron records the month
in progress to KV on every run (`lib/summary/refreshMonthlyRegimeHistory.ts`), and the read path
merges it over the bundled snapshot, so the month rail stays current between deploys. The regime
history routine still regenerates the canonical month-end series and the archive the scripts own —
it is the rebuild, not the critical path.

Manage them at <https://claude.ai/code/routines>. When an expected PR does not appear, check the
routine's run log there before assuming nothing changed — a quiet week and a failed run look the
same from the repo. Every one of these jobs previously failed at its PR step while reporting green,
so the routines are told to end a run with `FAILED` rather than claim success without a PR.

These routines run in a sandbox whose egress proxy denies hosts by policy, and the data pipeline
needs three of them: `fred.stlouisfed.org`, `home.treasury.gov`, and `query1.finance.yahoo.com`.
Without the allowlist the first FRED fetch fails with `connect_rejected` — a 403 on CONNECT, not
from FRED. Three routines all reporting FAILED with a 403 is the egress policy, not the data.

**"The run stops before touching a file" was not true of the brief freeze** (corrected 2026-08-29).
Every FRED fetch 403s, `loadReportDataSafe` falls back to the bundled snapshot, and report assembly
*succeeds* — so `degraded`, which is `!reportResult.ok`, stays false. `scripts/freezeWeeklyBrief.ts`
guarded only on `degraded`, so it ran to completion on stale data: a live run on 2026-08-29 froze
week `2026-w25` from a `2026-06-17` record date, ten weeks old, and exited 0. A wrong record in
`data/published_briefs.json` is not recoverable in the way that matters — the archive is append-only
and citable, so the correction is visible forever.

`lib/report/briefPublishGuard.ts` now judges readiness on the flags that actually move under an
outage — `isFallback`, `isLive`, and the age of the record date — and exits non-zero, so the routine
reports FAILED instead of publishing a stale week. **If you are debugging a routine that writes data,
check what it does on fallback, not only what it does on error.**

All four data-writing scripts were audited against a real outage on 2026-08-29 (FRED returning 403
for every series). Two shared the defect; two were already correct:

| Script | Behavior under a total live-data outage | |
| --- | --- | --- |
| `scripts/freezeWeeklyBrief.ts` | wrote week `2026-w25` from a `2026-06-17` record date, exit 0 | fixed |
| `scripts/generateWeeklySlackBrief.ts` | wrote the June snapshot under a "Weekly Brief" heading, exit 0 | fixed |
| `scripts/generateMonthlySummaries.ts` | throws on the first FRED failure, exit 1, no writes | already safe |
| `scripts/refreshFallbackSnapshots.ts` | `fetchTreasuryData()` without `snapshotFallback` throws, exit 1, no writes | already safe |

The two safe ones fetch FRED directly, so a 403 is an error. The two broken ones went through
`loadReportData`, where falling back to the bundled snapshot is a *success*. That is the tell: a
script is at risk exactly when it reads through a loader that degrades gracefully.

`generateWeeklySlackBrief.ts` takes `--allow-fallback` for local or offline artifact generation,
which writes but stamps the output `NOT LIVE DATA` with the reason. The scheduled routine passes no
flag, so it fails loudly.

Why `data/published_briefs.json` holds a single week: the routine has not completed a good run since.
That archive is **not backfilled**, deliberately. Its value is that it is evidence the call was
published every week; writing retroactive `publishedAt` stamps for weeks that were never published
would fabricate exactly the cadence it exists to prove, and `/history` now shows those numbers to
visitors. The archive fills forward, once the allowlist lets a real run through.

Cloudflare's build is the remote gate. `scripts/vinext-run.mjs` runs lint, typecheck, test, and
assets before building **on preview builds only** — a pull request's build fails red if the suite
does, while the production branch and any build with an unknown branch skip the gate, so a flaky
test can never block a deploy. Every build logs which way it went (`[vinext-run] check gate: …`).

The workflow files under `.github/workflows/` are kept as manual (`workflow_dispatch`) fallbacks for
a missed run or a restored Actions budget. Running both would open two PRs, not corrupt anything.

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
`app/operate/components/` · `app/signals/`

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
