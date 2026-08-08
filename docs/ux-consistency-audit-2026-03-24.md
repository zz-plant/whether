# UX Consistency Opportunities (Operations + Method)

Date: 2026-03-24  
Scope reviewed: `/planning`, `/trust` mobile captures plus shared shell components.

## Why this matters

Whether’s core loop is **signals → posture → decision → artifact**. Inconsistent shells and interaction patterns make the decision artifact feel fragmented, which slows scan speed and weakens shareability.

## Priority opportunities

### 1) Unify top-of-page shell hierarchy across report surfaces (High)
- **Observed drift**
  - `/planning` uses `ReportShell` + `ReportShellHeader` with status chip, page nav, and stat cards.
  - `/trust` uses `HubPageShell` + `HubHero` and then separate breadcrumb/hero stack.
  - Mobile screenshots show visibly different top structures, spacing rhythm, and control grouping for pages that are both in the primary operating loop.
- **Risk to decision transmission**
  - Users must re-learn page framing and where to find trust/status metadata.
- **Recommendation**
  - Define one canonical “surface header contract” with fixed slots: brand, posture chip, freshness/record date, page-level actions, and section nav.
  - Either: (a) migrate Method onto a `ReportShell` variant, or (b) extract a shared super-header consumed by both shells.

### 2) Standardize primary action model in the hero band (High)
- **Observed drift**
  - `/planning` top controls emphasize route tabs and a single full-width search affordance.
  - `/trust` hero shows two side-by-side buttons (`SEARCH`, `LIGHT`) plus a horizontal section rail.
- **Risk**
  - Action priority is unclear because button semantics and hierarchy differ by page.
- **Recommendation**
  - Create a shared action taxonomy (`primary`, `secondary`, `mode toggle`, `section navigation`) and enforce ordering and button tokens across all shells.
  - Keep one dominant CTA per page at mobile widths.

### 3) Align navigation paradigms (tabs vs chips vs breadcrumb) (High)
- **Observed drift**
  - `/planning`: dense pill tabs near the top and no breadcrumb visible in the same band.
  - `/trust`: breadcrumb appears below hero and section chips are horizontally scrollable with “SWIPE FOR MORE SECTIONS.”
- **Risk**
  - Mixed paradigms increase orientation cost and reduce confidence in where the user is in the system.
- **Recommendation**
  - Adopt one navigation stack pattern for report surfaces:
    1. route-level nav,
    2. optional section rail,
    3. breadcrumb only when needed for SEO/deep hierarchy pages.
  - Move breadcrumb placement to a consistent slot (either above hero or below page nav everywhere).

### 4) Normalize status metadata presentation (High)
- **Observed drift**
  - “Signals updated” and “Record date” are shown as stat cards in `/planning` header.
  - `/trust` places trust/freshness values inside hero stats and body cards with different phrasing and visual weight.
- **Risk**
  - Temporal trust data is harder to compare across pages.
- **Recommendation**
  - Create a shared metadata component for freshness, effective date, and confidence that can render in compact/expanded variants but preserves labels, order, and typography.

### 5) Consolidate typography scale + heading rhythm (Medium)
- **Observed drift**
  - `/trust` hero uses a very large headline style.
  - `/planning` emphasizes uppercase labels and medium-sized utility copy in the shell.
- **Risk**
  - Hierarchy feels like different products; scannability drops when moving page-to-page.
- **Recommendation**
  - Define cross-surface mobile type ramps (H1/H2/body/meta/caps) and cap max headline size for operational hubs to keep one-screen artifact readability.

### 6) Make control width behavior consistent on mobile (Medium)
- **Observed drift**
  - `/planning` search button spans full width.
  - `/trust` top actions are half-width side-by-side pills.
- **Risk**
  - Tap-target expectations differ and primary action salience becomes inconsistent.
- **Recommendation**
  - Use a single mobile rule: primary controls full-width; secondary controls wrap below or align in a consistent two-column pattern with fixed intent.

