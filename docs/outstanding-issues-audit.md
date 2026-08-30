# Outstanding issues audit (2026-03-02, updated 2026-08-29)

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

| Priority | Issue | Status evidence | Why it matters | Current status / mitigation |
| --- | --- | --- | --- | --- |
| P0 | Promote export/share actions into Overview header | Shipped | Blocks fastest path from insight to shareable artifact | **Shipped:** Top header format picker, hero primary Copy Brief CTA, and persistent sticky call strip. |
| P0 | Launch executive briefing pack | Shipped | Limits leadership distribution workflows | **Shipped:** Slide/Slack/email-ready briefs with sources, citations, and reason codes via `lib/briefBuilders.ts`. |
| P0 | Add weekly digest output | Shipped | Limits habitual recurrence and outbound delivery cadence | **Shipped:** Automated digest payload and cron delivery in `lib/alertDelivery.ts` and `worker/index.ts`. |
| P0 | Add regime-shift alerts with reason codes + Time Machine links | Shipped | Alerts are less actionable/auditable without causal context | **Shipped:** Deterministic reason-code schema, deep link generator, and test fixtures in `tests/alertDelivery.test.ts`. |
| P1 | Live macro fetchers for CPI/unemployment/BBB spreads | Shipped | Snapshot-only behavior increases staleness risk | **Shipped:** Live FRED fetchers with YoY computation, range bounds, and fallback parity in `lib/macroSnapshot.ts`. |
| P1 | Source health panel for stale/failed feeds | Shipped | Users cannot quickly assess live vs degraded data state | **Shipped:** System status and Source board on `/trust` with freshness timestamps, source URLs, and fallback status. |
| P1 | Offline archive materialization for historical `structured` fields | Shipped | Risks historical output inconsistency in offline/deterministic modes | **Shipped:** Materialized summary archive in `lib/summaryArchive.ts` with deterministic regression coverage. |
| P1 | API contract tests for `/api/weekly` + `/api/monthly` | Shipped | Raises risk of downstream integration breakage | **Shipped:** Contract assertions in `tests/apiSummaryContracts.test.ts` and `tests/cliContracts.test.ts`. |
| P1 | Stack modernization near-/mid-term checklist items | Shipped | Platform drag may increase delivery risk and migration uncertainty | **Shipped:** Migrated to Vinext on Cloudflare Workers with Tailwind v4 and clean typecheck/test suite. |
| P1 | Runtime KV persistence provisioning (`WHETHER_DURABLE_KV`) | Open configuration | State (alerts/events) operates in `local-fallback` when unprovisioned in Wrangler | Documented runbook provisioning steps in `docs/cloudflare-deployment-runbook.md`. |
| P2 | Monthly section expansion toward weekly parity | In progress | Output asymmetry for operators across cadences | Monthly `planningLanguage` structured parity shipped; additional section depth planned. |
| P2 | Decision Memory + Scenario Studio (Milestone 10) | Open | Missing immutable audit trail + scenario planning system | Sequence design spike, then thin-slice implementation. |
| P2 | Evidence + data reliability expansion (Milestone 11) | In progress | Missing final reliability/evidence layer for operator trust | Core live fetchers and trust panels shipped; fossil record view planned. |
| P2 | Acquisition readiness checklist | In progress | Signals GTM/readiness commitments are incomplete | Core briefing pack, APIs, and live fetchers shipped. 2026-08-29: added 1-click Slack copy, present mode, threshold proximity bar, developer quick-access popover, role lens filters, board annex export, command palette actions, calendar ritual integration, keyboard shortcuts, and operator playbook docs. Remaining: public repo, Show HN launch gate, role-specific alert routing. |

## Duplicate tracking overlaps (resolved)

Key overlapping deliverables across checklist sections have now been unified and shipped:
1. **Overview export/share CTA:** Unified across header, hero, and sticky strip.
2. **Live macro fetchers:** Unified under `lib/macroSnapshot.ts`.
3. **Source health & trust panel:** Unified on `/trust` with shared system status and source boards.

## Open Focus Areas

1. **Durable KV binding:** Provision `WHETHER_DURABLE_KV` in production/preview deployments when multi-isolate persistence is required.
2. **Milestone 10:** Decision Memory and Scenario Studio thin-slice implementation.
3. **Egress allowlist & Archive freeze:** Ensure automated freeze jobs have egress network access in production pipelines.

## Ownership lanes (for planning handoff)

- **Product + UX:** Overview CTA promotion, briefing pack UX, operator path instrumentation.
- **Backend + API:** digest/brief payload contracts, alert schema, contract tests.
- **Platform + Data:** live fetchers, fallback semantics, source health state model.
- **Infra + Frontend platform:** modernization execution, compatibility evidence, migration risk controls.
