# Cloudflare build/deploy audit (2026-02-25)

## Scope
Audit of the provided Cloudflare Pages/Workers pipeline log for `bun run build` followed by `npx wrangler versions upload`.

## What is already good
- Dependency install is fast (`bun install` in ~2.44s) thanks to cache restore.
- Next.js compilation and static generation are healthy (successful compile, TypeScript, static generation complete).
- Asset upload and worker publish are successful without retries.

## Main optimization opportunities

### 1) Reduce duplicate install/build work in the same job
**Evidence from log**
- The job runs top-level `bun install --frozen-lockfile`.
- `next-on-pages` then runs `vercel build`, which performs another install step (`Installing dependencies... bun install ... Checked ... (no changes)`).

**Impact**
- Repeats package manager startup and dependency resolution in one CI run.
- Adds avoidable wall-clock time on uncached/partial-cache runs.

**Recommendations**
- Split pipeline into explicit phases and reuse artifacts:
  1. `bun install --frozen-lockfile`
  2. `bun run build` (or `bun run build:pages`)
  3. deploy from generated output without triggering another install/build path.
- If build orchestrator allows it, disable install inside nested `vercel build` invocation (or pass through the already-installed workspace).

---

### 2) Tighten static asset cacheability to avoid large repeat uploads
**Evidence from log**
- Wrangler uploaded **112 new/modified static assets** this run.

**Impact**
- Larger upload windows and slower deploys.
- Higher chance of cache misses globally.

**Recommendations**
- Ensure immutable asset naming is stable (content-hash-based paths) and avoid non-deterministic build output where possible.
- Verify whether build IDs/chunk IDs change more often than source changes; if so, evaluate stabilizing build identifiers in CI for identical source inputs.
- Keep `_headers` policies strict for immutable static content (`cache-control: public,max-age=31536000,immutable`) where appropriate.

---

### 3) Investigate `Invalid prerender config` warnings from `next-on-pages`
**Evidence from log**
- Warnings for dynamic routes such as `/concepts/[slug]`, `/guides/[stakeholder]`, `/guides/stage/[stage]`, `/solutions/career-paths/[role]`.

**Impact**
- Usually non-blocking today, but may indicate route metadata mismatch and risk future compatibility breakage.

**Recommendations**
- Audit route segment config (`dynamic`, `revalidate`, runtime settings) for these paths.
- Track `@cloudflare/next-on-pages` and Next.js release notes for compatibility fixes.
- Add a CI warning budget policy: fail only on *new* warnings or on known critical warning classes.

---

### 4) Reduce warning noise from bundled duplicate object keys
**Evidence from log**
- Repeated `[WARNING] Duplicate key "options" in object literal [duplicate-object-key]` emitted during bundling.

**Impact**
- Buries useful warnings and increases triage cost.

**Recommendations**
- Identify which dependency emits this minified object literal and update/patch if possible.
- If harmless and external, suppress this warning class in CI log processing while keeping other warnings visible.

---

### 5) Clarify runtime/platform warning ownership
**Evidence from log**
- `Build not running on Vercel. System environment variables will not be available.`
- `Using edge runtime on a page currently disables static generation for that page`.

**Impact**
- Easy to misinterpret as regressions during incident triage.

**Recommendations**
- Add a short “expected warnings” section to deployment docs/runbook so on-call can quickly distinguish expected vs action-required warnings.

## Prioritized action plan

### Quick wins (this week)
1. Add CI post-processing to summarize and deduplicate recurring warnings.
2. Document expected platform warnings in deployment runbook.
3. Track warning counts over time (simple grep-based metric in CI artifacts).

### Medium-term (1–2 sprints)
1. Restructure build/deploy to avoid nested redundant install behavior.
2. Validate route segment config for dynamic prerender warnings.
3. Improve static asset cache headers and verify deterministic output behavior.

### Longer-term
1. Reassess toolchain evolution (`next-on-pages` vs future alternatives) once route/runtime parity and warning profile improve.

## Suggested success metrics
- End-to-end build+deploy time (P50/P95).
- Number of uploaded static assets per deploy.
- Total warning count and unique warning classes per run.
- Number of “unexpected warning class” CI failures.
