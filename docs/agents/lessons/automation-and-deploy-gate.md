# Scheduled automation and the deploy gate

Moved out of `CLAUDE.md`. Read when a routine, the brief freeze, a send path, or a red Cloudflare build is the subject. Check what a job does on fallback, not only on error.

## Scheduled automation

The recurring data jobs run as scheduled Claude Code routines, not GitHub Actions. Each one runs
the same scripts the old workflow did, opens a PR, and never merges it.

| Routine | ID | Cadence (UTC) | Produces |
| --- | --- | --- | --- |
| Whether — regime history refresh | `trig_016331bnhHUZx2SWjWew2z5m` | Tue 12:00 | `data/summary_archive.json`, `summary_monthly_regime_history.json`, `monthly_summaries_2012_2025.json`, `time_machine_cache.json`, `confidence_record_months.json`, `weekly_summaries_2018_2026.json`, `summary_memory_rail_weekly.json` (see below on the prompt) |
| Whether — weekly brief freeze | `trig_01WrbhhT73Ve4bsFK83UNyu9` | Thu 13:00 | current week appended to `data/published_briefs.json` |
| Whether — claims read-through (Tue, after the Monday send) | `trig_011EVxtoaiNMXk6CnKUPdfnZ` | Tue 02:13 | nothing committed: a read-only report, pushed to the owner's phone, comparing each claim in `docs/claims-ledger.md` across the live surfaces, and whether the weekly and month-end comparison bases are current |

A third, "Whether — weekly Slack brief refresh" (`trig_017b1YkXqvsje8pseMXcUftp`, disabled),
regenerated `docs/briefs/latest-weekly-slack-brief.md`. That file was deleted on 2026-10-06. Nothing
in `app/`, `lib/` or `worker/` read it, and `/share`, `GET /api/brief/slack` and the Monday post all
build the same text from the live read, so the committed copy could only ever be the older one —
and it was: refreshed once in seven weeks, it still said 2026-09-14 while the archive held w40.
`bun run brief:weekly:artifact` still writes `artifacts/weekly-slack-brief.txt` (gitignored) for the
Jev brief audit. The routine was disabled the same day; if it is ever re-enabled, its third step fails
on the removed `--format markdown` instead of re-adding the file.

