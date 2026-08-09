# Design debt audit (UI walkthrough + frontend code cross-reference)

Date: 2026-03-04
Scope clicked: `/`, `/evidence`, `/planning`, `/resolve`, `/toolkits`, `/learn`, `/trust` (desktop + mobile). Note: `/start` was retired before this cleanup.

## Priority 0 — Fix immediately

1. **Mobile global nav discoverability is weak (content appears clipped, requires hidden horizontal scroll behavior).**
   - **Why it matters:** On first load, primary destinations look truncated rather than intentionally scrollable, which increases wayfinding friction at the top of every page.
   - **UI evidence:** Mobile captures show only partial visibility of tabs like "Evidence appendix".
   - **Code signals:** The top nav is implemented as a horizontal overflow rail (`overflow-x-auto`, `snap-x`) without an affordance pattern (fade edge, explicit chevron, or progress hint).
   - **Recommendation:** Add explicit horizontal-scroll affordance and active-tab visibility cues; ensure first render makes the pattern self-evident.

### Implementation tracker

| ID | Priority | Item | Suggested owner | Status |
| --- | --- | --- | --- | --- |
| DD-001 | P0 | Mobile global nav scroll affordance | Design + Frontend | Shipped (2026-03-31) |
| DD-002 | P1 | IA taxonomy/nav alignment with canonical hubs | Product + Frontend | Open |
| DD-003 | P1 | Theme toggle accessibility semantics | Frontend | Shipped (2026-04-24) — dynamic `aria-label` + `aria-pressed` already in `themeToggleButton.tsx` |
| DD-004 | P1 | Homepage (`/`) progressive disclosure on mobile | Product + Frontend | Partial (2026-04-25) — delta panel made visually dominant; posture summary stays compact (2-col on mobile); Continuity, Citation, More-paths and revisit deck collapsed via `<details>`. Partial (2026-08-08) — hero score block no longer restates the weekly delta or the boldness caption on mobile; both were duplicated by the headline block a short scroll above (−50px, 3471→3421 at 430w). Remaining: scroll length still long; the posture-summary band itself is not yet collapsed. |
| DD-005 | P2 | Consolidate duplicate CTA patterns on primary pages | Product + Frontend | Shipped for `/` (2026-08-07) — canonical action decided: hero `Copy Brief` is the one-tap primary, header `Export` is the format picker, `StickyCallStrip` is its on-scroll persistence. The duplicate `ShareBriefButton` in `ThreeWhethersCard` was removed. Other primary pages not yet audited. |
| DD-006 | P2 | Improve dark-theme secondary text contrast tokens | Design system + Frontend | Partial (2026-04-25) — bumped `slate-400/500 → slate-300/400` across `WeeklyCallModePanel` (posture summary, continuity steps, trajectory delta) and `HomeWorkspaceBands` (audit/Optional/Open chips, evidence note). System-wide token pass deferred to Phase 2. |
| DD-007 | P3 | Standardize user-facing Evidence/Signals naming | Product + Content | Open — workspace band labels normalised to "Answer one question / Review a past week / Use a tool" (2026-04-25); broader naming sweep pending. |
| DD-008 | P3 | Toolkit search feedback affordances | Frontend | Open |

## Priority 1 — High leverage

2. **Information architecture drift between intended hub model and surfaced navigation labels/routes.**
   - **Why it matters:** Product framing previously emphasized a retired Command Center (`/start`) and clear layer boundaries, but primary nav currently favors `/` + `/evidence` naming and omits several decision surfaces from top-level navigation.
   - **UI evidence:** Header hubs are `Weekly Capital Posture Brief`, `Evidence appendix`, `Operations`, `Resources`, `Reference`.
   - **Code signals:** `primaryNavigation` defines only the five hubs above, while major user journeys also live in `/evidence`, `/resolve`, `/toolkits`, `/learn`, `/trust`.
   - **Recommendation:** Align global navigation taxonomy with IA boundaries and make the homepage weekly path prominence explicit.
   - **Status (2026-08-02):** Largely resolved. Nav order, labels, next-step cues, and report-shell routes now all derive from `lib/navigation/informationArchitecture.ts`; the desktop header shows all five primary hubs (it previously filtered to Brief + Plan via a stale step list).

3. **Theme toggle has stale accessibility labeling and weak mode semantics.**
   - **Why it matters:** Assistive tech users hear an aria label that does not describe current state or next action accurately once toggled.
   - **Code signals:** Toggle button `aria-label` is hardcoded to `"Toggle light mode"` while visible text changes between `Light` and `Dark`.
   - **Recommendation:** Use dynamic `aria-label` or `aria-pressed` semantics (`Switch to light/dark mode`) and include state announcement.

4. **Command Center page is cognitively dense on mobile (long, high-cardinality decision surface).**
   - **Why it matters:** The homepage (`/`) now carries the one-page weekly flow, but on mobile it becomes a long scroll with multiple sections and many equal-weight cards; this dilutes the "5-minute" promise.
   - **UI evidence:** Mobile page length is very high and includes posture, situation chips, and many toolkit cards in one pass.
   - **Code signals:** `/` inlines all posture cards, all situations, and all toolkit definitions in a single page render with limited progressive disclosure.
   - **Recommendation:** Collapse secondary choices behind progressive disclosure (e.g., pick posture → reveal situation subset → reveal 1–3 recommended toolkits).

## Priority 2 — Medium

5. **Primary pages contain repeated CTA patterns that compete for attention.**
   - **Why it matters:** Repeated "copy brief" and action rails can create decision noise, especially on small screens where persistent action bars consume visual priority.
   - **UI evidence:** Home mobile view shows top-level copy CTA and persistent bottom action controls.
   - **Code signals:** Report shell composes primary CTA, command center actions, and mobile action/nav constructs in parallel.
   - **Recommendation:** Reduce to one canonical primary action per viewport context and demote secondary actions into one expandable affordance.

6. **Dark theme contrast hierarchy is subtle for secondary metadata and chip text.**
   - **Why it matters:** Long-form scanning (timestamps, helper text, tertiary labels) is effortful; risk grows in dense data views like `/evidence`.
   - **UI evidence:** Secondary labels and metadata read close to background luminance in several panels.
   - **Code signals:** Heavy reliance on adjacent slate tones (`text-slate-300/400` on dark translucent surfaces).
   - **Recommendation:** Tighten color token contrast for helper text and metadata; run targeted contrast audits for core panel primitives.

## Priority 3 — Opportunistic cleanup

7. **Inconsistent naming between "Evidence" and "Signals" concepts across routes and copy.**
   - **Why it matters:** The same conceptual layer is referred to by multiple labels, increasing comprehension cost for returning users.
   - **Code signals:** Navigation and page-link icon maps include both `Evidence appendix` and `Evidence` labels while route-level user journeys also refer to `/evidence`.
   - **Recommendation:** Standardize one user-facing term and map legacy aliases only as redirects/metadata, not visible nav labels.

8. **Search/filter UX on Toolkits is functional but low-feedback.**
   - **Why it matters:** Users submit a full form request for simple filtering, with minimal assistive affordances like highlighted matches, quick facets, or saved intents.
   - **Code signals:** `/toolkits` uses server-rendered query filtering through a search form and plain results grid.
   - **Recommendation:** Keep server filtering but add lightweight client-side affordances (suggested intents, active-query chips, result counts near input).
