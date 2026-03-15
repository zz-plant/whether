# Build speed audit (Cloudflare Pages + Next on Pages)

Historical note: this audit describes the retired `next-on-pages` pipeline and is preserved only for baseline comparison against the current Vinext lane.

Based on the 2026-03-12 CI log, the slowest stages are:

## Timing breakdown (from log)

- Environment/tool install (`nodejs` + `bun`): ~5.3s
- Dependency install (`bun install --frozen-lockfile`): ~7.9s
- `bun run build` total: ~208s
  - `next build --webpack` compile: ~34s
  - Static page generation (`183` routes): ~132s
  - Remaining Next/Vercel/next-on-pages packaging: ~42s
- Wrangler upload/deploy: ~18s
  - static asset upload (`1661` assets): ~5.9s

## Highest-impact opportunities

1. **Reduce pre-render fanout for non-critical SEO routes**
   - The build pre-renders `183` routes, producing `1661` static assets.
   - Move long-tail SEO pages from eager `generateStaticParams()` pre-render to runtime ISR (still cacheable with `revalidate`).
   - Keep core weekly brief surfaces pre-rendered (`/`, core decision pages), and defer long-tail variants.
   - Expected impact: **largest single reduction** (often 60-150s depending on routes/data fetches).

2. **Stop forcing webpack when Turbopack is viable**
   - Log shows `next build --webpack`.
   - Validate whether Cloudflare Pages + next-on-pages now support your current route/features on default build mode.
   - If compatible, removing forced webpack usually reduces compile/optimization time.
   - Expected impact: **moderate** (commonly 10-40s).

3. **Cut build-time data work in static paths**
   - For pages with `generateStaticParams()`, avoid expensive per-page work during prerender.
   - Precompute shared data once per route family; avoid repeated transformations/fetches per slug+cluster combination.
   - Expected impact: **moderate to high** (depends on duplicated work).

## Medium-impact opportunities

4. **Remove/repair invalid prerender config warnings**
   - next-on-pages reports repeated `Invalid prerender config` lines for multiple dynamic routes.
   - While warnings do not currently fail the build, they can indicate fallback behavior that defeats intended caching and may add internal adapter work.

5. **Only pre-render canonical combinations**
   - Some combinatorial routes (e.g. `/decide/[slug]/[cluster]`, `/toolkits/[slug]/[cluster]`, `/signals/[cluster]/[decision-scenario]`) likely generate many pages with similar payloads.
   - Pre-render the highest-traffic/canonical set; serve the rest dynamically with ISR.

6. **Trim worker bundle hot spots**
   - Upload log shows very large webpack artifacts (e.g. ~2.7 MiB chunk).
   - Audit heavy dependencies imported into server/edge routes and split by route.
   - This mostly helps deploy/upload/startup and can slightly reduce build packaging time.

## Low-impact opportunities

7. **Avoid duplicate dependency checks inside the nested build layer**
   - `next-on-pages` invokes `vercel build`, which still runs an install check (`no changes` in ~30ms).
   - Time impact is small today, but worth keeping lean.

8. **Improve build observability for future tuning**
   - Add timing logs around static param generation and expensive data transforms.
   - This allows route-level budgeting and prevents regressions.

## Suggested execution order

1. Route inventory: classify pages as **core** vs **long-tail SEO**.
2. Convert long-tail route families to dynamic ISR (no eager pre-render).
3. Re-run CI and compare static generation time + static asset count.
4. Evaluate unforced build mode (drop explicit webpack if safe).
5. Fix invalid prerender config warnings.

## Practical target

A realistic near-term goal is reducing total build+deploy from ~4m16s to **~2m30s–3m00s** primarily by reducing eager static generation fanout.
