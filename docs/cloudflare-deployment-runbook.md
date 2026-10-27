# Cloudflare deployment runbook

## How production actually deploys

Cloudflare Workers Builds watches `main` and deploys on its own, roughly two
minutes after a merge — `wrangler deployments list` shows one deployment per
merge commit. Nothing in GitHub Actions deploys this Worker, and nothing should:
a second lane would race Workers Builds for the same Worker.

There was a `Deploy` workflow that ran `wrangler deploy` on every push to main.
It never once succeeded — the repo has no `CLOUDFLARE_API_TOKEN` secret, so
Wrangler exited on every run from 2026-05-30 onward — while Workers Builds
shipped those same commits. It was removed in Aug 2026 because a permanently
red check on every merge is the signal that hides a real deploy failure. GitHub `CI` has
been dispatch-only since 2026-08-21 (billed Actions minutes), so verification moved to
`.husky/pre-push` locally and to Cloudflare Workers Builds, whose `bun run check:vinext`
gates every push — nothing stopped being verified.

The commands below are for out-of-band deploys from a workstation (`wrangler
login` first) and for verifying a build locally.

## What Workers Builds runs

The build command configured in the Workers Builds dashboard is `bun run check:vinext`. It is
the deploy gate, not the full local check:

```bash
bun scripts/run-checks.mjs --preset deploy
```

