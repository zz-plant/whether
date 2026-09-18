# CLAUDE.md

Operational entrypoint. **Read [AGENTS.md](AGENTS.md) before non-trivial work** — it holds the
product stance, hard rules, and decision framework that govern what a *good* change looks like here.
This file only covers mechanics: commands, costs, and where things live.

## Commands and what they cost

| Command | Time | When |
| --- | --- | --- |
| `bun run test <path>` | ~0.2s | Default loop. Runs only that file. |
| `bun run test -t "<name>"` | ~1s | Filter by test name across the suite. |
| `bun run test` | ~14s | 1,900+ tests / 297 files. Before commit, not per-edit. `BUN_TEST_RANDOMIZE=1` shuffles like the gate; `BUN_TEST_SEED=<n>` replays a gate failure. |
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

### Toolchain notes (2026-09-02)

- **Lint is oxlint, at parity with the ESLint config it replaced.** `.oxlintrc.json` carries
  the React and Next plugins, the two file-size budgets, and the `lib/report/home` import fence.
  Oxlint's `correctness` category also brings rules ESLint never enforced here. The backlog that
  was switched off at the swap has been worked down: as of 2026-09-02 `no-unused-vars` (84),
  every `jsx-a11y` rule (50), `no-useless-escape` (12), `no-extra-boolean-cast`,
  and `no-useless-rename` are all **enforced at zero**.
  Seven more were enforced on 2026-09-03: `unicorn/no-thenable` (5), `react/refs` (4),
  `nextjs/no-html-link-for-pages` (3), `react/purity` (2), `unicorn/no-new-array` (1),
  `no-irregular-whitespace` (1), and `unicorn/no-useless-fallback-in-spread` (1). That last one
  was recorded here as blocked, because its only finding sat on a line carrying an `as` cast that
  `review:hotspot-preflight` would then count as newly added. It is not blocked: Next augments the
  global `RequestInit` with `next`, so the whole expression collapses to `...init?.next` and the
  cast goes with the fallback.

  **`react/no-danger` is enforced from 2026-09-16.** All fourteen findings were
  `<script>` tags holding JSON — structured data, and one JSON island the page reads back — which
  is the case the rule cannot tell from an HTML injection and the one React offers no other API
  for. They are now a single `app/components/jsonLdScript.tsx`, so a rule disabled across the whole
  repo became a disable on one line someone has read. The suppression census records that trade
  (lint suppressions 7 -> 8, disabled rules 2 -> 1) with the argument in the baseline. It also
  tightened one thing: every payload goes through `serializeJsonLd`, and `briefArtifactScript` had
  been escaping only `<`, so a line separator in any string it carried was a parse error in the
  embedded JSON.

  **`react/set-state-in-effect` is enforced from 2026-09-17, and no lint rule is off any more.**
  It was the last one, with 22 findings across 19 files, and they were three different problems:

  | Shape | Count | What it took |
  | --- | --- | --- |
  | Reads a browser-only source on mount (localStorage, a cookie, a DOM island, a generated client id) | 11 | `useSyncExternalStore` through `app/components/browserSource.ts` |
  | A value the render already had, mirrored back through an effect | 7 | Derive it; the effect was a second render to reach it |
  | An edit that has to survive until a prop moves | 4 | Stamp the edit with the baseline it was made against |

  What made it "not something to flip blind" was the first row: nothing in this suite exercises a
  client effect, and adding a DOM to get one is a far larger change than the fix. The way round it
  is that a store's one catastrophic failure mode is pure. React calls `getSnapshot` on every
  render and re-renders whenever the reference differs, so a snapshot that allocates — `JSON.parse`,
  a spread — never settles; an effect's worst case was one extra render, a store's is an infinite
  one. So the caching lives in one module and `tests/browserSource.test.ts` pins its properties
  without a DOM: stable reference, lazy first read, the server snapshot rendered through hydration,
  notify only on a real change, one `window` listener per source however many components read it.

  Two details a module-singleton store gets wrong by default, both pinned there:
  `refreshOnSubscribe` for a source the *page* owns rather than the tab (a DOM island the next route
  renders differently — a cache that never re-reads serves the previous route's brief where the
  mount effect read again), and refcounting the watch on the listener set (handing the teardown to
  whoever subscribed first means the first consumer to unmount stops watching for everyone still
  mounted).

  Two conversions were worth more than the rule. Where a visit **overwrites the slot it reads** —
  both "since you were last here" panels — read and write now sit in the module that owns the slot
  and the read is taken explicitly first, instead of surviving on the order of two statements in one
  effect. And `thresholdsPanel` had three effects racing for one form (the prop, the saved draft,
  the audit trail), so which won depended on effect order; precedence is stated once, in render.

  Two rules are enforced everywhere except a named set of files, which the suppression census
  counts rather than treating as configuration:
  `nextjs/no-html-link-for-pages` is off for `app/layout.tsx`, where `/feed.xml` is a route handler
  serving a file that `<Link>` would client-navigate to; and `jsx-a11y/prefer-tag-over-role` is off
  for `TimelineBar.tsx` and `scrollProgressBar.tsx`, whose `role="region"` and `role="progressbar"`
  wrappers would cost a named landmark or a UA-styled `<progress>` to satisfy. (This paragraph used
  to name `evidenceSections.tsx`, which the config never listed; the third entry was
  `AppSidebar.tsx`, and it stopped being needed when that file's dead `role="dialog"` drawer was
  deleted.)
- **Product code carries a file-size budget.** `max-lines` is enforced at 800 effective lines
  (blank lines and comments skipped) across `app/**` and `lib/**`. It is deliberately not applied
  to `scripts/**` or `tests/**`, where a budget only invites fake overrides. The pre-existing
  900-line exemptions for `weeklyDecisionCard.tsx` and `homePageAssembler.ts` are ordered after
  the budget so they still win. Nine files sit between 500 and 800; 500 is the ratchet target.
  ESLint and `eslint-config-next` are gone, which is also what let TypeScript move to 7:
  typescript-eslint was the only consumer of the compiler API, which TS 7 does not ship until 7.1.
- **Suppressions are themselves a gated metric.** `bun run check:suppressions`
  (`scripts/check-suppression-census.ts`) counts inline lint disables, `@ts-*` comments, skipped
  tests, lint rules disabled globally, and lint rules an `overrides` block turns off, against an
  inline baseline — and fails when any of them rises. It exists because every other ratchet here —
  the rule burn-down, `lint:types`, the suite — can be turned green by suppressing the finding
  rather than fixing it, and nothing else in the gate notices. A change that trades a lint finding
  for a disable comment now moves one number down and this one up, and is rejected.

  The override category matters as much as the inline one: a rule set to `error` and scoped `off`
  for a handful of files is a suppression with a wider blast radius than a disable comment, and
  before this it moved no number at all. Baseline as of 2026-09-03: 7 lint suppressions, 3 type
  suppressions, 0 skipped tests, 2 disabled rules, 2 override-disabled rules, and a floor of 212
  test files. Lower it in the script when work earns it; raising one is a policy change and belongs
  in its own PR with the reason.
