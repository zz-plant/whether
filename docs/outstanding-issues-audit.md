# Outstanding issues audit (2026-03-02)

This document reconciles open work tracked in `docs/implementation-status.md` and `ROADMAP.md`.
It is intentionally **source-bound** (only items that are explicitly unchecked/open in those trackers).

## Scope and source of truth

- Primary implementation tracker: `docs/implementation-status.md`
- Product roadmap + immediate backlog: `ROADMAP.md`

## Normalized severity model

- **P0 (execution blocker):** directly blocks core operator flow adoption or distribution.
- **P1 (trust/reliability blocker):** does not block core navigation, but degrades trust, freshness, or integration durability.
- **P2 (strategic expansion):** important capability expansion after core distribution + reliability gaps are closed.

## Consolidated open-issue register

| Priority | Issue | Status evidence | Why it matters | Mitigation (next step) |
| --- | --- | --- | --- | --- |
| P0 | Promote export/share actions into Overview header | Open in implementation tracker + roadmap carry-over + Milestone 9 + acquisition checklist | Blocks fastest path from insight to shareable artifact | Ship header-level CTA with event telemetry and success threshold |
| P0 | Launch executive briefing pack | Open in Milestone 9 | Limits leadership distribution workflows | Implement MVP pack (Slack/email/slide-ready) using existing summary primitives |
| P0 | Add weekly digest output | Open in immediate backlog + Milestone 9 | Limits habitual recurrence and outbound delivery cadence | Publish digest payload contract and delivery channel pilot |
| P0 | Add regime-shift alerts with reason codes + Time Machine links | Open in immediate backlog + Milestone 9 | Alerts are less actionable/auditable without causal context | Add reason-code schema + deep-link generator + alert QA fixtures |
| P1 | Live macro fetchers for CPI/unemployment/BBB spreads | Open in immediate backlog + Milestone 11 + acquisition checklist | Snapshot-only behavior increases staleness risk | Roll out live fetchers behind feature flags with fallback parity tests |
| P1 | Source health panel for stale/failed feeds | Open in immediate backlog + Milestone 11 + acquisition checklist | Users cannot quickly assess live vs degraded data state | Add source health panel with freshness SLA markers + fallback reasons |
| P1 | Offline archive materialization for historical `structured` fields | Open in implementation tracker | Risks historical output inconsistency in offline/deterministic modes | Add archive materialization job + fixture-backed regression tests |
| P1 | API contract tests for `/api/weekly` + `/api/monthly` | Open in implementation tracker | Raises risk of downstream integration breakage | Add JSON schema/contract assertions to CI |
| P1 | Stack modernization near-/mid-term checklist items | Multiple unchecked items in tracker | Platform drag may increase delivery risk and migration uncertainty | Complete baseline evidence, canary findings, and compatibility report before migration |
| P2 | Monthly section expansion toward weekly parity | Open in implementation tracker | Output asymmetry for operators across cadences | Identify parity targets and deliver in increments |
| P2 | Decision Memory + Scenario Studio (Milestone 10) | Entire milestone open | Missing immutable audit trail + scenario planning system | Sequence design spike, then thin-slice implementation |
| P2 | Evidence + data reliability expansion (Milestone 11) | Entire milestone open | Missing final reliability/evidence layer for operator trust | Stage work after P0/P1 closure with explicit acceptance gates |
| P2 | Acquisition readiness checklist | Entire section open | Signals GTM/readiness commitments are incomplete | Track as a release gate with binary pass/fail criteria |

## Duplicate tracking overlaps (mitigate with single workstreams)

The same deliverables are currently repeated across multiple checklist sections. Track each as a single epic with shared acceptance criteria:

1. **Overview export/share CTA**
   - Appears in implementation tracker, Milestone 5 carry-over, Milestone 9, and acquisition readiness.
2. **Live macro fetchers**
   - Appears in immediate backlog, Milestone 11, and acquisition readiness.
3. **Source health panel**
   - Appears in immediate backlog, Milestone 11, and acquisition readiness.

## Recommended 2-week mitigation slice

1. **P0 closure:** Ship Overview header export/share CTA and verify click-through from first viewport.
2. **P0 closure:** Add alert reason codes + Time Machine deep links with deterministic payload tests.
3. **P1 hardening:** Add API contract tests for weekly/monthly endpoints in CI.
4. **P1 hardening:** Land live macro fetchers + source health panel behind feature flags with fallback parity validation.
5. **P1 risk reduction:** Complete modernization baseline outputs, canary findings, and Pages compatibility write-up.

## Ownership lanes (for planning handoff)

- **Product + UX:** Overview CTA promotion, briefing pack UX, operator path instrumentation.
- **Backend + API:** digest/brief payload contracts, alert schema, contract tests.
- **Platform + Data:** live fetchers, fallback semantics, source health state model.
- **Infra + Frontend platform:** modernization execution, compatibility evidence, migration risk controls.
