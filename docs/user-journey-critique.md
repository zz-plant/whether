# User Journey Critique (3 Typical Journeys)

Date: 2026-02-10
Scope: Weekly briefing, Signal evidence, and Action playbook workflows.

## Journey 1 — New leader onboarding (Home → Onboarding → Signals)

### What works well
- The home page leads with role fit and an explicit reading sequence, which lowers orientation time.
- "Start here: onboarding" is a strong primary CTA for first-time users.
- Onboarding uses a clear three-step sequence and points users to live evidence pages.

### Friction observed
- There are many top-level paths early (weekly, operations, signals, formulas, onboarding). For first-time users, this can feel like "choose your own adventure" before they understand the model.
- The onboarding checklist communicates completion target but does not appear to persist completion state, so users may lose progress cues between visits.
- Some CTA labels vary between "Start here", "Start checklist", "Start orientation", and "Start the guide", increasing cognitive load.

### Constructive recommendations
1. Add a lightweight "mode switch" (First-time vs Returning) near the hero to reduce initial branch complexity.
2. Persist onboarding step completion in local storage and reflect progress in the header badge.
3. Standardize onboarding CTA verbs to one pattern (for example: "Start orientation", "Open glossary", "Open signal evidence").

---

## Journey 2 — Evidence validation under time pressure (Signals page)

### What works well
- The suggested 3-step scan order is excellent for time-boxed checks.
- The page combines summary, threshold controls, and time-machine context in one place.
- Keyboard accessibility starts strong: skip link receives focus on first Tab.

### Friction observed
- The page is feature-dense; users can hit advanced controls before they finish the suggested scan path.
- "Open step" is repeated on all cards and can feel ambiguous when quickly scanning.
- Browser console shows a Base UI label mismatch warning while navigating this area, which can erode trust for technical users.

### Constructive recommendations
1. Collapse advanced controls by default behind a sticky "Advanced diagnostics" drawer, with the 3-step scan pinned above.
2. Replace generic "Open step" with specific actions ("Open timeline", "Open thresholds", "Open sensor feed").
3. Resolve the Base UI label warning to keep the console clean for analyst/operator users.

---

## Journey 3 — From strategy to execution deliverables (Operations → Plan/Decisions/Briefings)

### What works well
- Workstream segmentation (Overview / Plan / Decisions / Briefings) is clear and closely aligned with leadership workflows.
- Overview page provides immediate next steps and a direct path to each workstream.
- Briefings page starts with explicit "first action" framing, which helps users begin quickly.

### Friction observed
- Users can lose "where am I in this workflow" context when moving between workstreams; the hierarchy feels broad rather than sequential.
- Similar copy blocks across pages can make subpages feel less differentiated on first glance.
- There is no obvious completion/progress model across Plan → Decisions → Briefings for users preparing an end-to-end packet.

### Constructive recommendations
1. Add a visible progress rail across operations pages (Step 1 Plan, Step 2 Decisions, Step 3 Briefings).
2. Add "Next recommended action" cards at each workstream footer to encourage forward movement.
3. Introduce a final "brief readiness" checklist that confirms assumptions, decisions, and exports are complete.

---

## Overall priority list
1. **Highest impact:** enforce a linear default path for first-time and execution workflows.
2. **Medium impact:** reduce language inconsistency in CTAs and repeated generic labels.
3. **Medium impact:** surface progress persistence (onboarding + operations completion cues).
4. **Quick win:** fix console warnings in critical analyst flows.
