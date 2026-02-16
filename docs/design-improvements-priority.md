# Design improvements backlog (execution scope: P0 + P1)

This backlog now focuses only on **P0** and **P1** items for immediate execution planning.

## Priority definitions
- **P0 (High / immediate):** materially improves comprehension, conversion to action, or trust in weekly decision-making.
- **P1 (Medium / next cycle):** improves efficiency and confidence for repeat operators.

## P0 workstream (implement now)

1. **Persistent “Current posture” sticky summary rail (desktop + mobile)**
   - Keep posture, confidence, and primary action visible while scrolling.
   - Include quick links to the active evidence section and immediate action.
   - **Acceptance criteria:** The user can scroll through long sections without losing “what to do now.”

2. **Canonical trust/caveat module shared across pages**
   - Standardize confidence label, rationale, and caveat copy in one reusable pattern.
   - Apply the same component language to `/`, `/signals`, and `/operations`.
   - **Acceptance criteria:** Trust messaging is visually and verbally consistent across report surfaces.

3. **Severity-tuned alert/fallback hierarchy**
   - Strengthen differentiation between normal, caution, and hold states.
   - Pair each state with explicit operator guidance (what to proceed with vs pause).
   - **Acceptance criteria:** Users can identify state severity at a glance and know the expected action.

## P1 workstream (implement next)

4. **Role-based quick views (Product lead / Eng lead / Finance partner)**
   - Provide role toggles that reorder content and recommendations while keeping shared source data.
   - Preserve URL state so role selection is linkable and back-button safe.
   - **Acceptance criteria:** Role switch changes emphasis without changing underlying facts.

5. **Summary-mode progressive disclosure with time-to-read estimates**
   - Add clear read-time labels (for summary vs full depth).
   - Add explicit expand/reveal affordances for deeper sections.
   - **Acceptance criteria:** Users can choose a scan path based on time budget.

6. **Decision diff chips (“Up from last week”, “New this cycle”)**
   - Add lightweight change indicators near key cards and actions.
   - Surface deltas inline rather than only in dedicated comparison modules.
   - **Acceptance criteria:** Repeat users can quickly locate what changed since prior review.

7. **Cross-page workflow continuity with next-step breadcrumbs**
   - Add explicit “next recommended move” cues tied to the global flow: Assess → Decide → Guardrails → Owners → Export.
   - Place continuation cues at the end of each major page section.
   - **Acceptance criteria:** Users can move through the workflow without dead-ends.

## Deferred
- P2 items are intentionally excluded from this execution scope until P0/P1 are shipped.
