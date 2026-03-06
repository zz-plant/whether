# Agent-accelerated prioritized feature spec

This document converts the requested backlog into an implementation sequence that assumes coding-agent support for delivery speed.

## Re-baseline (post home-brief hardening)

The current repo trajectory has improved materially with:
- `homeBriefModel` + `decisionKnobs` semantics (homepage reads more like an operator instrument).
- `loadReportDataSafe` and normalized fallback markers (reliability under partial data failure).
- centralized regime label formatting (cross-surface language consistency).

That progress changes execution priority: the next cycle should optimize for **weekly ritual behavior and shareable artifacts**, not broad surface expansion.

### Product North Star for the next cycle

Ship toward a single transmission loop:

`signals → posture → decision delta → bounded action → shareable artifact`

If a work item does not improve this loop, treat it as secondary.

### Primary success metrics (decision-product metrics)

1. Monday returning-user rate on briefing surfaces.
2. Share/export actions per briefing session (Slack/board/citation copy).
3. Time-to-decision statement (first actionable line visible without scroll).
4. % of sessions where users can answer “what changed this week?” in one screen.

---

## Immediate execution stack (value-unlocking order)

## Tier 1 — Core product loop (ship first)

### A) Decision Delta Panel (highest leverage)
**Goal**
- Convert macro updates into explicit week-over-week operating change calls.

**Required output shape**
- `What changed` (per key driver with up/down/flat state).
- `Net decision shift` (what operating stance should change now).
- Explicit no-change path: `No macro change this week. Hold posture.`

**Implementation notes**
- Compute with existing delta/snapshot paths before adding new systems.
- Keep language action-first and Monday-routine friendly.

**Why now**
- Without an explicit delta layer, the product still reads as analysis instead of a decision instrument.

### B) One-screen leadership brief
**Goal**
- Produce a first-viewport artifact leaders can reuse in meetings and Slack.

**Required output shape**
- Weekly operating posture summary.
- Confidence + shift-watch status.
- This-week changes + 2–3 implication lines.
- Actions: `Copy Slack brief`, `Copy board summary`, `Export PDF`.

**Implementation notes**
- Align content contract with `docs/one-screen-weekly-brief-spec.md`.
- Keep scroll-free for standard desktop viewport in the first shipped version.

### C) Bounded playbook decisions
**Goal**
- Replace generic guidance with enforceable action + trigger + reversal rules.

**Required output shape**
- `Do X`.
- `Pause/stop if Y threshold`.
- `Re-enable when Z condition recovers`.

**Why now**
- This is the bridge from “briefing” to “operating policy.”

## Tier 2 — Distribution + authority (ship after Tier 1)

### D) Programmatic decision pages
**Goal**
- Capture high-intent search/LLM traffic with direct operator questions.

**Page contract**
- Current posture.
- Decision implication.
- Link back to current weekly brief.
- Clear “last updated” and provenance markers.

### E) “Cite this call” block
**Goal**
- Make Whether references portable into docs, decks, and meeting notes.

**Required fields**
- Call date, posture, confidence, cadence, and source notes.
- One-click copy.

## Tier 3 — Trust reinforcement

### F) Regime history strip
- Compact recent regime history for continuity and anti-whiplash trust.

### G) Signal contribution weights
- Show per-signal contribution toward current posture to improve interpretability.

## Tier 4 — UX polish (do last)

- Rename “Command Center” style labels where needed.
- Move methodology deeper in learn flows.
- Collapse long sections in operations surfaces.

These are valuable, but they should not outrank weekly-loop mechanics.

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
