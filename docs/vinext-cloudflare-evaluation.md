# Vinext evaluation for Cloudflare Workers

This repo remains Cloudflare-first. Vinext is now the production build/deploy lane, with preview handled as a named Wrangler environment inside the same Cloudflare config.

## Current repo shape (April 15, 2026)
- Pages: 69
- Route handlers: 33
- Layouts: 3
- Dynamic segments: 19
- Architecture: heavy Next 16 App Router usage with metadata, route handlers, redirects, search-param navigation, sitemap/robots, and Cloudflare deployment coupling.

## Active lane
### `current-vinext` (production baseline)
- Dev/start/build/deploy: `bun run dev`, `bun run start`, `bun run build`, `bun run deploy:cloudflare`
- Cloudflare path: Vinext + [`wrangler.toml`](../wrangler.toml)
- Preview deploy wrapper: `bun run deploy:cloudflare:preview`
- Vite/Vinext config: [`vite.config.ts`](../vite.config.ts)
- Cloudflare preview environment: `env.preview` in [`wrangler.toml`](../wrangler.toml)
- Worker entry: [`worker/index.ts`](../worker/index.ts)
- Node preflight: [`scripts/vinext-run.mjs`](../scripts/vinext-run.mjs) fails fast outside Node 22+.
- Cloudflare env coordination: [`scripts/cloudflare-run.mjs`](../scripts/cloudflare-run.mjs) applies the same target environment to both build and deploy.

## What upstream says now
- Vinext 1.0 reached General Availability (released Sept 28, 2026 for Cloudflare Birthday Week).
- Current npm release in this repo: `vinext@1.0.1` and `@vinext/cloudflare@1.0.1`.
- npm metadata requires Node `>=22`.
- Repo metadata reflects that Node `>=22` is the supported engine for the active build/deploy lane.
- Upstream provides broad Next.js 16 coverage for App Router, route handlers, metadata, middleware, cache APIs, redirects, sitemap, and robots, exceeding 99% test compatibility.
- Vinext 1.0 introduces advanced network cache warming on Cloudflare Workers edge, pre-rendering and warming ISR caches before deployments go live.
- This repo clears the canonical deploy gate on `1.0.1` with CSS font loading, React `19.2.8`, and the postinstall repair script.

## Immediate repo implications
- Production is now on Vinext.
- Keep preview isolated through `env.preview` for rollback rehearsal and config experimentation.
- Do not assume `runtime = "edge"` semantics are authoritative under Vinext; validate actual runtime behavior in deployed preview/production environments.
- Do not depend on Next-generated typed-route output in shared navigation/content modules. This repo now uses a local route-type compatibility layer for those modules.

## Must-pass operating gates
### Gate A — Runtime and tooling readiness
- Node 22+ is the default for build and deploy.
- `bun run check` passes.
- `bun run lint`, `bun run typecheck`, and `bun run test` still pass in the baseline lane.

### Gate B — Build and boot parity
- Current baseline passes:
  - `bun run build`
  - `bun run build:cloudflare`
- Preview lane passes:
  - `bun run build:cloudflare:preview`
  - `bun run start`
  - `bun run deploy:cloudflare:preview:dry-run`

### Gate C — Route/runtime parity
- Homepage, Signals, and Operations preserve decision-transmission behavior.
- Representative dynamic content pages from Answers, Resources, Toolkits, Guides, and Posture render correctly.
- Route handlers preserve payload shape, status codes, and cache behavior.
- Metadata routes and their route-handler replacements stay correct (`sitemap.xml` is a metadata route; `robots.txt` is `app/robots.txt/route.ts`, which renders the Content-Signal line the metadata format cannot express).
- Search-param-driven navigation flows remain intact.

### Gate D — Cloudflare operations parity
- Vinext worker boot validated in the top-level production config and `env.preview`.
- Asset and image routes resolve correctly.
- Cache behavior for `revalidate`-sensitive paths is explicit and acceptable.
- Rollback now means reverting to the last pre-cutover commit or re-pointing production deploy automation at the top-level production target while keeping preview validation in `env.preview`.

## Decision rule
- **Operate on Vinext** while the current gates stay green.
- **Revert** if production-critical route/runtime behavior differs from the validated baseline.

## Sources
- [Vinext README](https://github.com/cloudflare/vinext)
- [Vinext on npm](https://www.npmjs.com/package/vinext)
