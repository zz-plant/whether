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

## Build + deploy commands

This repo now has one Wrangler source of truth with two deployment targets:
- `production`: top-level config in [`wrangler.toml`](/Users/kanav/Documents/GitHub/whether-app/wrangler.toml)
- `preview`: named `env.preview` in [`wrangler.toml`](/Users/kanav/Documents/GitHub/whether-app/wrangler.toml)

Use this command sequence in CI to keep Cloudflare Workers deploys deterministic and auditable:

```bash
bun install --frozen-lockfile
bun run check
bun run build:cloudflare
bun run deploy:cloudflare
```

This flow keeps dependency installation to a single explicit `bun install --frozen-lockfile` step and uses Vinext as the only build/deploy adapter.

`bun run build:cloudflare` and `bun run deploy:cloudflare` now route through [`scripts/cloudflare-run.mjs`](/Users/kanav/Documents/GitHub/whether-app/scripts/cloudflare-run.mjs), which sets `CLOUDFLARE_ENV` before the Vinext build step and then deploys with the matching Wrangler environment. This removes the old config-swapping preview wrapper and keeps build-time bindings/config aligned with the deploy target.

## Branch deploy commands

- **Production deploy:** `bun run deploy:cloudflare`
- **Production deploy dry run:** `bun run deploy:cloudflare:dry-run`
- **Preview build-only validation:** `bun run build:cloudflare:preview`
- **Preview deploy:** `bun run deploy:cloudflare:preview`
- **Preview deploy dry run:** `bun run deploy:cloudflare:preview:dry-run`

## Production lane

- Production uses [`wrangler.toml`](/Users/kanav/Documents/GitHub/whether-app/wrangler.toml)
- Worker entrypoint is [`worker/index.ts`](/Users/kanav/Documents/GitHub/whether-app/worker/index.ts)
- Generic Vinext commands still route through [`scripts/vinext-run.mjs`](/Users/kanav/Documents/GitHub/whether-app/scripts/vinext-run.mjs)
- Cloudflare-targeted build/deploy commands route through [`scripts/cloudflare-run.mjs`](/Users/kanav/Documents/GitHub/whether-app/scripts/cloudflare-run.mjs)

`deploy:cloudflare` builds against the top-level Wrangler config and then runs the dedicated `@vinext/cloudflare deploy --skip-build` CLI, so the build artifact and deploy target stay on the same environment contract without relying on Vinext's deprecated deploy compatibility shim.

The dry-run commands are intentionally stronger than the adapter's native `--dry-run`. They first build the selected environment and then run the repo-local `wrangler deploy --dry-run`, which packages the Worker and validates bindings and upload limits without publishing. A successful dry run therefore provides deploy-package evidence rather than only checking that the Vinext scaffold exists.

Upgrade Guardrails runs this production dry run on every pull request, so deploy packaging remains a mechanical gate rather than a manual-only check.

### Current toolchain notes

- Tailwind now runs on v4 via [`app/globals.css`](/Users/kanav/Documents/GitHub/whether-app/app/globals.css) and [`postcss.config.js`](/Users/kanav/Documents/GitHub/whether-app/postcss.config.js) using `@tailwindcss/postcss`; the legacy `tailwind.config.ts` file was removed during the CSS-first migration.
- Keep `vinext` and `@vinext/cloudflare` on the same pinned release (currently `0.2.1`). This repo still verifies Bun's Vinext install during `postinstall` via [`scripts/repair-vinext-install.mjs`](/Users/kanav/Documents/GitHub/whether-app/scripts/repair-vinext-install.mjs) before build/deploy commands run.
- Web-vitals telemetry now uses the official [`web-vitals`](https://www.npmjs.com/package/web-vitals) package in [`app/components/webVitalsTracker.tsx`](/Users/kanav/Documents/GitHub/whether-app/app/components/webVitalsTracker.tsx) instead of `next/web-vitals`, which keeps the current Vinext compatibility check free of that prior warning.
- Root layout fonts now load from CSS in [`app/globals.css`](/Users/kanav/Documents/GitHub/whether-app/app/globals.css) instead of `next/font/google` in [`app/layout.tsx`](/Users/kanav/Documents/GitHub/whether-app/app/layout.tsx), which removes the last repo-local compatibility gap on the active Vinext lane.

## Preview lane

The preview lane now lives in [`wrangler.toml`](/Users/kanav/Documents/GitHub/whether-app/wrangler.toml) under `env.preview`. This keeps preview and production under one config file while still letting Wrangler isolate the deployment target.

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

### Optional: durable KV (`WHETHER_DURABLE_KV`)

Several repositories (`lib/storage/regimeAlertRepository.ts`, `lib/storage/alertPreferenceRepository.ts`, `lib/storage/postureDecisionEventRepository.ts`, `lib/storage/decisionMemoryRepository.ts`, `lib/events/decisionEventStore.ts`, `lib/ingestion/store.ts`) probe `globalThis.WHETHER_DURABLE_KV` and silently fall back to in-memory storage when the binding is missing. The fallback is per-isolate and is lost on every redeploy, so any feature that depends on durable history (regime alert history, decision events, decision memory, alert preferences, ingestion snapshots) operates as `backend: "local-fallback"` until the binding is provisioned.

To provision once and enable durable persistence:

```bash
# Production lane (top-level config)
bunx wrangler kv namespace create WHETHER_DURABLE_KV
bunx wrangler kv namespace create WHETHER_DURABLE_KV --preview

# Preview lane (env.preview)
bunx wrangler kv namespace create WHETHER_DURABLE_KV --env preview
bunx wrangler kv namespace create WHETHER_DURABLE_KV --env preview --preview
```

Then paste the returned IDs into the commented `[[kv_namespaces]]` and `[[env.preview.kv_namespaces]]` blocks in `wrangler.toml` and uncomment them. After deploy, `/api/regime-alerts` and `/api/decision-events` should report `backend: "durable"` instead of `local-fallback`.

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
