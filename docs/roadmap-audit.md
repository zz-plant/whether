# Roadmap audit (Milestones 5–8)

This audit maps roadmap checklist items to concrete evidence in the codebase.
It is meant to validate that Milestones 5–8 are implemented and traceable.

Legend:
- **Done**: Implemented with clear evidence in the codebase.
- **Partial**: Implemented in-app but missing a portion of the intent.
- **Not found**: No supporting evidence located.

## Milestone 5 — UX Polish + Verification
| Item | Status | Evidence |
| --- | --- | --- |
| Cockpit-style layout with high-density panels. | Done | Report shell + panel system (`weather-panel`, grid, bento layout).【F:app/components/reportShell.tsx†L84-L220】 |
| Accessibility pass: keyboard nav, focus states, reduced motion. | Done | Skip link + focus-visible styles + reduced motion media query.【F:app/components/reportShell.tsx†L69-L83】【F:app/globals.css†L370-L418】 |
| Verify offline mode + snapshot labeling. | Done | Offline badge + trust status messaging for fallback mode.【F:app/page.tsx†L64-L118】【F:app/components/reportShell.tsx†L89-L160】 |
| Add footer disclaimer: “Not Financial Advice.” | Done | Footer disclaimer in report shell.【F:app/components/reportShell.tsx†L270-L287】 |
| Add an executive decision brief block with a single recommendation + risk badge. | Done | Executive snapshot with confidence badge and recommendation copy.【F:app/components/reportSections.tsx†L1660-L1735】 |
| Add a “what changed since last read” delta panel on Overview with a Time Machine link. | Done | Change-since-last-read panel + Time Machine link CTA.【F:app/components/changeSinceLastReadPanel.tsx†L128-L304】 |
| Add inline “signal translation” helpers for jargon-heavy metrics. | Done | Tooltip-supported signal explanations in assessment cards and sensor panels.【F:app/components/reportSections.tsx†L662-L780】 |
| Promote export/share actions (copy-ready leadership brief) to the Overview header. | Partial | Export/share actions exist in executive snapshot and export briefs, but not in the top header itself.【F:app/components/reportSections.tsx†L2007-L2061】【F:app/operations/components/exportBriefPanel.tsx†L297-L364】 |

## Milestone 6 — Reliability + Regression Tests
| Item | Status | Evidence |
| --- | --- | --- |
| Unit tests for regime scoring boundaries. | Done | `regimeEngine.test.ts` coverage of scoring/threshold behavior.【F:tests/regimeEngine.test.ts†L1-L160】 |
| Unit tests for classification rules. | Done | Regime classification assertions in `regimeEngine.test.ts`.【F:tests/regimeEngine.test.ts†L1-L160】 |
| Unit tests for Decision Shield verdicts. | Done | Decision Shield verdict tests in `decisionShield.test.ts`.【F:tests/decisionShield.test.ts†L1-L200】 |
| Data parsing tests for Treasury normalization. | Done | Normalization tests in `treasuryNormalizer.test.ts`.【F:tests/treasuryNormalizer.test.ts†L1-L200】 |

## Milestone 7 — Operator Demand Expansion
| Item | Status | Evidence |
| --- | --- | --- |
| Broaden macro inputs beyond the yield curve (inflation, unemployment, credit spreads) with explicit source links. | Done | Macro signals panel + macro snapshot data + formula/source links.【F:app/components/reportSections.tsx†L2735-L2865】【F:data/macro_snapshot.json†L1-L120】 |
| Add adjustable regime thresholds with audit trails for custom tuning. | Done | Threshold controls with local storage audit trail and URL params.【F:app/signals/components/thresholdsPanel.tsx†L17-L210】 |
| Expand Decision Shield to cover additional decision types (M&A, infra spend, geographic expansion). | Done | Decision Shield option set includes M&A, infrastructure, geographic expansion, infra spend actions.【F:app/operations/components/decisionShieldPanel.tsx†L24-L70】 |
| Add export/share flows (PDF, slide-ready summary, scheduled email or Slack brief). | Done | Export briefs include print/PDF, Slack/email share, and slide bullets.【F:app/operations/components/exportBriefPanel.tsx†L297-L380】 |
| Build an Insight Database with citations to evidence and historical precedents. | Done | Insight database data and panel surfaced in report sections.【F:data/recommendations.ts†L1-L120】【F:app/components/reportSections.tsx†L3016-L3158】 |
| Add time-series comparisons (“then vs now”) with regime change diffs. | Done | Delta panel comparing previous read and current regime/scores.【F:app/components/changeSinceLastReadPanel.tsx†L128-L304】 |
| Add alerts/notifications on regime changes. | Done | Regime change alert panel and alert log tracking with local storage.【F:app/components/reportSections.tsx†L2215-L2370】【F:app/components/regimeAlertsPanel.tsx†L1-L150】 |
| Support saved Decision Shield scenarios and team presets. | Done | Decision Shield preset storage and management UI.【F:app/operations/components/decisionShieldPanel.tsx†L113-L710】 |
| Surface deep data provenance per sensor (direct source URLs, formulas, timestamps). | Done | Sensor cards and macro signals include source links, formulas, timestamps.【F:app/components/reportSections.tsx†L2506-L2865】 |
| Introduce an API/export endpoint for embedding regimes in internal dashboards. | Done | Summary API endpoints for weekly/monthly/quarterly/yearly exports.【F:app/api/weekly/route.ts†L1-L80】【F:app/api/monthly/route.ts†L1-L80】 |

