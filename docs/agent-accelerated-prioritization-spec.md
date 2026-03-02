# Agent-accelerated prioritized feature spec

This document converts the requested backlog into an implementation sequence that assumes coding-agent support for delivery speed.

## Prioritization principles

1. **Core-thesis reinforcement first:** ship features that make “macro regime should change operating decisions” tangible in the core product loop.
2. **Low new-systems overhead:** prioritize features that reuse existing data flows and UI surfaces.
3. **Editorial bottlenecks are first-class constraints:** where implementation is easy but policy/content is hard, mark owner decisions explicitly.
4. **Trust-building progression:** sequence from explainability upgrades to workflow embedding to personalization.

## Tier 1 — Ship this week

### 1) Macro-mismatch warnings on concepts (start here)
**Goal**
- Highlight when a concept/essay was authored in a regime that conflicts with the current regime so readers calibrate advice before reuse.

**Scope**
- Add a mismatch evaluation for each concept card and concept detail page.
- Render a warning banner when `essayRegime` and `currentRegime` are in conflict.
- Keep existing concept metadata/data source; no new external feeds.

**Product behavior**
- If conflict exists, show warning state: “This concept was written for `<origin regime>`. Current regime is `<current regime>`.”
- If aligned, optionally show neutral/aligned badge.
- If concept regime metadata is missing, show no warning and no blocking error.

**Acceptance criteria**
- Every concept with regime metadata deterministically resolves to aligned/mismatch.
- Warning appears on both list card and detail view.
- No regressions to `/concepts` rendering when metadata is absent.

**Dependencies**
- Existing regime classification output.
- Existing concept metadata regime tags.

---

### 2) Lagging vs. leading indicator split
**Goal**
- Improve interpretability by distinguishing indicators that confirm conditions versus those that anticipate shifts.

**Scope**
- Classify each indicator in scoring displays as `leading` or `lagging`.
- Update score composition UI to show grouped sections and labels.
- No scoring-model rewrite in this phase.

**Product behavior**
- Score display includes two buckets: “Leading (predictive)” and “Lagging (confirming)”.
- Each indicator row shows type label and keeps existing provenance metadata.

**Acceptance criteria**
- Indicator type mapping is explicit and centrally defined.
- All displayed indicators appear in exactly one bucket.
- Existing total score/regime output remains unchanged.

**Dependencies**
- Indicator inventory and display components.
- Product decision on type mapping for ambiguous indicators.

---

### 3) Historical regime replay
**Goal**
- Let users pick a prior date and view the mandate card as it would have appeared then.

**Scope**
- Date picker + replay view for historical mandate state.
- Query stored historical score snapshots when available.
- If snapshot persistence is incomplete, implement/complete logging pipeline first.

**Product behavior**
- User selects date; UI returns regime, score components, and mandate card for nearest available historical point.
- Replay mode is visibly labeled as historical.
- If exact date unavailable, system falls back to nearest prior record and states chosen date.

**Acceptance criteria**
- Replay works for at least one full historical window supported by stored snapshots.
- Provenance includes snapshot timestamp and source freshness marker.
- Missing-data behavior is explicit and non-fatal.

**Dependencies**
- Snapshot storage coverage and retention policy.
- Existing Time Machine/historical fetch patterns.

---

### 4) “Whether to ship” checklist
**Goal**
- Convert current regime into a quick launch recommendation (`go` / `wait` / `kill`) from structured user inputs.

**Scope**
- Lightweight form UI + scoring rubric tied to current regime state.
- Result card with decision outcome and top rationale bullets.
- No new third-party data.

**Product behavior**
- User submits checklist answers.
- System evaluates against current regime parameters.
- Outputs recommendation plus 2–4 reasons and one reversal trigger.

**Acceptance criteria**
- Deterministic output for identical answers under same regime.
- Decision rubric is auditable (weights/rules visible in code/config).
- Recommendation explains both rationale and reversal condition.

**Dependencies**
- Existing regime classification output.
- Product decision on checklist question set and rubric weights.

## Tier 2 — Ship next week

### 5) Slack/Notion/Linear integration
- **Outcome:** weekly mandate card auto-delivered into planning systems.
- **Implementation track:** OAuth + webhook/push jobs + per-destination payload formatter.
- **Non-technical blocker:** destination-specific message design and ownership model.

### 6) Concept conflict map
- **Outcome:** show where canonical essays disagree and in which regimes each wins.
- **Implementation track:** graph/relationship view + conflict schema.
- **Non-technical blocker (primary):** editorial mapping of conflict pairs and conditional winner rules.

### 7) Team context profile + personalized mandates
- **Outcome:** tailor mandate card by stage/sector/team-size profile.
- **Implementation track:** profile storage + onboarding capture + mandate personalization layer.
- **Non-technical blocker:** policy decisions on segmentation and override behavior.

## Tier 3 — Two to three weeks

### 8) Sector-specific regime overlays
- **Outcome:** separate regime interpretations per vertical (e.g., B2B SaaS vs. consumer).
- **Implementation track:** sector filter + model selection infrastructure.
- **Non-technical blocker (primary):** sector-specific signal definitions and weights.

### 9) Regime transition case library
- **Outcome:** historical decision/outcome library tied to macro moments.
- **Implementation track:** case data model + submission/editorial workflow + browse UI.
- **Non-technical blocker (primary):** sourcing, validation, and editorial QA process.

## Decision bottlenecks to resolve before implementation parallelization

1. Define concept conflict taxonomy and “winner under conditions” rubric (for #6).
2. Approve sector signal-weight matrices and governance process (for #8).
3. Set credibility criteria and review workflow for case publication (for #9).

## Recommended execution sequence

1. Ship #1 immediately to reinforce the concepts loop with minimal engineering risk.
2. Ship #2 and #4 in parallel (UI/data presentation + bounded decision logic).
3. Ship #3 once snapshot coverage is confirmed; if needed, implement snapshot logging prerequisite first.
4. Start Tier 2 integration and visualization work while editorial decisions for #6/#7 are finalized.
5. Begin Tier 3 only after decision bottlenecks are explicitly documented and approved.
