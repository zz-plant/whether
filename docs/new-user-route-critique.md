# New User Route Critique (Round 2: Actionable UX Plan)

This revision keeps the same two first-time routes, but turns findings into implementation-ready recommendations with priorities.

## How this walkthrough was run
- Environment: local dev build via `bun run dev`.
- Method: manual browser traversal of the two routes plus navigation inventory checks.
- Lens: first-time user clarity, decision confidence, and path completion speed.

## Route 1: Weekly briefing (`/`) → Onboarding & glossary (`/onboarding`)

### User intent
"I’m new. Tell me what this product is, how to read it, and what I should do first."

### Steps traversed
1. Open `/` (Weekly briefing).
2. Use primary nav: **Onboarding & glossary**.
3. Jump to glossary section (`#beginner-glossary`).

### Friction observed
- Early viewport includes duplicate or repeated navigation affordances, which competes with onboarding copy.
- Heading copy contains repetition (example: "Start with Start onboarding."), reducing trust and polish.
- New-user path is present but visually diluted by dense surrounding modules.

### What can be removed (priority: high)
1. Visually duplicated skip-link variants at the top of view when both are rendered simultaneously.
2. Repeated quick-jump actions that point to the same report anchors during onboarding context.

### What needs to be rebuilt (priority: high)
1. **Onboarding hero and first viewport hierarchy**
   - Rebuild around one primary CTA: "Start onboarding".
   - Keep one secondary CTA: "View live report".
   - Collapse non-essential context into an expandable "Why this matters" region.
2. **Glossary learning model**
   - Rebuild as progressive disclosure (accordion or card drill-down).
   - Each term should include:
     - plain-English definition,
     - "if this rises/falls" operator consequence,
     - one linked destination in the report.

### What needs modification (priority: medium)
1. Fix repetitive microcopy and enforce a copy QA pass for section headings.
2. Add explicit wayfinding status (e.g., "Step 1 of 3") and "next step" callout after glossary.
3. Reduce above-the-fold density so the 3-step starter path is visible without scrolling on common laptop heights.

---

## Route 2: Weekly briefing (`/`) → Action playbook (`/operations`) → Plan (`/operations/plan`)

### User intent
"I understand the signal. Help me turn it into a clear monthly plan and owner actions."

### Steps traversed
1. Open `/`.
2. Use primary nav: **Action playbook** (`/operations`).
3. Open **Plan** (`/operations/plan`) from playbook flow.

### Friction observed
- Entry to playbook includes many simultaneous navigation surfaces (page links, section links, utility links).
- Multiple links communicate similar outcomes, increasing choice paralysis.
- Step framework exists (Plan → Decisions → Briefings) but progression emphasis is weaker than content density.

### What can be removed (priority: high)
1. Duplicate/near-duplicate pathway links to the same destination in top navigation blocks.
2. Non-essential utility links in the first decision viewport when a user is still choosing the next workflow step.

### What needs to be rebuilt (priority: high)
1. **First-time playbook mode**
   - Rebuild as linear guided flow:
     - Step 1 Plan
     - Step 2 Decisions
     - Step 3 Briefings
   - Keep an explicit "Switch to expert mode" for power users.
2. **Plan page information architecture**
   - Rebuild around decision packets instead of source buckets:
     - posture,
     - guardrails,
     - owners,
     - deadline,
     - export action.

### What needs modification (priority: medium)
1. Strengthen visual current-step indicator and completion state.
2. Add immediate after-action feedback (e.g., "Step complete — continue to Decisions").
3. Reduce CTA competition to one primary monthly action plus one secondary exploratory action.

---

## Prioritized implementation plan

### Now (1 sprint)
1. Remove duplicate visual nav elements and repeated quick links in onboarding/playbook entry states.
2. Fix copy defects and repeated phrasing in headings.
3. Add explicit step progress labels and "next action" messaging.

### Next (1–2 sprints)
1. Rework onboarding first viewport with single primary CTA and simplified information hierarchy.
2. Convert glossary to progressive disclosure with operator consequences.
3. Tune playbook stepper UI for stronger progression cues and reduced decision overload.

### Later (2+ sprints)
1. Ship optional "first-time mode" across onboarding + playbook with route memory.
2. Add measurement instrumentation for:
   - time to first meaningful action,
   - onboarding completion rate,
   - Plan → Decisions click-through,
   - Briefings export completion.

## Success criteria for this critique
- A new user should reach a clear next action within 30–60 seconds on both routes.
- Each page should expose one dominant action in the first viewport.
- Step completion should be unambiguous at every transition.