The `deploy` preset (`scripts/check-tasks.mjs`, where the pre-push hook's preset is declared too)
is two stages: lint, typecheck, test, assets, suppressions and dead-exports together, then the
landmark audit on its own once they pass, under `WHETHER_DEPLOY_GATE=1` for the run and every task
it spawns. The landmark audit runs second and alone: it starts the production worker under
`wrangler dev` (the `serve:worker` script), which bundles the worker once and renders every route
from that bundle, and a workerd container sharing a small box's cores with lint, tsc and the
suite still turns a cold start into a timeout — the reason it is a stage of its own. (Until
2026-10-21 it served `vite dev` instead, which compiled each route on first fetch; the audit
against the worker is not only faster, it is the code that ships.)

`WHETHER_DEPLOY_GATE=1` (read in one place, `scripts/deploy-gate.mjs`) makes `scripts/run-tests.mjs` shuffle test order, pin `NODE_ENV=test`, run
with a 120s ceiling, and skip `tests/tools/` (it shells out to `python3`, which the build image does
not guarantee), and gives the landmark audit's dev-server readiness and per-route bounds room for a
cold start. A start that still misses its 180s deadline gets one fresh start before the audit fails
(2026-10-14: two `main` builds that day failed on a dev server that never answered, between builds
that passed), and every failed start prints the last 30 lines of the dev server's log into the build
log, which used to name a file inside the container and nothing else. It did once also drop to "2 workers"; `--max-concurrency` never bounded workers and the
knob is gone. `audit` needs the network and `hotspot-preflight` needs git history, so both stay
on `bun run check` and pre-push rather than the deploy path. It runs on every push, `main` included,
so a red gate is a blocked deploy — read the build log in the dashboard, where `run-checks.mjs` names the failing
task and attaches its output. **Read it from the bottom.** The viewer keeps a bounded window and the
gate's own output can be thousands of lines, so the per-task `❌` scrolls out of reach; since
2026-09-15 the run ends by repeating each failure with the lines that named it, which is the part
that survives.

If the build command in the dashboard is ever changed, change `check:vinext` (or the `deploy`
preset) instead: the tests in `tests/deployGateTestScope.test.ts` pin what that script runs, and
the dashboard has no test.

### "the working tree is not the commit it claims to be"

The gate prints `[run-checks] HEAD <sha>` before it runs anything, and stops with this message when
a tracked file on disk differs from that commit. It is not a code failure: the container is holding
content the commit does not have, so nothing the gate could report would be about the commit, and
the assets the deploy uploads come from that same tree.

It happened on 2026-09-17. `public/` held the previous successful build's files — the blank memo
example and the pre-fix `embed.js` — over an otherwise fresh clone, which the log's
`Restoring from build output cache` step explains. Two tests failed on content their own commit had
replaced, everything else passed, and it read as a flaky suite for a day.

**The gate repairs it now (2026-10-14).** Inside Workers Builds (`WORKERS_CI=1`) the gate resets
every drifted tracked file to HEAD with `git reset --hard`, lists the files it reset under
`[run-checks] … resetting them to the commit`, and carries on. Git in the container holds the commit,
so the cache can no longer decide what gets checked or deployed, and nobody has to clear it by hand.
Untracked leftovers are still only reported. Outside a build container the gate still refuses and
touches nothing, because there a drifted file is someone's uncommitted work.

If the refusal still appears in a build log, the reset ran and the files differ again, so something
is rewriting them during the build; clearing the cache will not fix that. Before 2026-10-14 the
remedy was clearing the build cache in the dashboard (Settings → Build → clear build cache).

## Tracing

`wrangler.toml` enables Workers automatic tracing (open beta) on both lanes under
`[observability.traces]` with `head_sampling_rate = 1`. The runtime emits spans for every handler
invocation, external fetch, and KV or Durable Object operation, with no code change. Export goes
to an OTLP destination configured in the dashboard (Observability → Destinations); Honeycomb,
Grafana Cloud, Axiom, and Sentry all accept it. Spans move to unified volume pricing on December 1,
2026 (50 GB/mo included, $0.25/GB thereafter), and `head_sampling_rate` is the cost knob — the invariant-level questions (how long did FRED take
against the 10s read deadline, what wrote to KV on a read) need a fraction of traffic.

## Source maps

`upload_source_maps = true` on both lanes, and `vite.config.ts` sets `build.sourcemap` for the
`rsc` and `ssr` environments only. Together they give Workers Logs stack traces that name a file
and a line in this repository instead of an offset into `index.js`; Wrangler fetches the map after
the invocation completes, so there is no runtime cost, and the client build stays map-free so no
source reaches a browser. The entry's map is under 1MB against the 15MB limit. Until 2026-09-14
the flag was `false` while `[observability]` was on, which is the combination that leaves every
stack trace pointing into minified code.

## Secrets and provider keys

Secrets are set per lane with `bunx wrangler secret put <NAME>` (add `--env preview` for the
preview lane) and reach library code through `globalThis`, like every binding; `readSetting`
(`lib/runtime/settings.ts`) reads one by name, falling back to `process.env` for scripts and
local runs, and treats an empty value as unset at either source. The site serves
without any of them: each provider key switches a read from a keyless path to a keyed one, and
the Slack signing secret gates one webhook route.

| Secret | Read by | Without it |
| --- | --- | --- |
| `FRED_API_KEY` | `lib/fred.ts` (`fetchFredRows`) | FRED reads stay on the chart-export CSV. A vintage request (`asOf`) throws instead of returning today's revision. |
| `ALPHA_VANTAGE_API_KEY` | `lib/saasMultiples.ts` | The SaaS comps median reads SEC EDGAR filings priced with Cboe's delayed quotes, falling back to Yahoo Finance. Neither needs a key. |
| `GITHUB_TOKEN` | `worker/workflows/regimeHistoryRefresh.ts`, `worker/workflows/weeklyBriefFreeze.ts` | Both Workflows fail loudly rather than skipping: the regime-history one at its PR step, the freeze at its first line, before it spends a live read. Each writes a failing `cron-step` row naming the missing secret, so a lane switched on without it says so on `/trust` instead of going quiet. Fine-grained token on this repository only: contents and pull requests, write; checks, read. The checks permission is what lets a Workflow read its branch build before merging (`WHETHER_AUTOMERGE_DATA_PRS`); without it the merge step fails with HTTP 403 and leaves the pull request open. |
| `SLACK_SIGNING_SECRET` | `lib/api/slackSignature.ts` (`requireSlackSignature`), from `app/api/webhooks/slack/actions/route.ts` | Production answers every interactive Slack action with 503 `slack_signing_secret_not_configured`; outside production the route accepts unsigned requests so it can be exercised without a Slack app. With it, the route checks `X-Slack-Signature` (HMAC-SHA256 over `v0:{timestamp}:{raw body}`) and refuses timestamps more than five minutes off, both with 401. Set it on both lanes; the value is the app's signing secret under Basic Information at api.slack.com. |
| `SLACK_WEBHOOK_URL` | `lib/delivery/slack.ts` (`slackChannel.listTargets`), for the Monday brief, both crons' `check-regime-change` alerts and the month-end pulse | The operator's own channel is not a target. Every post still goes to the channels subscribed through the form (the per-team webhook registry), and the three tripwire alerts — a regime change, a flip window narrowing, and (since 2026-09-17) a flash, an outsized move in the short rate or the curve since the previous read — are still recorded in the step's result and still reach alert subscribers by email through `alert-deliveries`. |
| `WHETHER_OPS_EMAIL` | `lib/delivery/opsNotice.ts` (`sendOpsFailureNotice`), at the end of each cron run and from both Workflows when they fail | Failures are recorded on `/trust` and reach nobody: every run with a failed step writes a failing `ops-notice` row saying the address is unset. With it, a run where any step failed sends one email to that address through the `EMAIL` binding, naming each failed step and its error; a run where everything succeeded sends nothing. The address is not a secret, but set it with `wrangler secret put` so it stays out of the repository. |
| `CLOUDFLARE_ACCOUNT_ID` | `lib/telemetry/runHistory.ts`, `lib/export/briefScreenshot.ts` | Both readers below report themselves unconfigured. The account id is not a secret, but it is set the same way so the two tokens cannot be present without it. |
| `CLOUDFLARE_ANALYTICS_READ_TOKEN` | `lib/telemetry/runHistory.ts` (`loadCronRunHistory`), from `app/trust/trustPageModel.ts` | `/trust` renders no "Scheduled runs" section. With it, the page reads the `cron-step` stream back through the Analytics Engine SQL API and shows runs, failures, and last success per scheduled step for the trailing 30 days, cached 15 minutes per isolate under a 2.5s deadline. Token permission: Account Analytics: Read. |
| `CLOUDFLARE_BROWSER_RENDERING_TOKEN` | `lib/export/briefScreenshot.ts` (`captureAndStoreBriefScreenshot`), from the Monday cron | The `artifact/brief-screenshot` cron step reports `skipped_unconfigured` and the Slack brief goes out as text blocks. With it, the cron captures the weekly-call block at `/?screenshot=1` through the Browser Rendering screenshot endpoint, stores the PNG in KV under the record date for 60 days, and the Slack post carries it as an image block served from `/api/image/brief-screenshot?date=YYYY-MM-DD`. Token permission: Browser Rendering: Edit. One capture a week sits well inside the free plan's ten minutes of browser time a day. |

The FRED key is free and allows 120 requests a minute. Alpha Vantage's free tier allows 25 requests
a day and 5 a minute: each symbol is fetched at most once a day (`next: { revalidate: 86400 }`), but
a basket fetched at once still exceeds the per-minute limit, and the comps then fall through to EDGAR.

## Browser notifications (VAPID keys)

Regime-change notifications to a browser need three values on the lane that should send them. Until
all three are set, `resolveVapidConfig` returns null and **nothing is offered anywhere in the UI** —
the toggle renders nothing rather than failing when pressed, and `/api/push` answers
`{ configured: false }`. That is deliberate, and it is the same rule the brief freeze follows: check
the configuration first and say so, rather than spend work discovering it later.

```bash
# Generate a P-256 pair. The public key is the uncompressed point, base64url;
# the private key is the JWK's `d`.
node -e '
const { subtle } = crypto;
subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign"]).then(async (pair) => {
  const raw = new Uint8Array(await subtle.exportKey("raw", pair.publicKey));
  const jwk = await subtle.exportKey("jwk", pair.privateKey);
  const b64 = (b) => Buffer.from(b).toString("base64url");
  console.log("VAPID_PUBLIC_KEY=" + b64(raw));
  console.log("VAPID_PRIVATE_KEY=" + jwk.d);
});'

wrangler secret put VAPID_PRIVATE_KEY     # secret
wrangler secret put VAPID_PUBLIC_KEY      # not secret, but kept beside its pair
wrangler secret put VAPID_SUBJECT         # mailto: or https: identifying the sender (RFC 8292 §2.1)
```

The keypair is an identity, not a rotating credential: regenerating it invalidates every stored
subscription, and each browser has to opt in again. Rotate only if the private key leaks.

Sending happens in one place — the branch of `checkRegimeChange` that has established the published
regime actually moved — so nothing fires on a week where nothing happened. The push carries no
payload, so there is no RFC 8291 encryption in the codebase and no way for a queued notification to
deliver a reading that has since changed; the service worker fetches `/api/posture/current` as it
draws the notification. Subscriptions that answer 404 or 410 are deleted rather than retried.

## Trial infrastructure

Two platform pieces are declared on both lanes and switched on by `[vars]` on the preview lane
only, so production keeps its current behavior until the trial is promoted:

- **`IngestCoordinator`** (`worker/ingestCoordinator.ts`), a SQLite-backed Durable Object bound
  as `INGEST_COORDINATOR`, holds the materialized signal model, the refresh lock, and an hourly
  alarm that refreshes due families. `WHETHER_INGEST_COORDINATOR = "1"` makes
  `getDefaultIngestionStore()` use it instead of KV. The object's own `GET /status` (reachable
  from a Worker through the stub, not publicly) reports whether a model exists and when the next
  alarm fires.
