# Cloudflare deployment runbook

## Build + deploy commands

This repo now has two explicit Cloudflare lanes:
- `current-vinext`: production baseline using Vinext on Cloudflare Workers
- `vinext-spike`: preview-only Vinext evaluation lane

Use this command sequence in CI to keep Cloudflare Workers deploys deterministic and auditable:

```bash
bun install --frozen-lockfile
bun run check:vinext
bun run build:cloudflare
bun run deploy:cloudflare
```

This flow keeps dependency installation to a single explicit `bun install --frozen-lockfile` step and uses Vinext as the only build/deploy adapter.

`bun run build`, `bun run build:cloudflare`, and `bun run build:pages` all route through the same Vinext build path so local, CI, and Cloudflare validation stay aligned.

## Branch deploy commands

- **Production deploy:** `bun run deploy:cloudflare`
- **Production deploy dry run:** `bun run deploy:cloudflare:dry-run`
- **Build-only validation:** `bun run deploy:cloudflare:nonprod`
- **Preview spike:** `bun run deploy:vinext`
- **Preview spike dry run:** `bun run deploy:vinext:dry-run`

## Production lane

- Production uses [`wrangler.toml`](/Users/kanav/Documents/GitHub/whether-app/wrangler.toml)
- Worker entrypoint is [`worker/index.ts`](/Users/kanav/Documents/GitHub/whether-app/worker/index.ts)
- All default `dev`, `build`, `start`, and Cloudflare deploy scripts route through [`scripts/vinext-run.mjs`](/Users/kanav/Documents/GitHub/whether-app/scripts/vinext-run.mjs)

`deploy:cloudflare` maps directly to `vinext deploy` with the production Worker name in [`wrangler.toml`](/Users/kanav/Documents/GitHub/whether-app/wrangler.toml). `deploy:cloudflare:nonprod` is build-only validation without upload.

## Preview lane

The preview lane remains intentionally isolated from the production Cloudflare config:
- production uses [`wrangler.toml`](/Users/kanav/Documents/GitHub/whether-app/wrangler.toml)
- preview uses [`wrangler.vinext.jsonc`](/Users/kanav/Documents/GitHub/whether-app/wrangler.vinext.jsonc)
- `bun run deploy:vinext` runs through [`scripts/vinext-deploy.mjs`](/Users/kanav/Documents/GitHub/whether-app/scripts/vinext-deploy.mjs), which temporarily activates the preview config for the deploy command and then restores the production config immediately after

Validation commands for the preview lane:

```bash
bun run check:vinext
bun run build:vinext
bun run start:vinext
bun run deploy:vinext:dry-run
```

## Expected warnings (non-blocking)

The warning classes below are currently expected from the Vinext/Rolldown toolchain and should be treated as upstream noise unless behavior changes:

- Rolldown/Vinext plugin timing diagnostics during multi-environment builds
- Rolldown option-validation warnings for `treeshake.preset` and `experimentalMinChunkSize`
- `INEFFECTIVE_DYNAMIC_IMPORT` for `vinext/dist/shims/navigation.js` during SSR chunking

If CI reports a new warning class, treat it as action-required until triaged and either:
1. fixed in code/dependencies, or
2. intentionally accepted and documented in the build/deploy notes for the current Vinext version.
