# User Journey Critique (3 Typical Paths)

Date: 2026-02-09  
Method: Manual traversal using local dev server (`bun run dev`) and Playwright (Firefox).

## Journey 1 — First-time visitor: Home → Onboarding & Glossary

### What works
- The landing page immediately anchors the user with a clear primary heading (`Weekly briefing`) and a high-signal top navigation set (leadership summary, action playbook, signal evidence, onboarding).
- Onboarding content is practical and scannable: it combines a recommended 3-step path with plain-English macro definitions (cash availability, risk appetite, curve slope).
- Terminology translation is strong for the product audience (operators and leaders who are not macro specialists).

### Friction observed
- The homepage has multiple links that look similarly primary in the same viewport region (e.g., several "copy-ready" and report links), which can dilute the obvious “first click” for a new user.
- Onboarding is content-rich but lacks visible completion/progress affordances (e.g., “Step 1/3 complete”), so users may not know when they’re done with the quick-start path.

### Constructive recommendations
1. Add a single dominant “Start here” CTA on the homepage for first-time sessions (or when no prior local usage state exists).
2. Add lightweight onboarding progress states (3-step checklist with completion checkmarks).
3. Add contextual exit links from onboarding into the exact report sections referenced by each concept.

---

## Journey 2 — Analyst/operator scan: Signals page deep dive

### What works
- The `Signal evidence` page has clear intent and hierarchy: command-center framing, key drivers, expanded packs, threshold tuning, and time-sequence replay.
- Available controls imply strong analytical flexibility (`Select all`, `Clear`, groups/windows, threshold logic, deep dive cards).
- Supporting links to related report pages strengthen continuity with decision surfaces.

### Friction observed
- Control density is high in the first viewport; users can encounter many choices before understanding what the “minimum viable analysis” is.
- Labels like `LIVE SENSOR ARRAY` and multiple control clusters are information-rich, but first-time interpretation cost is non-trivial.

### Constructive recommendations
1. Add a compact “Suggested scan order” strip at top of Signals (e.g., 1) regime timeline, 2) key thresholds, 3) deep-dive cards).
2. Introduce progressive disclosure for advanced controls (collapsed by default with “Show advanced filters”).
3. Add tiny “why this matters” helper text on each major signal panel in operator language.

---

## Journey 3 — Execution workflow: Operations hub → Briefings / Plan / Decisions

### What works
- The Operations area cleanly maps to execution modes: `Overview`, `Plan`, `Decisions`, `Briefings`.
- Subpages preserve a consistent shell (`Action playbook`) and provide copy/export-oriented actions aligned to leadership workflows.
- Decision-focused components (e.g., `Decision shield`, `assumptions`, `counterfactual` style content areas) support governance before commitment.

### Friction observed
- Repeated labels and link variants in the nav region can feel duplicative, making wayfinding slightly harder than necessary.
- Primary user objective per subpage ("what should I do first here?") is not always explicit in the first viewport.

### Constructive recommendations
1. Normalize navigation labels to reduce near-duplicates and emphasize one canonical label per destination.
2. Add a short “First action” callout block at top of each operations subpage (briefings/plan/decisions).
3. Add completion affordances across the operations flow (e.g., “Plan drafted → Decision guardrails checked → Brief exported”).

---

## Cross-journey opportunities

1. **First-time guidance mode**
   - Detect first session and add a low-friction guided layer spanning Home → Onboarding → Signals → Operations.
2. **Stronger progressive disclosure**
   - Keep expert power available while reducing initial cognitive load for new users.
3. **Task completion feedback**
   - Add explicit “done” states and next-step suggestions so users feel forward momentum.

## Bottom line
The product already communicates depth and credibility; the next UX lift is primarily **orientation and focus**: reducing first-view choice overload, clarifying first actions, and making progress/completion states obvious.
