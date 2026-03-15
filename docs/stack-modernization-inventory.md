# Stack modernization inventory & constraints

## Runtime policy
- **Policy choice:** Vinext cutover complete; Cloudflare build/deploy no longer depend on Vercel output adapters.
- **Primary runtime:** Bun is the default runtime/package manager for local and CI command orchestration (`bun install`, `bun run <script>`).
- **Supported Node runtime:** Node.js `>=22` for Vinext CLI wrappers and deploy flows.

## Runtime & tooling versions
- **Package manager / primary runtime:** Bun 1.3.9 (`packageManager`, `engines.bun`).
- **Node engine:** `>=22` (`engines.node`).
- **Next.js:** 16.1.6.
- **React / React DOM:** 19.2.4.
- **TypeScript:** 5.9.3.
- **Tailwind CSS:** 3.4.17.
- **Cloudflare adapter:** Vinext + `@cloudflare/vite-plugin`.
- **Testing:** Bun test runner via `bun run test` (guarded wrapper `bun scripts/run-tests.mjs` fails if `./tests` discovery is empty before running `bun test ./tests`).
- **Test compatibility contract:** Existing tests continue using `node:test` / `node:assert/strict` imports under Bun's Node-compat layer.
- **Linting:** `eslint` CLI via `bun run lint`.

## Build & deployment pipeline
- **Primary build entry:** [`scripts/vinext-run.mjs`](/Users/kanav/Documents/GitHub/whether-app/scripts/vinext-run.mjs) wraps the Vinext CLI and enforces Node `>=22` for build/dev/start/deploy commands.
- **Cloudflare output wiring:** [`wrangler.toml`](/Users/kanav/Documents/GitHub/whether-app/wrangler.toml) targets [`worker/index.ts`](/Users/kanav/Documents/GitHub/whether-app/worker/index.ts) with asset and image bindings enabled.

## App Router usage & runtimes
- **App Router layout:** `app/` directory with top-level `layout.tsx`, route segments, and API handlers under `app/api`.
- **Current route inventory:** 69 `page.tsx` routes, 33 `route.ts` handlers, 3 `layout.tsx` files, and 19 dynamic segments.
- **Edge runtime:** `app/page.tsx`, onboarding, signals, operations (root/decisions/plan/briefings), and `app/api/og/route.ts` export `runtime = "edge"`.
- **Typed routes:** shared navigation/content modules now use a local route-type layer instead of depending on Next-generated typed-route output.

## Data fetching & caching
- **Treasury API client:** `lib/treasury/treasuryClient.ts` uses `fetch` and normalizes responses with explicit `source`, `fetched_at`, and `isLive` metadata; it also supports snapshot fallbacks and historical cache reads.
- **Offline snapshot data:** `lib/snapshot.ts` loads `data/snapshot_fallback.json` and validates it for offline mode fallbacks.
- **Time Machine cache:** historical lookups use cached snapshots (see `lib/timeMachine`).
- **Source metadata expectations:** sensor readings include explicit source labels and freshness metadata (see `lib/sensors.ts`).

## Deployment constraints & assumptions
- **Cloudflare Workers:** production config includes `compatibility_date = "2026-03-15"` and `nodejs_compat`.
- **Static asset handling:** Vinext build output is uploaded via `vinext deploy`; runtime assets are bound through `ASSETS`.

## Initial risk register
- **Edge runtime drift:** multiple routes rely on `runtime = "edge"`; framework upgrades could shift caching or runtime defaults.
- **Cloudflare adapter compatibility:** Vinext/Rolldown warnings still need periodic validation on upgrades.
- **App Router changes:** App Router behavior may change in Next.js upgrades even when the deploy runtime stays on Vinext.
- **Data fallback expectations:** treasury fetch fallbacks and snapshot validation need parity during migrations.

## Sources of truth
- Tooling and versions: `package.json`.
- Build pipeline: `scripts/vinext-run.mjs`.
- Cloudflare wiring: `wrangler.toml`.
- App runtime declarations: `app/**/page.tsx`, `app/api/og/route.ts`.
- Data clients and metadata: `lib/treasury/treasuryClient.ts`, `lib/sensors.ts`, `lib/snapshot.ts`.
