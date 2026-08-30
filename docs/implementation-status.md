# Implementation status tracker

This document consolidates delivery status across product roadmap audits, known follow-up refactors, and stack modernization tasks.

## Snapshot

- Milestones 5–8 are complete.
- Milestone 9 (Signal Ops + Briefing Pack) is substantially complete: export/share actions shipped in the hero, briefing pack with Slack/Notion/Linear integrations live, regime-shift alerting live with reason codes. Role-specific alert routing remains open.
- Summary-system follow-ups are mostly complete; monthly `planningLanguage` parity is now shipped, while broader monthly section expansion remains open.
- Operator workflow enhancements (2026-08-29): 1-click Slack copy, present mode, threshold proximity bar, developer quick-access, role lens filters, board annex export, command palette actions, calendar ritual integration, and keyboard shortcuts.
- Stack modernization cut over to Vinext on Cloudflare Workers; Tailwind v4 and the safe support-dependency slice are complete, the root-layout font path is Vinext-compatible, and the active Vinext lane now runs on `0.0.41` with a repo-local install repair.

## Product roadmap (milestones 5–8)

### Completed
- [x] Cockpit-style high-density report layout.
- [x] Accessibility pass (keyboard nav, focus states, reduced motion support).
- [x] Offline mode and snapshot labeling.
- [x] Footer disclaimer (“Not Financial Advice”).
- [x] Executive decision brief block with recommendation + risk badge.
- [x] “What changed since last read” panel with Time Machine linkage.
- [x] Inline signal translation helpers.
- [x] Reliability test coverage for regime scoring/classification, Decision Shield verdicts, and Treasury normalization.
- [x] Milestone 7 operator expansion set (macro breadth, threshold tuning, Decision Shield coverage, exports, insight database, alerts, provenance, APIs).
- [x] Milestone 8 CXO function surfaces.

### Remaining
- [x] Promote export/share actions directly into the Overview header.

## Summary-system follow-ups

- [x] (P0) Shared `structured` → copy renderer and contract unification.
- [x] (P1) Offline archive materialization for historical `structured` fields.
- [x] (P1) API contract tests for `/api/weekly` and `/api/monthly` payload guarantees.
- [x] (P2) Monthly `planningLanguage` parity slice for structured output, copy rendering, and cadence card display.
- [ ] (P2) Broader monthly section expansion toward weekly parity where operator value is clear.

## Stack modernization

### Near-term checklist
- [x] Create and commit compatibility matrix (`docs/stack-compatibility-matrix.md`).
- [x] Capture baseline check outputs on current pins (captured with known pre-existing failures).
- [x] Complete framework canary spike and publish findings.
- [x] Complete Tailwind v4 impact audit.
- [x] Verify Cloudflare Pages build compatibility on candidate stack.
- [x] Approve cutover and switch production build/deploy to Vinext.

### Mid-term checklist
- [x] Run Wave 1 framework-core production migration.
- [x] Run Wave 2 Tailwind v4 migration with visual QA sign-off.
- [x] Run Wave 3 supporting dependency upgrades.
- [x] Add CI Pages-targeted build gating and compatibility evidence requirement.
- [x] Add/expand data fallback and metadata parity tests.
- [x] Publish post-upgrade runbook updates and ownership handoff notes.


### Baseline command outputs (2026-03-12)

**Owner:** Platform (Codex agent run)

| Command | Outcome | Notes | Output log |
| --- | --- | --- | --- |
| `bun run lint` | Pass | Completed cleanly on pinned dependencies. | `docs/evidence/stack-modernization/2026-03-12-baseline/lint.log` |
| `bun run typecheck` | Fail | Pre-existing TypeScript drift across app/test contracts and generated payload typings. | `docs/evidence/stack-modernization/2026-03-12-baseline/typecheck.log` |
| `bun run test` | Fail | 12 failing tests (weekly card shell assumptions + posture/payload contract assertions). | `docs/evidence/stack-modernization/2026-03-12-baseline/test.log` |
| `bun run build:pages` | Pass with warnings | Historical pre-cutover baseline on the old `next-on-pages` lane. | `docs/evidence/stack-modernization/2026-03-12-baseline/build-pages.log` |

