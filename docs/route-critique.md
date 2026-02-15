# Route critique: three typical user journeys

Date: 2026-02-15
Routes reviewed:
1. `/` (Weekly briefing)
2. `/signals` (Signal evidence)
3. `/operations` (Action playbook)

## 1) Weekly briefing (`/`)

### What can be removed
- Repeated low-context status chips (for example duplicated "Cached (medium)") in the primary viewport. They dilute attention before users orient to the core recommendation.
- Excess info (`i`) icon density in hero-level content where explanatory text is already visible.

### What should be rebuilt
- The top-level decision framing should be rebuilt into a single "Read this first" decision card that answers:
  - what changed,
  - what to do now,
  - confidence and caveats.
- Replace fragmented widgets with a structured executive narrative (decision -> evidence -> actions) to reduce cognitive switching.

### What needs modification
- Keep command-center access, but demote its visual prominence on first visit.
- Consolidate utility actions (copy/share/state) into a compact utility bar below the main decision card.
- Improve hierarchy: one dominant CTA, secondary links as subdued supporting navigation.

## 2) Signal evidence (`/signals`)

### What can be removed
- Duplicate freshness labels and repeated "Cached (medium)" badges when no comparison is required.
- Advanced controls shown at all times for first-time users; this can remain discoverable but should not compete with reading flow.

### What should be rebuilt
- Rebuild filtering into progressive disclosure:
  - default: simple preset filters (All, Inflation, Growth, Labor, Financial conditions),
  - advanced: threshold toggles and audit details behind "Advanced".
- Rebuild signal cards as a rank-ordered list by impact and recency, not just equal-weight card blocks.

### What needs modification
- Keep threshold logic and audit trail, but convert them into contextual side panels instead of primary buttons.
- Strengthen source credibility affordances: "View source" should consistently expose timestamp, publisher, and update cadence without extra clicks.
- Tighten button copy so actions are clearer than labels (for example, "Apply thresholds" -> "Apply filter").

## 3) Action playbook (`/operations`)

### What can be removed
- Repetitive "Mark complete" controls for every panel when completion does not currently change planning outcomes.
- Empty or unlabeled interactive elements (observed one blank button) that add friction and accessibility risk.

### What should be rebuilt
- Rebuild this route around time horizons:
  - this week,
  - this month,
  - this quarter.
- Rebuild workstreams into owner-ready cards with fields for owner, due date, and expected impact so the page can be used directly in operating reviews.

### What needs modification
- Retain section navigation, but make each section start with a concise "Why this matters now" sentence.
- Merge monthly summary and workstream actions into a single execution table with export/copy-ready formatting.
- Improve completion interactions: progress should persist and visibly roll up to section-level status.

## Cross-route recommendations

### Remove
- Interface noise from repeated status chips and duplicated utility elements.
- Redundant explanatory icons where adjacent microcopy already explains context.

### Rebuild
- Information architecture around a consistent flow:
  1. Decision
  2. Evidence
  3. Execution
- Route-specific defaults for novice users, with advanced tooling progressively disclosed.

### Modify
- Standardize CTA grammar and visual hierarchy.
- Improve state persistence and feedback for check/completion controls.
- Keep transparency elements (sources, thresholds, audit trail) but relocate them to support layers rather than first-layer actions.

## Prioritized implementation plan (P0 / P1 / P2)

### P0 — Fix now (high user friction, trust, and accessibility)
- Remove unlabeled/empty interactive controls on `/operations` and ensure all controls have accessible names.
- Remove duplicated status chips and duplicate freshness badges in above-the-fold areas (`/`, `/signals`) to reduce scanning noise.
- Fix completion feedback so check/complete interactions persist and visibly update section-level progress (`/operations`).

### P1 — Rebuild core task flow (high leverage on comprehension and execution)
- Rebuild `/` hero into a single "Read this first" decision card (change, action, confidence/caveat).
- Rebuild `/signals` into progressive disclosure filters (simple defaults first, advanced controls second).
- Rebuild `/operations` layout by time horizon (this week/month/quarter) and owner-ready workstream cards.

### P2 — Polish and optimize (clarity and consistency improvements)
- Modify CTA copy/grammar and hierarchy consistency across routes.
- Modify transparency affordances so thresholds/audit/source metadata are contextual support layers.
- Add a shared execution table/export pattern to streamline cross-functional reviews.
