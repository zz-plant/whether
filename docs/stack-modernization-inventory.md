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

## Newer capabilities snapshot (research baseline)

This section maps the currently pinned stack to newer stable versions and highlights capabilities worth evaluating during modernization.

| Element | Current in repo | Newer stable (observed) | Notable newer capabilities to evaluate |
| --- | --- | --- | --- |
| Bun | 1.2.14 | 1.3.8 | Runtime and package manager performance improvements, plus continued Node compatibility expansion for tooling/scripts. |
| Next.js | 14.2.5 | 16.1.6 | Turbopack maturity improvements, Cache Components/PPR-oriented caching model, and `proxy.ts` replacing `middleware.ts` naming for network boundary clarity. |
| React / React DOM | 18.3.1 | 19.2.4 | React 19 Actions for async mutations, `useOptimistic`, form-centric hooks (`useFormStatus`, `useActionState`), improved Suspense behavior, and static React DOM APIs. |
| TypeScript | 5.5.3 | 5.9.3 | Language service and type-checking improvements, faster editor workflows, and newer type-system ergonomics from 5.6–5.9 releases. |
| Tailwind CSS | 3.4.6 | 4.1.18 | Tailwind v4 CSS-first setup, streamlined content/source detection, and reduced PostCSS plugin surface for common setups. |
| Zod | 3.23.8 | 4.3.6 | Zod 4 API/performance updates and schema ergonomics improvements for large validation surfaces. |
| ESLint | 8.57.0 | 9.39.2 | Flat config-first ecosystem direction and updated rule/tooling compatibility expectations. |

### Research sources used for this snapshot
- `npm view <package> version` for version baselining.
- Next.js 16 release post: <https://nextjs.org/blog/next-16>
- React 19 release post: <https://react.dev/blog/2024/12/05/react-19>
- Tailwind CSS v4 release post: <https://tailwindcss.com/blog/tailwindcss-v4>
- TypeScript 5.9 release post: <https://devblogs.microsoft.com/typescript/announcing-typescript-5-9/>

## Build & deployment pipeline
- **Primary build entry:** `scripts/build.mjs` uses `next build` by default, switches to `next-on-pages` for Cloudflare Pages or Cloudflare deploy environments (`CF_PAGES`, `CLOUDFLARE_ACCOUNT_ID`, or `BUILD_TARGET=pages`), and rewrites worker output paths for Cloudflare deployment compatibility.
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
