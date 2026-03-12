# Implementation status tracker

This document consolidates delivery status across product roadmap audits, known follow-up refactors, and stack modernization tasks.

## Snapshot

- Milestones 5–8 are largely complete, with one remaining UX item.
- Summary-system follow-ups remain open (P1/P2).
- Stack modernization has completed setup guardrails, but major migration execution is still open.

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
- [ ] Promote export/share actions directly into the Overview header (currently partial).

## Summary-system follow-ups

- [x] (P0) Shared `structured` → copy renderer and contract unification.
- [x] (P1) Offline archive materialization for historical `structured` fields.
- [x] (P1) API contract tests for `/api/weekly` and `/api/monthly` payload guarantees.
- [ ] (P2) Monthly section expansion toward weekly parity where operator value is clear.

## Stack modernization

### Near-term checklist
- [x] Create and commit compatibility matrix (`docs/stack-compatibility-matrix.md`).
- [x] Capture baseline check outputs on current pins (captured with known pre-existing failures).
- [x] Complete framework canary spike and publish findings.
- [x] Complete Tailwind v4 impact audit.
- [x] Verify Cloudflare Pages build compatibility on candidate stack.
- [ ] Approve go/no-go with rollback plan before production migration PRs.

### Mid-term checklist
- [ ] Run Wave 1 framework-core production migration.
- [ ] Run Wave 2 Tailwind v4 migration with visual QA sign-off.
- [ ] Run Wave 3 supporting dependency upgrades.
- [x] Add CI Pages-targeted build gating and compatibility evidence requirement.
- [x] Add/expand data fallback and metadata parity tests.
- [ ] Publish post-upgrade runbook updates and ownership handoff notes.


### Baseline command outputs (2026-03-12)

**Owner:** Platform (Codex agent run)

| Command | Outcome | Notes | Output log |
| --- | --- | --- | --- |
| `bun run lint` | Pass | Completed cleanly on pinned dependencies. | `docs/evidence/stack-modernization/2026-03-12-baseline/lint.log` |
| `bun run typecheck` | Fail | Pre-existing TypeScript drift across app/test contracts and generated payload typings. | `docs/evidence/stack-modernization/2026-03-12-baseline/typecheck.log` |
| `bun run test` | Fail | 12 failing tests (weekly card shell assumptions + posture/payload contract assertions). | `docs/evidence/stack-modernization/2026-03-12-baseline/test.log` |
| `bun run build:pages` | Pass with warnings | Cloudflare Pages artifact emitted; `next-on-pages` reported dynamic route prerender config warnings. | `docs/evidence/stack-modernization/2026-03-12-baseline/build-pages.log` |

## Proposed next milestone (not started)

Milestone 9 (Interactive Decision Intelligence) remains proposed and not yet executed as an implementation track. Planned workstreams include live telemetry + data sync, role KPI filters, trend analytics, scenario planning, expanded alerts, goal tracking, and workflow integrations.

## Source docs

- `docs/feature-specs-current.md` (current shipped behavior + summary refactor backlog).
- `docs/stack-modernization-plan.md` (upgrade plan and execution checklists).
