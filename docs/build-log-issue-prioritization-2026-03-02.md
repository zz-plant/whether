# Build/Deploy Log Triage — 2026-03-02

## Executive summary
The deploy completed successfully, but there are **two actionable issues** in the logs and several informational items.

## Prioritized issues

### P1 — `Invalid prerender config` for multiple dynamic routes
**Why this matters:** This appears repeatedly for key content routes and their `.rsc` variants during `@cloudflare/next-on-pages` post-processing. Even though the build succeeds, this can cause route behavior differences between expected static/ISR behavior and Cloudflare edge output if unsupported prerender metadata is being ignored.

**Evidence in log:**
- `Invalid prerender config for /concepts/[slug]` (and `.rsc`)
- Similar warnings for `/decide/[slug]`, `/guides/[stakeholder]`, `/guides/stage/[stage]`, `/library/failure-modes/[slug]`, `/posture/[slug]`, `/solutions/career-paths/[role]`, `/toolkits/[slug]`

**Likely root cause:** A mismatch between current Next.js prerender configuration emitted by `next build` (Next 16.1.6) and the parser/expectations in `@cloudflare/next-on-pages` 1.13.16.

**Recommended next actions:**
1. Reproduce locally with `bun run build` and inspect `.vercel/output/config.json` and route metadata for one affected route.
2. Check route-level exports (`revalidate`, `dynamic`, `runtime`, `generateStaticParams`) for unsupported combinations for Cloudflare Pages.
3. Test with latest compatible `@cloudflare/next-on-pages` and Wrangler to confirm whether this is a resolved adapter bug.
4. Add CI guardrail: fail build if new `Invalid prerender config` entries appear or count increases.

---

### P2 — Duplicate object key warning during bundling (`duplicate-object-key`)
**Why this matters:** Duplicate keys can silently override config/options in generated code paths, potentially causing subtle runtime behavior changes.

**Evidence in log:**
- `[WARNING] Duplicate key "options" in object literal [duplicate-object-key]`
- Warning points to generated `<stdin>` bundle content.

**Likely root cause:** Minified/transformed dependency output (not first-party source), likely from a UI/runtime helper bundle.

**Recommended next actions:**
1. Confirm source by generating source maps and mapping the emitted chunk to package origin.
2. If from dependency, pin/upgrade affected package and verify warning disappears.
3. If unavoidable third-party noise, document and suppress only with explicit justification.

---

## Lower-priority / informational items

### P3 — Edge runtime disables static generation on at least one page
`⚠ Using edge runtime on a page currently disables static generation for that page` is expected if deliberate; otherwise it may increase runtime cost/latency.

**Action:** Audit edge-runtime usage and keep only where edge-specific behavior is required.

### P4 — Non-Vercel build environment warnings
- `Build not running on Vercel. System environment variables will not be available.`
- `Bun is used as a package manager at build time only, not at runtime with Functions`

These are generally informational in a Cloudflare + next-on-pages workflow.

## What is *not* currently a problem
- Build compilation and TypeScript checks succeeded.
- Static generation completed for all reported pages.
- `wrangler versions upload` completed and produced preview URLs.
- Asset upload and worker publish succeeded.

## Suggested owner sequence
1. **Platform/infra owner:** investigate P1 adapter/prerender compatibility.
2. **Frontend owner:** trace and validate P2 duplicate-key warning source.
3. **Performance owner:** review P3 edge-runtime static-generation trade-offs.
