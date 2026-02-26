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

- [x] Shared structured → copy renderer and contract unification.
- [ ] Offline archive materialization for historical `structured` fields.
- [ ] API contract tests for `/api/weekly` and `/api/monthly` payload guarantees.
- [ ] Monthly section expansion toward weekly parity where operator value is clear.

## Stack modernization

### Near-term checklist
- [x] Create and commit compatibility matrix (`docs/stack-compatibility-matrix.md`).
- [ ] Capture clean baseline check outputs on current pins.
- [ ] Complete framework canary spike and publish findings.
- [ ] Complete Tailwind v4 impact audit.
- [ ] Verify Cloudflare Pages build compatibility on candidate stack.
- [ ] Approve go/no-go with rollback plan before production migration PRs.

### Mid-term checklist
- [ ] Run Wave 1 framework-core production migration.
- [ ] Run Wave 2 Tailwind v4 migration with visual QA sign-off.
- [ ] Run Wave 3 supporting dependency upgrades.
- [x] Add CI Pages-targeted build gating and compatibility evidence requirement.
- [x] Add/expand data fallback and metadata parity tests.
- [ ] Publish post-upgrade runbook updates and ownership handoff notes.

## Proposed next milestone (not started)

Milestone 9 (Interactive Decision Intelligence) remains proposed and not yet executed as an implementation track. Planned workstreams include live telemetry + data sync, role KPI filters, trend analytics, scenario planning, expanded alerts, goal tracking, and workflow integrations.

## Source docs

- `docs/feature-specs-current.md` (current shipped behavior + summary refactor backlog).
- `docs/stack-modernization-plan.md` (upgrade plan and execution checklists).
