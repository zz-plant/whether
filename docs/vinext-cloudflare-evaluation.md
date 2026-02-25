# Vinext evaluation for Cloudflare Workers (safe rollout plan)

This repo plans to stay on Cloudflare Workers. This document captures what we can do safely now, without replacing the production toolchain prematurely.

## Current production baseline (keep as-is)
- Dev/start: `next` CLI.
- Build dispatch: `scripts/build.mjs`.
- Cloudflare path: `@cloudflare/next-on-pages` + `wrangler.toml` targeting `.vercel/output/static/_worker.js`.

## Why a direct swap is risky today
- `vinext` is explicitly experimental.
- `vinext` currently targets Cloudflare Workers first, but parity gaps and breaking changes can appear quickly.
- `vinext` requires Node >=22, while this repo baseline remains Node 20.16.x.

## Safe actions we can take now
1. **Keep production on current pipeline**
   - Continue using:
     - `bun run build`
     - `bun run build:pages`
2. **Run vinext only in a spike branch / isolated CI lane**
   - No production script replacement until parity is proven.
3. **Adopt objective cutover gates**
   - Only consider migration after all gates below pass.

## Suggested migration gates (Cloudflare-first)
### Gate A — Runtime and tooling readiness
- Node 22 lane added to CI.
- `bun install`, lint, typecheck, tests pass under Node 22.
- No regressions in existing Node 20 production lane while spike is in progress.

### Gate B — Build/deploy parity
- Current baseline passes:
  - `bun run build`
  - `bun run build:pages`
- Vinext spike passes equivalent build/start/deploy-preview commands in a non-production branch.

### Gate C — Route/runtime parity (must-pass)
- App Router pages parity (SSR/SSG/ISR behavior).
- API routes parity (payload shape, status codes, caching headers).
- Edge runtime parity (including OG image routes).
- Middleware/proxy behavior parity where used.

### Gate D — Cloudflare operations parity
- Worker artifact/output compatibility validated.
- Asset handling and cache semantics validated in preview.
- Rollback to current `next-on-pages` path documented and tested.

## Decision rule
- **Migrate** only when all gates pass and rollback is verified.
- **Defer** if any production-critical route/runtime behavior differs.

## Practical recommendation
Until those gates are met, the safest path for this repo is:
- Keep current `next` + `next-on-pages` production workflow.
- Continue vinext as an evaluation track only.
