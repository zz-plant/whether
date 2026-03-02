# Persona click-route walkthrough and UX critique (2026-03-02)

## Persona used
**Name:** Alex Rivera (archetype)  
**Role:** VP Product (works closely with VP Engineering)  
**Goal:** Turn this week’s regime signal into concrete operating calls in under 5 minutes.

## Routes traversed
1. `/` → `/signals` → `/operations`
2. `/` → `/decide` (attempted from home nav, then validated via direct route)
3. `/` → `/method` → `/learn` (method link from home looped back to `/`; then validated via direct route)

## What worked
- **Route 1 is the strongest narrative chain**: posture on home, evidence on Signals, execution framing on Operations.
- **Page intent labels are generally clear once on-page** (`Signals`, `Action playbook`, `Decide`, `Method`, `Learn`).
- **The command-center home view provides immediate macro posture context** at first paint.

## What could be streamlined
1. **Reduce top-of-page control density on `/`.**
   - Observed: home rendered with very high interaction density (`34` links, `48` buttons).
   - Streamline by collapsing tertiary controls (e.g., utilities and secondary jumps) behind a single “More actions” disclosure.

2. **Make primary route progression explicit.**
   - Recommended “next-step” rail on each page:
     - Home: `Review evidence` → `/signals`
     - Signals: `Apply to operating plan` → `/operations`
     - Operations: `Translate by role` → `/decide`
   - This would reduce navigation guesswork for time-constrained leaders.

3. **Clarify Command Center vs. global nav wording.**
   - On home, repeated route names and command-center anchors can feel redundant.
   - Keep one canonical top-level label set and demote intra-page jumps visually.

## What felt extraneous or distracting
1. **Home-page action density is too high for a “weekly decision” task.**
   - The interaction volume competes with the single most important question: “What should we do this week?”

2. **Potential nav ambiguity from duplicated labels.**
   - During traversal, top links for `Decide` and `Method` from home did not transition as expected, while direct routes worked.
   - Even if intentional (anchor behavior), this reads as route uncertainty during rapid scanning.

3. **Signals and Operations are rich but visually busy at scan depth.**
   - Signals includes many diagnostics quickly (`48` links on-page).
   - Operations also carries high control density (`37` links, `34` buttons).
   - Consider progressive disclosure defaults (top 3 only, then “Show full diagnostic set”).

## Prioritized change list

### P0 (do first)
1. **Simplify home above the fold**
   - Keep one directive card, one primary CTA, and one secondary CTA.
   - Move tertiary actions (utility controls, deep jumps) into a collapsed “More actions” control.
   - **Why first:** highest impact on first-30-second clarity.

2. **Add a guided next-step CTA chain**
   - Home → Signals (`Review evidence`)
   - Signals → Operations (`Apply to operating plan`)
   - Operations → Decide (`Translate by role`)
   - **Why first:** removes wayfinding ambiguity in the core weekly workflow.

### P1 (do second)
3. **De-duplicate navigation labels and hierarchy**
   - Distinguish global route nav from in-page command-center anchors through copy and visual hierarchy.
   - Ensure `Decide` and `Method` links have unambiguous destination behavior.
   - **Why second:** lowers cognitive load and prevents perceived route inconsistency.

4. **Default to progressive disclosure in high-density pages**
   - Show “top 3” diagnostics/actions by default on Signals and Operations.
   - Move the full set behind explicit “Show all diagnostics/actions” interactions.
   - **Why second:** preserves depth while optimizing executive scan speed.

### P2 (do third)
5. **Standardize a compact trust/freshness strip**
   - Use one reusable strip for posture timestamp, data freshness, and provenance.
   - Remove duplicate trust/status language blocks where possible.
   - **Why third:** trims repetition and increases confidence without adding visual weight.

## High effort, high payoff bets

1. **Unified weekly decision workspace (single-screen orchestration)**
   - Combine the core flow (posture → evidence → actions → role translation) into one progressive, collapsible workspace with deep-link sections.
   - Keep route-level pages for depth, but make the default leadership workflow possible without context-switching.
   - **Effort profile:** high (IA changes, component refactor, routing/state coordination).
   - **Payoff:** major reduction in decision latency for weekly leadership reviews.

2. **Role-aware recommendations engine on Operations/Decide**
   - Add explicit role toggles (VP Product, VP Engineering, Finance) that dynamically re-rank actions, risks, and copy-ready outputs.
   - Persist role preference and URL state for shareable links.
   - **Effort profile:** high (content modeling, ranking rules, QA across personas).
   - **Payoff:** higher action relevance and less manual interpretation overhead.

3. **Actionability exports with structured templates**
   - Provide one-click exports for planning artifacts (Jira-ready action list, Notion staff update, risk register entry).
   - Include source snapshot metadata and confidence markers in each export.
   - **Effort profile:** high (template system, content governance, analytics instrumentation).
   - **Payoff:** strongest conversion from insight to execution, with measurable workflow adoption.

4. **Diagnostic prioritization + confidence layering framework**
   - Build an explicit prioritization model that surfaces “top movers” first and progressively reveals supporting diagnostics.
   - Add layered confidence explanation (10-second summary, 60-second evidence, full method trace).
   - **Effort profile:** high (modeling, UX system design, validation tuning).
   - **Payoff:** better trust calibration and faster scanning on dense pages.

5. **Navigation architecture hardening and intent clarity pass**
   - Standardize global nav vs in-page anchors, enforce route-behavior consistency, and add instrumentation for navigation misclick loops.
   - Pair with usability tests focused on “first click correctness” in 5-minute scenarios.
   - **Effort profile:** medium-high to high (cross-route copy, interaction, and telemetry updates).
   - **Payoff:** lower confusion and stronger perceived product reliability for executive users.

## Validation notes
- Route traversal and UI density checks were performed in a live local run using Playwright against `bun run dev`.
- Observed page-level interaction counts:
  - `/`: 34 links, 48 buttons
  - `/signals`: 48 links, 12 buttons
  - `/operations`: 37 links, 34 buttons
  - `/decide`: 13 links, 2 buttons
  - `/method`: 12 links, 2 buttons
  - `/learn`: 16 links, 2 buttons
