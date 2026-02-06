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


## Recommended near-term upgrade actions (next 1–2 sprints)

These actions convert the research output into executable work items while minimizing risk.

1. **Establish the compatibility matrix as a checked-in artifact (owner: platform).**
   - Add a matrix table for Next.js, React, Tailwind, TypeScript, Bun, Node, and `@cloudflare/next-on-pages` with columns for: current, candidate, status, blockers, and evidence links.
   - Include explicit Cloudflare compatibility notes and links to release/change logs for every candidate version.

2. **Run a dependency-only baseline validation on the current branch (owner: engineering).**
   - Keep current versions pinned and run `bun run lint`, `bun run typecheck`, and `bun test` to confirm a clean baseline before any upgrades.
   - Save outputs in a short spike note so future failures can be attributed to upgrades, not pre-existing drift.

3. **Perform a canary spike for framework core (owner: platform + frontend).**
   - Create a temporary spike branch and test Next.js + React upgrades first, without Tailwind changes in the same step.
   - Validate App Router behavior, `runtime = "edge"` routes, API handlers, and caching-sensitive pages.
   - Record all breakages with exact file paths and remediation estimates.

4. **Prepare Tailwind v4 migration plan as a separate track (owner: frontend).**
   - Audit current `tailwind.config.ts`, `postcss.config.js`, and global CSS usage for v4 CSS-first migration impact.
   - Identify plugin/config patterns to remove or replace and list the expected visual regression risk areas.

5. **Gate Cloudflare deployment compatibility before merging upgrades (owner: platform).**
   - Confirm `@cloudflare/next-on-pages` support for target Next.js/React versions.
   - Run the Pages-targeted build (`BUILD_TARGET=pages`) and verify worker output handling still matches `wrangler.toml` expectations.

6. **Define rollback and release criteria up front (owner: engineering manager).**
   - Rollback trigger: any unresolved edge-runtime regression or failing deployment build.
   - Release criteria: lint/typecheck/tests pass, no critical UI regressions, and data freshness metadata remains intact.

### Near-term execution checklist
- [x] Create and commit the compatibility matrix document (`docs/stack-compatibility-matrix.md`).
- [ ] Capture clean baseline check outputs on current pins.
- [ ] Complete framework canary spike and publish findings.
- [ ] Complete Tailwind v4 impact audit.
- [ ] Verify Cloudflare Pages build compatibility on candidate stack.
- [ ] Approve go/no-go with rollback plan before production migration PRs.

## Recommended mid-term upgrade actions (next 1–2 quarters)

These actions operationalize migration outcomes after the near-term spike and gating work is complete.

1. **Execute production migration in sequenced waves (owner: platform + frontend).**
   - Wave 1: upgrade framework core (Next.js/React/TypeScript) with no product-surface feature changes.
   - Wave 2: migrate styling layer to Tailwind v4 with a dedicated visual QA pass.
   - Wave 3: upgrade supporting ecosystem dependencies (ESLint, Zod, build helpers) once framework layers are stable.

2. **Institutionalize compatibility policy and release cadence (owner: engineering manager).**
   - Define a quarterly dependency review ritual that re-checks target versions, cloud adapter support, and breaking changes.
   - Require a “compatibility evidence” section in upgrade PRs that links to release notes and local validation logs.

3. **Add CI guardrails for modernization regressions (owner: platform).**
   - Ensure CI runs lint, typecheck, tests, and at least one Cloudflare Pages-targeted build for upgrade branches.
   - Fail builds when edge runtime routes or route handlers regress on required metadata/freshness behavior.

4. **Expand runtime safety checks around core data paths (owner: data/platform).**
   - Add focused tests for treasury fetch fallback behavior, source metadata propagation, and time-machine cache integrity.
   - Track parity before/after upgrade so migration does not degrade offline-mode or freshness guarantees.

5. **Harden observability for post-upgrade behavior (owner: platform).**
   - Add lightweight health signals for API route failures, stale snapshot usage, and edge/runtime exceptions.
   - Define alert thresholds and incident playbooks for the first two releases after migration.

6. **Close migration with documentation and ownership handoff (owner: tech lead).**
   - Update stack version baselines, deployment notes, and runbooks after each completed wave.
   - Record unresolved follow-ups in roadmap/issues with owners and target dates.

### Mid-term execution checklist
- [ ] Run Wave 1 framework-core production migration.
- [ ] Run Wave 2 Tailwind v4 migration with visual QA sign-off.
- [ ] Run Wave 3 supporting dependency upgrades.
- [x] Add CI pages-targeted build gating and compatibility evidence requirement (`.github/workflows/upgrade-guardrails.yml`, `.github/pull_request_template.md`).
- [x] Add/expand data fallback and metadata parity tests (`tests/treasuryClient.test.ts`).
- [ ] Publish post-upgrade runbook updates and ownership handoff notes.

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
