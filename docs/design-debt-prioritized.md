# Design debt audit (UI walkthrough + frontend code cross-reference)

Date: 2026-03-04
Scope clicked: `/`, `/evidence`, `/planning`, `/resolve`, `/toolkits`, `/learn`, `/trust` (desktop + mobile). Note: `/start` was retired before this cleanup.

## Priority 0 — Fix immediately

1. **Mobile global nav discoverability is weak (content appears clipped, requires hidden horizontal scroll behavior).**
   - **Why it matters:** On first load, primary destinations look truncated rather than intentionally scrollable, which increases wayfinding friction at the top of every page.
   - **UI evidence:** Mobile captures show only partial visibility of tabs like "Evidence".
   - **Code signals:** The top nav is implemented as a horizontal overflow rail (`overflow-x-auto`, `snap-x`) without an affordance pattern (fade edge, explicit chevron, or progress hint).
   - **Recommendation:** Add explicit horizontal-scroll affordance and active-tab visibility cues; ensure first render makes the pattern self-evident.

### Implementation tracker

| ID | Priority | Item | Suggested owner | Status |
| --- | --- | --- | --- | --- |
| DD-001 | P0 | Mobile global nav scroll affordance | Design + Frontend | Shipped (2026-03-31) |
| DD-002 | P1 | IA taxonomy/nav alignment with canonical hubs | Product + Frontend | Shipped (2026-08-02) — see item 2 status note below; tracker row was stale. |
| DD-003 | P1 | Theme toggle accessibility semantics | Frontend | Shipped (2026-04-24) — dynamic `aria-label` + `aria-pressed` already in `themeToggleButton.tsx` |
| DD-004 | P1 | Homepage (`/`) progressive disclosure on mobile | Product + Frontend | Partial (2026-04-25) — delta panel made visually dominant; posture summary stays compact (2-col on mobile); Continuity, Citation, More-paths and revisit deck collapsed via `<details>`. Partial (2026-08-08) — hero score block no longer restates the weekly delta or the boldness caption on mobile; both were duplicated by the headline block a short scroll above. Partial (2026-08-11) — hero signal readout collapses on <640px to a one-line summary via pure-CSS `<details>` disclosure. Partial (2026-08-29) — shipped `ThresholdProximityBar` (replaces buried threshold microtext with a visual bar), role lens filter tabs on the bounded-decision ledger (reduces cognitive load per scan), `CopySlackBriefButton` and `PresentModeButton` as hero primary actions (reduces need to scroll to action rails), `DeveloperQuickAccess` popover (collapses API/MCP info behind a chip), and command palette quick-actions (`Cmd+K`). Remaining: overall scroll length on mobile. |
| DD-005 | P2 | Consolidate duplicate CTA patterns on primary pages | Product + Frontend | Shipped (2026-08-07) — canonical action on `/`: hero `Copy Brief` is the one-tap primary, header `Export` is the format picker, `StickyCallStrip` is its on-scroll persistence. Duplicate `ShareBriefButton` in `ThreeWhethersCard` removed. All five primary routes then swept for repeated copy/controls — see DD-009. |
| DD-009 | P2 | Cross-route duplication sweep (`/`, `/signals`, `/operate`, `/answer`, `/trust`) | Frontend | Shipped (2026-08-07) — audited each route for repeated leaf text, repeated headings, and duplicate controls. Fixed: `/trust` disclaimer sentence printed twice in one paragraph; `/trust` Sources card header concatenating the two status labels its own list itemizes; `/signals` per-item boilerplate repeated 3× inside a `.map()`; `/signals` second copy of the short-vs-deep explanation at page end (kept the CTA, dropped the restated rationale); 17× visible "Select to expand or collapse" on glossary rows; `/operate` step label/title/description restated by nested `ReportSection`s and by the checklist. `/operate` 5386→4994px, `/signals` 6398→6200px. Not a defect: `/trust`'s high heading count is glossary content inside a closed `<details>`; `/operate`'s "Raw summary text" duplication is a deliberate copyable artifact behind a disclosure. |
| DD-006 | P2 | Improve dark-theme secondary text contrast tokens | Design system + Frontend | Shipped (2026-08-11) — system-wide token pass in `app/styles/tokens.css`: `--app-text-muted #94a3b8 → #a7b3c4`, `--app-text-secondary #cbd5e1 → #d7dee8` (574 `text-slate-400/500` call sites alias to these), border alphas 0.065/0.085/0.14 → 0.10/0.13/0.19, surface ladder widened (panel/surface/raised `#13161b`/`#181b21`/`#1f232a`), and a dark-theme floor remapping `text-white/30–55` (the /40 tier measured ~3.7:1, under AA) to the muted role. Light theme verified unaffected. See "Contrast & mobile compression pass (2026-08-11)" in `docs/one-screen-weekly-brief-spec.md`. |
| DD-007 | P3 | Standardize user-facing Evidence/Signals naming | Product + Content | Shipped (2026-08-11) — canonical labels (Weekly Brief / Evidence / Plan / Resolve / Trust) all derive from `lib/navigation/informationArchitecture.ts`; swept for stragglers and fixed the last two: structured-data description "Evidence" → "Evidence" (`app/signals/evidencePageModel.ts`) and the `/signals` curve-context heading "…the full appendix" → "…the deeper evidence" (matches the page's own Short read / Deeper evidence terms). No user-facing "Signals" labels remain. |
| DD-008 | P3 | Toolkit search feedback affordances | Frontend | Shipped (2026-08-11) — the audit predates the toolkit library's move into `/answer` (`app/answer/components/toolkitLibraryPanels.tsx`), which already implements the recommendation: result count beside the input, suggested-intent chips, active-query Clear affordance, and an empty state with closest-match and recovery links. Verified live; internal links also updated `/resolve# → /answer#` to skip the 308 redirect hop. |

## Priority 1 — High leverage

2. **Information architecture drift between intended hub model and surfaced navigation labels/routes.**
   - **Why it matters:** Product framing previously emphasized a retired Command Center (`/start`) and clear layer boundaries, but primary nav currently favors `/` + `/evidence` naming and omits several decision surfaces from top-level navigation.
   - **UI evidence:** Header hubs are `Weekly Capital Posture Brief`, `Evidence`, `Operations`, `Resources`, `Reference`.
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
   - **Code signals:** Navigation and page-link icon maps include both `Evidence` and `Evidence` labels while route-level user journeys also refer to `/evidence`.
   - **Recommendation:** Standardize one user-facing term and map legacy aliases only as redirects/metadata, not visible nav labels.

8. **Search/filter UX on Toolkits is functional but low-feedback.**
   - **Why it matters:** Users submit a full form request for simple filtering, with minimal assistive affordances like highlighted matches, quick facets, or saved intents.
   - **Code signals:** `/toolkits` uses server-rendered query filtering through a search form and plain results grid.
   - **Recommendation:** Keep server filtering but add lightweight client-side affordances (suggested intents, active-query chips, result counts near input).
