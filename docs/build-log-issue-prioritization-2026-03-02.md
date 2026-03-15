# Build/Deploy Log Triage — 2026-03-02

Historical note: this triage refers to the retired `next-on-pages` deployment path and is preserved for migration history only.

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


## 2026-03-09 follow-up (route config audit + compatibility check)

### Scope audited
Dynamic App Router routes exporting `dynamicParams`, `generateStaticParams`, and/or `revalidate` were re-audited, including:
- `/answers/[slug]`
- `/concepts/[slug]`
- `/concepts/audience/[audience]`
- `/concepts/focus/[focus]`
- `/decide/[slug]`
- `/guides/[stakeholder]`
- `/guides/stage/[stage]`
- `/library/failure-modes/[slug]`
- `/posture/[slug]`
- `/resources/[slug]`
- `/solutions/career-paths/[role]`
- `/startup-macro-posture/[regime]`
- `/toolkits/[slug]`

### Root cause (confirmed)
`next@16.1.6` emits dynamic ISR prerender function metadata for these routes that does not match the stricter prerender-config shape expected by `@cloudflare/next-on-pages` v1.13.16 (`type: Prerender` + `fallback.type: FileFsRef` with a static fallback file). As a result, the adapter flags these dynamic ISR entries as `Invalid prerender config` while still completing the build.

### Compatibility finding
- Current published `@cloudflare/next-on-pages` latest is still `1.13.16`; no newer verified release is available to consume for `next@16.1.6`.
- Attempted route-level option alignment (`dynamic = "force-static"` on affected dynamic routes) did **not** eliminate the warnings in this adapter version.

### Accepted configuration pattern
Until Cloudflare ships a compatible adapter update for this Next output shape:
1. Keep current route exports (`dynamicParams = false`, `generateStaticParams`, and existing `revalidate` where product freshness requires ISR).
2. Treat these `Invalid prerender config` entries as an **accepted known warning class** in CI warning baselines.
3. Fail CI only on **new** warning classes or warning-count drift beyond the accepted list.

### Verification snapshot
- Local Cloudflare build (`bun run build:cloudflare`) still emits the same 27 warning classes (including these invalid-prerender lines).
- Warning audit against updated baseline now reports `Unexpected warning classes: 0` and `Critical warning matches: 0`.
