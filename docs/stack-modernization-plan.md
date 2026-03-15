# Stack modernization research plan

Historical note: this document captures the pre-cutover research plan from the `next-on-pages` era. Production has since moved to Vinext on Cloudflare Workers; keep this file for migration history, not as the active deployment runbook.

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
- Run `bun run lint`, `bun run typecheck`, and `bun run test` after each layer.
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
   - Keep current versions pinned and run `bun run lint`, `bun run typecheck`, and `bun run test` to confirm a clean baseline before any upgrades.
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
- [x] Complete framework canary spike and publish findings.
- [x] Complete Tailwind v4 impact audit.
- [x] Verify Cloudflare Pages build compatibility on candidate stack.
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



## 2026-03-12 framework canary spike findings

**Owner:** Platform + Frontend (Codex agent run)

### Candidate versions tested
- `next@16.2.0-canary.93`
- `react@19.3.0-canary-46103596-20260305`
- `react-dom@19.3.0-canary-46103596-20260305`
- `eslint-config-next@16.2.0-canary.93`
- `@cloudflare/next-on-pages@1.13.16` (unchanged during spike)

### Commands + outcomes
- Install canary pins: **pass** (`docs/evidence/stack-modernization/2026-03-12-canary/framework-upgrade-install.log`)
- `bun run lint`: **terminated / blocked** due lint traversal cost after generated build artifacts (terminated after prolonged run) (`docs/evidence/stack-modernization/2026-03-12-canary/lint.log`)
- `bun run typecheck`: **fail** with new Next canary typed-route breakage in generated `.next/types/**` (`PrefetchForTypeCheckInternal` export mismatch + stricter route handler param checks), plus baseline repo type drift (`docs/evidence/stack-modernization/2026-03-12-canary/typecheck.log`)
- `bun run test`: **fail** (same 12 failing baseline tests; no additional canary-only failures were isolated in this run) (`docs/evidence/stack-modernization/2026-03-12-canary/test.log`)
- `bun run build:pages`: **pass with warnings**; Cloudflare worker artifact emitted (`docs/evidence/stack-modernization/2026-03-12-canary/build-pages.log`)
- Runtime smoke: **pass** module import of generated worker (`docs/evidence/stack-modernization/2026-03-12-canary/runtime-smoke.log`)

### Blockers
1. **Noisy baseline before migration**: type/test suites already fail on pinned stable stack; this masks canary-attributed regressions.
2. **Next canary generated-type incompatibility**: `.next/types/**` references internal exports not available in canary package layout used here.
3. **Lint runtime pressure after builds**: lint scans become impractical when generated `.vercel` output exists in workspace.

### Remediation notes
- Stabilize baseline first (type/test red items in baseline logs) before any framework upgrade decision.
- For canary follow-up, clear generated outputs (`bun run clean`) before lint and exclude deployment artifacts from lint scope if needed.
- Re-run canary on a clean branch with route-handler signature audit focused on Next 16.2 canary typegen changes.

## 2026-03-12 Tailwind v4 impact audit

**Owner:** Frontend (Codex agent run)

### Current state snapshot
- Tailwind version: `3.4.17` (current pin).
- Config model: JS/TS config + PostCSS plugin chain (`tailwind.config.ts`, `postcss.config.js`).
- CSS entrypoint: `app/globals.css` with legacy layer directives (`@tailwind base/components/utilities`) and heavy `@apply` usage in custom utility classes.
- Tailwind plugin usage: none (`plugins: []`), which lowers migration complexity.

### Risk map
- **Config migration risk (medium):** v4 prefers CSS-first config and changes default content detection assumptions. Existing typed `tailwind.config.ts` theme extension will need translation/validation.
- **PostCSS pipeline risk (medium):** plugin entry changes from `tailwindcss` to the v4 package/plugin expectations; requires lock-step update with build tooling.
- **Global CSS risk (high):** `app/globals.css` contains broad `@apply`-based composition for shell/panel/tile primitives; visual drift risk is concentrated here.
- **Component risk (medium-high):** components depending on classes composed in `globals.css` (weekly decision card shell, operations/export tiles, layout chrome) likely exhibit perceptible style shifts under v4 token + preflight differences.

### Migration scope (estimated)
1. Move/translate Tailwind config to v4-compatible CSS-first setup while preserving semantic color tokens.
2. Update PostCSS integration and remove deprecated directives/config where required.
3. Validate all `@apply` chains in `app/globals.css` against v4 utility availability.
4. Run focused visual QA sweep for top-fold homepage, operations export view, and decision-card components.

### Visual QA entry criteria
- `bun run build` and `bun run build:pages` pass on migration branch.
- Zero layout breakage in one-screen weekly brief above the fold.
- No clipping/contrast regressions in export/share surfaces (`/operations`).
- Screenshot diff spot-check approved for: homepage hero + weekly decision card, operations export panel, answers detail page shell.

## Rollback strategy (required before production migration)

### Trigger conditions
Rollback immediately if any of the following occur during rollout/canary deploy:
1. Cloudflare Pages build fails or worker artifact cannot be generated.
2. Runtime smoke fails (worker import/load or core route health check fails).
3. Typecheck or test regressions exceed known baseline failure envelope without approved exceptions.
4. Visual QA detects decision-transmission regressions on weekly brief or export artifacts.

### Re-pin steps
1. Restore pinned stable versions in `package.json` (`next@16.1.6`, `react@19.2.4`, `react-dom@19.2.4`, `eslint-config-next@16.1.6`, `tailwindcss@3.4.17`).
2. Reinstall exact lockfile state: `bun install --frozen-lockfile` (or restore committed `bun.lock` and run `bun install`).
3. Clean generated upgrade artifacts: `bun run clean`.
4. Re-run baseline verification quartet: `bun run lint`, `bun run typecheck`, `bun run test`, `bun run build:pages`.
5. Attach rollback evidence logs to implementation-status + compatibility matrix before any re-attempt.