- **`RegimeHistoryRefreshWorkflow`** (`worker/workflows/regimeHistoryRefresh.ts`), bound as
  `REGIME_HISTORY_WORKFLOW`, turns the KV month in progress into a pull request against
  `data/summary_monthly_regime_history.json`. `WHETHER_HISTORY_WORKFLOW = "1"` makes the Monday
  cron start one instance (`bunx wrangler workflows instances list whether-regime-history-refresh
  --env preview` shows the runs). It needs `GITHUB_TOKEN` and `GITHUB_REPOSITORY`.

- **`WeeklyBriefFreezeWorkflow`** (`worker/workflows/weeklyBriefFreeze.ts`), bound as
  `BRIEF_FREEZE_WORKFLOW`, freezes this week's brief into `data/published_briefs.json` behind a
  pull request, from inside Cloudflare where FRED is reachable. `WHETHER_BRIEF_FREEZE_WORKFLOW =
  "1"` makes the Monday cron start one instance after the email and Slack steps. Its first step
  runs the same readiness guard as `bun run brief:freeze` (`lib/report/publishedBriefRecord.ts`
  builds the record for both) and retries hourly, up to five times, when the live read is not
  publishable yet. The archive stays append-only: a week the base branch already carries is left
  untouched and the run reports no change. It needs `GITHUB_TOKEN` and `GITHUB_REPOSITORY`; the
  branch is `automation/weekly-brief-freeze-<slug>`, the same name the manual GitHub workflow uses,
  so the two never collide on a week.

