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
