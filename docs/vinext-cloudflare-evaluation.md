# Vinext evaluation for Cloudflare Workers

This repo remains Cloudflare-first. Vinext is now the production build/deploy lane, with a separate preview Worker retained for isolated validation.

## Current repo shape (March 15, 2026)
- Pages: 69
- Route handlers: 33
- Layouts: 3
- Dynamic segments: 19
- Architecture: heavy Next 16 App Router usage with metadata, route handlers, redirects, search-param navigation, sitemap/robots, and Cloudflare deployment coupling.

## Current lanes
### `current-vinext` (production baseline)
- Dev/start/build/deploy: `bun run dev`, `bun run start`, `bun run build`, `bun run deploy:cloudflare`
- Cloudflare path: Vinext + [`wrangler.toml`](/Users/kanav/Documents/GitHub/whether-app/wrangler.toml)

### `vinext-spike` (parallel evaluation)
- Dev/start/build/check: `bun run dev:vinext`, `bun run start:vinext`, `bun run build:vinext`, `bun run check:vinext`
- Cloudflare preview deploy wrapper: `bun run deploy:vinext`
- Vite/Vinext config: [`vite.config.ts`](/Users/kanav/Documents/GitHub/whether-app/vite.config.ts)
- Cloudflare spike config: [`wrangler.vinext.jsonc`](/Users/kanav/Documents/GitHub/whether-app/wrangler.vinext.jsonc)
- Worker entry: [`worker/index.ts`](/Users/kanav/Documents/GitHub/whether-app/worker/index.ts)
- Node preflight: [`scripts/vinext-run.mjs`](/Users/kanav/Documents/GitHub/whether-app/scripts/vinext-run.mjs) fails fast outside Node 22+.

## What upstream says now
- Vinext is still explicitly experimental.
- Current npm release: `vinext@0.0.30`.
- npm metadata requires Node `>=22`.
- Repo metadata now reflects that Node `>=22` is the supported engine for the active build/deploy lane.
- Upstream claims broad Next.js 16 coverage for App Router, route handlers, metadata, middleware, cache APIs, redirects, sitemap, and robots.
- Upstream also states its default behavior is request-time rendering rather than Next’s build-time prerender bias, and image optimization remains partial.

## Immediate repo implications
- Production is now on Vinext.
- Keep the preview spike isolated for rollback rehearsal and config experimentation.
- Do not assume `runtime = "edge"` semantics are authoritative under Vinext; validate actual runtime behavior in deployed preview/production environments.
- Do not depend on Next-generated typed-route output in shared navigation/content modules. This repo now uses a local route-type compatibility layer for those modules.

## Must-pass operating gates
### Gate A — Runtime and tooling readiness
- Node 22+ is the default for build and deploy.
- `bun run check:vinext` passes.
- `bun run lint`, `bun run typecheck`, and `bun run test` still pass in the baseline lane.

### Gate B — Build and boot parity
- Current baseline passes:
  - `bun run build`
  - `bun run build:cloudflare`
- Preview lane passes:
  - `bun run build:vinext`
  - `bun run start:vinext`
  - `bun run deploy:vinext:dry-run`

### Gate C — Route/runtime parity
- Homepage, Signals, and Operations preserve decision-transmission behavior.
- Representative dynamic content pages from Answers, Resources, Toolkits, Guides, and Posture render correctly.
- Route handlers preserve payload shape, status codes, and cache behavior.
- Metadata routes (`sitemap.xml`, `robots.txt`) remain correct.
- Search-param-driven navigation flows remain intact.

### Gate D — Cloudflare operations parity
- Vinext worker boot validated in production config and preview config.
- Asset and image routes resolve correctly.
- Cache behavior for `revalidate`-sensitive paths is explicit and acceptable.
- Rollback now means reverting to the last pre-cutover commit or re-pointing production deploy automation at the preview-isolated config.

## Decision rule
- **Operate on Vinext** while the current gates stay green.
- **Revert** if production-critical route/runtime behavior differs from the validated baseline.

## Sources
- [Vinext README](https://github.com/cloudflare/vinext)
- [Vinext on npm](https://www.npmjs.com/package/vinext)
