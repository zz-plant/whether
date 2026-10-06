# CLAUDE.md

Operational entrypoint. **Read [AGENTS.md](AGENTS.md) before non-trivial work** — it holds the
product stance, hard rules, and decision framework that govern what a *good* change looks like here.
This file only covers mechanics: commands, costs, and where things live.

## Commands and what they cost

| Command | Time | When |
| --- | --- | --- |
| `bun run test <path>` | ~0.2s | Default loop. Runs only that file. |
| `bun run test -t "<name>"` | ~1s | Filter by test name across the suite. |
| `bun run test` | ~14s | 2,500+ tests / 360+ files. Before commit, not per-edit. `BUN_TEST_RANDOMIZE=1` shuffles like the gate; `BUN_TEST_SEED=<n>` replays a gate failure. |
| `bun run typecheck` | ~5s | TypeScript 7 (native). Run after any type-surface change. |
| `bun run lint` | ~1s | oxlint, syntactic. The gate. Config in `.oxlintrc.json`. |
| `bun run lint:types` | ~5s | oxlint type-aware (tsgolint). In `check` and pre-push since 2026-09-16; not in the deploy gate. |
| `bun run check` | ~50s | lint + typecheck + test + assets + audit + preflight + landmarks, concurrently. Pre-merge only. The landmark audit is now the long pole. |
| `bun run audit` | ~2s | `bun audit --audit-level=critical`. Highs are dev-only transitives; see `run-checks.mjs`. |
| `bun run check:dead-exports` | ~0.4s | Exports nothing references, against a baseline of zero. In `check`, pre-push, and the deploy gate. |

Package manager is `bun`. Dev server: `bun run dev`. Prefer the targeted test + `typecheck`
pair while iterating; save `bun run check` for pre-merge. `check` runs its tasks concurrently and
reports every failure in one pass; add `--serial` for fail-fast sequencing when debugging it.

`check` also runs automatically on `git push` via `.husky/pre-push`, and since 2026-08-22 that hook
is the check gate rather than a mirror of one: the GitHub workflows are manual-only, because this
private repo's Actions minutes are billed and the account stopped paying for them. Skipping the hook
means pushing unverified. Skip it with `SKIP_PREPUSH=1 git push` or `git push --no-verify`.

**The hook clears git's exported environment before running the gate, and must keep doing so.**
Git hands every hook `GIT_DIR`, `GIT_INDEX_FILE`, and friends, and every `git` the gate shells out
to inherits them — which silently redirects those calls at the pushing repository.
`tests/checkGateMarker.test.ts` builds a throwaway repo with `git init` and gets this one instead;
`review:hotspot-preflight` resolves `HEAD~1` against the wrong index. Both pass standalone and fail
only under the hook, so the symptom reads as flakiness. Reproduce it with
`GIT_DIR=$PWD/.git bun run test tests/checkGateMarker.test.ts`. Note that
this worktree is often shared with other sessions, so a pre-push failure may be someone else's
in-flight edit rather than yours — check `git status` first. The hook covers lint, typecheck, test,
assets, and `hotspot-preflight`, and deliberately omits `audit`, which needs the network — run
`bun run check` before a merge to pick that one up. Cloudflare Workers Builds still builds and
deploys every push, which is the only remote gate left.

## Read before you touch (the long reasoning lives in `docs/agents/lessons/`)

This file used to carry every dated post-mortem inline (about 97KB). Each is in its own file now;
open the one that matches the task instead of reading them all.

| Touching… | Read |
| --- | --- |
| lint, suppressions, dead-export census, suite runner, telemetry streams, a red gate | [toolchain-and-gates](docs/agents/lessons/toolchain-and-gates.md) |
| a routine, brief freeze, email/Slack send, Cloudflare build, "green here, red there" | [automation-and-deploy-gate](docs/agents/lessons/automation-and-deploy-gate.md) |
| reader-facing strings, source-reading tests, page-vs-page claims | [tests-and-copy-rules](docs/agents/lessons/tests-and-copy-rules.md) |
| a new module, an API field, share/OG/SEO metadata, a cache, a warning banner, runway | [dead-features-and-honesty](docs/agents/lessons/dead-features-and-honesty.md) |
| `lib/regimeEngineCore.ts`, confidence, anything printing a score or delta | [regime-scoring](docs/agents/lessons/regime-scoring.md) |
| choosing a first file | [hot-files](docs/agents/hot-files.md) |

### Rules that catch changes here (one line each; the lesson files hold the why)

- **No `as` casts and no new lint suppressions.** `review:hotspot-preflight` and the suppression census reject both. Narrow, or parse `unknown` with zod.
- **A new export needs a real caller.** The dead-export census is at zero and also flags modules only a test imports.
- **`mock.module` stubs spread the real module** (`{ ...nextNavigation, useRouter }`). It is process-wide; the next file pays.
- **Reader-facing copy comes from `lib/report/`** and the naming table in `lib/report/AGENTS.md`. No engine keys, crawler or infrastructure words.
- **Ask what it publishes on fallback, not only on error.** A loader that degrades gracefully reports success.
- **Check the undrawn fields.** A value computed and rendered nowhere is where invented data survives.
- **Read a default's comment before calling it a defect.** Rendering tells you what a reader sees, not whether someone chose it.
- **Render before asserting** for UI: `whether-ui-loop`, or `renderToStaticMarkup` where the page renders offline.

