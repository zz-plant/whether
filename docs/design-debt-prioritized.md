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
| DD-004 | P1 | Homepage (`/`) progressive disclosure on mobile | Product + Frontend | Partial (2026-04-25) — delta panel made visually dominant; posture summary stays compact (2-col on mobile); Continuity, Citation, More-paths and revisit deck collapsed via `<details>`. Partial (2026-08-08) — hero score block no longer restates the weekly delta or the boldness caption on mobile; both were duplicated by the headline block a short scroll above. Partial (2026-08-11) — hero signal readout collapses on <640px to a one-line summary via pure-CSS `<details>` disclosure. Partial (2026-08-29) — shipped `ThresholdProximityBar` (replaces buried threshold microtext with a visual bar), role lens filter tabs on the bounded-decision ledger (reduces cognitive load per scan), `CopySlackBriefButton` and `PresentModeButton` as hero primary actions (reduces need to scroll to action rails), `DeveloperQuickAccess` popover (collapses API/MCP info behind a chip), and command palette quick-actions (`Cmd+K`). Superseded in part (2026-09-03) — `ThresholdProximityBar` removed: it encoded the buffer as a fill against an unstated 30-point reference and restated the counter beside it. The Watch-this-week block now draws one `ThresholdLadder` per composite signal (reading, guardrail, clears-when, and the span where neither fires), and the risk-appetite cell got the rail funding pressure already had so the pair reads as small multiples. Closed (2026-09-15) by the sitewide declutter (`docs/feature-specs-current.md` §1.1.17): `/` phone 6,352 → 3,718 px and desktop 4,838 → 2,976 px on the same day's data, with the call, score and delta inside the first 430×932 viewport; what remains is one of each thing. |
| DD-005 | P2 | Consolidate duplicate CTA patterns on primary pages | Product + Frontend | Shipped (2026-08-07) — canonical action on `/`: hero `Copy Brief` is the one-tap primary, header `Export` is the format picker, `StickyCallStrip` is its on-scroll persistence. Duplicate `ShareBriefButton` in `ThreeWhethersCard` removed. All five primary routes then swept for repeated copy/controls — see DD-009. |
| DD-009 | P2 | Cross-route duplication sweep (`/`, `/signals`, `/operate`, `/answer`, `/trust`) | Frontend | Shipped (2026-08-07) — audited each route for repeated leaf text, repeated headings, and duplicate controls. Fixed: `/trust` disclaimer sentence printed twice in one paragraph; `/trust` Sources card header concatenating the two status labels its own list itemizes; `/signals` per-item boilerplate repeated 3× inside a `.map()`; `/signals` second copy of the short-vs-deep explanation at page end (kept the CTA, dropped the restated rationale); 17× visible "Select to expand or collapse" on glossary rows; `/operate` step label/title/description restated by nested `ReportSection`s and by the checklist. `/operate` 5386→4994px, `/signals` 6398→6200px. Not a defect: `/trust`'s high heading count is glossary content inside a closed `<details>`; `/operate`'s "Raw summary text" duplication is a deliberate copyable artifact behind a disclosure. |
| DD-006 | P2 | Improve dark-theme secondary text contrast tokens | Design system + Frontend | Shipped (2026-08-11) — system-wide token pass in `app/styles/tokens.css`: `--app-text-muted #94a3b8 → #a7b3c4`, `--app-text-secondary #cbd5e1 → #d7dee8` (574 `text-slate-400/500` call sites alias to these), border alphas 0.065/0.085/0.14 → 0.10/0.13/0.19, surface ladder widened (panel/surface/raised `#13161b`/`#181b21`/`#1f232a`), and a dark-theme floor remapping `text-white/30–55` (the /40 tier measured ~3.7:1, under AA) to the muted role. Light theme verified unaffected. See "Contrast & mobile compression pass (2026-08-11)" in `docs/one-screen-weekly-brief-spec.md`. |
| DD-007 | P3 | Standardize user-facing Evidence/Signals naming | Product + Content | Shipped (2026-08-11) — canonical labels (Weekly Brief / Evidence / Plan / Resolve / Trust) all derive from `lib/navigation/informationArchitecture.ts`; swept for stragglers and fixed the last two: structured-data description "Evidence" → "Evidence" (`app/signals/evidencePageModel.ts`) and the `/signals` curve-context heading "…the full appendix" → "…the deeper evidence" (matches the page's own Short read / Deeper evidence terms). No user-facing "Signals" labels remain. |
| DD-008 | P3 | Toolkit search feedback affordances | Frontend | Shipped (2026-08-11) — the audit predates the toolkit library's move into `/answer` (`app/answer/components/toolkitLibraryPanels.tsx`), which already implements the recommendation: result count beside the input, suggested-intent chips, active-query Clear affordance, and an empty state with closest-match and recovery links. Verified live; internal links also updated `/resolve# → /answer#` to skip the 308 redirect hop. |
| DD-010 | P2 | Shape register: one badge shape, one control shape, containers off the control radius | Design system + Frontend | Shipped (2026-09-02) — `docs/agents/ui-ux-standards.md` §XIV; radius roles in `app/styles/tokens.css` (`xl` 8→10px, `2xl` 12→16px); 22 pill badges and control overrides normalized; `tests/shapeRegister.test.ts` guards it. |
| DD-020 | P1 | Sitewide restatement: the same fact printed on several bands of one page, and shell props no route rendered | Product + Frontend | Shipped (2026-09-15) — `docs/feature-specs-current.md` §1.1.17. One stage control, one timeline, one plan CTA and one index per page; one header band on every route; the report shell lost the fourteen props it never rendered and four dead components; `/signals` gave the operating call and the role translation back to the routes that own them. Measured the same day: `/` 4,838 → 2,976 px desktop, 6,352 → 3,718 px phone; `/signals` 4,989 → 3,856 / 7,836 → 6,065; `/operate` 3,883 → 3,338 / 5,418 → 4,552. Guarded by `tests/homeRouteDecisionTransmissionContract.test.tsx`, `tests/pageConsolidation.test.tsx`, `tests/reportShellSections.test.tsx`, `tests/planningCliPage.test.tsx`. |
| DD-028 | P2 | Section labels in tracked capitals across the site | Design system + Frontend | Shipped (2026-09-23) — `.type-eyebrow` (157 call sites) is sentence case at 0.01em, the change its own stylesheet comment set aside for doing once. Nine hand-rolled capital labels (`decisionRecordPanel`, `evidenceInstruments`, `/concepts`, `decisionShieldPlanModes`, `/toolkits/[slug]`) moved onto the class, and the phone table's `data-label` captions dropped their capitals. Capitals stay on stamps only. Five links lost caps tracking. Rules in `docs/agents/ui-ux-standards.md` §XVIII; guarded by `tests/typeRegister.test.tsx`. **Finished 2026-09-23:** the first pass left every inline link in capitals — `ActionLink`'s `inline` variant carried `.type-badge`, the stamp class — and 60-odd sentence-case labels, buttons and summaries across 25 files still spelled out 0.08–0.16em tracking inline, as did `.weather-cta`, `.weather-data-mode`, the chip base, `.weather-hub-chip`, `.weather-tag` and the skip link. All are sentence-spaced now; the test fails on tracking without capitals in `app/` or `app/styles`, and on a badge class in `ActionLink`. Out of scope, deliberately: the OG cards, the weekly email and the slide export, which are other media with their own register. |
| DD-029 | P2 | `/operate` weekly plan: boxed, colour-headed guidance cards, bordered Done buttons, pill switcher | Product + Frontend | Shipped (2026-09-23). Spec corrected first: the guidance block is the only statement of the call on `/operate`, so it stays; what changed is its form. Three bordered cards with sky/amber/violet capital headings under "This week's guidance · Read this first." are one `<dl>`. The five Done controls keep their 44px target and saved state and lose the button frame and tracking. The workstream switcher's monospace "Workstream:" label and three pills are an underlined tab row, and its Suspense skeleton — a panel of four card blocks, several times the row's height — now shares the row's classes (`workstreamNavLayout.ts`). |
| DD-030 | P2 | Score-ladder tick labels stacked three rows deep | Frontend | Shipped (2026-09-23). Ticks carry the number only; a key under the track names each line in tick order. Label layout is computed for both widths a ladder is drawn at (224px and 448px) and a container query picks one, so the common 66/70/76 lines sit on one row on a desktop track and two in the homepage column. Correction to the earlier record: the stacking was not only label length — the layout was computed for 224px and applied at every width. Guarded by `tests/visualPrimitives.test.tsx`. |
| DD-031 | P1 | Mobile reading order inversion between WhatChangedSection and WhatItChangesSection | Design + Frontend | Shipped (2026-09-24) — Standardized DOM and visual order (`order-2` for changed signals → `order-3` for consequences), eliminating mobile CSS flex reversal (`order-3 md:order-2` vs `order-2 md:order-3`). Resolves WCAG 1.3.2 tab order conflicts and enforces Hard Rule #1 (Delta First). Compacted changed-signals table headers by inlining scale notes. Guarded by `tests/homeRouteDecisionTransmissionContract.test.tsx`. |
| DD-032 | P1 | Planning rule list expansion state loss on Back/Forward and missing URL determinism | Frontend | Shipped (2026-09-24) — Implemented instant client toggle (<16ms) for "Top 3 rules" vs "Show all rules" with `window.history.pushState` and `popstate` listening, so `?actions=all` is shareable and browser Back/Forward restores the list state without reloading the page. Guarded by `tests/expansionControlsRendering.test.ts`. |
| DD-033 | P2 | Answer page action-before-comprehension layout defect | Design + Frontend | Shipped (2026-09-24) — Reordered section flow on `/answers/*` so full-width `headings.copy` ("Copy this answer") sits after the bounded rules and threshold lines rather than above them. Added a quick-copy CTA to `SecondaryPageHeader`'s `actions` slot for power users, reconciling 60s transmission with cognitive reading order. |

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

## Frontend cleanup pass (2026-09-02)

Answers the "what needs a redesign / refactor" audit. Each item was measured before it was
changed, and the numbers below are the measured ones.

| ID | Item | Status |
| --- | --- | --- |
| DD-011 | Lint backlog switched off at the oxlint swap | Shipped — `no-unused-vars` (84), every `jsx-a11y` rule (50), `no-useless-escape` (12), `no-extra-boolean-cast` (3), `no-useless-rename` (2), `unicorn/no-useless-fallback-in-spread` (1) all fixed to zero and **enforced**. Remaining rules and counts are listed in CLAUDE.md → Toolchain notes. |
| DD-012 | Dead CSS in the custom layer | Shipped — 41 of 138 `weather-*` classes were defined but never rendered. 321 lines removed across 9 stylesheets. Verified inert: 14 routes were crawled and none references a removed class. `@keyframes weather-stream-reveal` was kept, since live rules still animate it. |
| DD-013 | `/mockups` served in production | Shipped — `app/mockups/layout.tsx` calls `notFound()` unless `NODE_ENV !== "production"` or `WHETHER_ENABLE_MOCKUPS=1`, which `wrangler.toml` sets on the preview lane only. Four routes were publicly reachable; they were `noindex` but still served. No inbound links existed. |
| DD-014 | No file-size budget on product code | Shipped — `max-lines` enforced at 800 effective lines across `app/**` and `lib/**`. Deliberately not applied to `scripts/**` or `tests/**`. Nine files sit between 500 and 800; **500 is the ratchet target**. |
| DD-015 | `exportBriefPanel.tsx` at 940 lines | Partial — down to 780. The two builders defined inside the component moved to `lib/export/issueTrackerBrief.ts`, and the twenty inline `useMemo` derivations became one pure `buildExportBriefArtifacts()` in `lib/export/exportBriefArtifacts.ts`. Both are now covered by 14 tests that could not exist before, because the panel only renders once its planning step is opened. Jira and Linear were computing byte-identical markdown twice; that is one value now. **Closed 2026-09-08 — 650 effective lines.** The sibling blocks were the wrong seam; the repeated ones were. `app/operate/components/exportBriefFields.tsx` now owns the two-column `ExportTargetGrid`, the read-only `ExportPreviewPane` (written out twice), the `ExportDownloadButton` (written out nine times, each repeating the same forty-character class string), and the four-field override form, whose four `useState` hooks collapsed to one `OverrideDraft`. |
| DD-016 | `decisionShieldPanel.tsx` at 819 lines, 12 `useState` + 6 `useEffect` | Not started — the heaviest stateful component in the app. Needs its form state extracted to a hook before the JSX can be split. |
| DD-017 | `ReportShell` has two public APIs | Not started — it accepts both a grouped `model` object and 42 flat props, and `normalizeReportShellInput` merges them. Four callers already pass `model`; three (`/answer`, `/signals`, `/trust`) pass flat props. Migrating those three would let the flat branch and its type be deleted. |
| DD-018 | `react/set-state-in-effect` (26 findings) | Not started — a real React anti-pattern, but each case needs judgment about where the state should be derived instead. Not safe to bulk-fix. |
| DD-019 | Component naming split in `app/components` | Not started, and deliberately so — 102 files sit flat in one directory, 25 PascalCase and 62 camelCase. Renaming is a large diff for a cosmetic gain and would collide with every in-flight branch. Worth doing as its own commit when the tree is quiet, not folded into a behavioural change. |

### ARIA patterns that keep a scoped lint exemption

`jsx-a11y/prefer-tag-over-role` is enforced everywhere except three files, each because the
suggested native tag cannot carry the pattern:

- `TimelineBar.tsx` — `role="slider"` over a segmented colour track. `<input type="range">` cannot
  render the coloured month segments. The arrow/Home/End handler moved off the wrapper onto the
  slider itself, which is what those keys actually drive, and the wrapper became a `<section>`.
- `scrollProgressBar.tsx` — `role="progressbar"`. A `<progress>` rewrite was tried and reverted:
  it depends on `::-webkit-progress-value` / `::-moz-progress-bar` styling that could not be
  verified in this environment, and it dropped the width transition. The ARIA form works today.
- `AppSidebar.tsx` — `role="dialog"`. A real `<dialog open>` is *non-modal*: no focus trap, no
  inertness. It would not make the existing `aria-modal` claim any truer, and it brings UA sizing
  and background that have to be neutralised. The backdrop did become a real `<button>`, so it is
  now keyboard-closable.

`app/signals/components/evidenceSections.tsx` keeps no exemption: its `role="radio"` buttons
became native radios inside labels, because the old markup left **both** options in the tab order
when a radiogroup owes one tab stop plus arrow keys. Selection uses `router.replace`, not `push`,
so arrowing between reading depths does not fill the history stack.
