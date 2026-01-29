# PRD — Next-Level Signal Ops + Decision Memory

## Summary
Whether’s next-level release hardens the product into an operator-grade briefing system.
The focus is on: (1) signal delivery (alerts + digests), (2) executive briefing packs,
(3) Decision Memory as an audit trail, and (4) scenario tooling that keeps assumptions explicit.

## Problem statement
Leaders need rapid, defensible macro guidance, but current outputs are still too manual to
operationalize. Without push alerts, auditable decision records, and shareable briefs, the
report risks being a static dashboard rather than an execution tool.

## Goals
- Deliver regime changes and deltas automatically (alerts + weekly digest).
- Make brief generation fast and citation-rich for leadership review.
- Preserve decision context with immutable, traceable records.
- Enable counterfactuals without blurring simulated vs. live data.

## Non-goals
- Predictive forecasting or trade recommendations.
- Personalized finance guidance.
- Free-form AI chat or narrative generation without citations.

## Primary users
- CPO/CTO/COO/CFO leaders who need macro posture translated into constraints.
- Strategy and finance partners who draft planning materials.
- Operators who must validate decisions with traceable sources.

## User stories
- As a strategy lead, I receive a push alert only when the regime changes so I can brief
  leadership quickly.
- As a planning reviewer, I can audit decisions with the exact regime and thresholds used.
- As an executive, I can export a slide-ready brief with citations in under a minute.
- As an operator, I can run a counterfactual and share a link with delta highlights.

## Scope (must-have)
1. **Signal Ops**
   - Regime-change alerts with reason codes and source metadata.
   - Weekly digest summarizing changes in tightness/bravery and key sensors.
2. **Executive briefing pack**
   - One-click Slack/email text block and slide-ready bullets.
   - PDF-friendly view with citations and freshness badges.
3. **Decision Memory**
   - Append-only log capturing inputs, regime, sensor values, thresholds, and sources.
   - Exportable JSON/CSV records.
4. **Scenario Studio**
   - Counterfactual sliders with “Simulated” labeling and delta summary.
   - Lock assumptions banner to keep posture choices explicit.

## Success metrics
- ≥ 70% of weekly active users export a briefing pack.
- ≤ 2 minutes from alert receipt to brief generation.
- ≥ 80% of Decision Shield runs saved to Decision Memory.
- 0 alerts fired without a regime change or threshold crossing.

## Dependencies
- Treasury and macro data must expose source URLs and timestamps.
- Decision Shield must expose inputs/outputs for logging.
- Time Machine deep links for replay context.

## Risks + mitigations
- **Alert fatigue** → strict trigger rules and reason codes.
- **Ambiguous simulations** → explicit “Simulated” badges and export blocks.
- **Data freshness gaps** → fallback reasons and health checks in UI.

## Open questions
- Preferred delivery channels for alerts (email, Slack, webhook)?
- Storage location for Decision Memory (local, server, or export-only)?
- Required retention period for audit logs?
