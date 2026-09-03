# CLAUDE.md

Operational entrypoint. **Read [AGENTS.md](AGENTS.md) before non-trivial work** — it holds the
product stance, hard rules, and decision framework that govern what a *good* change looks like here.
This file only covers mechanics: commands, costs, and where things live.

## Commands and what they cost

| Command | Time | When |
| --- | --- | --- |
| `bun run test <path>` | ~0.2s | Default loop. Runs only that file. |
| `bun run test -t "<name>"` | ~1s | Filter by test name across the suite. |
| `bun run test` | ~40s | 1,100+ tests / 205 files. Before commit, not per-edit. `BUN_TEST_RANDOMIZE=1` shuffles like the gate; `BUN_TEST_SEED=<n>` replays a gate failure. |
| `bun run typecheck` | ~5s | TypeScript 7 (native). Run after any type-surface change. |
| `bun run lint` | ~1s | oxlint, syntactic. The gate. Config in `.oxlintrc.json`. |
| `bun run lint:types` | ~5s | oxlint type-aware (tsgolint). Advisory: run before a PR; not in the gate (see toolchain notes). |
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

### Toolchain notes (2026-09-02)

- **Lint is oxlint, at parity with the ESLint config it replaced.** `.oxlintrc.json` carries
  the React and Next plugins, the two file-size budgets, and the `lib/report/home` import fence.
  Oxlint's `correctness` category also brings rules ESLint never enforced here; the ones with
  pre-existing findings on 2026-09-02 are switched off in the config so the swap changed the
  tool, not the policy. Tighten one rule per PR, largest first. `no-unused-vars` (83: 49 unused
  imports, 34 declarations, 46 files) was burned down and enforced on 2026-09-03, along with
  `no-useless-escape` (12), `no-extra-boolean-cast` (3), `no-useless-rename` (2), and
  `no-irregular-whitespace` (1) — all four auto-fixable and semantics-preserving. Eleven more
  closed the same week: the three `unicorn/*` rules, `react/purity`, `react/refs`,
  `nextjs/no-html-link-for-pages`, `jsx-a11y/label-has-associated-control` (11), and the four
  single-finding a11y rules. **71 findings remain across 5 rules**:
  `jsx-a11y/prefer-tag-over-role` (31), `react/set-state-in-effect` (26), `react/no-danger` (12),
  and one finding each in `jsx-a11y/control-has-associated-label` and
  `jsx-a11y/no-noninteractive-element-interactions`.

  The last two are single false positives, which is why they stay off. The
  `control-has-associated-label` finding is a link in `planningExecutionStepper.tsx` whose name
  comes from its dynamic children — adding an `aria-label` would override the visible text and
  make it worse. The `no-noninteractive-element-interactions` one is `TimelineBar`'s
  `role="region"` wrapper handling arrow keys; `role="toolbar"` satisfies the rule but costs a
  named landmark a screen-reader user can jump to, which is a bad trade for one finding.

  Enabling a rule with a scoped exception is fine and is now visible: `nextjs/no-html-link-for-pages`
  is enforced repo-wide and `off` for `app/layout.tsx` alone, because `/feed.xml` is a route handler
  serving a file and `<Link>` would client-navigate to a feed. The census counts that override as a
  suppression rather than treating it as configuration — otherwise silencing a rule per-file would
  be the cheapest way past the gate.

  **`jsx-a11y/prefer-tag-over-role` is not a mechanical burn-down — do not batch it.** Ten of
  its 32 findings are inline `<svg role="img" aria-labelledby=…>`, which is the recommended
  pattern for accessible inline SVG; an `<svg>` cannot become an `<img>`, so "fixing" them
  removes the accessible name and the rendering both. Several more are behavioural rewrites
  rather than lint fixes — `role="slider"` to `<input type="range">`, `role="progressbar"` to
  `<progress>`, `role="dialog"` to `<dialog>`. Only the `role="button"`, `role="region"`, and
  `role="search"` cases are straightforward. Take it per-finding or leave it off.
  ESLint and `eslint-config-next` are gone, which is also what let TypeScript move to 7:
  typescript-eslint was the only consumer of the compiler API, which TS 7 does not ship until 7.1.

  **`max-lines` and `no-restricted-imports` are not part of that queue.** Both are `off` at the
  top level only so an `overrides` block can apply them where they matter — the two file-size
  budgets and the `lib/report/home` import fence. Turning either on globally is a policy choice
  about a threshold, not a burn-down.

  **Measuring one rule: do not trust `oxlint -D <rule> | grep '(<rule>)'`.** Oxlint prints a
  plugin finding as `react(no-danger)`, not `react/no-danger`, and `nextjs/*` rules print under
  `next(...)`. A grep for the config's spelling matches nothing and every plugin rule reads as
  zero findings — which on 2026-09-03 produced a confident "16 rules are already clean" against
  a tree that had 100 findings in them. Enable the rule and count `error <plugin>(<rule>):`
  from a full run instead.