### 7) Reduce duplicated “brand block” variants (Medium)
- **Observed drift**
  - Multiple logo/title badge compositions appear across pages (e.g., `WHETHER` capsule with different adjacent labels/spacing).
- **Risk**
  - Visual identity feels unstable and introduces maintenance overhead.
- **Recommendation**
  - Publish one reusable brand+surface identity component with variants only for density (`compact`, `standard`) and not custom per route.

### 8) Harmonize card corner radius, border contrast, and spacing tokens (Medium)
- **Observed drift**
  - Card families and pills in screenshots show close-but-not-identical border contrasts and corner styles between routes.
- **Risk**
  - Perceptual inconsistency and reduced polish on share screenshots.
- **Recommendation**
  - Introduce tokenized “surface tiers” (hero panel, stat card, nav pill, utility pill) and map each component class to those tiers.

### 9) Standardize copy casing and microcopy intent on controls (Low)
- **Observed drift**
  - Control labels vary between all-caps utility tone and sentence/title case in nearby regions.
- **Risk**
  - Inconsistent voice and weaker action clarity.
- **Recommendation**
  - Set a style rule: navigation pills uppercase; action buttons title case; support labels sentence case.

### 10) Add a consistency QA gate for shell-level UX (Low)
- **Observed drift**
  - Two mature top-level routes ship with divergent shell logic and interaction grammar.
- **Risk**
  - Drift continues with each new route/feature.
- **Recommendation**
  - Add a lightweight design QA checklist to PRs touching top-level pages:
    - header slot contract unchanged
    - one primary CTA at mobile
    - metadata labels/order consistent
    - nav stack order consistent
    - screenshot diff included for mobile.

## Suggested implementation sequence

1. Define canonical header/action/nav contracts in shared shell primitives.
2. Migrate `/trust` and `/planning` to the same contract before further surface expansion.
3. Tokenize typography/surface tiers and replace ad-hoc classes.
4. Add route-level visual regression snapshots for key mobile breakpoints.

## Implementation progress (updated 2026-03-24)

- ✅ Method hero now uses stacked-mobile action layout with a dominant primary CTA.
- ✅ Method hero stats now use report-style stat cards and normalized labels/order (`Posture`, `Signals updated`, `Record date`).
- ✅ Global header controls now follow consistent mobile width behavior for Search + theme toggle.
- ✅ Method now uses `ReportShell` directly for full top-shell parity (header, trust rail, command bar, nav, and section index behavior aligned with report surfaces).
- ✅ (2026-08-08) **#5 typography scale.** `typography.css` aliased `.text-fluid-xs` to `--fs-micro`, so the two most-used steps in the app (401 usages combined) rendered at the same size and small text had no hierarchy. `xs` now has its own step and the `lg`/`xl`/`2xl` end was widened — the ladder is 11/12/13/14/15/17/20/24px instead of collapsing into 11–20px. The `--fs-*` scale and the `--text-fluid-*` copy in `@theme` are now mirrored, with a note that they must stay in step.
- ✅ (2026-08-08) **#8 card corner radius.** `--radius-*` was defined twice — a hand-authored 2/3/4/6px scale in `:root` and a `calc(var(--radius) * n)` chain in `@theme inline`. The utilities took the second, so all 538 `rounded-*` usages landed between 2.4px and 7.2px (and `rounded-3xl` resolved to 0px). Both definitions now share one 2/4/6/8/12px scale, so the steps are actually distinguishable while staying angular.
- ⏳ Remaining high-priority work: replace remaining `HubSection` blocks on Method with report-native section wrappers if we want complete visual grammar parity inside body content.
- ⏳ **#3 navigation paradigms** is still open and is the one item here that is a product decision rather than a styling fix: the global header carries two full bands (109px) because the cadence chips, lens chips, and primary nav all live in it. Container padding was tightened, but collapsing the bands means deciding whether the lens chips belong in global chrome at all.

## Reference code areas

- `app/components/reportShell.tsx`
- `app/components/reportShellHeader.tsx`
- `app/components/hubPageShell.tsx`
- `app/planning/page.tsx`
- `app/trust/page.tsx`
