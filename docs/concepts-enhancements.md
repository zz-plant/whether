# /concepts enhancement opportunities

This note captures product and UX improvements for the `/concepts` timeline and article pages.

## Quick wins

1. **Add on-page filtering + search**
   - Add text search (`title`, `author`, `focus`) and chip filters (`era`, `audience`, macro regime label).
   - Why: the timeline now spans many eras and entries, so scanning is increasingly expensive without controls.

2. **Expose reading-time and format metadata**
   - Add optional fields like `readMins` and `sourceType` (essay, book excerpt, podcast episode, framework index).
   - Why: users can prioritize what to open based on available attention.

3. **Improve timeline scanning anchors**
   - Add sticky in-page era navigation and deep links (`/concepts#modern-ai-era`).
   - Why: helps users jump across long lists quickly and improves shareability.

4. **Add stronger evidence previews on cards**
   - Surface one concise macro guidance line directly on each timeline card (not just a regime pill).
   - Why: users can evaluate article relevance before opening details.

5. **Clarify missing-context behavior**
   - Show an inline badge on timeline cards for pre-2012 entries indicating “macro snapshot unavailable”.
   - Why: sets expectations before click-through and reduces confusion.

## Higher-impact product upgrades

6. **Build “compare concepts” mode**
   - Let users select 2–3 entries and compare publication context, regime posture, and guidance side by side.
   - Why: supports synthesis and decision discussions for leadership teams.

7. **Attach concept-to-action translation blocks**
   - Add “How to apply this quarter” sections (e.g., planning cadence, KPI choices, org design implications).
   - Why: the current pages explain context well; this would close the loop to action.

8. **Add confidence and provenance annotations**
   - Label inferred links as directional (not causal), and add confidence level for each macro-context interpretation.
   - Why: increases trust and keeps analytical claims calibrated.

9. **Add role-based views**
   - Offer default presets for PM ICs, design leaders, founders, and platform/infra leaders.
   - Why: each persona needs different guidance emphasis from the same underlying canon.

10. **Track concept freshness and influence arcs**
    - Add “still relevant / historically important / superseded” status and a “what changed since publication” update note.
    - Why: helps users avoid overfitting to outdated frameworks.

## Implementation notes

- Start with schema additions in `lib/productCanon.ts` for optional metadata (`readMins`, `sourceType`, `confidence`, `relevanceStatus`).
- Implement filters and anchors on `app/concepts/page.tsx` first; this yields immediate utility with low migration cost.
- Extend the detail template in `app/concepts/[slug]/page.tsx` for action translation and provenance labels.
- If these enhancements ship, add lightweight UX validation (click-path telemetry or a qualitative usability pass) before adding more canon entries.

## Suggested priority tiers

### P0 (high urgency / highest near-term leverage)
- **1. Add on-page filtering + search**
- **4. Add stronger evidence previews on cards**
- **5. Clarify missing-context behavior**

### P1 (important next wave after P0)
- **2. Expose reading-time and format metadata**
- **3. Improve timeline scanning anchors**
- **8. Add confidence and provenance annotations**

### P2 (valuable but can follow after core UX clarity work)
- **6. Build compare concepts mode**
- **7. Attach concept-to-action translation blocks**
- **9. Add role-based views**
- **10. Track concept freshness and influence arcs**