- **Suppressions are themselves a gated metric.** `bun run check:suppressions`
  (`scripts/check-suppression-census.ts`) counts inline lint disables, `@ts-*` comments, skipped
  tests, and globally-disabled lint rules against an inline baseline, and fails when any rises.
  It exists because every other ratchet here — the rule burn-down, `lint:types`, the suite — can
  be turned green by suppressing the finding rather than fixing it, and nothing else in the gate
  notices. A burn-down that trades a lint finding for a disable comment now moves one number down
  and this one up, and is rejected. Baseline as of 2026-09-03: 7 lint suppressions, 3 type
  suppressions, 0 skipped tests, 5 disabled rules, 1 override-disabled rule, and a floor of 206
  test files. Lower it in the script when work earns it; raising one is a policy change and belongs
  in its own PR.
- **`lint:types` is advisory, not a gate — yet.** Type-aware oxlint (`oxlint-tsgolint` 7.0.2001)
  adds `no-floating-promises`, `no-base-to-string`, and the type-constituent rules, and reports 28
  pre-existing findings; a PR must not raise that number. Three consecutive runs in each mode
  gave identical results, but one earlier run in the same session reported findings later runs
  did not and could not be reproduced. Promote it into the gate after a week of identical runs.
- **The gate shuffles test order.** `scripts/run-tests.mjs` passes `--randomize` under
  `WHETHER_DEPLOY_GATE=1`; bun prints `--seed=<n>` at the end of every run, and
  `BUN_TEST_SEED=<n> bun run test` replays the container's order locally. The runner also strips
  `FRED_API_KEY` and `ALPHA_VANTAGE_API_KEY` from the suite's environment, so a key in a shell
  cannot route a fixture-driven test to a real upstream.
- **Zod is pinned to 4.4.3.** 4.5.x changes schema types in a way `@modelcontextprotocol/sdk`
  1.30's tool registration does not accept (`ZodString` is not assignable to its `AnySchema`);
  `scripts/mcp/whether-mcp-server.ts` stops typechecking. Revisit with the MCP SDK v2 migration.
- **Provider keys and trial switches.** `FRED_API_KEY` routes FRED reads to the API (JSON,
  ALFRED vintages via `fetchFredRows(..., { asOf })`); `ALPHA_VANTAGE_API_KEY` routes the SaaS
  comps median to Alpha Vantage; `GITHUB_TOKEN` lets the regime-history Workflow open its PR.
  `WHETHER_INGEST_COORDINATOR=1` and `WHETHER_HISTORY_WORKFLOW=1` switch on the Durable Object
  ingest coordinator and the Workflow; both are set on `env.preview` only. Details:
  `docs/cloudflare-deployment-runbook.md` ("Secrets", "Trial infrastructure") and
  `docs/agents/data-and-platform.md`.

### Scheduled automation

The recurring data jobs run as scheduled Claude Code routines, not GitHub Actions. Each one runs
the same scripts the old workflow did, opens a PR, and never merges it.

| Routine | Cadence (UTC) | Produces |
| --- | --- | --- |
| Whether — regime history refresh | Mon 12:00 | `data/summary_archive.json`, `summary_monthly_regime_history.json`, `monthly_summaries_2012_2025.json` |
| Whether — weekly brief refresh & freeze | Mon 13:00 | `docs/briefs/latest-weekly-slack-brief.md`, `artifacts/weekly-slack-brief.txt`, and current week appended to `data/published_briefs.json` |

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
Two more once the provider keys are set: `api.stlouisfed.org` (FRED API, `FRED_API_KEY`) and
`www.alphavantage.co` (SaaS comps, `ALPHA_VANTAGE_API_KEY`); without a key each read stays on the
keyless host it always used.
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

