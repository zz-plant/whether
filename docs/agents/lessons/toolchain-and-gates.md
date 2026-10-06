# Toolchain notes and the check gates

Moved out of `CLAUDE.md` so it is read when a task touches lint, the suite runner, suppressions, dead-export census, telemetry streams or the gate. Dated entries are the reasoning behind each rule; the commands live in [CLAUDE.md](../../../CLAUDE.md).

## Toolchain notes (2026-09-02)

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
  tests, lint rules disabled globally, and lint rules an `overrides` block turns off, against a
  hand-edited baseline — and fails when any of them rises. It exists because every other ratchet here —
  the rule burn-down, `lint:types`, the suite — can be turned green by suppressing the finding
  rather than fixing it, and nothing else in the gate notices. A change that trades a lint finding
  for a disable comment now moves one number down and this one up, and is rejected.

  The override category matters as much as the inline one: a rule set to `error` and scoped `off`
  for a handful of files is a suppression with a wider blast radius than a disable comment, and
  before this it moved no number at all. Baseline as of 2026-09-03: 7 lint suppressions, 3 type
  suppressions, 0 skipped tests, 2 disabled rules, 2 override-disabled rules, and a floor of 212
  test files. Lower it in `scripts/census.config.ts` when work earns it; raising one is a policy
  change and belongs in its own PR with the reason.

  **Both census scripts are mechanism only (2026-10-06).** Everything that names this repo — the
  scanned roots, the framework's convention names, the data directories, the self-exclusions, both
  baselines and the test-file floor — is in `scripts/census.config.ts`, and both walk the tree
  through one shared `scripts/walk-files.mjs`, which is also what `scripts/run-tests.mjs` uses for
  its discovery guards. One walk, because two copies had already drifted: the guarded `statSync`
  below existed in the dead-export scan and not in this one.
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
  is guarded in the shared walk both scans use — a dangling symlink, or a path that vanishes between
  the `readdirSync` and the stat, used to crash the census instead of skipping one entry (the
  suppression census still could, until 2026-10-06). Unit scaffolds are exempt
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
  The ingestion file store is an upstream too, and until 2026-10-01 the guard missed it: an online
  `bun run seo:answers:launch-readiness` left a live reading under `.cache/ingestion`, the offline
  suite read it back, and `tests/jev.test.ts` and `tests/homeMetadata.test.ts` failed on a clean diff
  until the directory was deleted. The preload now points `WHETHER_INGESTION_DIR` at a fresh
  directory for every run (removed in a preload `afterAll`; bun test never fires process `exit`).
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


- **An excuse in a gate has to fail a payload you know is broken (2026-10-06).** The landmark
  audit read the RSC flight payload whenever a route's markup had no targeted `<main>`, to excuse a
  placeholder `<main>` that /state was said to flush. Every payload carries the layout's 404
  boundary, and `app/not-found.tsx` renders `<main id="main-content">`, so the excuse held on every
  route: five reading routes whose `<main>` had no id passed (/about, /contact, the brief record,
  the decision-shield overview, every resource article). /state never had a placeholder either. Its
  page rendered `<main className="flex min-h-screen ...">` without the id, so the case the excuse
  was written for was the first instance of the bug. A painted `<main>` is now judged as painted.
  The payload is read only for a route that paints none, and the rows a boundary names as its
  `fallback` are skipped there. Against 6404891a, the commit before #1518 fixed those pages, the old
  audit passed all 35 routes and the new one fails exactly the five.