### Promoting the brief freeze to production

Two operator actions, and since 2026-09-17 they can be done in either order — the Workflow checks
`GITHUB_TOKEN` at its first line, before the live read, so a lane that has the flag and not the
secret refuses in seconds and names the secret in its `brief-freeze` row rather than reporting
"gave up after five hours" for something that was true at hand-off:

1. `wrangler secret put GITHUB_TOKEN` (no `--env`, so it lands on the production lane), with the
   same fine-grained scope the preview lane's token has.
2. Add to the top-level `[vars]` block in `wrangler.toml` — named environments do not inherit
   `vars`, so the preview lane keeps its own copy:

   ```toml
   WHETHER_BRIEF_FREEZE_WORKFLOW = "1"
   GITHUB_REPOSITORY = "zz-plant/whether"
   ```

   `GITHUB_REPOSITORY` only restates `DEFAULT_GITHUB_REPOSITORY`, but a lane that writes to a
   repository should say which one rather than inherit it from a constant two modules away.

Then watch `/trust` → Scheduled runs for a `Brief freeze outcome` row on the next Monday, and
`automation/weekly-brief-freeze-<slug>` for the pull request.

### Data pull requests merge themselves (2026-10-14)

With `WHETHER_AUTOMERGE_DATA_PRS = "1"` in the top-level `[vars]`, both data Workflows merge the pull request they opened (`worker/workflows/landDataPullRequest.ts`). Each waits five minutes for Cloudflare's branch build to start, checks it every five minutes for up to 45 more, then squash-merges only if `lib/github/dataPullRequestMerge.ts` allows it: the pull request is open, it changes exactly the Workflow's one data file, and every Workers Builds check run on its head commit concluded `success`. The merge is pinned to that commit, so GitHub refuses it if anyone pushed after the check.