Cloudflare's build is the remote gate, and it gates **production too**. The build command
configured in Workers Builds is `bun run check:vinext`, and since 2026-09-02 that script *is* the
deploy gate: `WHETHER_DEPLOY_GATE=1 bun scripts/run-checks.mjs lint typecheck test assets`, then
`WHETHER_DEPLOY_GATE=1 bun scripts/run-checks.mjs landmarks` on its own. So every push, `main`
included, runs lint, typecheck, the suite, and the asset check, and then the landmark audit,
before anything is built or deployed. The audit runs second and alone because it spawns a dev
server and compiles every route against it; on a small box a server competing with lint, tsc,
and the suite for cores turns a slow route into one that "never answered". **A failing test does
block a deploy.**

Until 2026-09-02 `check:vinext` was plain `bun run check`, which is the wrong gate for that
container in three ways, and the deploy-gate rules this repo already had never reached it: the
suite ran with workstation defaults (8 workers, 60s ceiling) on a box where this repo documents
those defaults as flaky; `tests/tools/` ran, which shells out to `python3` the build image does not
guarantee; and `audit` (network) and `hotspot-preflight` (git history) ran where neither has what it
needs. `WHETHER_DEPLOY_GATE=1` is what switches `scripts/run-tests.mjs` to 2 workers, a 120s
ceiling, and no `tests/tools/`, and what gives the landmark audit's readiness and per-route bounds
room for a cold start (180s / 60s instead of 90s / 30s). The runner also pins `NODE_ENV=test` for the
suite it spawns: `bun test` only defaults it when unset, and a build container that sets
`NODE_ENV=production` runs the suite in production mode, where `programmaticPayloadBuilder` stops
relaxing its freshness contract and fails on fallback data. Those rules had only ever applied inside
`scripts/vinext-run.mjs`'s inner gate — a step the build reaches *after* the outer command has
already passed. `audit` and `hotspot-preflight` still run on pre-push (preflight) and in
`bun run check` (both); they are excluded from the deploy path, not from the repo.

This paragraph used to say the opposite — that the production branch skips the gate, so "a flaky
test can never block a deploy" — and that sentence cost two days. Builds failed on all 27 commits
from 2026-08-31 to 2026-09-01 while the doc said they couldn't, so nobody read the build log; the
site served Aug-30 code for two days and the fix had to be deployed by hand. The confusion is that
there are *two* gates. `scripts/vinext-run.mjs` does skip lint/typecheck/test/assets on the
production branch, and still logs which way it went (`[vinext-run] check gate: …`) — but that gate
guards `vinext-run build`, which CI only reaches *after* `bun run check` has already passed. The
inner gate never decides whether a deploy happens.

Two things that made a red build hard to read, both fixed 2026-09-01:

- `run-checks.mjs` buffers each task's output until it exits, and had no per-task timeout, so one
  hung task stalled the gate silently until Cloudflare's 30-minute ceiling — "Build took too long"
  was the whole diagnosis. Tasks are now bounded (`CHECK_TASK_TIMEOUT_MS`, default 10m) and a
  timeout reports a named failure with the child's output.
- The landmarks audit fetched routes with no timeout, which is what hung. Bounded per route
  (`--route-timeout-ms`, default 30s). A timed-out route fails the check rather than joining the
  `unauditable` bucket, which only warns — otherwise a container that reaches no route at all would
  report "0 violations" and go green.

**If a local `check` passes and the remote build fails, suspect ordering or environment, not the
doc.** `mock.module` patches the module registry process-wide, so a test file can pass only because
another file ran first and installed its mock; CI orders the suite differently. Run the file alone
(`bun run test <path>`) before concluding it is fine. Environment includes the network: Cloudflare's
container reaches Treasury and often FRED, a sandboxed session reaches neither, and the read path
*writes* when an ingest brings something back. Invariant 1 ("reading performs zero writes") ran a
cold store against the real network, so it passed here and failed every container build from
2026-08-30 to 2026-09-02 — the earlier tests had ingested a rates-only model into `.cache/ingestion`,
the KV store read it through a file fallback it no longer has, and the read took the refresh lock.
A test about writes has to serve its own upstreams (see `readWithStore` in
`tests/architectureInvariants.test.ts`).

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

`lib/report/` · `app/components/home/` · `app/operate/components/` · `app/signals/`

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