### When a check fails and you don't know why

1. `git status` — the worktree is shared; the failure may be someone else's in-flight edit.
2. Run the file alone: `bun run test <path>`.
3. Replay the shuffled order: `BUN_TEST_SEED=<n> bun run test` (the seed prints at the end of a run).
4. Green here and red on Cloudflare: suspect environment (credentials, network, stale `public/`), not the diff. Reproduce the container.
5. Skipping the pre-push hook (`SKIP_PREPUSH=1`) means pushing unverified. Say why in the PR and run `bun run check` yourself.

### Session hygiene

- The SessionStart hook unshallows a shallow clone, so `git log` / `git blame` see real history.
- `bun run agent:route -- "<task>"` before broad searching: it names docs, first files and minimum checks.
- When a fix changes documented behaviour, update the matching doc in the same commit
  (`docs/feature-specs-current.md` drifts fastest).

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
| `bun run review:hotspot-preflight` | Runs as part of `bun run check`; flags high-risk files needing extra review. Default range is the last commit **plus** uncommitted changes; `--base <sha>` is commit-to-commit and sees no dirty tree; `--working-tree` is uncommitted only. The printed range says which. On pre-push, `.husky/pre-push` scopes it to the commits the push actually sends (`scripts/pre-push-range.mjs` reads git's stdin plan), so it neither judges other sessions' uncommitted work nor misses commits 2..n of a multi-commit push. |
| `bun run audit:jev-copy` | Advisory, needs a running server and Workers AI credentials: asks Jev (`typesafe/jev`) the 2026-09-22 copy audit's four questions of every sentence on the reader routes; `-- --mode brief` asks whether the generated brief contradicts the latest published call. Exits non-zero if any Jev call failed. Not in the gate — the suite is offline and a model's answer is not a check. Jev is never used for the call itself. |
| `bun run telemetry:streams` | Rows per Analytics Engine stream over a window, with each stream's consumer. A stream at zero is dead code or a broken emitter. |
| `bun run review:comment-trends` | Summarizes recurring PR review comment patterns from GitHub. |
| `bun run mcp:whether` | Starts a stdio MCP server (`get_agent_brief`, `list_agent_skills`, `pull_recent_site_info`) — see [docs/agents/agent-interface.md](docs/agents/agent-interface.md). |
| `bun run smoke:prod` | Runs post-deploy synthetic smoke checks against the production site. |

## Where things live

Canonical modules — extend these before creating new ones:

- **Weekly brief / homepage** — `app/page.tsx`, `app/components/DecisionHero.tsx`,
  `lib/report/homeBriefModel.ts`, `lib/report/reportData.ts`, `lib/report/decisionKnobs.ts`
- **Bounded rules / playbooks** — `lib/playbook.ts`, `lib/report/operatingCalls.ts`,
  `lib/thresholds.ts`, `lib/regimeEngine.ts`
- **Company calibration (stage, runway)** — `lib/report/operatorStage.ts`,
  `lib/report/operatorRunway.ts`, `buildScopedVariantDecisionAdjustment` and
  `scaleAdjustmentToRunway` in `lib/report/boundedDecisionRules.ts`; one cookie each, read by
  `lib/report/operatorContext.ts`
- **Share artifacts** — `/share` owns every copy, file and image format; builders in
  `lib/export/*` (`briefBuilders`, `investorUpdateSnippet`, `portfolioNote`, `meetingSlideExport`,
  `boardSlideDeck`). The page reads `lib/report/weeklyBriefSnapshot.ts`; the slide and image
  routes read `lib/export/exportSnapshot.ts`. Both resolve the stored operating snapshot first,
  so they draw the same week unless report assembly falls back
- **Alerts between Mondays** — `lib/alert/*`: `alertEvaluator` decides, `flashMoves` judges
  raw-input moves against the previous snapshot, `checkRegimeChange` posts Slack,
  `alertDelivery` mails subscribers
- **Trust / continuity** — `lib/report/trustStatus.ts`, `lib/report/reportFormatting.ts`,
  `lib/timeMachine/*`
- **Agent surfaces** — the state (`lib/agentState.ts`, served at `/api/agent?view=state`), and every tool an
  agent can call in `lib/agent/tools.ts`: the two MCP transports (`lib/mcp/`), the `/api/mcp?tool=` shim, the
  manifest and `/llms.txt` all read it, and `tests/agentDiscoveryParity.test.ts` holds them to it. Add a tool
  there, once. Inputs and refusals: `lib/agent/inputs.ts`.
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
- **FRED marks a missing observation with an empty CSV field, not only `"."`.** `Number("")`
  is `0`, so any parser that guards only against the dot reads a market holiday as a zero print.
  Seven month-ends in `data/time_machine_cache.json` carried all-zero yields, and the stress
  veto's trailing VIX mean was pulled down by holiday zeros, until 2026-09-14. Route every FRED
  value through `isMissingFredValue` (`lib/fred.ts`); the archive generators share one parser in
  `scripts/regimeArchiveContext.ts` for the same reason.
- Use `rg` for discovery; avoid `ls -R` and `grep -R`.
