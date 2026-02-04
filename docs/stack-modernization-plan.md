# Stack modernization research plan

This plan scopes the research, validation, and decision gates needed to modernize the Whether
stack while preserving product behavior and Cloudflare readiness.

## Goals
- Map the current stack and deployment constraints.
- Identify viable upgrade paths (Next.js, React, Tailwind, Bun/Node).
- Validate upgrades in a contained spike before committing to migration work.
- Produce a phased migration path with explicit risks and rollback strategy.

## Phase 1: Inventory & constraints (1–2 days)
**Deliverable:** Stack inventory + risk register.

- Runtime/tooling
  - Current versions: Next.js, React, TypeScript, Tailwind, Bun/Node, Cloudflare adapters.
  - Build pipeline: `scripts/build.mjs`, `next-on-pages`, and `wrangler` configuration.
- Deployment constraints
  - Confirm Cloudflare Pages/Workers requirements, environment variables, and cache behavior.
  - Identify edge runtime usage and API route expectations.
- Feature usage
  - App Router patterns in `app/` (server components, route handlers, metadata).
  - Data fetching and cache strategy in `lib/`.

## Phase 2: Upgrade feasibility matrix (2–3 days)
**Deliverable:** Compatibility matrix + breaking-change notes.

- Next.js upgrade candidates (14.x → 15.x)
  - App Router behavioral changes, route handler updates, and caching defaults.
- React upgrade candidates (18.x → 19.x)
  - Runtime changes, new concurrent features, and any type or API shifts.
- Tailwind upgrade candidates (3.x → 4.x)
  - Config format changes, plugin deprecations, and CSS output differences.
- Cloudflare adapter compatibility
  - `@cloudflare/next-on-pages` support matrix for target versions.

## Phase 3: Migration spike (2–4 days)
**Deliverable:** Spike branch results with pass/fail checklist.

- Create a spike branch for experimental upgrades.
- Upgrade one layer at a time (Next.js → React → Tailwind) to isolate failures.
- Run `bun run lint`, `bun run typecheck`, and `bun test` after each layer.
- Capture failure logs and remediation steps.

## Phase 4: Migration plan & execution (3–5 days)
**Deliverable:** Sequenced migration plan with rollback strategy.

- Determine final target versions based on spike findings.
- Draft migration steps with file-level changes, expected impacts, and owners.
- Add doc updates for any required operational changes.
- Establish rollback steps and cutover checklist.

## Phase 5: Post-migration verification (1–2 days)
**Deliverable:** Verification checklist + perf/regression notes.

- Re-run lint, typecheck, and tests.
- Check dashboard rendering, data freshness indicators, and offline mode.
- Validate Cloudflare deployment path and cache behavior.

## Decision gates
- **Gate 1:** Inventory complete and constraints confirmed.
- **Gate 2:** Compatibility matrix shows no blockers.
- **Gate 3:** Spike passes or has clear, low-risk fixes.
- **Gate 4:** Migration plan approved with rollback strategy.

## Risks to track
- App Router behavior changes affecting data fetching or caching.
- Tailwind config or generated CSS changes affecting layout density.
- Cloudflare adapter incompatibilities or build pipeline drift.
- TypeScript/React typing changes that require broad refactors.

## Artifacts
- Stack inventory document.
- Compatibility matrix and breaking-change notes.
- Spike branch report (what broke, how to fix).
- Migration plan with timeline and owners.
