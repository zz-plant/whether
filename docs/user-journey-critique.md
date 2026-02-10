# User Journey Critique (3 Typical Journeys)

Date: 2026-02-10  
Method: Manual traversal on local dev server (`bun run dev`) with Playwright.

## Journey 1 — First-time orientation (Home → Onboarding → Signals)

### What works well
- The homepage offers a clear “Weekly briefing” entry point and a visible onboarding CTA (`Start here: onboarding`), which gives new users an immediate first click.
- Onboarding content is sequenced and practical (orientation steps + glossary + jump links to report destinations).
- The Signals page opens with a compact “quick 3-step review,” reinforcing a fast analysis path before deeper tooling.

### Friction observed
- Early navigation still presents multiple parallel options (`Weekly briefing`, `Action playbook`, `Signal evidence`, `Methodology`, `Onboarding & glossary`), which can increase decision overhead for first-time users.
- CTA language is directionally good but still slightly fragmented across pages (`Start here`, `Start orientation`, `Open signal evidence`, `Review live data feed`).
- Onboarding emphasizes sequence but does not expose an obvious persistent “completion” state in-page (for example, completed step markers).

### Constructive recommendations
1. Add a first-session guidance mode that visually narrows choices to one recommended next action per screen.
2. Normalize CTA verbs to one pattern (for example: “Start …” for first actions, “Open …” for destinations).
3. Introduce explicit completion affordances in onboarding (checkmarks + persisted step state).

---

## Journey 2 — Weekly decision scan (Weekly briefing → Action playbook)

### What works well
- The Weekly briefing page communicates intent quickly: “Fast operating guidance for macro-driven weeks.”
- The top section order (action priorities, weekly action map, leadership readout) supports rapid executive scanning.
- Transition to the Action playbook is straightforward and keeps context anchored around execution.

### Friction observed
- The initial viewport is information-rich; section controls and navigation elements compete with the primary “what should I do first?” flow.
- Some labels are close in meaning (`Action priorities`, `Weekly action map`, `Leadership readout`) without explicit hierarchy for urgency.
- Users can move into detailed report sections quickly without confirmation that the weekly top-line interpretation is complete.

### Constructive recommendations
1. Add a pinned “Start with this sequence” strip that remains visible through the first scroll region.
2. Apply explicit urgency tags to major sections (e.g., “Read first”, “Then decide”, “Reference”).
3. Add a completion handoff cue before deep-linking into operations (e.g., “Weekly interpretation complete → continue to Plan”).

---

## Journey 3 — Execution handoff (Operations overview → Plan → Decisions → Briefings)

### What works well
- The operations architecture maps to real execution behavior (`Plan`, `Decisions`, `Briefings`).
- Page titles are explicit and scoped (`Action playbook · Plan`, `· Decisions`, `· Briefings`), which aids orientation.
- Copy/export actions are prominent in decision and briefing views, matching operator needs.

### Friction observed
- The “plan → decisions → briefings” sequence is stated in copy, but progress is not strongly visualized as a persistent stepper.
- Similar shell/navigation patterns across subpages can make first-view differentiation weaker than intended.
- System trust is slightly affected by a visible console warning in this area (`Base UI <Field.Label> ... nativeLabel`).

### Constructive recommendations
1. Add a persistent operations progress rail with current step, completed steps, and next step callout.
2. Increase subpage-specific first-action blocks at top of each workstream.
3. Resolve console warnings on core execution surfaces to preserve trust for technical users.

---

## Cross-journey themes
1. **Orientation and focus:** Reduce first-view branching and highlight one recommended next action.
2. **Progress visibility:** Persist and display completion state for onboarding and operations workflows.
3. **Language consistency:** Standardize CTA/action verbs and reduce near-duplicate labels.
4. **Trust signals:** Keep console clean on mission-critical analyst/operator flows.

## Bottom line
The product already demonstrates strong decision-support depth. The largest UX opportunity is improving **guided momentum**: making first actions clearer, reducing early choice overload, and showing users visible completion from orientation through execution.