The branch build is a real gate only because its deploy command became `bun run deploy:cloudflare:branch-check` on 2026-10-14 ("Branch builds" below). Under `npx wrangler preview`, every branch build failed after the gate passed, so a Workflow would never have merged anything. If that command changes again, check that a green branch build still means the deploy gate passed.

A pull request the Workflow may not merge stays open, and the run fails with the reason. That puts it on `/trust` as a failing outcome row and, where `WHETHER_OPS_EMAIL` is set, in the owner's failure email. Set the var to `"0"` to hand merging back to a person.

Why not wait for a longer preview trial: `data/published_briefs.json` is deliberately never
backfilled, so every week spent proving this is a week the record can never honestly claim. The
failure modes are bounded — `assembleCurrentWeekBrief` refuses degraded and fallback data outright,
a bad run throws and opens nothing, and it now writes its own failing row either way.

To promote any of the others, copy its var into the production `[vars]` block; to retire one, remove
the binding and, for the object, add a `deleted_sqlite_classes` migration. The DO migration list
is top-level and applies to both lanes, which is why the class is declared on both. The
coordinator's promotion criterion, so it is a decision and not a drift: two consecutive weeks on
the preview lane in which its `GET /status` reports a model and a scheduled alarm on every check,
and the `refresh-operating-state` row on the preview `/trust` run history shows no failures.

## Validating config without deploying

`bunx wrangler types --env preview <out.d.ts>` parses and validates `wrangler.toml` for a lane
without network or credentials and prints the bindings it resolved; run it after any config edit.
The full dry run (`bun run deploy:cloudflare:preview:dry-run`) also builds and packages.

## Build + deploy commands

This repo now has one Wrangler source of truth with two deployment targets:
- `production`: top-level config in [`wrangler.toml`](../wrangler.toml)
- `preview`: named `env.preview` in [`wrangler.toml`](../wrangler.toml)

Use this command sequence in CI to keep Cloudflare Workers deploys deterministic and auditable:

```bash
bun install --frozen-lockfile
bun run check
bun run build:cloudflare
bun run deploy:cloudflare
```

This flow keeps dependency installation to a single explicit `bun install --frozen-lockfile` step and uses Vinext as the only build/deploy adapter.

`bun run build:cloudflare` and `bun run deploy:cloudflare` now route through [`scripts/cloudflare-run.mjs`](../scripts/cloudflare-run.mjs), which sets `CLOUDFLARE_ENV` before the Vinext build step and then deploys with the matching Wrangler environment. This removes the old config-swapping preview wrapper and keeps build-time bindings/config aligned with the deploy target.