### Post-cutover verification (2026-03-15)

| Command | Outcome | Notes |
| --- | --- | --- |
| `bun run check:vinext` | Pass | 100% compatible. |
| `bun run lint` | Pass | No repo-level lint errors after cutover cleanup. |
| `bun run typecheck` | Pass | Local route-type layer and Vinext wrapper changes typecheck cleanly. |
| `bun test tests/cliContracts.test.ts tests/whetherCli.test.ts tests/weeklyCardSectionDiagnostics.test.tsx` | Pass | 31 tests passed; cutover-sensitive regression set clean. |
| `bun run build` | Pass with known upstream warnings | Vinext build completes; remaining warnings are Rolldown/Vinext diagnostics. |
| `bun run deploy:cloudflare:dry-run` | Pass | Production Worker config dry-run succeeds. |

### Tailwind v4 + support dependency verification (2026-03-31)

| Command | Outcome | Notes |
| --- | --- | --- |
| `bun run lint` | Pass | Tailwind v4 CSS-first migration and runtime telemetry swap lint cleanly. |
| `bun test tests/reportShellSections.test.tsx tests/weeklyDecisionCardLayout.test.tsx tests/homeWeeklyComposition.test.tsx tests/navigationInformationArchitecture.test.ts tests/reportShellNavigation.test.tsx tests/navigationOrientationBadge.test.tsx tests/staticHubNav.test.tsx tests/nextStepRail.test.tsx tests/monthlySummary.test.ts tests/summaryCopyRenderer.test.ts tests/cadenceSummaryCardAdapter.test.tsx tests/apiSummaryContracts.test.ts tests/summaryArchive.test.ts tests/summaryArchiveMigration.test.ts` | Pass | 40/40 targeted regression tests passed after the dependency upgrade set. |
| `bun run build` | Pass with known upstream warnings | Vinext production build succeeds on Tailwind v4 and the repaired `0.0.38` install lane. Rolldown warning classes remain expected noise. |
| `bun run check:vinext` | Pass (100% compatible) | `next/web-vitals` issue was removed by switching to `web-vitals`, and `next/font/google` was removed from the root layout in favor of CSS font loading. |
| `bun run typecheck` | Pass | Cleanup of route/test contract drift and summary typing now leaves the active Vinext lane typecheck-clean. |

### Vinext 0.0.41 maintenance uplift (2026-04-15)

| Command | Outcome | Notes |
| --- | --- | --- |
| `bun run build` | Pass | Upgrading to `vinext@0.0.41` removes the prior Rolldown `treeshake.preset` option-validation warning on the active Vite 8 lane. |
| `bun run check` | Pass | Full lint + typecheck + test suite passes once the local CLI discovery test is made deterministic against configured discovery ports. |

### Vinext install repair + 0.0.38 validation (2026-03-31)

| Command | Outcome | Notes |
| --- | --- | --- |
| `bun install` | Pass | Root `postinstall` repair restores missing Vinext `dist/` runtime files from the published `0.0.38` tarball when Bun leaves them out of `node_modules`. |
| `bun run check:vinext` | Pass (100% compatible) | No remaining repo-local compatibility gaps after the root-layout font migration. |
| `bun run typecheck` | Pass | Active `0.0.38` lane is typecheck-clean. |
| `bun run lint` | Pass | No lint regressions after the font and install-repair changes. |
| `bun run build` | Pass with known upstream warnings | Active `0.0.38` lane builds successfully once the repaired install tree is in place. |

## Proposed next milestone (not started)

Milestone 9 (Interactive Decision Intelligence) remains proposed and not yet executed as an implementation track. Planned workstreams include live telemetry + data sync, role KPI filters, trend analytics, scenario planning, expanded alerts, goal tracking, and workflow integrations.

## Source docs

- `docs/feature-specs-current.md` (current shipped behavior + summary refactor backlog).
- `docs/stack-modernization-plan.md` (upgrade plan and execution checklists).
