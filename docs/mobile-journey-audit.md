# Mobile journey critique (3 representative user paths)

Date: 2026-02-10  
Viewport tested: 390x844 (mobile touch context)

## Method
- Ran the app locally with `bun run dev`.
- Traversed three common flows for product/engineering leaders on a phone-sized viewport.
- Captured screenshots to support observations.

## Journey 1 — First-time user starts from home, then onboarding
**Goal:** Understand what to do first and begin guided setup.  
**Path:** `/` → `Start here: onboarding` → `/onboarding`

### What worked well
- The primary onboarding CTA is easy to discover near the top of the home page.
- The onboarding page loads quickly and preserves the product’s “operator briefing” tone.
- Information density is high without feeling noisy, which is useful for executive users scanning quickly.

### Friction observed
- There are multiple similarly named onboarding entry points on the home screen. This can create mild decision hesitation (“which one is the canonical start?”).

### Constructive improvements
1. Keep one dominant onboarding CTA in the hero and demote duplicates to lower-emphasis links.
2. Add a short “expected time to complete” microcopy on the onboarding CTA.
3. Persist onboarding progress state more visibly on return visits (for confidence and continuity).

## Journey 2 — Returning user tries to open weekly briefing from home
**Goal:** Open current weekly briefing and quickly copy/share summary.  
**Path attempted:** `/` → `Weekly briefing`

### What worked well
- The weekly summary controls (including `Copy summary`) are present and visible on mobile.
- Key sections are positioned close to the top, minimizing scroll for repeat users.

### Friction observed
- Tapping the `Weekly briefing` link from the home context failed in mobile testing due to overlapping/intercepting elements (pointer interception behavior).
- The destination content appears on the same page context, but the interaction model is not obvious enough under touch conditions.

### Constructive improvements
1. Resolve click/tap interception for top-level navigation links in the home view by adjusting stacking and pointer-event handling.
2. Introduce explicit visual affordance for in-page navigation versus route navigation (iconography + label convention).
3. Add an immediate post-tap state change (pressed state/spinner/focus movement) so users get deterministic feedback.

## Journey 3 — Operations-focused user opens the operations workspace
**Goal:** Move from summary to execution-oriented planning content.  
**Path:** direct `/operations` entry

### What worked well
- The operations page provides clear framing for practical execution artifacts.
- Navigation labels like monthly summary/workstreams support outcome-oriented scanning.
- The page structure appears compatible with progressive deep dives.

### Friction observed
- The top area remains content-dense on mobile; first-time users may need stronger wayfinding cues to pick a “next best action.”

### Constructive improvements
1. Add a sticky “Start here” rail/button that recommends one next action based on current regime state.
2. Increase hierarchy contrast between strategic summary blocks and actionable controls.
3. Consider a compact/expanded mode toggle for mobile to reduce initial cognitive load.

## Prioritized recommendations (cross-journey)
1. **P0:** Fix mobile tap target interception in home navigation interactions.
2. **P1:** Simplify home CTA architecture (single primary onboarding path + clearer weekly entry behavior).
3. **P1:** Strengthen mobile feedback loops (pressed/loading/focus movement) for high-value actions.
4. **P2:** Reduce initial cognitive load in operations with stronger “next step” signposting.

## Screenshot artifacts
- Journey 1 home: `browser:/tmp/codex_browser_invocations/f26a846b6a6c58f1/artifacts/artifacts/j1-home.png`
- Journey 1 onboarding: `browser:/tmp/codex_browser_invocations/f26a846b6a6c58f1/artifacts/artifacts/j1-onboarding.png`
- Journey 2 weekly attempt: `browser:/tmp/codex_browser_invocations/f26a846b6a6c58f1/artifacts/artifacts/j2-home-weekly-attempt.png`
- Journey 3 operations: `browser:/tmp/codex_browser_invocations/f26a846b6a6c58f1/artifacts/artifacts/j3-operations.png`

## Addendum — screenshot-only landing follow-up (2026-02-26)

To avoid splitting closely related mobile UX findings across multiple docs, the landing-page screenshot review is consolidated here.

### Additional prioritized opportunities
1. **Hero scanability (P1):** tighten above-the-fold copy to one outcome-oriented statement, keep one primary CTA, and add a short “what you get” list.
2. **Card density reduction (P1):** merge adjacent informational cards and reserve high-contrast treatments for decision-critical modules.
3. **Section wayfinding (P1):** add a compact sticky “you are here” navigator for Overview / Signals / Method / FAQ jumps.
4. **Earlier trust cues (P1):** surface concise proof snippets (data cadence, source count, freshness) before long explanatory sections.
5. **Typography rhythm (P2):** increase line-height in dense panels and convert long paragraphs into bullets where possible.
6. **CTA normalization (P1):** align repeated CTA copy/styling to reinforce one primary mobile conversion path.

### Validation metrics to instrument
- Mobile primary CTA click-through rate.
- Bounce rate from first viewport.
- Scroll depth percentiles (25/50/75).
- Section-to-section drop-off.
- Evidence/method interaction rate.