- **An unused export is a gated metric too (2026-09-15).** `bun run check:dead-exports`
  (`scripts/check-dead-exports.ts`) counts exported declarations under `app/`, `lib/` and
  `worker/` that no other scanned file mentions, against a baseline of **zero**. A sweep that
  day found 556 of them — 232 runtime, 324 types — plus nine modules nothing imported, and
  nothing in the gate had noticed: an unused export is not a lint finding, not a type error,
  and not a failing test, it is surface every reader has to rule out before trusting a module.
  "Referenced" is deliberately cheap (the name appears as an identifier in another file, across
  every source, config and workflow extension this repo uses), which mostly over-counts, so a
  reported orphan is nearly always real — but it is a scan, not a proof: a symbol reached only
  through a runtime string, or named only from a file type the scan does not read, shows as dead.
  If it fails on an export you know is live, widen the scan rather than deleting the export. The
  names Next.js and the Workers runtime consume by convention are exempt. It runs in `bun run check`,
  on pre-push, and in the deploy gate.

  **The scan refuses an unreadable tree rather than scoring it.** Every verdict it makes is "no
  other file mentions this name", so a checkout it cannot fully read reports *more* dead exports,
  not fewer: a container missing `tests/` would condemn hundreds of live exports and the failure
  would read as a real finding. That is the landmark audit's trap from the other side, where a
  container reaching no route at all would have reported zero violations and gone green. So the CLI
  names any required reference root that comes back empty and exits without a count, and `statSync`
  is guarded in both scans — a dangling symlink, or a path that vanishes between the `readdirSync`
  and the stat, used to crash the census instead of skipping one entry. Unit scaffolds are exempt
  by design (`requireCompleteTree`): a two-file tree is what they measure.

  **It now counts orphaned data files too, and a test does not count there (2026-09-16).** A JSON
  file declares no exports, so the export census cannot see it: a dataset every consumer was
  deleted from scores zero findings and goes on looking like part of the product.
  `censusOrphanedDataFiles` walks `data/` and `content/` and matches each filename, with and without
  its extension, against every reference root *except* `tests/` — plus `docs/`, because a dataset a
  runbook names by filename has a consumer, it is just not a compiler. Excluding tests is the whole
  reason it finds anything: `data/` is what the product ships and reads, so a file there whose only
  reader is a suite is not product data. A genuine fixture belongs in `tests/fixtures/`, where this
  scan never looks.

  **And modules only a test imports (2026-09-17).** `censusTestOnlyModules` is the third scan, and
  it closes the hole the export half leaves open on purpose. A helper used inside its own module and
  exported for a test is a legitimate seam — this repo has around two hundred — so the symbol level
  cannot tell a seam from a feature. The *module* level can: `driverDecisionViews.ts` has four
  exports only its test names and is imported by the homepage, so it passes, while a module no
  shipping file imports at all is a feature built, tested, and reachable by nobody. Import
  specifiers are resolved to paths rather than matched by filename, `scripts/` counts as a consumer
  (a CLI is one), and the files Next.js loads by convention are exempt.
- **`lint:types` is enforced (2026-09-16), on pre-push and `bun run check`.** Type-aware oxlint
  (`oxlint-tsgolint` 7.0.2001) adds `no-floating-promises`, `no-base-to-string`, and the
  type-constituent rules.

  Promoting it is what found the two findings it had drifted to, both in code written the day
  before: `tests/analyticsQuery.test.ts` had `String(url)` on a `RequestInfo | URL`, the exact trap
  the burn-down below cleared from eight test files, and `lib/contentMeasurement.ts` reached every
  field of a public intake through `String()` on an `unknown`. That is the argument for the
  promotion in one line — advisory means nobody runs it, and ten days of "reports zero" was ten
  days of nobody running it. The content guard is a `z.strictObject` now, like the search intake
  beside it, so extra keys on that endpoint are refused rather than ignored.

  **Not in the deploy gate.** It reads the type graph, so it is the slowest task in the list, and
  the reproducibility note below still stands. A check that might flake belongs where a person is
  standing next to it, not in the one place whose log is hard to read — the lesson `run-checks.mjs`
  paid for on 2026-09-15. The 28 pre-existing findings were burned down on 2026-09-06: a shared
  `tests/fixtures/requestTarget.ts` replaced `String(input)` on a `RequestInfo | URL` in eight test
  files (a `Request` there compares as "[object Object]"), deliberate fire-and-forget promises took
  `void`, `RegimeKey | string` unions collapsed to `string`, `premiumFunnel` rejects a non-string
  candidate instead of stringifying it, and `app/brief.md` no longer risks pasting "[object Object]"
  into a published artifact. A PR must not raise the number above zero. Three consecutive runs in each mode
  gave identical results, but one earlier run in the same session reported findings later runs
  did not and could not be reproduced. Promote it into the gate after a week of identical runs.
- **The gate shuffles test order.** `scripts/run-tests.mjs` passes `--randomize` under
  `WHETHER_DEPLOY_GATE=1`; bun prints `--seed=<n>` at the end of every run, and
  `BUN_TEST_SEED=<n> bun run test` replays the container's order locally. The runner also strips
  `FRED_API_KEY` and `ALPHA_VANTAGE_API_KEY` from the suite's environment, so a key in a shell
  cannot route a fixture-driven test to a real upstream.
- **The build container always has Cloudflare credentials, and the suite must not see them
  (2026-09-15).** Workers Builds exports `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` so
  wrangler can deploy. `resolveAnalyticsReadConfig` reads both — it accepts `CLOUDFLARE_API_TOKEN`
  as well as `CLOUDFLARE_ANALYTICS_READ_TOKEN`, because they name the same permission — so a test
  asserting the reader is *unconfigured*, which is the state of every developer machine, was true
  here and false there. `scripts/run-tests.mjs` now strips all four (both tokens, the account id,
  and `WHETHER_TELEMETRY_DATASET`), and `tests/runHistory.test.ts` clears them itself rather than
  relying on that. This cost five red builds, and it was slow to find for one reason worth
  remembering: **the only environment that disagreed was the one whose log could not be read.**
  When a check passes everywhere you can look, enumerate what the place you cannot look *has* that
  you do not — credentials first.
- **The suite runs offline.** `bunfig.toml` preloads `scripts/test-network-guard.ts` for every
  `bun test`, and an outbound fetch throws instead of leaving the box; loopback stays open, because
  `tests/whetherCli.test.ts` starts its own server. This is the same argument as the stripped API
  keys one line up, taken to its end: a result that depends on what the environment happens to
  allow is not a result about the code. Measured 2026-09-03, it took the suite from **49.3s to
  13.7s** with all 1169 tests still passing — not one needed the network. Three files held ~18s
  between them (`/api/health` 8.5s → 0.4s, `whetherClientSdk` 5.3s → 0.4s, `mcpCommitmentLinter`
  4.8s → 0.4s), every second of it spent on FRED reads nothing asserted against. Serve an upstream
  with a fixture fetcher (`fixtureFetch` in `tests/architectureInvariants.test.ts`) or by assigning
  `globalThis.fetch`; to exercise a real one on purpose, `WHETHER_TEST_ALLOW_NETWORK=1`.
- **`--max-concurrency` was never a worker count.** The runner used to pass 8 locally and 2 in the
  gate and call it "fewer workers". It bounds `test.concurrent` tests, this suite declares none,
  and bun runs every file in one process regardless: the same 20 files took 8.26s at 1 and 8.10s
  at 8. The knob is gone rather than re-tuned — a setting that reads as protection and provides
  none stops anyone looking for the real cause. The real contention is `tests/whetherCli.test.ts`
  spawning 62 Node processes, which no runner flag reaches. `BUN_TEST_CONCURRENCY` is still
  honoured when set explicitly; nothing sets it.
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

- **A telemetry stream needs a producer, and the public intake validates what it accepts
  (2026-09-16).** `regime-transition` and `degraded-state` were declared in `TelemetryStream` and
  listed in the intake's accepted set, and nothing in `app/`, `lib/` or `worker/` had ever written
  either one — so the only way a row reached them was a POST from outside, and no reader would have
  looked. Both are gone, and `tests/telemetryStreamReachability.test.ts` fails if a stream is
  declared without a producer.

  The larger finding was next to them. The intake checked its ten accepted names against a chain of
  `if`s, and **five of the ten had no validator in that chain**, so they were written through
  unexamined. Two of those five are Worker-authored (`ingest-pipeline`, `cron-step`) and one of
  those two is read back and rendered on `/trust` as "Scheduled runs" — anyone could have posted a
  run that never happened onto the page whose job is to be trustworthy. A third, `premium-funnel`,
  has its own route with a body cap and a validator, which shadows the dynamic one anyway, so its
  entry there was a weaker door Next never opened. The accepted set is now the keys of
  `STREAM_VALIDATORS`: a stream with no validator cannot be posted, and adding one without a
  validator does not typecheck. The declared list lives once, in `TELEMETRY_STREAMS`, with the union
  derived from it and the census script reading it.