## Branch deploy commands

- **Production deploy:** `bun run deploy:cloudflare`
- **Production deploy dry run:** `bun run deploy:cloudflare:dry-run`
- **Preview build-only validation:** `bun run build:cloudflare:preview`
- **Preview deploy:** `bun run deploy:cloudflare:preview`
- **Preview deploy dry run:** `bun run deploy:cloudflare:preview:dry-run`

## Production lane

- Production uses [`wrangler.toml`](../wrangler.toml)
- Worker entrypoint is [`worker/index.ts`](../worker/index.ts)
- Generic Vinext commands still route through [`scripts/vinext-run.mjs`](../scripts/vinext-run.mjs)
- Cloudflare-targeted build/deploy commands route through [`scripts/cloudflare-run.mjs`](../scripts/cloudflare-run.mjs)

`deploy:cloudflare` builds against the top-level Wrangler config and then runs the dedicated `@vinext/cloudflare deploy --skip-build` CLI, so the build artifact and deploy target stay on the same environment contract without relying on Vinext's deprecated deploy compatibility shim.

The dry-run commands run both validation layers, because neither sees what the other does. They first build the selected environment, then run the adapter's own `--dry-run --skip-build`, which checks the adapter contract — router mode, ISR wiring, and the data and image adapters the routes require — and finally run the repo-local `wrangler deploy --dry-run`, which packages the Worker and validates bindings and upload limits without publishing. A successful dry run therefore provides deploy-package evidence rather than only a scaffold check, and an adapter-contract break reports itself as an adapter error instead of a later packaging failure.

Locally the production dry run is a manual check: `bun run deploy:cloudflare:dry-run`. The GitHub workflow that ran it on every pull request is dispatch-only, because the account stopped paying for Actions minutes on this private repo.

### Branch builds (Workers Builds Previews)

Every pushed branch gets its own Workers Builds run from the Worker's Previews base config: the same build command (`bun run check:vinext`), then the base config's deploy command. That command is `bun run deploy:cloudflare:branch-check` (set 2026-10-14): it builds against `env.preview` and runs both dry-run layers, the adapter contract and `wrangler deploy --dry-run`, and uploads nothing. So packaging, binding and bundle-size failures show on the pull request's check before the merge.

It used to be `npx wrangler preview`, which every branch failed: it ran Wrangler against the raw sources, without the vinext build, and could not resolve `@opentelemetry/api` or `virtual:vinext-image-adapters`. A permanently red check on every pull request is the signal that hides a real failure (see the removed `Deploy` workflow above). Making it upload is not the fix either. A preview built from the top-level config binds production `WHETHER_DURABLE_KV` and `VINEXT_KV_CACHE`, and the read path writes to KV in the background, so branch code would write production data. Real preview URLs need a Preview whose bindings are the `env.preview` ones; until that is proven, branch builds validate and stop.

The base config lives in Cloudflare, not in this repo. Read it with `cf builds workers get <script tag>` (`cf workers list` gives the tag as `id`).

### Current toolchain notes