Since 2026-09-14 the freeze can also run as a Cloudflare Workflow
(`worker/workflows/weeklyBriefFreeze.ts`), started by the Worker's Monday cron where
`WHETHER_BRIEF_FREEZE_WORKFLOW=1`. **It has never run.** The flag is set only under
`[env.preview]`, no `whether-preview` Worker has ever been deployed (`wrangler versions list --env
preview` fails on the missing script), and `wrangler workflows instances list
whether-weekly-brief-freeze` returned no instances on 2026-10-06. Every week in the archive came from
the Thursday routine. The commits say which writer it was: the Workflow's would read `chore: freeze
the <slug> brief`, while the routine's read `chore: freeze weekly brief to its permanent dated URL`
and carry a `Claude-Session` trailer.

Once switched on, it runs inside Cloudflare, where FRED is reachable, so the egress allowlist below
is not in its way; it shares the record builder with `brief:freeze` and opens the same
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

**A Monday routine runs at the end of the account's usage week (2026-10-06).** The seven-day usage
cap resets Tuesday 01:00 UTC, so a routine fired Monday at 12:00 or 13:00 UTC competes with
everything the account did that week. The Slack brief refresh fired seven Mondays from 2026-08-24:
six were rejected by the cap before the model took a turn, one correctly refused fallback data while
FRED was still blocked, and the one refresh that reached `main` came from a person typing "Try again"
the next evening. The regime history refresh was rejected the same way on 2026-09-21, 09-28 and
10-05. The Thursday freeze has never hit the cap. A rejected run never reaches the prompt's `FAILED`
instruction: it ends on "You've hit your weekly limit", and the `USAGE_LIMIT_REACHED` status lives
only in the routine's run log (`RemoteTrigger` `list_runs` / `get_run_log`, or the routines page),
so the repo saw what looked like quiet weeks. The regime history refresh moved from Monday to
Tuesday 12:00 UTC on 2026-10-06 for this reason. Schedule a routine early in the usage week, and read
the run log before the code when its pull request does not appear.

**The "Monday" cron ran on Sundays for five months (found 2026-10-14).** `wrangler.toml` said
`0 14 * * 1`, and Cloudflare counts weekdays from 1 = Sunday, so from the trigger's creation on
2026-05-18 the weekly email, the Slack brief and both Workflow hand-offs ran at 14:00 UTC on
Sunday. No `cron-step` row could show it: a step knows whether it worked, never which day it was
meant to run. It surfaced only because every 14:00 row in the telemetry carried a Sunday date. The
trigger is `0 14 * * MON` now, and `tests/cronSchedule.test.ts` refuses a numeric weekday. Since the
once-per-week send markers key on the ISO week of the send, a Sunday send (the end of one ISO week)
followed by a Monday send (the start of the next) is two sends, not a duplicate the markers catch.

**Failures now reach the owner, not only `/trust` (2026-10-14).** Nothing pushed a failed step
anywhere, and `/trust` reads the run history only where `CLOUDFLARE_ANALYTICS_READ_TOKEN` is set,
which production has never had. So unattended meant unobserved. The scheduled handler collects
every failed step and, at the end of the run, `sendOpsFailureNotice` (`lib/delivery/opsNotice.ts`)
mails one summary to `WHETHER_OPS_EMAIL`; both Workflows send their own when they fail, because
they end hours after the cron's notice has gone. A clean run sends nothing. Without the address,
each failing run writes an `ops-notice` row saying so instead of skipping quietly.

**The refresh committed three of the five files it writes (2026-10-07).** `generateMonthlySummaries.ts`
also writes `data/time_machine_cache.json` and `data/confidence_record_months.json`, and the routine's
prompt said "Commit only those three data files". The cache is what the live week compares with when
last week's brief cannot be used, so even a refresh that landed would have left it behind; the manual
August refresh (`ad6a8c9a`) was the last commit to carry it. With the three rejected Mondays on top,
the live week of 2026-10-05 compared itself with Aug 31, five weeks back. The archive was refreshed
through Sep 30 by hand the same day. The routine also never ran `generateWeeklySummaries.ts`, so the
weekly archive stopped at Sep 11 (last refreshed by hand on 2026-09-14), and once the month-ends
moved past it `tests/regimeArchiveReplay.test.ts` failed on the count of replayable weeks, which
would block the routine's own push at the pre-push gate. The prompt can only be edited by its owner
(the routine was created through the HTTP API, and an agent may edit only routines it created): it
should run the weekly generator between the monthly and quarterly ones, verify with
`regimeArchiveReplay.test.ts` too, and commit all seven files. Since 2026-10-09 the generators also
fetch FRED's `NFCI` (the Chicago Fed index is on the record basis, spec §1.1.67) and fail the run if
it does not arrive, so a refresh never writes an archive on another basis; the host is the
`fred.stlouisfed.org` it already reaches. `bun run archive:index` regenerates the `/history/[period]`
index from the archive, and the prompt does not run it either. The claims read-through was first scheduled Monday 15:47 UTC,
inside the window this section describes, and moved to Tuesday 02:13 UTC the same day; it now also
checks that the month-end archive is current.

**A freeze must not move a pinned test (2026-10-07).** The routine pushes through the pre-push gate,
so any test that reads the newest frozen week fails its push and no freeze PR opens. The brief-format
golden did: every paste's "Full brief" link cited the newest frozen week even for fixtures dated weeks
before it (`selectCitablePermalinkBrief` let a negative age through), so appending w41 would have moved
twenty-odd pinned strings. It now cites the newest week frozen at or before the reading. Before changing
anything the freeze touches, append a week in a scratch copy (`bun run brief:freeze`) and run the suite.

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
run. Its first good run froze `2026-w38` on 2026-09-17 — the three Thursdays before it refused
fallback data while FRED was blocked — and w39 and w40 followed, so it fills forward from there.
That archive is **not backfilled**, deliberately. Its value is that it is evidence the call was
published every week; writing retroactive `publishedAt` stamps for weeks that were never published
would fabricate exactly the cadence it exists to prove, and `/history` now shows those numbers to
visitors.

Cloudflare's build is the remote gate, and it gates **production too**. The build command
configured in Workers Builds is `bun run check:vinext`, and since 2026-09-02 that script *is* the
deploy gate: `WHETHER_DEPLOY_GATE=1 bun scripts/run-checks.mjs lint typecheck test assets suppressions`, then
`WHETHER_DEPLOY_GATE=1 bun scripts/run-checks.mjs landmarks` on its own. So every push, `main`
included, runs lint, typecheck, the suite, and the asset check, and then the landmark audit,
before anything is built or deployed. (Since 2026-10-06 the command is
`bun scripts/run-checks.mjs --preset deploy`: the same two stages and the same signal, declared
once in `scripts/check-tasks.mjs` beside the pre-push hook's preset. The lists had been written out
in four places and a test compared two of them.) The audit runs second and alone because it spawns a dev
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
the build step's own inner gate (since removed) — a step the build reached *after* the outer command
had already passed. `audit` and `hotspot-preflight` still run on pre-push (preflight) and in
`bun run check` (both); they are excluded from the deploy path, not from the repo.

This paragraph used to say the opposite — that the production branch skips the gate, so "a flaky
test can never block a deploy" — and that sentence cost two days. Builds failed on all 27 commits
from 2026-08-31 to 2026-09-01 while the doc said they couldn't, so nobody read the build log; the
site served Aug-30 code for two days and the fix had to be deployed by hand. The confusion was that
there were *two* gates: `scripts/vinext-run.mjs` also ran the checks before `vinext build` on
preview branches, and skipped them on production, but that gate guarded only the build step, which
the deploy reached *after* `bun run check` had already passed. The inner gate never decided whether
a deploy happened.

**The inner gate is gone (2026-10-07).** From 2026-09-03 it was skipped "by evidence": the outer run
wrote a per-commit marker of what had passed (`scripts/check-gate-marker.mjs`, under
`.cache/check-gate/`), and `vinext-run build` ran only what the marker did not cover, so that a
dashboard command silently changed away from `check:vinext` would still be gated. That was a
marker file, an age bound, a dirty-tree rule, a union across the two stages, a 250-line test and a
second arrival in every doc, to defend against a dashboard setting no test can read. The guarantee
it bought is now a line in `docs/cloudflare-deployment-runbook.md`: if the dashboard's build command
changes, change the `deploy` preset, because the dashboard has no test. `vinext-run.mjs` only starts
the Vinext CLI, and `tests/deployGateTestScope.test.ts` holds it to importing none of the gate.

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

**The build container's checkout is not necessarily the commit (2026-09-17), and the gate refuses
one that is not.** After `fa1cc6e` merged, every build failed on two assertions — the memo example
still reading as the blank form, and `public/embed.js` still holding the hardcoded origin — while
`lint`, `typecheck` and every other test passed, and the same suite was green here through six
consecutive `WHETHER_DEPLOY_GATE=1` runs. The tell was inside one file: in `tests/embedRoute.test.ts`
the case that reads `public/embed.js` failed while the case beside it, reading `app/api/embed/route.ts`
and `app/share/embedBuilder.tsx` from the same commit, passed. `app/`, `lib/` and `tests/` were fresh
and `public/` was not — and the stale content was byte-for-byte what the last *successful* build
(03:03, pre-merge) still serves in production. The log's `Restoring from build output cache` step is
the mechanism: something wrote over `public/` after the clone. Two files from one commit cannot
disagree in a checkout, so a split like that is never a test problem, and the repo's answers for a
flaky suite — run it again, run it alone, replay the seed — cannot find it.

`worktreeDrift()` (`scripts/exec.mjs`) reports the drifted paths, and under `WHETHER_DEPLOY_GATE=1`
`run-checks.mjs` prints `HEAD <sha>` and **refuses before running any task** when a tracked file on
disk differs from it. It is a refusal, not a note, for `check:dead-exports`'s reason and one worse
than it: the results would be about something other than the commit, *and* the assets that deploy
come from the same tree, so a green run would ship the drift. Untracked files are reported and
allowed — a build container may leave something extra behind, which does not make the commit's own
content wrong. (The marker had this answer the whole time and threw it away: its `headCommit()`
returned `""` for a dirty tree and its doc comment asserted the container "checks out clean".
Believing that sentence cost a day and three wrong public hypotheses.)

Clearing the project's build cache in the Cloudflare dashboard was the remedy until 2026-10-14, by
hand, every time the cache went stale. That paragraph said no push from here could fix a stale cache,
which was wrong: the gate runs inside the container, and git there holds the commit. Under
`WORKERS_CI=1` the gate now runs `restoreTrackedFromHead` (`scripts/exec.mjs`, a `git reset --hard
HEAD`), names every file it reset, and refuses only if drift survives the reset. Deleting the two
assertions would still have been wrong: they are what showed that stale static assets were about to
deploy. The reset is limited to the build container because on a laptop the same drift is
uncommitted work.

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

A fourth, 2026-10-13: **a passing step prints its verdict, not its output.** The repeat above only
helps a failing gate. A *passing* gate still filled the window: `bun` 1.3.14 prints a line per
passing test whenever stdout is not a terminal (the "silent on a pass" below holds only on a TTY),
fallback warnings like `FRED circuit breaker open` repeated ~700 times, and the deploy step added
Vite's chunk tables and Wrangler's 600-row module table. The deploy's own result fell out of the log
and a working build read as a failed one. Now `run-checks` reduces a passing task to its last four
lines (`CHECK_VERBOSE=1` restores the rest); a failing task keeps its output, with any line repeated
more than three times printed once with its count; the gate runs `bun test --only-failures`;
`cloudflare-run.mjs` sets Vite to `warn` when `WORKERS_CI=1` and prints Wrangler's module table as a
count. A passing build is now ~45 lines and its deploy ~200. `tests/buildLogNoise.test.ts` holds it.

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
`answerPageReaderCopy`) and eight shuffled runs went green. The component suites that still listed
their three exports were thought safe because they never import a route themselves — but the stub
is process-wide, so it is the *next* file that pays: on 2026-09-22 seed `56385488` put one ahead of
the answer-page suites and failed 13 tests on a missing `notFound`. Every suite spreads the real
module now; a new one that does not is the same bug waiting for its seed. Keeping the real `notFound` has a second benefit: `resourceArticleRoutes.test.ts` asserts
against what Next actually throws instead of against a stub written in another file.

The workflow files under `.github/workflows/` are kept as manual (`workflow_dispatch`) fallbacks for
a missed run or a restored Actions budget. Running both would open two PRs, not corrupt anything.