### Scheduled automation

The recurring data jobs run as scheduled Claude Code routines, not GitHub Actions. Each one runs
the same scripts the old workflow did, opens a PR, and never merges it.

| Routine | Cadence (UTC) | Produces |
| --- | --- | --- |
| Whether — regime history refresh | Mon 12:00 | `data/summary_archive.json`, `summary_monthly_regime_history.json`, `monthly_summaries_2012_2025.json` |
| Whether — weekly brief refresh & freeze | Mon 13:00 | `docs/briefs/latest-weekly-slack-brief.md`, `artifacts/weekly-slack-brief.txt`, and current week appended to `data/published_briefs.json` |

Since 2026-09-14 the freeze also runs as a Cloudflare Workflow (`worker/workflows/weeklyBriefFreeze.ts`),
started by the Worker's Monday cron where `WHETHER_BRIEF_FREEZE_WORKFLOW=1` (the preview lane, for
now). It runs inside Cloudflare, where FRED is reachable, so the egress allowlist below is not in
its way; it shares the record builder with `brief:freeze` and opens the same
`automation/weekly-brief-freeze-<slug>` branch, so it and the routine cannot both freeze a week
differently. Details: `docs/cloudflare-deployment-runbook.md` ("Trial infrastructure").

The site no longer waits on any of them to show a current month. The Worker cron records the month
in progress to KV on every run (`lib/summary/refreshMonthlyRegimeHistory.ts`), and the read path
merges it over the bundled snapshot, so the month rail stays current between deploys. The regime
history routine still regenerates the canonical month-end series and the archive the scripts own —
it is the rebuild, not the critical path.

**The freeze Workflow now reports its own outcome (2026-09-16).** The Monday cron logged a
`cron-step` row the moment `create()` resolved — before the freeze had read anything — and the
Workflow itself wrote nothing at all. So `/trust` showed a green Monday row whether the week was
frozen, refused as stale, or retried for five hours and gave up, and the only signal that anything
was wrong was `data/published_briefs.json` sitting at one week. There are two rows now:
`brief-freeze-start` (the cron handed it over) and `brief-freeze` (what the Workflow did). A step
that reports success for work it did not observe is worse than one that reports nothing, because it
gets read as evidence.

**Still gated to preview, and the promotion no longer has an order (2026-09-17).** It needs
`WHETHER_BRIEF_FREEZE_WORKFLOW = "1"` in `wrangler.toml`'s top-level `[vars]` and `GITHUB_TOKEN`
set on the production lane — two operator actions, one of them a secret, and until now the
sequence mattered: the flag without the secret made the Workflow spend a live read and, on a week
that was not publishable yet, up to five hourly retries before discovering at 7pm a configuration
fact that was true at 2pm. The token is checked at the first line of `freeze()` now, before any
work, so either action can land first and the missing one is named in the `brief-freeze` row within
seconds. Skipping instead was the wrong repair: a silent skip is exactly what left the archive at
one week with nothing on `/trust` to say so. The full checklist, with the secret's scope, is in
`docs/cloudflare-deployment-runbook.md` ("Promoting the brief freeze to production").

The argument for not waiting on a longer preview trial: the archive is deliberately never
backfilled, so every week spent proving this is a week the record can never honestly claim, and the
failure modes are bounded — a bad run throws, opens no pull request, and writes a failing row;
`assembleCurrentWeekBrief` refuses degraded and fallback data outright; and nothing merges the pull
request without a person.

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

`refreshFallbackSnapshots` is safe and **unscheduled**: `bun run data:refresh-fallbacks` is hand-run,
no routine and no workflow calls it, and what it writes is the floor every degraded read serves.
`check:curated-freshness` (in `bun run check`) is the only thing that notices, at a 45-day SLA.

The two safe ones fetch FRED directly, so a 403 is an error. The two broken ones went through
`loadReportData`, where falling back to the bundled snapshot is a *success*. That is the tell: a
script is at risk exactly when it reads through a loader that degrades gracefully.

`generateWeeklySlackBrief.ts` takes `--allow-fallback` for local or offline artifact generation,
which writes but stamps the output `NOT LIVE DATA` with the reason. The scheduled routine passes no
flag, so it fails loudly.

**The audit covered the scripts and missed the sends (fixed 2026-09-17).** The same question — what
does this do on fallback — had never been asked of the two artifacts that leave the building, and
both answered it worse than any script did. `lib/email/sendWeeklyBrief.ts` read the snapshot through
`?.` and filled every gap with a constant: no snapshot meant regime `"DEFENSIVE"`, "Hold bounded
operating discipline.", and a record date reading "this week", mailed to every subscriber and
returned as `ok: true`, so the Monday `cron-step` row on `/trust` went green for a call nobody
computed. `lib/slack/deliverSlackBrief.ts` *computed* a `degraded` flag and the one caller
destructured `{ text, recordDate }` and dropped it, so the post went out identically whether the
reading was live or bundled — while `GET /api/brief/slack`, the same data path, published the flag
to integrators. Both call `assessPublishReadiness` now and refuse, with the reason on the failed
cron row (`refused_unpublishable: …`). The cron itself was never the hole: it guards on
`refreshResult.ok && snapshot && weeklyCall`. `POST /api/email/send-weekly` was — it calls
`sendWeeklyBrief()` with no snapshot, and reads whatever the store has, which is nothing when the
Worker has no KV binding and falls back to the in-memory store.

A refusal is the right outcome rather than a labelled send, for the archive's reason: an email
cannot be corrected after it lands, and a channel told nothing on Monday can ask, where a channel
handed a stale reading under this week's heading cannot tell.

`data/published_briefs.json` held a single week for as long as the routine could not complete a good
run; the Workflow froze `2026-w38` on 2026-09-17, so it holds two and fills forward from there.
That archive is **not backfilled**, deliberately. Its value is that it is evidence the call was
published every week; writing retroactive `publishedAt` stamps for weeks that were never published
would fabricate exactly the cadence it exists to prove, and `/history` now shows those numbers to
visitors.

Cloudflare's build is the remote gate, and it gates **production too**. The build command
configured in Workers Builds is `bun run check:vinext`, and since 2026-09-02 that script *is* the
deploy gate: `WHETHER_DEPLOY_GATE=1 bun scripts/run-checks.mjs lint typecheck test assets suppressions`, then
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
needs. `WHETHER_DEPLOY_GATE=1` is what switches `scripts/run-tests.mjs` to a 120s
ceiling and no `tests/tools/`, and what gives the landmark audit's readiness and per-route bounds
room for a cold start (180s / 60s instead of 90s / 30s). (It also used to drop to "2 workers";
see the toolchain note above for why that never did anything.) The runner also pins `NODE_ENV=test` for the
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

**The inner gate no longer repeats the outer one (2026-09-03).** Both were deliberate and each was
documented on its own; nothing recorded that on a preview build the second could never fail, because
the first had just passed on the same tree. It was the most expensive thing in the build — roughly a
minute of lint, typecheck, suite, assets and landmarks re-run on every pull-request push, for no
signal. Deleting the inner gate would have fixed the waste and given up the guarantee: the build
command lives in the Cloudflare dashboard, so no test here can prove it still names `check:vinext`,
and "a gate that quietly stops running is worse than no gate at all" is a rule this repo has already
paid to learn. So the inner gate is skipped **by evidence**: `run-checks.mjs` under
`WHETHER_DEPLOY_GATE=1` records which checks passed for the current commit
(`scripts/check-gate-marker.mjs`, into gitignored `.cache/check-gate/`), and `vinext-run build` runs
whichever of `GATE_TASKS` that record does not cover — all five, if the dashboard command ever stops
writing one. The record is refused for a dirty tree, for another commit, and after six hours, so
every way it can go wrong costs a repeated run rather than a skipped gate. The build log says which
way it went.

