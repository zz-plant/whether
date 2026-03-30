# Cloudflare deployment runbook

## Build + deploy commands

This repo now has one Wrangler source of truth with two deployment targets:
- `production`: top-level config in [`wrangler.toml`](/Users/kanav/Documents/GitHub/whether-app/wrangler.toml)
- `preview`: named `env.preview` in [`wrangler.toml`](/Users/kanav/Documents/GitHub/whether-app/wrangler.toml)

Use this command sequence in CI to keep Cloudflare Workers deploys deterministic and auditable:

```bash
bun install --frozen-lockfile
bun run check:vinext
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
- **Legacy alias:** `bun run deploy:vinext`
- **Legacy alias dry run:** `bun run deploy:vinext:dry-run`

## Production lane

- Production uses [`wrangler.toml`](/Users/kanav/Documents/GitHub/whether-app/wrangler.toml)
- Worker entrypoint is [`worker/index.ts`](/Users/kanav/Documents/GitHub/whether-app/worker/index.ts)
- Generic Vinext commands still route through [`scripts/vinext-run.mjs`](/Users/kanav/Documents/GitHub/whether-app/scripts/vinext-run.mjs)
- Cloudflare-targeted build/deploy commands route through [`scripts/cloudflare-run.mjs`](/Users/kanav/Documents/GitHub/whether-app/scripts/cloudflare-run.mjs)

`deploy:cloudflare` builds against the top-level Wrangler config and then runs `vinext deploy --skip-build`, so the build artifact and deploy target stay on the same environment contract.

## Preview lane

The preview lane now lives in [`wrangler.toml`](/Users/kanav/Documents/GitHub/whether-app/wrangler.toml) under `env.preview`. This keeps preview and production under one config file while still letting Wrangler isolate the deployment target.

`bun run deploy:cloudflare:preview`:
- sets `CLOUDFLARE_ENV=preview` for the build step
- runs the Vinext build against `env.preview`
- deploys with `--env preview`

Validation commands for the preview lane:

```bash
bun run check:vinext
bun run build:cloudflare:preview
bun run start:vinext
bun run deploy:cloudflare:preview:dry-run
```

## Auth preflight

Real deploys now run a lightweight Wrangler auth preflight before upload:
- local interactive use: `wrangler login`
- CI/non-interactive use: set `CLOUDFLARE_API_TOKEN`

Dry-run commands skip this preflight because they do not upload.

## Expected warnings (non-blocking)

The warning classes below are currently expected from the Vinext/Rolldown toolchain and should be treated as upstream noise unless behavior changes:

- Rolldown/Vinext plugin timing diagnostics during multi-environment builds
- Rolldown option-validation warnings for `treeshake.preset` and `experimentalMinChunkSize`
- `INEFFECTIVE_DYNAMIC_IMPORT` for `vinext/dist/shims/navigation.js` during SSR chunking

If CI reports a new warning class, treat it as action-required until triaged and either:
1. fixed in code/dependencies, or
2. intentionally accepted and documented in the build/deploy notes for the current Vinext version.

## Shared UI import exceptions

- `app/components/uiIcons.tsx` now imports Lucide icons from `lucide-react/dist/esm/icons/*` so the shared client chunk only analyzes the icons the weekly brief and operations surfaces actually render.
- `simple-icons` does not expose stable per-icon ESM component entrypoints in the current package shape; `app/components/workAppIcon.tsx` therefore inlines the four non-Slack SVG metadata records used across export/integration surfaces instead of importing the full package entry.
- If we revisit `simple-icons`, treat any return to `import { ... } from "simple-icons"` inside shared UI modules as an explicit bundle-cost tradeoff that must be re-measured in `bun run build`.
