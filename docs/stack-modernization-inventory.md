# Stack modernization inventory & constraints

## Runtime & tooling versions
- **Package manager:** Bun 1.2.14 (`packageManager`).
- **Node engine:** >=20.16.0.
- **Next.js:** 14.2.5.
- **React / React DOM:** 18.3.1.
- **TypeScript:** 5.5.3.
- **Tailwind CSS:** 3.4.6.
- **Cloudflare adapter:** @cloudflare/next-on-pages 1.13.16.
- **Testing:** `node --test` via `bun test`.
- **Linting:** `next lint` via `bun run lint`.

## Build & deployment pipeline
- **Primary build entry:** `scripts/build.mjs` chooses `next build` by default, uses `next-on-pages` on Cloudflare Pages (or `BUILD_TARGET=pages`), and rewrites the worker output for Cloudflare Pages.
- **Cloudflare output wiring:** `wrangler.toml` targets the `.vercel/output/static/_worker.js` output with Node.js compatibility enabled.

## App Router usage & runtimes
- **App Router layout:** `app/` directory with top-level `layout.tsx`, route segments, and API handlers under `app/api`.
- **Edge runtime:** `app/page.tsx`, onboarding, signals, operations (root/decisions/plan/briefings), and `app/api/og/route.ts` export `runtime = "edge"`.
- **Typed routes:** enabled via `experimental.typedRoutes` in `next.config.js`.

## Data fetching & caching
- **Treasury API client:** `lib/treasury/treasuryClient.ts` uses `fetch` and normalizes responses with explicit `source`, `fetched_at`, and `isLive` metadata; it also supports snapshot fallbacks and historical cache reads.
- **Offline snapshot data:** `lib/snapshot.ts` loads `data/snapshot_fallback.json` and validates it for offline mode fallbacks.
- **Time Machine cache:** historical lookups use cached snapshots (see `lib/timeMachine`).
- **Source metadata expectations:** sensor readings include explicit source labels and freshness metadata (see `lib/sensors.ts`).

## Deployment constraints & assumptions
- **Cloudflare Pages/Workers:** `wrangler.toml` config includes `compatibility_date = "2026-01-23"` and `nodejs_compat`.
- **Static asset rules:** ESModule rules for `__next-on-pages-dist__` output.

## Initial risk register (Phase 1)
- **Edge runtime drift:** multiple routes rely on `runtime = "edge"`; framework upgrades could shift caching or runtime defaults.
- **Cloudflare adapter compatibility:** `@cloudflare/next-on-pages` version must remain compatible with target Next.js/React versions.
- **Typed routes / App Router changes:** `experimental.typedRoutes` and App Router behavior may change in Next.js upgrades.
- **Data fallback expectations:** treasury fetch fallbacks and snapshot validation need parity during migrations.

## Sources of truth
- Tooling and versions: `package.json`.
- Build pipeline: `scripts/build.mjs`.
- Cloudflare wiring: `wrangler.toml`.
- App runtime declarations: `app/**/page.tsx`, `app/api/og/route.ts`.
- Data clients and metadata: `lib/treasury/treasuryClient.ts`, `lib/sensors.ts`, `lib/snapshot.ts`.