**A bound set under the real cost manufactures the failure it claims to detect (2026-09-17).** The
landmark audit's per-route bound was 60s in the deploy gate. The gate spawns its own dev server, so
every route compiles from cold, and the two heaviest — `/share` and `/trust` — do not answer inside
60s on a loaded box. Three builds failed with `2 route(s) never answered`, and the log saying so is
only in the Cloudflare dashboard, so from a sandbox it read as an unexplained red build on whatever
was pushed last. The bound is 120s now, measured rather than guessed: a cold run against
`origin/main`, carrying none of that day's changes, reported exactly those two routes and went green
at 150s. **When a check fails only where you cannot read it, reproduce the environment, not the
diff** — here, `git archive` into a scratch directory with `node_modules` hardlinked, and
`--base-url` pointed at an unused port so the audit starts its own cold server instead of reusing a
warm one. The bound is still a bound: a route that never answers fails the gate.

**The build container's checkout is not necessarily the commit (2026-09-17), and the gate now
refuses one that is not.** After `fa1cc6e` merged, every build failed on two assertions — the memo
example still reading as the blank form, and `public/embed.js` still holding the hardcoded origin —
while `lint`, `typecheck` and every other test passed, and the same suite was green here through six
consecutive `WHETHER_DEPLOY_GATE=1` runs. The tell was inside one file: in `tests/embedRoute.test.ts`
the case that reads `public/embed.js` failed while the case beside it, reading `app/api/embed/route.ts`
and `app/share/embedBuilder.tsx` from the same commit, passed. `app/`, `lib/` and `tests/` were fresh
and `public/` was not — and the stale content was byte-for-byte what the last *successful* build
(03:03, pre-merge) still serves in production. The log's `Restoring from build output cache` step is
the mechanism: something wrote over `public/` after the clone. Two files from one commit cannot
disagree in a checkout, so a split like that is never a test problem, and the repo's answers for a
flaky suite — run it again, run it alone, replay the seed — cannot find it.

`scripts/check-gate-marker.mjs` had the answer the entire time and threw it away: `headCommit()`
returns `""` for a dirty tree, so the marker was silently not written, and its own doc comment
asserted that "the build container checks out clean, so this only ever fires locally". Believing
that sentence cost a day and three wrong public hypotheses. `worktreeDrift()` now reports the
drifted paths instead of collapsing them into `""`, and under `WHETHER_DEPLOY_GATE=1`
`run-checks.mjs` prints `HEAD <sha>` and **refuses before running any task** when a tracked file on
disk differs from it. It is a refusal, not a note, for `check:dead-exports`'s reason and one worse
than it: the results would be about something other than the commit, *and* the assets that deploy
come from the same tree, so a green run would ship the drift. Untracked files are reported and
allowed — a build container may leave something extra behind, which does not make the commit's own
content wrong.

Clearing the project's build cache in the Cloudflare dashboard is the remedy, and it is a dashboard
action: no push from here can fix a stale cache, and deleting the two assertions would have made
`main` green while hiding the fact that stale static assets were the thing about to deploy.

Two things that made a red build hard to read, both fixed 2026-09-01:

- `run-checks.mjs` buffers each task's output until it exits, and had no per-task timeout, so one
  hung task stalled the gate silently until Cloudflare's 30-minute ceiling — "Build took too long"
  was the whole diagnosis. Tasks are now bounded (`CHECK_TASK_TIMEOUT_MS`, default 10m) and a
  timeout reports a named failure with the child's output.
- The landmarks audit fetched routes with no timeout, which is what hung. Bounded per route
  (`--route-timeout-ms`, default 30s). A timed-out route fails the check rather than joining the
  `unauditable` bucket, which only warns — otherwise a container that reaches no route at all would
  report "0 violations" and go green.

A third, same shape, fixed 2026-09-15: **`run-checks.mjs` repeats every failure at the end of the
run**, with the lines that named it and the tail of that task's output. The per-task report is
printed as each task finishes, and the gate's own output can bury the reason — a `bun` that prints
a line per test makes a *passing* suite ~1,700 lines, and Cloudflare's log viewer keeps a bounded
window. A branch that failed the build five times running showed nothing in any reachable log but
passing tests and `exited with code 1`; the `❌` line and the assertion had scrolled out of reach.
Whatever that window keeps, it keeps the end, so the end now carries enough to act on.
`CHECK_FAILURE_TAIL_LINES` (default 40) sizes it.

That block also names **the `bun` it ran on**, and says so when that is older than `engines.bun`.
Nothing enforces the declared range, so a build image shipping its own `bun` runs this gate on
whatever it has — and the container above was on 1.1.x while `packageManager` pinned 1.3.14. The
tell was the per-test output itself: only 1.1.x prints a line per passing test; 1.2 and 1.3 are
silent on a pass. Inferring the toolchain from its output formatting is not a thing a reader should
have to do twice, and a mismatch that could explain a failure must be printed beside it. It is a
note, not a hard stop: an older runtime may still be fine, and turning an unexplained failure into a
different unexplained failure buys nothing.

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
`tests/architectureInvariants.test.ts`). Since 2026-09-03 that is the default rather than something
each test must remember: the suite runs offline (see "The suite runs offline" above), so the
container and a sandboxed session now see the same upstreams — none — unless a test serves its own.

**A `mock.module` stub must be a superset of the module it replaces (2026-09-16).** Ten suites patch
`next/navigation`, and every one of them listed the three or four exports it happened to need. The
patch is process-wide, so what each of them actually installed was a `next/navigation` with *only*
those exports, for every file in the run. Three suites reach `permanentRedirect` through a route and
failed to link — `SyntaxError: Export named 'permanentRedirect' not found` — in whichever shuffled
orders put a stub first. It reproduced in roughly one shuffled run in four and never once in file
order, which is the shape of this hazard every time it appears here. Spread the real module and
override only what the test needs:

```ts
import * as nextNavigation from "next/navigation";
mockAny.module("next/navigation", () => ({ ...nextNavigation, useRouter: () => ({ … }) }));
```

The two files that render a *route* were fixed this way (`toolkitHowToAnchors`,
`answerPageReaderCopy`) and eight shuffled runs went green; the eight component suites still list
their three exports and have not been observed to trigger it, because they never dynamically import
a route. Keeping the real `notFound` has a second benefit: `resourceArticleRoutes.test.ts` asserts
against what Next actually throws instead of against a stub written in another file.

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
| `bun run review:hotspot-preflight` | Runs as part of `bun run check`; flags high-risk files needing extra review. Default range is the last commit **plus** uncommitted changes; `--base <sha>` is commit-to-commit and sees no dirty tree; `--working-tree` is uncommitted only. The printed range says which. |
| `bun run telemetry:streams` | Rows per Analytics Engine stream over a window, with each stream's consumer. A stream at zero is dead code or a broken emitter. |
| `bun run review:comment-trends` | Summarizes recurring PR review comment patterns from GitHub. |
| `bun run mcp:whether` | Starts a stdio MCP server (`get_agent_brief`, `list_agent_skills`, `pull_recent_site_info`) — see [docs/agents/agent-interface.md](docs/agents/agent-interface.md). |
| `bun run smoke:prod` | Runs post-deploy synthetic smoke checks against the production site. |

## Tests that read source instead of behaviour

22 test files (counted 2026-09-16) match a regex against a file's source rather than asserting on
what it does.
That is not automatically wrong, and the split is sharp enough to state as a rule.

