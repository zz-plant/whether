# Layout, sequencing, and visual revamp proposal

## Goal
Reframe Whether as a decision cockpit that minimizes scroll, clarifies progression, and makes confidence/action state obvious in under 30 seconds.

## 1) Information architecture revamp

### Current pattern
- Home, Signals, and Operations each present rich section stacks with section anchors and quick-step cards.
- The same trust + source context is repeated in shell chrome and page bodies.

### Proposed IA
- **Mode 1: Decide now** (default):
  - Top: Decision status strip (`Do now`, `Monitor`, `Defer`) with confidence and time horizon.
  - Middle: 3-card action deck (one per role: Product, Engineering, Finance).
  - Bottom: "Why" accordion showing the evidence trail.
- **Mode 2: Explain why**:
  - Signals-first narrative with threshold context and timeline.
  - Designed for analyst and leadership review.
- **Mode 3: Export/share**:
  - Briefing and copy-ready materials with one-click package actions.

This allows a hard split between execution users and evidence users while preserving the existing source sections.

## 2) Sequencing redesign

### Current pattern
- Home and Signals both include recommended scan sequences, and Operations includes its own checklist.

### Proposed sequence model
- Add a **global stage rail** (sticky, always visible):
  1. Assess regime
  2. Decide posture
  3. Set guardrails
  4. Assign owners
  5. Export brief
- Each page defaults to the stage relevant to its route and displays **"next best step"** CTA that deep-links to the next stage.
- Auto-collapse completed stages and keep current stage expanded.

This should replace duplicated local onboarding blocks with one shared journey pattern.

## 3) Visual hierarchy upgrades

- Introduce a **single dominant hero card** per page with:
  - Decision sentence in plain language.
  - Confidence meter.
  - Effective date + freshness.
- Reduce equal-weight card surfaces; use stronger size contrast:
  - Tier 1 cards: key decision + immediate actions.
  - Tier 2 cards: rationale and supporting stats.
  - Tier 3: provenance and appendices.
- Move secondary metadata (source link, fetched timestamps) into a compact disclosure row to reduce above-the-fold noise.

## 4) Density and readability improvements

- Apply a **"one screen, one answer"** rule:
  - Home answers: "What should we do this week?"
  - Signals answers: "Why is this regime call credible?"
  - Operations answers: "What do teams do next by function?"
- Limit each primary section intro to one line + one action.
- Introduce progressive disclosure for technical detail (threshold internals, archive controls).

## 5) Component-level changes

- Convert repeated quick-step blocks into a shared `ActionSequence` component with variants (`brief`, `detailed`, `checklist`).
- Create a shared `DecisionBanner` component consumed by Home + Operations + workstream pages.
- Add `EvidencePeek` compact component to summarize top 3 signal movers before users dive into full tables.

## 6) Interaction and motion direction

- Keep transitions subtle and stateful:
  - Stage changes: fade + 8px translate on content panel.
  - Confidence changes: color/label transition only (no layout shift).
- Preserve existing touch target and focus standards; treat keyboard flow through stage rail as first-class.

## 7) Mobile-first layout updates

- Replace long vertical stacks with:
  - Horizontal snap carousel for action cards.
  - Bottom sticky "Next step" bar.
  - Expandable evidence drawer.
- Keep stage rail as segmented control on mobile.

## 8) Suggested rollout (disruptive by design)

1. **Phase A (shell overhaul)**
   - Add stage rail + decision banner globally.
2. **Phase B (home simplification)**
   - Collapse homepage to decision-first structure.
3. **Phase C (signals reframing)**
   - Reorder to timeline -> thresholds -> live feed -> sources.
4. **Phase D (operations unification)**
   - Merge monthly checklist + immediate next steps into one execution board.
5. **Phase E (briefing workflow)**
   - Build dedicated export mode with explicit handoff templates.

## 9) Success metrics

- Time-to-first-action click (target: -30%).
- Scroll depth before first CTA click (target: -40%).
- Weekly return rate to "Decide now" mode.
- Brief export completion rate.
- Reduced navigation jumps between Home, Signals, Operations during a single session.