- Tailwind now runs on v4 via [`app/globals.css`](../app/globals.css) and [`postcss.config.js`](../postcss.config.js) using `@tailwindcss/postcss`; the legacy `tailwind.config.ts` file was removed during the CSS-first migration.
- Keep `vinext` and `@vinext/cloudflare` on the same pinned release (currently `0.2.1`). The `postinstall` repair that restored `dist/` files Bun left out of `vinext@0.0.38` was retired on 2026-10-06: cold installs of `0.2.1` (fresh cache, scripts off) were complete — all 858 published files — on every Bun this repo runs on (1.1.38 as seen in the build container, the pinned 1.3.14, and 1.4.2), 19 times out of 19, and the script returned early in CI regardless. If a Vinext bump ever fails with a missing `node_modules/vinext/dist/...` module, compare the installed file count with `npm view vinext@<version> dist.fileCount` before suspecting the code.
- Web-vitals telemetry now uses the official [`web-vitals`](https://www.npmjs.com/package/web-vitals) package in [`app/components/webVitalsTracker.tsx`](../app/components/webVitalsTracker.tsx) instead of `next/web-vitals`, which keeps the current Vinext compatibility check free of that prior warning.
- Root layout fonts now load from CSS in [`app/globals.css`](../app/globals.css) instead of `next/font/google` in [`app/layout.tsx`](../app/layout.tsx), which removes the last repo-local compatibility gap on the active Vinext lane.

## Preview lane

The preview lane now lives in [`wrangler.toml`](../wrangler.toml) under `env.preview`. This keeps preview and production under one config file while still letting Wrangler isolate the deployment target.

`bun run deploy:cloudflare:preview`:
- sets `CLOUDFLARE_ENV=preview` for the build step
- runs the Vinext build against `env.preview`
- deploys with `--env preview`

Validation commands for the preview lane:

```bash
bun run check
bun run build:cloudflare:preview
bun run start
bun run deploy:cloudflare:preview:dry-run
```

## Runtime bindings

The active `wrangler.toml` declares the following bindings on both the production and `env.preview` lanes:

- `ASSETS` — Workers Static Assets binding for vinext output.
- `IMAGES` — Workers Images binding used by the `/_vinext/image` worker route.
- `WHETHER_SUBSCRIBE_RATE_LIMITER` and `WHETHER_PUBLIC_WRITE_RATE_LIMITER` — Workers [rate limiting](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/) bindings (`[[ratelimits]]`), read through `lib/runtime/rateLimit.ts`. The first fronts every path that sends a verification email (`/api/email/subscribe`, `/api/subscribe`, `/api/mcp?tool=subscribe`, all through `subscribeAndSendVerification`) at 5 a minute per connecting address; the second fronts the browser telemetry intake at 60 a minute. A refused request answers 429 with `Retry-After`. Counters are per Cloudflare location and eventually consistent, so this is abuse control, not accounting. `namespace_id` is account-wide and shared counters follow it, which is why the preview lane declares its own ids. Absent (tests, `bun run dev`), every check allows.
- `CF_VERSION_METADATA` — Workers [Version Metadata](https://developers.cloudflare.com/workers/runtime-apis/bindings/version-metadata/) binding. Surfaces `id`, `tag`, and `timestamp` for the live deploy. `app/api/health/route.ts` reads `globalThis.CF_VERSION_METADATA.id` to populate the `commitSha` field, replacing the previous Pages-only `CF_PAGES_COMMIT_SHA` lookup.
- `ANALYTICS` — Workers [Analytics Engine](https://developers.cloudflare.com/analytics/analytics-engine/) dataset (`whether_telemetry` on production, `whether_telemetry_preview` on the preview lane). All three first-party telemetry routes (`/api/telemetry/web-vitals`, `/api/telemetry/operator-workflow`, `/api/telemetry/content-measurement`) write through `lib/telemetry/analyticsEngine.ts`. Schema: `index1 = stream`, `blob1 = stream`, `blob2 = JSON event payload`, with optional typed `doubles` (e.g. web-vitals `value` and `delta`). Datasets auto-create on first write — no extra provisioning needed. When the binding is absent (local dev / tests) the helper falls back to a tagged `console.info` line so behavior matches the previous black-hole path without throwing. **Querying**: the Analytics Engine binding only supports `writeDataPoint` from Workers; to read the data, use the [Cloudflare GraphQL Analytics API](https://developers.cloudflare.com/analytics/graphql-api/) with an API token that has `Workers Analytics Engine` read permissions. Filter on `dataset = 'whether_telemetry'` and extract fields from the JSON blob in `blob2`. `lib/telemetry/runHistory.ts` does this from the Worker for the `cron-step` stream so `/trust` can show what the scheduled jobs did (see `CLOUDFLARE_ANALYTICS_READ_TOKEN` above); `WHETHER_TELEMETRY_DATASET` names the lane's dataset for that read, and is set on the preview lane only.

`[observability] enabled = true` is set on both lanes so tail logs and runtime errors land in the Workers dashboard for the active deploy without extra plumbing. `head_sampling_rate` is `1` (no sampling) until invocation volume warrants tuning.

### Durable KV (`WHETHER_DURABLE_KV`)

All repositories (`lib/operatingState/snapshotStore.ts`, `lib/storage/postureTransitionEventRepository.ts`, `lib/storage/decisionMemoryRepository.ts`, `lib/storage/regimeAlertRepository.ts`, `lib/ingestion/store.ts`, and the subscriber, Slack-webhook and alert stores) store in `WHETHER_DURABLE_KV`; the shared accessor is `getWhetherKv()` in `lib/runtime/kv.ts`, which refuses a binding without `list()`. Stored JSON is read back through `getJson` / `parseStoredJson` in the same module, narrowed by a zod schema or the store's own parser; an unparseable or non-matching record reads as no record. Every `get…Store()` / `get…Repository()` picks KV or its in-memory fallback through `selectStoreByBinding` (`lib/runtime/storeSelection.ts`), which re-checks the binding on each call the way `getDefaultIngestionStore` does, so a call that ran before the binding was installed no longer leaves the isolate writing to memory.

The consolidated state architecture operates around `refreshOperatingState()`, which executes the single authoritative signal refresh, pure regime evaluation, `OperatingSnapshot` persistence, state machine update, and transition recording. Current brief reads project the latest committed `OperatingSnapshot`; explicit historical reads continue to reconstruct the requested period. Read paths perform zero writes while the materialized signal store is current; a cold store ingests inline, and a stale one takes the refresh lock and refreshes off the request (Invariants 1, 1b, 1c in `tests/architectureInvariants.test.ts`).

To provision once and enable durable persistence:

```bash
# Production lane (top-level config)
bunx wrangler kv namespace create WHETHER_DURABLE_KV
bunx wrangler kv namespace create WHETHER_DURABLE_KV --preview

# Preview lane (env.preview)
bunx wrangler kv namespace create WHETHER_DURABLE_KV --env preview
bunx wrangler kv namespace create WHETHER_DURABLE_KV --env preview --preview
```

Then paste the returned IDs into the commented `[[kv_namespaces]]` and `[[env.preview.kv_namespaces]]` blocks in `wrangler.toml` and uncomment them. After deploy, `/api/regime-alerts` and `/api/decision-events` report `backend: "durable"`. In production, write operations strictly require durable storage and refuse silent local fallback.

The binding is intentionally left commented out by default so CI deploys do not fail wrangler validation when the namespace IDs have not yet been provisioned.

## Auth preflight

Real deploys now run a lightweight Wrangler auth preflight before upload:
- local interactive use: `wrangler login`
- CI/non-interactive use: set `CLOUDFLARE_API_TOKEN`

Dry-run commands skip this preflight because they do not upload.

## Warning policy

The active `vinext@0.2.1` lane no longer emits the prior Rolldown option-validation warnings for `treeshake.preset` or `experimentalMinChunkSize` during `bun run build`.

If a build (local, or the Workers Builds log) reports a new warning class, treat it as action-required until triaged and either:
1. fixed in code/dependencies, or
2. intentionally accepted and documented in the build/deploy notes for the current Vinext version.

## Shared UI import exceptions

- None live today: `app/components/uiIcons.tsx` imports Lucide icons from `lucide-react` directly, and `simple-icons` is not a dependency (the inlined-SVG workaround that `app/components/workAppIcon.tsx` carried is gone with it).
- If a shared client module ever needs per-icon or third-party brand icons again, treat any deep import path inside shared UI (`lucide-react/dist/esm/icons/*`, `simple-icons/components/*`) as an explicit bundle-cost tradeoff that must be re-measured in `bun run build`.