## Milestone 8 — CXO Function Replacement
| Item | Status | Evidence |
| --- | --- | --- |
| CFO / Finance Strategy mode. | Done | Finance strategy panel + finance strategy data model.【F:app/components/reportSections.tsx†L3466-L3566】【F:data/recommendations.ts†L334-L420】 |
| COO / Operating Strategy posture board. | Done | CXO function outputs include COO posture outputs for operating constraints and checklists.【F:lib/cxoFunctionOutputs.ts†L17-L52】【F:app/components/reportSections.tsx†L1240-L1336】 |
| CTO/CPO Strategic Planning overlays. | Done | CXO outputs include roadmap posture + hiring/pricing templates; Decision Shield templates support regime-aligned language.【F:lib/cxoFunctionOutputs.ts†L33-L61】【F:app/components/reportSections.tsx†L3555-L3640】 |
| Head of Strategy briefing suite. | Done | Strategy brief data model + executive briefing suite panels support narrative, guardrails, and triggers.【F:data/recommendations.ts†L405-L520】【F:app/operations/components/strategyBriefPanel.tsx†L1-L200】 |

## Milestone 9 — Interactive Decision Intelligence (Proposed)

This milestone converts Whether from a periodic briefing tool into a continuously operating decision cockpit. It prioritizes role-specific operating loops, real-time integrations, and proactive planning support.

### Themes
1. **Live executive telemetry:** unify macro signals with internal operating metrics so leaders can see posture implications in context.
2. **Role-native decision surfaces:** emphasize KPI slices and actions for founders, product leaders, and finance operators.
3. **Forward-looking planning:** support scenario simulation, forecast deltas, and trigger-based workflows.

### Milestone 9 workstreams

| Workstream | Scope | Example deliverables | Dependencies | Success metric |
| --- | --- | --- | --- | --- |
| Real-time dashboards + data sync | Add customizable dashboard surfaces that blend Whether macro signals with company data sources (finance, CRM, planning). | Dashboard builder with card layout presets, live refresh status badges, and unified “macro vs company” comparison panels (e.g., capital tightness vs runway/burn). | Connector framework, auth scopes, data freshness metadata model. | Teams can monitor key posture + operating metrics without manual data refresh. |
| Role-specific KPI filters | Enable per-role KPI panels, time-range selectors, and geography/segment filters. | CFO panel (liquidity, burn, cash conversion), Product panel (opportunity signals, demand risk), Founder panel (capital posture + growth risk summary). | Shared KPI taxonomy, role defaults, filtering API/state model. | Each role can configure and persist its top 3–5 KPIs tied to a posture objective. |
| Visual trend analytics | Add chart-centric historical analysis for macro sensors and posture outcomes. | Time-series charts for rates/credit spreads/risk appetite, trend annotations, and green/yellow/red posture gauges. | Historical series storage, charting primitives, color/accessibility standards. | Users can identify trend direction and regime drift in under 30 seconds. |
| Scenario planning + forecasting | Add a simulation workspace for macro assumption changes and projected operating impact. | “What-if” controls (rate shocks, spread moves), forecast horizon (30/60/90 days), projected recommendation deltas. | Deterministic simulation engine, assumptions metadata, simulation-state labeling. | Teams can compare baseline vs simulated recommendations before planning decisions. |
| Alerts + notifications | Expand alerts from in-app to external channels with configurable thresholds and digests. | Slack/email alerts for tightness/risk threshold crossings, digest cadence controls, alert history + acknowledgement workflow. | Notification service integration, channel credentials, alert policy model. | Critical posture shifts are communicated to owners within agreed SLA. |
| Goal tracking + alignment | Let teams define operating goals and evaluate progress alongside macro posture changes. | Goal objects (target metric + threshold + owner), progress widgets, posture-aware “accelerate/hold” suggestions. | Goal data model, ownership/permissions, metric ingestion hooks. | Teams can track goal attainment with explicit macro context in one view. |
| API + workflow integrations | Expand external access so Whether signals can power internal systems. | Versioned posture API, webhook events, integrations for Notion/Asana/Slack, warehouse export schemas. | API auth/versioning strategy, event delivery reliability, integration templates. | Customers can embed posture signals directly into existing planning workflows. |

### Delivery sequencing

| Phase | Priority | Focus |
| --- | --- | --- |
| Phase 1 (foundation) | P0 | Connector framework, role KPI model, historical series persistence, and API hardening. |
| Phase 2 (operator UX) | P1 | Interactive dashboards, trend visuals, and role-specific filter presets. |
| Phase 3 (proactive workflows) | P1 | Scenario studio, channel alerts, and goal-tracking loops. |
| Phase 4 (ecosystem expansion) | P2 | Third-party integrations, webhooks, and warehouse-level embedding patterns. |

### Guardrails and implementation notes
- Preserve existing provenance and confidence labeling on all dashboard and alert surfaces.
- Keep simulated outputs visually and programmatically distinct from live production posture.
- Require explicit ownership and threshold governance for alerting to prevent noise.
- Maintain role-based defaults while allowing team-level customization.
- Ship each workstream with instrumentation so usage and decision-impact can be measured.
