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
red check on every merge is the signal that hides a real deploy failure. `CI`
still runs lint, typecheck, test, assets, and build on both pushes and PRs, so
nothing stopped being verified.

The commands below are for out-of-band deploys from a workstation (`wrangler
login` first) and for verifying a build locally.

## What Workers Builds runs

The build command configured in the Workers Builds dashboard is `bun run check:vinext`. It is
the deploy gate, not the full local check:

```bash
WHETHER_DEPLOY_GATE=1 bun scripts/run-checks.mjs lint typecheck test assets \
  && WHETHER_DEPLOY_GATE=1 bun scripts/run-checks.mjs landmarks
```

The landmark audit runs second and alone: it spawns a dev server and compiles every route
against it, and a server sharing a small container's cores with lint, tsc, and the suite turns a
slow route into one that "never answered".

`WHETHER_DEPLOY_GATE=1` makes `scripts/run-tests.mjs` run 2 workers with a 120s ceiling and skip
`tests/tools/` (it shells out to `python3`, which the build image does not guarantee), and gives
the landmark audit's dev-server readiness and per-route bounds room for a cold start. `audit`
needs the network and `hotspot-preflight` needs git history, so both stay on `bun run check` and
pre-push rather than the deploy path. It runs on every push, `main` included, so a red gate is a
blocked deploy — read the build log in the dashboard, where `run-checks.mjs` names the failing
task and attaches its output.

If the build command in the dashboard is ever changed, change `check:vinext` instead: the tests
in `tests/deployGateTestScope.test.ts` pin what that script runs, and the dashboard has no test.

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

This dry run is now a manual check: `bun run deploy:cloudflare:dry-run`. The workflow that used to run it on every pull request is dispatch-only, because the account stopped paying for Actions minutes on this private repo. Packaging is still exercised on every push by Cloudflare Workers Builds, which builds the Worker and fails the deploy on the same errors the dry run would surface — the difference is that it finds them after the merge rather than before it, so run the dry run by hand on anything that touches bindings, the adapter, or bundle size.

### Current toolchain notes

- Tailwind now runs on v4 via [`app/globals.css`](../app/globals.css) and [`postcss.config.js`](../postcss.config.js) using `@tailwindcss/postcss`; the legacy `tailwind.config.ts` file was removed during the CSS-first migration.
- Keep `vinext` and `@vinext/cloudflare` on the same pinned release (currently `0.2.1`). This repo still verifies Bun's Vinext install during `postinstall` via [`scripts/repair-vinext-install.mjs`](../scripts/repair-vinext-install.mjs) before build/deploy commands run.
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
- `CF_VERSION_METADATA` — Workers [Version Metadata](https://developers.cloudflare.com/workers/runtime-apis/bindings/version-metadata/) binding. Surfaces `id`, `tag`, and `timestamp` for the live deploy. `app/api/health/route.ts` reads `globalThis.CF_VERSION_METADATA.id` to populate the `commitSha` field, replacing the previous Pages-only `CF_PAGES_COMMIT_SHA` lookup.
- `ANALYTICS` — Workers [Analytics Engine](https://developers.cloudflare.com/analytics/analytics-engine/) dataset (`whether_telemetry` on production, `whether_telemetry_preview` on the preview lane). All three first-party telemetry routes (`/api/telemetry/web-vitals`, `/api/telemetry/operator-workflow`, `/api/telemetry/content-measurement`) write through `lib/telemetry/analyticsEngine.ts`. Schema: `index1 = stream`, `blob1 = stream`, `blob2 = JSON event payload`, with optional typed `doubles` (e.g. web-vitals `value` and `delta`). Datasets auto-create on first write — no extra provisioning needed. When the binding is absent (local dev / tests) the helper falls back to a tagged `console.info` line so behavior matches the previous black-hole path without throwing. **Querying**: the Analytics Engine binding only supports `writeDataPoint` from Workers; to read the data, use the [Cloudflare GraphQL Analytics API](https://developers.cloudflare.com/analytics/graphql-api/) with an API token that has `Workers Analytics Engine` read permissions. Filter on `dataset = 'whether_telemetry'` and extract fields from the JSON blob in `blob2`.

`[observability] enabled = true` is set on both lanes so tail logs and runtime errors land in the Workers dashboard for the active deploy without extra plumbing. `head_sampling_rate` is `1` (no sampling) until invocation volume warrants tuning.

### Durable KV (`WHETHER_DURABLE_KV`)

All repositories (`lib/operatingState/snapshotStore.ts`, `lib/storage/postureTransitionEventRepository.ts`, `lib/storage/decisionMemoryRepository.ts`, `lib/storage/regimeAlertRepository.ts`, `lib/storage/alertPreferenceRepository.ts`, `lib/ingestion/store.ts`) connect through `lib/runtime/boundary.ts` to `WHETHER_DURABLE_KV`.

The consolidated state architecture operates around `refreshOperatingState()`, which executes the single authoritative signal refresh, pure regime evaluation, `OperatingSnapshot` persistence, state machine update, and transition recording. Current brief reads project the latest committed `OperatingSnapshot`; explicit historical reads continue to reconstruct the requested period. Read paths perform zero writes.

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

If CI reports a new warning class, treat it as action-required until triaged and either:
1. fixed in code/dependencies, or
2. intentionally accepted and documented in the build/deploy notes for the current Vinext version.

## Shared UI import exceptions

- `app/components/uiIcons.tsx` now imports Lucide icons from `lucide-react/dist/esm/icons/*` so the shared client chunk only analyzes the icons the weekly brief and operations surfaces actually render.
- `simple-icons` does not expose stable per-icon ESM component entrypoints in the current package shape; `app/components/workAppIcon.tsx` therefore inlines the four non-Slack SVG metadata records used across export/integration surfaces instead of importing the full package entry.
- If we revisit `simple-icons`, treat any return to `import { ... } from "simple-icons"` inside shared UI modules as an explicit bundle-cost tradeoff that must be re-measured in `bun run build`.
