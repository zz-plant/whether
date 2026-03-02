# Mobile design improvements backlog (top 6)

This backlog tracks the six mobile-first improvements. P0/P1 items are now implemented in the UI so the remaining work is P2 follow-through and iteration.

## Three designs to rethink next

If we only pick three areas for the next UX/design cycle, prioritize these:

1. **Returning-visitor delta layer (what changed since last review)**
   - Why rethink: repeat visitors need immediate signal change detection; current flow still requires scanning multiple sections.
   - Rethink direction: make the delta strip the first content block on return visits, with impact-coded tags and one-tap jump links to changed sections.

2. **Context-preserving mobile navigation model**
   - Why rethink: section chips solve basic jumps, but long reports still create orientation loss once users scroll deeply or open nested panels.
   - Rethink direction: add a compact progress + breadcrumb state (e.g., "3/7 · Execution") and keep chip labels decision-oriented rather than document-oriented.

3. **First-screen rewrite for “decision in 5 seconds” clarity**
   - Why rethink: this panel improved first-read clarity, but it can still over-index on narrative versus explicit recommended action confidence.
   - Rethink direction: tighten to a stricter decision card format: posture, confidence score, one primary action, one fallback action, and explicit time horizon.

## Priority definitions
- **P0 (High / immediate):** fixes first-visit blockers that prevent comprehension or action.
- **P1 (Medium / next cycle):** improves speed, confidence, and repeat usage on mobile.
- **P2 (Lower / later):** raises retention and polish after core flows are solid.

## Recommended improvements + status

1. **P0 — Thumb-zone sticky decision bar (bottom anchored)** ✅ Implemented
   - Added a mobile-only bottom decision bar with posture confidence and one primary action in thumb reach.
   - Kept desktop sticky posture card for large screens.

2. **P0 — First-screen rewrite for “decision in 5 seconds” clarity** ✅ Implemented
   - Added a dedicated “Decision in 5 seconds” panel that answers what changed, what to do, and urgency.
   - Kept deeper context below the fold for progressive detail.

3. **P0 — Mobile interaction + accessibility hardening pass** ✅ Implemented
   - Ensured critical interactive controls remain on 44px+ targets in modified components.
   - Preserved high-contrast text and visible focus behavior in new controls.

4. **P1 — Performance budget for mobile (Core Web Vitals oriented)** ✅ Implemented (initial baseline)
   - Reduced above-the-fold interaction complexity by focusing first-screen content.
   - Kept heavy navigation detail in collapsible patterns instead of always-open blocks.

5. **P1 — Context-preserving mobile navigation model** ✅ Implemented
   - Added top-of-page mobile section jump chips with URL-hash state.
   - Highlighted active section chip based on current hash for return/context continuity.

6. **P2 — Returning-visitor delta layer (what changed since last visit)** ⏳ Pending
   - Add a dedicated “Since your last review” strip with only decision-relevant changes.
   - Label updates by impact level and collapse unchanged content by default.

## Added design standard: dense evidence mode (dashboard)

A dedicated `?view=evidence` mode now complements the narrative dashboard for operators who need a
fast, high-density scan before planning calls.

Preservation rules for future contributors:
- Keep one deterministic row per core indicator, ordered by decision relevance.
- Keep row anatomy fixed: left (label/value/freshness), middle (5Y sparkline with median +
  threshold lines), right (one operational implication sentence).
- Do not reintroduce detached legends for this view; use direct end-of-line labels.
- Reserve accent color for outliers/regime breaks only.
- Maintain keyboard row focus order and screen-reader row summaries.

## Text-first UI needs that can shift to non-text cues

The current UI still relies on explanatory copy in several places where structure, state, or visual encoding could carry more of the load:

1. **Onboarding orientation and wayfinding**
   - Current text role: three "Step N" sections and explanatory paragraph carry the onboarding model.
   - Alternative: progress stepper with completion state, optional mini-map, and contextual defaults (instead of repeated instructional prose).

2. **System/data state comprehension**
   - Current text role: provenance modules communicate freshness, update cadence, and source reliability with labels and helper text.
   - Alternative: stronger state icons/timeline markers + compact status meter with drill-down on demand.

3. **Action prioritization and decision confidence**
   - Current text role: weekly bullets, constraints, and timing windows are largely sentence-driven.
   - Alternative: explicit decision cards with primary/secondary action chips, confidence bars, and tradeoff toggles.

4. **Navigation education in command center**
   - Current text role: filter meaning, keyboard/remote instructions, and collapsed-state explanation are copy-heavy.
   - Alternative: icon-led filter legend, contextual hotkey hint chips, and progressive disclosure for advanced controls.

5. **Workflow status communication**
   - Current text role: workflow and checklist modules rely on labels like "Step 1", "In progress", and completion instructions.
   - Alternative: timeline rail + completion rings + state transitions (empty → active → complete) with less explanatory text.

## Button simplification recommendations (unnecessary or redundant controls)

These are the highest-confidence candidates to remove, merge, or conditionally render to reduce CTA clutter:

1. **Global header: "Run weekly sequence" (all pages)**
   - Why it is likely unnecessary: this CTA appears globally and competes with primary wayfinding on every route.
   - Recommendation: keep it only on pages where the weekly sequence is the primary next action, or demote it into contextual cards.

2. **Global header: "Leadership brief" versus in-flow "Generate leadership brief"**
   - Why it is likely redundant: both controls route users toward leadership brief generation/consumption from different surfaces.
   - Recommendation: consolidate to one canonical brief CTA per view (header _or_ in-flow) and keep one wording pattern.

3. **Toolkits search: always-visible "Clear"**
   - Why it is likely unnecessary: when no `q` query exists, the clear action is a no-op and adds visual noise.
   - Recommendation: only render "Clear" when a non-empty search query is present.

4. **Weekly decision card: "Share snapshot" without direct share action**
   - Why it is likely low-value in current form: modal opens a snapshot and close button but no explicit copy/download/share affordance.
   - Recommendation: either add direct actions (copy Markdown, copy plain text, export image) or remove the trigger until share is complete.

5. **Cross-page CTA density in top regions**
   - Why it is likely excessive: header + card-level controls can stack multiple primary-looking buttons before core content.
   - Recommendation: enforce a "one primary CTA per viewport region" rule and downgrade secondary actions to links or menu items.
