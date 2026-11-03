# Implementation status tracker

This document consolidates delivery status across product roadmap audits, known follow-up refactors, and stack modernization tasks.

## Snapshot (2026-10-06)

- Milestones 5–8 are complete.
- Milestone 9 (Signal Ops + Briefing Pack) is complete except role-specific alert routing: Copy Brief directly under the homepage's brief card, the briefing pack (Slack delivery, plus paste-ready Notion, Linear and Jira formats on `/share`), regime-shift alerts that state why they fired, and the weekly digest (`/api/weekly-digest`). Role routing is tagging only: each alert carries a `department` and a `rolePreset` (`lib/alert/alertEvaluator.ts`), no delivery path reads either, and every subscriber and Slack webhook receives every alert.
- Milestones 10 (Decision Memory + Scenario Studio) and 11 (Evidence + Data Reliability) are complete. Milestones 12–15 have open items, listed under [Open roadmap items](#open-roadmap-items).
- Summary-system follow-ups are mostly complete; monthly `planningLanguage` parity is shipped, while broader monthly section expansion remains open.
- Share and exports (2026-09-28 to 2026-10-06): `/share` is one format picker that previews exactly what will be pasted; the homepage copies the brief card as an image; every brief format (Slack, email, `/brief.md`, `/share`, the month-end pulse) renders from one brief document (`lib/report/briefDocument.ts`); the newest published brief is listed in `/news-sitemap.xml`.
- Reader vocabulary (2026-09-22 to 2026-09-23): reader copy says "guidance", "conditions" and "the change line" where it said "the call" (naming table in `lib/report/AGENTS.md`). `/glossary` redirects to `/trust#formula-reference`, and each term is explained where it appears. `/concepts` is back as a reading list.
- Confidence (2026-09-25 to 2026-09-28): every route and export prints one published confidence (`resolvePublishedConfidence`), and the confidence record on `/history` and `/calibration` grades the most recent year beside the full archive (`lib/report/calibrationDrift.ts`).
- Agent surface (2026-09-29): agents read one state (`lib/agentState.ts`, `/api/agent?view=state`) and call tools from one registry (`lib/agent/tools.ts`) that both MCP transports, the `/api/mcp?tool=` shim, the manifest and `/llms.txt` read; `tests/agentDiscoveryParity.test.ts` holds them to it. A refused input names the values that would have been accepted (`lib/agent/inputs.ts`).
- Plan lines and subscriptions (2026-10-01 to 2026-10-02): a reader sets a plan's own pause and restart lines on the two scores for each decision area (`/operate#ops-plan-lines`, `lib/alert/planLines.ts`) and is emailed the day one is crossed; when the form sent a runway band, the email says what the crossing means at it. A subscription change applies only when the reader presses Confirm on the page the emailed link opens, so mail filters that open every link cannot confirm it (`app/api/email/verify/route.ts`).
- Company calibration (2026-09-26 to 2026-10-02): Decision Shield has a bootstrapped mode that drops the VC-fundraising assumption and reads gross margin (`businessModel` in `lib/decisionShield.ts`). Runway can be worked out from cash, monthly spend and monthly revenue (`resolveProfileRunway` in `lib/operatorProfile.ts`), and one net-burn definition feeds the commitment test, the runway notes and the stress test. The runway planner states its plan as a cash-out month, raise dates and cuts in dollars, caps the burn multiple at 4x, and takes a company's own runway lines (`#ops-runway-lines`).
- Engagement loops (2026-09-18 to 2026-09-26): the month-end pulse emails and posts the investor update when the month-end reading differs from the prior one (`lib/alert/monthEndPulse.ts`). A reader returning after more than a week sees what changed since the last visit, when the card above does not already say it, and a board-deck download (`SinceLastVisit`; §1.1.63). The quiet-day line that followed "What changed this week" on a held week is gone with that section's lead (2026-10-09): the card's line under the call says no line was crossed, and "What would change this guidance" states what would (`buildCallChangeLine`: the nearer change line in points, or a held week's own condition; §1.1.55). `/share` adds a guardrail block per business area for Linear or Jira with no token stored, a WIP cap derived from the regime, pull-policy blocks and a standup line (`buildStandupLine`: whether the guidance moved, then what would change it); the MCP tool `lint_sprint_goal` grades a sprint goal against the bounded rules.
- Community backlog (2026-09-17): runway joins stage as a second calibration axis on the weekly guidance (`?runway=`, cookie, the header's runway pill and the homepage's "What it changes" section); the board slide ships as a native PPTX and a PDF from `/share` and `/api/export/board-slide`; `/share` copies a monthly investor update; the daily cron pushes a flash alert on an emergency-sized move in the short rate or the curve; the homepage's "What would change" section states the market move that would change the guidance. Linear/Jira guardrail sync is deferred on the stored-token decision (see `ROADMAP.md`).
- Operator workflow enhancements (2026-08-29): present mode, the board annex export on `/history`, command palette actions, a calendar link for the Monday review on `/share`, and keyboard shortcuts are live. Four items from that set are gone: the role lens chips were deleted with the three-cadence card on 2026-09-01; the separate Slack copy button (Copy Brief produces the Slack block) and the developer quick-access chip were removed on 2026-09-02; the threshold proximity bar gave way to threshold rails on 2026-09-03.
- Stack modernization cut over to Vinext on Cloudflare Workers; Tailwind v4 and the safe support-dependency slice are complete, the root-layout font path is Vinext-compatible, and the active Vinext lane has run on `0.2.1` since 2026-07-31. The repo-local install repair added for `0.0.38` was retired on 2026-10-06, when cold installs of `0.2.1` proved complete on every Bun in use (see `docs/cloudflare-deployment-runbook.md`).
- Gates and dependencies: `bun run check:vinext` has been the deploy gate since 2026-09-02, not the Vinext compatibility scan. Workers Builds runs it on every push: lint, typecheck, test, assets, suppressions and dead-exports, then the landmark audit (`scripts/check-tasks.mjs`). The scan is `bunx vinext check`. Since 2026-10-02 the pre-push hook scopes the hotspot preflight to the commits a push sends. Next is on 16.3.8 for the `next/og` advisory, and `proxy-addr` is pinned past the IP-spoofing advisory.
- Consolidation (2026-10-06): Slack sends go through one channel with one fan-out tally (`lib/delivery/slack.ts`, `lib/delivery/fanOut.ts`), deployment settings are read through one `readSetting` (`lib/runtime/settings.ts`), and the regime state machine moved out of `lib/report` to `lib/regimeStateMachine.ts`.

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
- [x] Promote export/share actions directly into the Overview header.

## Summary-system follow-ups

- [x] (P0) Shared `structured` → copy renderer and contract unification.
- [x] (P1) Offline archive materialization for historical `structured` fields.
- [x] (P1) API contract tests for `/api/weekly` and `/api/monthly` payload guarantees.
- [x] (P2) Monthly `planningLanguage` parity slice for structured output, copy rendering, and cadence card display. The cadence card was deleted on 2026-09-07; the field ships in `/api/monthly` and the rendered copy.
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

The tables below are dated records. Their commands are written as they run today; a note says where a script changed meaning or a listed test file has since been deleted.

### Baseline command outputs (2026-03-12)

**Owner:** Platform (Codex agent run)

| Command | Outcome | Notes | Output log |
| --- | --- | --- | --- |
| `bun run lint` | Pass | Completed cleanly on pinned dependencies. | `docs/evidence/stack-modernization/2026-03-12-baseline/lint.log` |
| `bun run typecheck` | Fail | Pre-existing TypeScript drift across app/test contracts and generated payload typings. | `docs/evidence/stack-modernization/2026-03-12-baseline/typecheck.log` |
| `bun run test` | Fail | 12 failing tests (weekly card shell assumptions + posture/payload contract assertions). | `docs/evidence/stack-modernization/2026-03-12-baseline/test.log` |

The pre-cutover build baseline on the old `next-on-pages` lane passed with warnings; its log is `docs/evidence/stack-modernization/2026-03-12-baseline/build-pages.log`. The `build:pages` script that produced it was removed on 2026-03-31.

### Post-cutover verification (2026-03-15)

| Command | Outcome | Notes |
| --- | --- | --- |
| `bunx vinext check` | Pass | 100% compatible. Recorded as `bun run check:vinext`, which ran this scan until 2026-04-01. |
| `bun run lint` | Pass | No repo-level lint errors after cutover cleanup. |
| `bun run typecheck` | Pass | Local route-type layer and Vinext wrapper changes typecheck cleanly. |
| `bun run test tests/cliContracts.test.ts tests/whetherCli.test.ts` | Pass | 31 tests passed across three files; the third, `weeklyCardSectionDiagnostics.test.tsx`, was deleted with its component on 2026-08-29. |
| `bun run build` | Pass with known upstream warnings | Vinext build completes; remaining warnings are Rolldown/Vinext diagnostics. |
| `bun run deploy:cloudflare:dry-run` | Pass | Production Worker config dry-run succeeds. |

### Tailwind v4 + support dependency verification (2026-03-31)

| Command | Outcome | Notes |
| --- | --- | --- |
| `bun run lint` | Pass | Tailwind v4 CSS-first migration and runtime telemetry swap lint cleanly. |
| `bun run test tests/reportShellSections.test.tsx tests/navigationInformationArchitecture.test.ts tests/reportShellNavigation.test.tsx tests/monthlySummary.test.ts tests/summaryCopyRenderer.test.ts tests/apiSummaryContracts.test.ts tests/summaryArchive.test.ts tests/summaryArchiveMigration.test.ts` | Pass | 40/40 targeted regression tests passed across 14 files after the dependency upgrade set. Six were deleted with the components they covered: `navigationOrientationBadge`, `staticHubNav` and `nextStepRail` on 2026-04-01, `weeklyDecisionCardLayout` and `homeWeeklyComposition` on 2026-08-06, `cadenceSummaryCardAdapter` on 2026-09-07. |
| `bun run build` | Pass with known upstream warnings | Vinext production build succeeds on Tailwind v4 and the repaired `0.0.38` install lane. Rolldown warning classes remain expected noise. |
| `bunx vinext check` | Pass (100% compatible) | Recorded as `bun run check:vinext`. `next/web-vitals` issue was removed by switching to `web-vitals`, and `next/font/google` was removed from the root layout in favor of CSS font loading. |
| `bun run typecheck` | Pass | Cleanup of route/test contract drift and summary typing now leaves the active Vinext lane typecheck-clean. |

### Vinext 0.0.41 maintenance uplift (2026-04-15)

| Command | Outcome | Notes |
| --- | --- | --- |
| `bun run build` | Pass | Upgrading to `vinext@0.0.41` removes the prior Rolldown `treeshake.preset` option-validation warning on the active Vite 8 lane. |
| `bun run check` | Pass | Full lint + typecheck + test suite passes once the local CLI discovery test is made deterministic against configured discovery ports. |

### Vinext install repair + 0.0.38 validation (2026-03-31)

The `postinstall` repair this table validates was retired on 2026-10-06; `bun install` no longer runs it.

| Command | Outcome | Notes |
| --- | --- | --- |
| `bun install` | Pass | Root `postinstall` repair restores missing Vinext `dist/` runtime files from the published `0.0.38` tarball when Bun leaves them out of `node_modules`. |
| `bunx vinext check` | Pass (100% compatible) | Recorded as `bun run check:vinext`. No remaining repo-local compatibility gaps after the root-layout font migration. |
| `bun run typecheck` | Pass | Active `0.0.38` lane is typecheck-clean. |
| `bun run lint` | Pass | No lint regressions after the font and install-repair changes. |
| `bun run build` | Pass with known upstream warnings | Active `0.0.38` lane builds successfully once the repaired install tree is in place. |

### Current lane re-run (2026-10-06, `vinext@0.2.1`)

| Command | Outcome | Notes |
| --- | --- | --- |
| `bun run lint` | Pass | oxlint with `--deny-warnings`. |
| `bun run typecheck` | Pass | |
| `bunx vinext check` | 93% compatible | The one issue is `__dirname` in four `scripts/check-*.ts` files and `tests/pageReaderContradictions.test.tsx`, which run under Bun and are not app code. The one partial is App Router strict mode. |
| `bun run test tests/cliContracts.test.ts tests/whetherCli.test.ts` | Pass | 53 tests across 2 files. |
| `bun run test tests/reportShellSections.test.tsx tests/navigationInformationArchitecture.test.ts tests/reportShellNavigation.test.tsx tests/monthlySummary.test.ts tests/summaryCopyRenderer.test.ts tests/apiSummaryContracts.test.ts tests/summaryArchive.test.ts tests/summaryArchiveMigration.test.ts` | Pass | 31 tests across 8 files. |

## Open roadmap items

The "Interactive Decision Intelligence" milestone proposed on 2026-02-25 was never adopted under that name. `ROADMAP.md` numbers Milestone 9 as Signal Ops + Briefing Pack, and two of the proposal's workstreams shipped under other milestones: scenario planning as the Scenario Studio (Milestone 10), and channel alerts as the email and Slack alerts of Milestones 9 and 12. Open in `ROADMAP.md` as of 2026-10-06:

- Milestone 12: a live Notion/Coda sync block; Linear/Jira epic sync, deferred on whether to store each team's token (the guardrail blocks on `/share` are the credential-free slice).
- Milestone 13: sector overlays, ARR-per-employee and burn-multiple benchmarks, a tech-talent heat index.
- Milestone 14: white-label exports, a board pre-read memo template, an audit-proof Decision Memory export.
- Milestone 15: all five items, including a typed client SDK (`@whether/sdk`), Zapier/Make connectors and a portfolio health matrix.
- Engagement: reading the activation funnel for the leaking step (the first full week measured is 2026-w41), history/compare for lapsed readers, a sprint retro report, a persistent board embed, and flash alerts framed as an expedite signal.
- Alert delivery by role: the tags exist, and no delivery path reads them.

## Source docs

- `docs/feature-specs-current.md` (current shipped behavior + summary refactor backlog).
- `ROADMAP.md` (milestone checklists and open items).
