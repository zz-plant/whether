# whether.work pathway critique: simplify three typical user journeys

Date: 2026-02-22
Routes traversed:
1. `/` — Weekly briefing
2. `/signals` — Signal evidence
3. `/operations` — Action playbook

Method: live walkthroughs on production (`https://whether.work`) using realistic first-session tasks. The goal was to complete each task quickly with no prior product context.

## What was traversed (current-state click paths)

### Pathway A (`/`): "Get the weekly call in <60 seconds"
Current interaction path:
1. Land on `/`.
2. Scan hero and status chips.
3. Open supporting inputs (`View 4 inputs`) to validate recommendation confidence.
4. Return to summary and choose next action.

Observed friction:
- Hero includes several competing controls before the narrative is clear.
- Repeated confidence/status treatment competes with the main decision statement.
- Utility and workflow actions are intermixed.

### Pathway B (`/signals`): "Validate the evidence and filter to what matters"
Current interaction path:
1. Land on `/signals`.
2. Parse a dense control surface.
3. Open advanced filters.
4. Change month/snapshot context.
5. Re-evaluate signal cards and optionally export.

Observed friction:
- Very high button density at first paint (hundreds of interactive elements).
- Advanced controls are foregrounded before a simple default path is established.
- Freshness/confidence metadata repeats frequently, creating scan noise.

### Pathway C (`/operations`): "Turn guidance into an owner-ready plan"
Current interaction path:
1. Land on `/operations`.
2. Review section framing.
3. Toggle completion (`Mark complete`) on one or more items.
4. Review summary/copy actions.

Observed friction:
- Completion controls are easy to trigger but loosely coupled to ownership details.
- Section navigation, summary tools, and command actions all compete early.
- Progress roll-up is less prominent than individual actions.

---

## Critique and simplification recommendations by pathway

## 1) Weekly briefing (`/`)

### Why it feels heavier than necessary
Users must parse interface affordances before they get a single dominant recommendation frame.

### Simplify the flow
1. **Introduce one "Read this first" card at the top** with only:
   - What changed,
   - What to do now,
   - Confidence + key caveat.
2. **Move auxiliary explainer content behind one disclosure** (`How this is scored`) instead of multiple inline `i` actions.
3. **Split action zones**:
   - Primary zone: one next-step CTA,
   - Secondary utility zone: copy/share/state.
4. **Collapse repeated status chips** into one route-level status row.

### Target outcome
A first-time user can answer the three headline questions in one reading pass, with optional drill-down rather than required hunting.

---

## 2) Signal evidence (`/signals`)

### Why it feels heavier than necessary
Power-user controls appear too early, while the default "show me what matters" pathway is visually diluted.

### Simplify the flow
1. **Default to a simple filter bar** (All, Growth, Inflation, Labor, Financial conditions).
2. **Move advanced controls into a drawer** (`Advanced filters`) that opens on demand.
3. **Use one confidence/freshness banner** at route or section level rather than repeating per card.
4. **Prioritize signal cards with explicit sort** (Impact, Recency, Divergence) so users understand why items appear first.
5. **Make export contextual** (for example: `Export timeline (Growth, last 6m, JSON)`).

### Target outcome
Users can complete a meaningful evidence review without touching advanced controls, while still preserving full analyst depth behind disclosure.

---

## 3) Action playbook (`/operations`)

### Why it feels heavier than necessary
The page supports completion interactions, but planning fidelity (owner/due date/impact) is not equally foregrounded.

### Simplify the flow
1. **Lead with time-horizon tabs** (`This week`, `This month`, `This quarter`) and display one horizon at a time.
2. **Replace simple completion toggles with owner-ready action rows**:
   - owner,
   - due date,
   - expected impact,
   - status.
3. **Add explicit progress roll-ups** at section and page level (assigned vs completed).
4. **Unify summary + export** into one meeting-ready output block.

### Target outcome
The route shifts from "checklist interaction" to "operational planning artifact" that can be copied directly into weekly reviews.

---

## Cross-pathway simplification rules

1. **One primary CTA above the fold per route.**
2. **Decision → Evidence → Execution should be the consistent information order.**
3. **Repeated metadata should be compressed to shared status regions.**
4. **Completion must be tied to accountability fields (owner/date/impact).**

## Prioritized implementation plan

### P0 — Clarity wins (low risk, high immediate value)
- Remove repeated status/chip patterns in hero or first viewport areas.
- Consolidate explainer affordances (many `i` actions → one disclosure pattern).
- Enforce one dominant above-the-fold CTA per route.

### P1 — Task-flow redesign (high leverage)
- Redesign `/signals` for default-simple filtering with advanced disclosure.
- Redesign `/operations` for horizon-first planning and owner-ready actions.

### P2 — Consistency and instrumentation
- Standardize CTA grammar and action hierarchy across routes.
- Ensure exports reflect active scope/filters in labeling.
- Track time-to-first-decision and time-to-plan-completion before/after changes.