**Legitimate, and most of them.** A `.husky` hook, a workflow YAML, `package.json`, `next.config.js`
and a `scripts/*.mjs` are configuration: there is no behaviour to render, and the fact *is* the text.
So is a module-level declaration a render cannot see — `"use client"`, `alternates.canonical`,
`export const revalidate` — which `tests/crawlableRouteContract.test.ts` explains where it uses one.
A third case is narrower and real: `tests/feedRoute.test.ts` reads its route to check no URL is
hardcoded, which no rendered assertion can distinguish, because the hardcoded literal and the
configured default are the same string.

**The failure mode, when it is one.** A source regex breaks on a rename and passes on a regression.
`tests/homePageHeading.test.tsx` carried the evidence in its own comment: one assertion "failed when
the ternary became a `??`, with the rendered heading unchanged". A test that fails on a refactor and
passes on a behaviour change is answering a different question from the one in its name.

**The rule.** If the claim is about rendered output and the thing renders in this suite, render it.
Pages and components do: `renderToStaticMarkup` works for a component, and for a page that reads no
upstream (`tests/toolkitHowToAnchors.test.tsx` renders `/toolkits/[slug]` and checks the HowTo's
`#step-N` fragments resolve to real anchors). A route handler is even easier — call it and parse the
response, as the feed test does for everything except that one literal. What does **not** render here
is a page behind the report read path: the suite serves no upstreams, so `app/page.tsx` suspends at
its data boundary and streams a shell. Assertions about that route stay source-level and say so at
the site.

Two files were converted on 2026-09-16 under this rule; the remaining source reads were checked
against it and left.

## Who the copy is written for (2026-09-16)

Four surfaces were addressed to the wrong reader, all in the same way: they rendered a fact about
*how the product works* to someone who can only act on facts about their own decision.

- **The programmatic pages published the indexation decision.** Two of the three printed the word
  "noindex" into the page, and all three joined `noindexReasons` — the quality gate's own
  identifiers — into the sentence. Someone searching a hiring question could land on an amber box
  reading "Degraded data mode: cluster-duplicate-no-distinct-datapoint-or-interpretation; this
  answer is marked noindex." Whether a page is indexed is a fact about a crawler; the gate ids are a
  fact about our own editorial bar. `lib/report/dataCurrencyNotice.ts` now splits the reasons: the
  four that mean the reading is not current become one sentence in the reader's terms, and the rest
  — thin section, duplicate cluster, missing copy button — render nothing at all, because a warning
  about data that is fine is the one that teaches a reader to ignore the next one. It takes the
  reasons rather than `degraded`, which is true whenever *any* gate fails.
- **`/trust`'s "Scheduled runs" panel was written for whoever maintains the pipeline**, on the page
  the IA points a reader to "when you want to sanity-check the brief before a big decision". It
  named the Worker and its crons, printed the read failure's internal reason, and rendered a raw
  error message under a column header promising a time. The column is a timestamp now
  (`lastFailedAt`), and the message stays in the model for whoever reads logs.
- **The cold-traffic corpus dropped the plain-language layer.** `GlossaryLink`, `SignalScaleNote`
  and `PlainEnglishScoreNote` were used on the home hero, `/signals` and `/trust` — the three pages
  a *returning* reader already knows their way around — and on none of the eleven answer pages or
  the scenario pages, which printed "current tightness: 79 / 100" to first-time visitors under a
  name no other surface uses for that score. The FAQ answer, which is the text a rich result shows,
  carried the same bare comparison.
- **The weekly email said "vs the regime line".** True, after the fix that replaced "vs last week",
  and still the engine's name for a threshold. It reads "9 pts above the line that changes the call"
  now, with the worse side folded into the model rather than re-derived in the renderer by checking
  whether a formatted string starts with a plus — the two lines face opposite ways.

The rule this leaves: **reader-facing copy carries no crawler, engine or infrastructure
vocabulary**, and where a label means the same thing on more than one surface it belongs in
`lib/report/` rather than being reworded per component (`lib/report/AGENTS.md` already says so).
Three tests hold it, each rendering the thing it judges rather than reading its source:
`tests/answerPageReaderCopy.test.tsx` renders all eleven answer pages and fails on
`/tightness|noindex|riskAppetite/`, `tests/runHistoryPanelCopy.test.tsx` renders every state the
panel has and fails on `/worker|cron|telemetry|binding|dataset/`, and
`tests/dataCurrencyNotice.test.ts` drives the real gate and asserts no reason id it produces can
reach a rendered sentence. The answer pages render offline because `loadWeeklyBriefSnapshot` falls
back to the bundled snapshot — which is worth knowing generally: **a page that reads through a
loader that degrades gracefully is testable here**, unlike one that suspends at a data boundary.

## What a page says against what the rest of the site says (2026-09-17)

Found by rendering the routes and reading them — `bun run ui:shots` against a dev server, then
looking at the PNGs — rather than by reading source. None of these is a lint finding, a type error,
a failing test or a dead export, and the suite was green through all of them.
`tests/pageReaderContradictions.test.tsx` pins each one.

- **`/history` said "Reading now" over a month-end reading.** Every figure on that page comes from
  the monthly series, so the last plotted point is the last *completed* month — up to five weeks
  behind the weekly call and regularly a different regime. The panel beside the phase map was headed
  "Reading now", and `TrackRecord` said "The call has been Sunny since Dec 31, 2025", so on a week
  the brief was calling Freezing, the page a reader visits to check the record told them the call
  was Sunny. Its own "Published weekly briefs" panel, two sections down, led with *Sep 15 — Freezing*.
  The honest version already existed on `/signals`, over the same series: "Month-end readings from
  the archive, so the latest figure here is the last completed month rather than this week's score
  above." That sentence is on `/history` now, the panel is headed "Last completed month", and the
  track-record line is bounded ("Through Aug 31, 2026, the month-end call had been…").
