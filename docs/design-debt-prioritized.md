# Design debt audit (UI walkthrough + frontend code cross-reference)

Date: 2026-03-04
Scope clicked: `/`, `/start`, `/signals`, `/operations`, `/decide`, `/toolkits`, `/learn`, `/method` (desktop + mobile)

## Priority 0 — Fix immediately

1. **Mobile global nav discoverability is weak (content appears clipped, requires hidden horizontal scroll behavior).**
   - **Why it matters:** On first load, primary destinations look truncated rather than intentionally scrollable, which increases wayfinding friction at the top of every page.
   - **UI evidence:** Mobile captures show only partial visibility of tabs like "Evidence appendix".
   - **Code signals:** The top nav is implemented as a horizontal overflow rail (`overflow-x-auto`, `snap-x`) without an affordance pattern (fade edge, explicit chevron, or progress hint).
   - **Recommendation:** Add explicit horizontal-scroll affordance and active-tab visibility cues; ensure first render makes the pattern self-evident.

## Priority 1 — High leverage

2. **Information architecture drift between intended hub model and surfaced navigation labels/routes.**
   - **Why it matters:** Product framing emphasizes Command Center (`/start`) and clear layer boundaries, but primary nav currently favors `/` + `/evidence` naming and omits several decision surfaces from top-level navigation.
   - **UI evidence:** Header hubs are `Weekly Capital Posture Brief`, `Evidence appendix`, `Operations`, `Resources`, `Reference`.
   - **Code signals:** `primaryNavigation` defines only the five hubs above, while major user journeys also live in `/start`, `/signals`, `/decide`, `/toolkits`, `/learn`, `/method`.
   - **Recommendation:** Align global navigation taxonomy with IA boundaries and make "start path" prominence explicit.

3. **Theme toggle has stale accessibility labeling and weak mode semantics.**
   - **Why it matters:** Assistive tech users hear an aria label that does not describe current state or next action accurately once toggled.
   - **Code signals:** Toggle button `aria-label` is hardcoded to `"Toggle light mode"` while visible text changes between `Light` and `Dark`.
   - **Recommendation:** Use dynamic `aria-label` or `aria-pressed` semantics (`Switch to light/dark mode`) and include state announcement.

4. **Command Center page is cognitively dense on mobile (long, high-cardinality decision surface).**
   - **Why it matters:** `/start` is positioned as the one-page weekly flow, but on mobile it becomes a long scroll with multiple sections and many equal-weight cards; this dilutes the "5-minute" promise.
   - **UI evidence:** Mobile page length is very high and includes posture, situation chips, and many toolkit cards in one pass.
   - **Code signals:** `/start` inlines all posture cards, all situations, and all toolkit definitions in a single page render with limited progressive disclosure.
   - **Recommendation:** Collapse secondary choices behind progressive disclosure (e.g., pick posture → reveal situation subset → reveal 1–3 recommended toolkits).

## Priority 2 — Medium

5. **Primary pages contain repeated CTA patterns that compete for attention.**
   - **Why it matters:** Repeated "copy brief" and action rails can create decision noise, especially on small screens where persistent action bars consume visual priority.
   - **UI evidence:** Home mobile view shows top-level copy CTA and persistent bottom action controls.
   - **Code signals:** Report shell composes primary CTA, command center actions, and mobile action/nav constructs in parallel.
   - **Recommendation:** Reduce to one canonical primary action per viewport context and demote secondary actions into one expandable affordance.

6. **Dark theme contrast hierarchy is subtle for secondary metadata and chip text.**
   - **Why it matters:** Long-form scanning (timestamps, helper text, tertiary labels) is effortful; risk grows in dense data views like `/signals`.
   - **UI evidence:** Secondary labels and metadata read close to background luminance in several panels.
   - **Code signals:** Heavy reliance on adjacent slate tones (`text-slate-300/400` on dark translucent surfaces).
   - **Recommendation:** Tighten color token contrast for helper text and metadata; run targeted contrast audits for core panel primitives.

## Priority 3 — Opportunistic cleanup

7. **Inconsistent naming between "Evidence" and "Signals" concepts across routes and copy.**
   - **Why it matters:** The same conceptual layer is referred to by multiple labels, increasing comprehension cost for returning users.
   - **Code signals:** Navigation and page-link icon maps include both `Evidence appendix` and `Evidence` labels while route-level user journeys also refer to `/signals`.
   - **Recommendation:** Standardize one user-facing term and map legacy aliases only as redirects/metadata, not visible nav labels.

8. **Search/filter UX on Toolkits is functional but low-feedback.**
   - **Why it matters:** Users submit a full form request for simple filtering, with minimal assistive affordances like highlighted matches, quick facets, or saved intents.
   - **Code signals:** `/toolkits` uses server-rendered query filtering through a search form and plain results grid.
   - **Recommendation:** Keep server filtering but add lightweight client-side affordances (suggested intents, active-query chips, result counts near input).