- **`/resolve` rendered every answer row as two underlined lines**, so eleven links read as
  twenty-two. `app/styles/decision-flow.css` already carries the fix and the argument for it, from
  when the same thing happened on `/answer` — but it keys on `a:has(p)`, and this list was built with
  `<span className="block">`. The anchor's own `no-underline` lost, exactly as the comment three
  lines below predicts ("the anchor rules above are unlayered, so they beat Tailwind's
  `no-underline`"). **A CSS rule that keys on an element name is a contract with the markup**; the
  three lists there are `<p>` in a grid now, with the title as the anchor's own first child.
- **`/trust` restated its section description as the first line of the section**, so the reader met
  the same sentence twice before anything new. And its rail offered "Sources" and "Sources &
  freshness" as neighbours, where the second opened a section headed **"Cite this call"** — a label
  naming neither its destination nor anything distinguishable from the entry above it. Rail labels
  are the section titles now. The test only pins distinguishability: a first version also required
  each label to share a word with its heading and failed on "Revisit triggers" → "What would make
  this recommendation wrong?", which is a good short name. A test that fails on a correct label is
  answering a different question from the one in its name.
- **`/pricing` told a reader their recorded decisions stay in their browser.** `/privacy` 2.4 says
  they are held in Cloudflare KV against the browser identifier, which is the truth; the pricing
  bullet bundled them with week close-outs, which *are* local, and called both "saved in this
  browser". Understating where a reader's data goes is the direction that costs trust, and these two
  pages are read by the same person for the same reason.
- **The mockup's copy button handed over an unmarked sample.** `/mockups/*` is gated off production
  by `app/mockups/layout.tsx` and only runs on the preview lane, which the audit initially missed —
  the route is not the problem. What left it was: the copied text was branded "Whether" and carried
  a posture, an action and a pause condition, so in a channel it read as the Monday brief. It leads
  with a SAMPLE line now, the same rule `tests/downloadableResourceArtifacts.test.ts` holds for the
  downloadable artifacts.

### The three left open, closed 2026-09-18

- **`/history` painted its whole chrome in the archive's newest regime.** The accent
  (`regimeAccentStyle`, on the page shell) is the hue every section rule, eyebrow and the mobile
  outline draw in — the site saying what the weather is — and `/history` fed it
  `trackRecord.currentRegime`. So the page rendered Sunny throughout on a week the brief was calling
  Freezing, and a reader one click from `/` watched the site change its mind. The status line still
  names the archive's regime, which describes the numbers on the page; the accent is neutral now.
  `tests/regimeColourContract.test.tsx` already carried the principle and the exception — "/history/compare
  is the one exception by design: it shows two weeks, and keying it to either would mislead" — so
  `/history`, which shows 176 months and counts all four regimes in a panel of its own, is the
  second exception rather than a new rule.
- **`startupClimateIndex` is gone.** It was computed on every build, carried into the weekly
  decision card's `diagnostics`, and rendered by nothing. A *field* rather than an export, so
  `check:dead-exports` could not see it — and `tests/homeBriefModel.test.ts` asserted on its score
  and its four breakdown rows without ever asking whether a reader could reach it, which is the
  mechanism that kept the four features above alive. `docs/adoption-driven-change-plan.md` had
  already put the choice as "surface it or remove the computation entirely"; surfacing it would have
  meant inventing the surface.
- **`review:hotspot-preflight` could not read a merge commit.** Its default range was `HEAD~1` — the
  first parent, which on "merge the base branch into this PR" is the *pre-merge branch tip*, so
  every line the base brought in read as newly added. Merging `main` on 2026-09-17 flagged an `as`
  cast that had been on `main` for a day, and the merge that resolved that PR's conflict could only
  be pushed with `SKIP_PREPUSH=1`. A merge now scans `HEAD^2...HEAD`: the second parent is the
  branch merged *in*, so the range is this branch since it last agreed with the base. Checked
  against the commit that misfired, the first parent surfaces seven lines of the base's own code and
  the new range surfaces none.

  **The first version of that fix was worse than the bug**, and the shape is worth keeping. A
  three-dot range ignores the working tree, and every branch cut from this repo's `main` starts at a
  merge commit — so scanning only the merge range made a fresh branch's uncommitted edits invisible
  until its first commit. The default mode's whole value is that it sees uncommitted work. It scans
  both ranges now, and the printed line names both.

  Left alone, deliberately: `isUnsafeAssertion` does not strip template literals, so prose in a
  backticked assertion message can still trip it (this session hit "…as one of them" and reworded
  the message). The comment there states the reason — `${...}` can hold real code — and blanking the
  literal text without blanking interpolations is a change to a matcher, not to a range.

**Two findings from that audit were wrong and are recorded here as such.** The mockup route being
publicly reachable — it is gated, and the gate has its own recorded argument. And `/operate` showing
four of six sections collapsed: `resolveInitialOpenStepIds` opens the first step plus anything
marked `defaultOpen`, and the comment above it records why the page moved *away* from opening
everything. Rendering a page tells you what a reader sees; it does not tell you whether someone
already decided that on purpose. Read the component before calling a default a defect.

## Features that shipped without shipping (2026-09-16)

Four things were built, tested, and reachable by nobody. They are worth naming together, because
**one mechanism kept all four alive: every ratchet here counts a reference from anywhere, and a test
counts.** An unshipped feature with a test is not a lint finding, not a type error, not a failing
test and not a dead export. It is invisible to the whole gate.

- **The first-time guide.** `FIRST_TIME_GUIDE_STEPS` (three steps, each with a worked example),
  `FIRST_TIME_GUIDE_HIGHLIGHTS` and `FIRST_TIME_GUIDE_NEXT_LINKS` sat in `reportCopy.ts` with
  `tests/reportCopy.test.ts` asserting there were exactly three steps and that each carried an
  example — and asking nowhere whether a reader could see them. They render now, collapsed, inside
  `FirstVisitExplainer`: that element is already the one thing on `/` addressed to someone who has
  never seen the page, and its own comment records what it cost the last time that spot grew a
  second block. Its first link pointed at `#executive-snapshot`, an id no page renders.
- **`computeReliabilityScore`** averaged confidence as 90/60/30, an offline flag as 100/50, and a
  degraded-source ratio over `max(degraded + 3, 4)` into a 0-100 figure with three colour bands.
  Its own tests pinned MED at 87 and LOW at 77 with every source healthy, against bands calling 80
  green and 60 amber — so the whole confidence range landed between 77 and 97, LOW read amber, MED
  read green. Deleted, not recalibrated: the site publishes a confidence label and, since the
  archive study, the record behind it.
- **The operator feedback pipeline.** `scripts/ingest_operator_feedback.py` (545 lines, the only
  Python here), `data/cohort_feedback.json` (31KB, eight named operators over six weeks), and a
  suite in `tests/tools/` — the one directory the deploy gate drops. No npm script, no route, no
  reader. It could not have been real: the published archive holds one week because the weekly
  routine has never completed a good run, so a six-week feedback cadence never happened. A
  committed file of named operators reads as evidence, which is why it went rather than stayed.
- **`data/concept_conflicts.json`**, which principle wins under which regime — a good idea, wired to
  nothing, referencing slugs no content carries and whose `/concepts` routes are in
  `retiredSitemapPaths`.

Also removed: the `ReturningVisitorDeltaStrip` fallback, whose default `impactLinks` and
`openPanelHref` named four ids nothing renders. The one caller passes its own, so the defaults never
shipped — dead anchors kept alive by never being reached. Both props are required now.

`check:dead-exports` grew the data-file scan above as a result. The export half still counts tests,
by design, so **this class can recur for code**: if you are adding a module whose only caller is its
own test, you are adding one of these.

### The rest of them (2026-09-17)

The module census above found nine more, and the split it draws is the useful part: three modules
`scripts/` imports (`answerLaunchReadiness`, `pageMetricsFromTelemetry`, `summaryArchive`) are alive
— a CLI is a consumer — and nine had no consumer but their own test.

- **`lib/export/issueTrackerBrief.ts` was wired up rather than deleted.** Its own doc comment says it
  was extracted from `exportBriefPanel.tsx` so it could be tested; that panel was later deleted, and
  the extraction survived it. It takes the same four arguments as the Slack brief, and `/share` is
  the page that owns copy formats, so it is a fifth card there now.
- **`lib/runtime/boundary.ts` was the instructive one.** Its `config` getter resolved `cronSecret`
  and `siteUrl` its own way, and production resolves both elsewhere — `lib/api/cronAuth.ts` and
  `lib/siteUrl.ts`, the latter reading `NEXT_PUBLIC_SITE_URL`, not the `SITE_URL` the boundary read.
  So the only test of "how config resolves" tested a third, divergent copy against the wrong
  variable. Its `ensureDurableStorage` promised to refuse a "silent in-memory fallback" that nothing
  consulted, and **"Invariant 6: Production writes fail if durable storage is missing" proved it by
  calling a fixture it had just defined** — an object literal, installed through
  `setRuntimeBoundaryForTesting`, asserted to throw from its own method. No production code was
  involved.

  What the code does is the opposite: `getOperatingSnapshotStore()` falls back to
  `InMemoryOperatingSnapshotStore` when no KV binding is present, in production as anywhere else, so
  the write succeeds and goes nowhere durable. Invariant 6 pins *that* now, and says so. Whether it
  should refuse instead is open — this repo has paid for silent fallbacks before — but that is a
  change to a write path, not a cleanup.
- **Deleted, each for its own reason**: a second Slack dispatcher (`lib/webhooks/`) beside the one
  the cron runs; an "official TypeScript SDK" that is not published and duplicates `/api/mcp` and
  `/api/agent`; `DecisionPlanStressTester.tsx`, 425 lines superseded by `PlanStressTestMode` in
  `decisionShieldPanel`; `transitionProbability.ts`, whose own comment said it was "kept for model
  analysis and tests; not rendered as a user product surface"; `reportNarrative.ts`, `sectorOverlays.ts`
  and `whetherToShipChecklist.ts`, each of which needs a surface that does not exist, and inventing
  one is what the first-time guide's history argues against.

Five exported *types* fell out as orphans once those modules went, and were de-exported rather than
deleted: each is still used inside its own file, and each had been kept "referenced" only by the
deleted module naming the same identifier.

### What the census still could not see (2026-09-17)

Four more, each invisible to every ratchet for its own structural reason. The pattern worth carrying:
**the census measures exported symbols in `app/`, `lib/` and `worker/`, so anything that is not one
is unmeasured.**

- **A route is not an export.** `GET`/`POST` are framework-exempt by name, so an API route nobody
  links, fetches or documents scores zero findings forever. `/api/company` (a public, rate-limited
  proxy to a keyed upstream, no consumer, absent from `/api-docs`) and `/api/posture-state` (an
  unauthenticated GET of full posture state, plus a cron-authed POST that appended the same
  committed transition `refreshOperatingState` already appends inline every run) are both gone.
  `appendCommittedPostureEvent` went with the route it existed for.
- **`/api/sync` was the same hole with a write on the end**, and had been *knowingly* kept:
  `docs/feature-specs-current.md` recorded it as "stays, tested, with no client". Unauthenticated
  POST, caller-chosen id and secret, 24KB into KV with no rate limit and no TTL, for two key names
  (`whether-company-metrics`, `whether-decision-log`) naming a module deleted the same day and a key
  nothing has ever written. `/privacy` 2.4 promises everything but recorded decisions "stays in your
  browser and is never sent", which was true only because nothing called it — and
  `tests/privacyPolicy.test.tsx` enumerates `STORAGE_KEYS` and `TELEMETRY_STREAMS`, neither of which
  a server-side write path appears in. A tested endpoint with no client is not a dormant feature.
- **A barrel is referenced by construction.** `lib/report/index.ts` was eleven
  `export * as x from "./x"` lines, imported by nothing except `packages/decision-engine`, whose
  entire content was `export * from "../../../lib/report/index"` and which nothing imported at all.
  The scan could never have found it: a namespace re-export always spells its own filename, so every
  file importing `./decisionKnobs` reads as a reference to the barrel's `decisionKnobs`. Both are
  deleted and `packages` is no longer a reference root.
- **`reports/` is not `data/`.** `reports/OPERATOR_COHORT_6_WEEKS.md` — eight named operators with
  companies, stages and runway months, "100% cohort retention", a 22.9-second median read — survived
  the purge of the operator-feedback pipeline, because `censusOrphanedDataFiles` walks `data/` and
  `content/`. It was the most evidence-shaped of the three files and the one left behind.

**A dead `#anchor` is the link version of this, and the landmark audit now catches it.**
`inspectInPageAnchors` reads every `href="#…"` and every id off the same served response for all 31
routes, and `collectUnresolvedAnchors` judges them **across routes, never per page**: a link fails
only when *no* audited route renders that id.

Both halves of that were paid for. Reading only literal HTML called the skip link dead on five
routes, because a streamed route's `<main id="main-content">` arrives escaped in the flight payload —
the same reason `inspectMainContentHtml` already consults it. And the first version judged per page,
which went green here and red in the container: plenty of targets render only under a condition —
a section that needs figures entered, a banner that needs degraded data — so "this page links to an
id it is not currently showing" is a claim about the data a route got, and the container's data is
not this box's (it reaches Treasury and often FRED; a sandbox reaches neither). "No page renders this
id" is a claim about the code. It is also the claim that catches the real cases: all four anchors
found by hand rendered on no route at all.

One real finding survived: `/operate/financial` offered nav chips for `#ops-runway-risk` and
`#ops-board-memo`, neither of which exists until figures have been entered. The empty state carries
the risk id now (exactly one branch is ever in the DOM, so the anchor always lands, on the message
saying what is missing), and the board-memo chip is gone — it sits behind a second toggle, so it
could never be a stable target.

## A cache is only honest where the label is (2026-09-17)

`public/sw.js` caches every same-origin document and serves the last copy when the network is gone;
`OfflineNotice` names the record date of what is on the screen. The worker shipped caching every
route and the notice shipped on `/` alone, so `/trust` — the page the IA points a reader to "when
you want to sanity-check the brief before a big decision" — served a previous visit's readings with
nothing saying so. The notice is mounted in `app/components/reportShell.tsx` now, which every
reading route but `/` is built on, and it takes the record date the shell already has, so the claim
stays true by construction.

The rule: **a route that renders a reading carries the notice; a route that does not — the glossary,
`/privacy`, the API docs — needs nothing**, because a cached copy of those makes no claim that can go
stale.

## What the site says about its reader (2026-09-17)

`/privacy` did not exist. The footer carried Terms and an Acceptable Use Policy, and **every use of
the word "data" in both means market data** — twelve sections of Terms including "Fees and Payment",
and nothing about the person reading. Meanwhile the product holds subscriber addresses with
verification tokens, the email Stripe reports for a paying customer, a per-browser identifier the
server reads back (`x-whether-client-id`) to scope saved decisions, one cookie, nine browser storage
keys and eight telemetry streams.

The gap was worse than a missing document, because `/pricing` publishes **"No signup, no key, no
trackers"** and the code is genuinely built to honour it: the search payload has no field that could
hold the query text, the acquisition bucket drops the referring URL, the intake refuses an
unexpected key, and the fonts are self-hosted. A claim a reader cannot check is worth less than the
work behind making it true, and there is real work behind this one — so `/pricing` links to the page
from the promise itself.

**The page is an inventory, and `tests/privacyPolicy.test.tsx` keeps it one.** Every `STORAGE_KEYS`
entry and every `TELEMETRY_STREAMS` entry is claimed there by the section that accounts for it, so
adding a storage key or a stream without deciding what a reader is told fails the suite. The registry
is hand-written on purpose: the point is that a person looked at the new key and said where it
belongs. It also checks the absences the page asserts — "no third-party analytics" is the kind of
sentence one added `<script>` makes false.

## A published field with no reading behind it

Three cases now, and they rhyme. `RegimeDiagnostics` published a distance from a threshold as a
weekly move (below); the confidence percent published distance as a probability; and on 2026-09-17
the embed API was found publishing `reversalCondition` as the literal **"Two consecutive weeks of
confirming signals"** — the same sentence every week, in every regime.

The embed case is the one worth remembering for where it hid. The field is returned only by
`format=json` and rendered by neither the HTML nor the text format, so nothing on any page could
have looked wrong; its only consumer was an integrator reading it as a fact about this week's call.
The real value was in scope the whole time — `reversalCondition` and `triggerThreshold` are
non-optional siblings of the `areaActionNow` the route already maps — and `flipTrigger` fell back to
"Monitor economic indicators", advice no reading produced. Both fields are nullable now, so a
consumer can tell "no condition published" from a condition.

**A surface nothing renders is where invented data survives longest.** When a route returns more than
it draws, the undrawn fields are the ones to check.

**A fourth case, and the one with the widest reach (2026-09-17): "stable" was manufactured from
absence.** `buildReportDynamics` returned `directionLabel: "stable"` when handed `previous: null`,
and the loader's fallback dynamics said the same — so *no comparison happened* and *a comparison
found nothing* arrived downstream as identical inputs, a zero severity delta and an empty
changed-signal list. Every renderer read the second meaning. A degraded read published "Conditions
held steady this week. Last week's calls stand." as the homepage's movement line, and
`postureDeltaLabel` rendered "No worse than last week" — onto the OG share card, which is the copy
that travels furthest. The snapshot path was worse: `lib/operatingState/snapshot.ts` passes
`previous: null` unconditionally, so every `OperatingSnapshot` claimed a stable week.

The fix is a fifth direction rather than better wording, because the distinction has to survive
being passed around: `"unavailable"` on `ReportDynamics["directionLabel"]` and on `RegimeMomentum`.
Widening the union is what enumerated the work — the compiler named the sites, and the ones it could
not reach (a `Record<string, string>` copy map, a `titleCase` interpolation, a zod enum that would
have *rejected* the degraded payload) were found by following the same field. `weeklyMovement.score`
is `number | null` for the same reason a missing distance is not zero. `tests/noComparisonHonesty.test.ts`
pins both halves: nothing claims a comparison when there was none, and a real comparison still says
what it found.

## Written for third parties, resolved like it (2026-09-17)

The embed is the one surface that renders inside somebody else's page, and it wrote the production
origin in three times: the snippet a reader copies off `/share`, `buildWhetherBriefUrl` (which
supplies the two links every embed carries), and `public/embed.js`. So the preview lane's embeds
advertised production — **the one surface you would use preview to check was the one preview could
not check.** The first two resolve through `lib/siteUrl` now, which `app/api-docs/page.tsx` already
did for the identical snippet; the script cannot import anything, so it reads its own `<script src>`
and keeps production as the fallback.

This is `tests/feedRoute.test.ts`'s rule, which had never been carried past the feed: on production
the hardcoded literal and the configured default are the same string, so no rendered assertion can
tell them apart, and the lane where they differ is the one this suite never runs in. Those
assertions are source reads and say so.

**The rule stopped at the embed, and the embed is not the only surface written for someone else
(2026-09-17).** `/api/mcp` hardcoded the production origin in the `_links` block and in
`mcp.endpoint` — the discovery payload, so preview told an agent which URL to call and named
production. So did the "Open the brief" button on both the weekly Slack post and the regime-change
alert, the weekly email's four links, and `app/brief.md`'s footer. All resolve through `lib/siteUrl`
now. `lib/fred.ts` and `lib/github/repoClient.ts` keep the literal on purpose: a `user-agent` names
who to contact, not where this deployment lives.

## An artifact that names itself

`public/downloads/quarterly-capital-posture-memo-example.md` was 310 bytes of empty headings —
`- Posture this quarter:` with nothing after the colon, five times — while being titled "Example"
and sold as "a memo example for board updates". A reader who already had the template downloaded the
same blank document under a second name.

The rule `tests/downloadableResourceArtifacts.test.ts` pins is asymmetric, and that is the point: a
file calling itself an example has no unfilled fields and says in the file that its figures are
illustrative, while the template and the checklist stay blank forms, because that is what those are.
A memo full of real-looking figures without that label is a live claim, and this repo already keeps
those out of static content.

## Regime scoring: what the numbers do and do not claim

The constants in `lib/regimeEngineCore.ts` are annotated; this is the behaviour that comes out
of them, which is less obvious.

- **`tightness` saturates, on purpose, and the hero now says when it has.** The rate component
  spans 0-90 across a 50bp window (3.5% to 4.0% base rate) and the components over-subscribe the
  cap, so above ~4% the published score is a constant 100 and its week-over-week delta is zero.
  Read `scores.tightnessPressure` for magnitude — same points, no ceiling anywhere — and
  `scores.tightnessSaturated` to tell a clipped score from a flat reading. Classification still
  uses the bounded score, so no published regime moved when pressure was added.

  The delta row used to render only when the delta was non-zero, so at the ceiling it vanished:
  100/100, no direction, and the reader left to infer from the ceiling tag that the silence meant
  "off the top" rather than "flat". It now says so. Pressure is computed per read and never
  persisted, so a *pressure* delta is not available without a stored-history change; what is
  published is the fact that the score has stopped being able to report a move.

- **A distance from a threshold is not a weekly move, and three artifacts published it as one
  (2026-09-16).** `RegimeDiagnostics` carried `tightnessDelta` and `riskAppetiteDelta`, and both
  were `score - threshold`, with no previous week in the calculation. The weekly email, the export
  brief and the published brief archive each printed one as **"vs last week"** — so an unchanged
  week still reported a move, of whatever size the score happened to sit above the line, and a
  score pinned at 100 reported +30 every week forever. `getRegimeProjection` already warned, in a
  comment, not to pass these where a velocity was wanted; three call sites did it anyway, which is
  why the fields are now `tightnessVsThreshold` and `riskAppetiteVsThreshold`. A name has to carry
  that, not a comment three files away.

  Each surface was fixed for what it actually has: the published archive reads
  `reportDynamics.changedSignals` and carries the real move (no record was contaminated — the field
  predates every entry); the weekly email's snapshot has no previous week in it, so its label
  changed to "vs the regime line"; the export brief dropped the segment, because the honest version
  of that number duplicates the corridor rails printed beside it. `OperatingSnapshot.schemaVersion`
  is 2, and a stored snapshot of the old shape reads as absent and is refilled by the next cron.
- **The two axes are not independent.** `riskAppetite` is a pure function of curve slope, and
  slope also drives the inversion term in `tightness`, so an inversion moves both at once. Note
  `riskAppetiteRegime = 50` therefore means "slope above +0.25%", not "a flat curve" — a
  relationship the threshold's own doc comment asks callers not to encode.
- **Confidence measures distance from a boundary, nothing else — and the archive now says so out
  loud (2026-09-16).** Two guards matter: an imputed input caps it
  (`CONFIDENCE_PERCENT_IMPUTED_CEILING`), because the stand-ins sit far from the boundaries and used
  to score the *ceiling* on an empty payload; and the risk gap is converted to its tightness
  equivalent before the two are compared, because the raw scales differ 4.5x and the risk axis
  otherwise decided the answer in 164 of 175 historical months.

  Calibrating the percent against `data/summary_archive.json` was the open work here. It is done,
  and the result is not that the number needs a different slope. Over the 176 month-end readings
  (2012-01 to 2026-08) the published regime held into the next month 169 times in 175, and:

  | Points from a boundary | Percent reported | Months held | Months |
  | --- | --- | --- | --- |
  | 0 to 5 | 55% | 100% | 11 |
  | 5 to 10 | 60% | 78% | 9 |
  | 10 to 20 | 65% | 100% | 12 |
  | 20 to 37 | 75% | 94% | 54 |
  | 37 or more | 92% | 99% | 89 |

  Every band held more often than the percent those months reported, above its 95% interval, the
  ceiling band included. Worse for the number's name, **distance does not order the outcome**: the
  least-confident band held 11 of 11 while the band above it held 7 of 9. And the archive cannot
  support re-fitting it — six flips in fourteen years is not a probability per band, and a curve
  fitted to the base rate would report ~97% every week and discriminate nothing.

  So the percent keeps measuring distance, which is honest, and the record is published beside it
  rather than folded into it (`lib/report/confidenceCalibration.ts`, rendered at
  `/trust#confidence-record`). It is derived from the bundled archive at module load, so the monthly
  refresh improves it instead of dating it. `tests/confidenceCalibration.test.ts` asserts the two
  findings as properties rather than pinning the counts, and fails if a later archive ever makes
  distance order the outcome — which is exactly when the copy would need rewriting.

  Still true: the scale tops out for most months. 51% of them report the 92% ceiling, and only 14
  distinct values have ever been produced.
- **The base rate is the 1-month bill.** `getBaseRate`'s `FED` rung has never fired. The 3.5%
  threshold is described as a policy-rate average but is fed `DGS1MO`, and with only a 50bp
  window driving the whole classification, a bill-specific dislocation moves the published call.

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
- **FRED marks a missing observation with an empty CSV field, not only `"."`.** `Number("")`
  is `0`, so any parser that guards only against the dot reads a market holiday as a zero print.
  Seven month-ends in `data/time_machine_cache.json` carried all-zero yields, and the stress
  veto's trailing VIX mean was pulled down by holiday zeros, until 2026-09-14. Route every FRED
  value through `isMissingFredValue` (`lib/fred.ts`); the archive generators share one parser in
  `scripts/regimeArchiveContext.ts` for the same reason.
- Use `rg` for discovery; avoid `ls -R` and `grep -R`.
