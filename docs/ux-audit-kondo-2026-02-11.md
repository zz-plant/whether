# UX audit — Kondo pass (remove, move, modify)

Date: 2026-02-11  
Audited surfaces: `/`, `/signals`, `/operations`, `/onboarding`  
Viewports: desktop (1440×900) and mobile (390×844)

## Audit framing
This pass uses a Marie Kondo-inspired lens for product UX:
- **Remove** what creates noise without adding decision confidence.
- **Move** what is useful but in the wrong place or wrong sequence.
- **Modify** what is directionally right but too heavy, repetitive, or unclear.
- **Keep** what already helps users orient and act.

## What already “sparks joy” (keep)
1. **High trust visual system** — the interface feels cohesive, premium, and intentional across routes.
2. **Clear macro-to-action narrative** — page titles and subheads tie market state to operator action.
3. **Consistent shell scaffolding** — command center and section cards create predictable scanning behavior.
4. **Strong CTA language** — labels like “Start here,” “Open live data feed,” and “Review monthly actions” are action-oriented.

## Remove (declutter)

### 1) Duplicate CTA clusters in the hero/shell
**Observed issue:** Primary action groups repeat in multiple zones (top-right shell actions, hero CTAs, command center list), which dilutes priority and increases “which button is canonical?” hesitation.  
**User cost:** Choice overload and slower first click.

**Recommendation:**
- Keep one **primary CTA** and one **secondary CTA** in the hero.
- Demote all additional siblings to lightweight text links in a “More actions” disclosure.

### 2) Non-critical status chips from first viewport on mobile
**Observed issue:** Status chips (“Cached”, date, fallback mode) consume prime vertical and horizontal real estate where the first action should dominate.  
**User cost:** Early cognitive load before task intent is established.

**Recommendation:**
- Collapse status chips into a single compact “Data status” row with tap-to-expand details.
- Show fallback mode inline only when severity warrants interruption.

### 3) Repeated cross-page links in command center
**Observed issue:** The same destinations appear repeatedly across playbook/pages/sections columns.  
**User cost:** Visual repetition without incremental value.

**Recommendation:**
- Deduplicate by showing each destination once with tags (e.g., `page`, `section`) instead of separate repeated lists.

## Move (re-sequence for flow)

### 1) Move “confidence/fallback” context next to affected actions
**Observed issue:** Confidence panel is visually separated from key CTA choices, forcing users to mentally reconcile risk and action.  
**User cost:** Extra interpretation steps during high-stakes decisions.

**Recommendation:**
- Keep confidence summary near the top, but attach actionable guidance directly under the primary CTA (e.g., “In fallback mode: validate live feed before exporting brief”).

### 2) Move advanced navigation controls below “first action” strip
**Observed issue:** Dense filters and nav pills appear before a clear guided path for first-time/returning users.  
**User cost:** Users must self-assemble journey order.

**Recommendation:**
- Add a pinned “First action” strip at top of content.
- Place advanced filters (`All/Playbook/Pages/Sections`) below this strip.

### 3) Move low-frequency actions out of immediate tap zone on mobile
**Observed issue:** Some secondary links crowd the same band as high-value buttons, creating accidental attention competition.  
**User cost:** Slower task completion and more scroll friction.

**Recommendation:**
- Keep only one dominant button in first mobile action row.
- Relocate tertiary actions into an overflow bottom sheet (“More actions”).

## Modify (refine what works)

### 1) Fix mobile horizontal overflow/truncation in CTA rows (P0)
**Observed issue:** On `/signals` and `/operations`, CTA labels extend beyond viewport bounds and clip.  
**User cost:** Reduced readability, uncertain tap targets, and perceived instability.

**Recommendation:**
- Convert CTA rows to responsive stacked layout on mobile (`1-up` primary button + vertical secondary links).
- Enforce `max-width: 100%`, wrapping rules, and no overflow for button text.

### 2) Increase hierarchy contrast between orientation and execution layers
**Observed issue:** Hero copy, status context, and command center compete for equal visual weight.  
**User cost:** Harder to identify “do this now” instruction.

**Recommendation:**
- Strengthen typographic and spacing hierarchy:
  - Hero action band = highest contrast.
  - Supporting context (status/provenance) = reduced emphasis.
  - Navigation matrix = tertiary.

### 3) Unify wording for primary journey anchors
**Observed issue:** Similar-but-different labels (“Start here: onboarding”, “Start orientation”, “Start with this week”) appear near each other.  
**User cost:** Semantic ambiguity around intended first step.

**Recommendation:**
- Standardize to one canonical phrase per intent:
  - Onboarding entry: `Start onboarding`
  - Weekly operator path: `Start weekly review`
  - Live data path: `Open live feed`

### 4) Add progressive disclosure for expert controls
**Observed issue:** Power features are visible immediately, even when users only need a minimum viable scan.  
**User cost:** Initial intimidation and delayed activation.

**Recommendation:**
- Default to “Essential view.”
- Place advanced controls behind `Show advanced controls` toggle, preserving expert depth without first-view overload.

## Suggested implementation backlog

### P0 (fix now)
1. Resolve mobile overflow/clipping in CTA groups on `/signals` and `/operations`.
2. Simplify first viewport CTA architecture to one primary + one secondary action.

### P1 (next)
1. Introduce a persistent “First action” strip by route.
2. Consolidate status chips into one expandable data-status component.
3. Normalize label vocabulary for core entry actions.

### P2 (later)
1. Deduplicate command center destinations with tags.
2. Add “Essential vs Advanced” viewing mode.

## Success criteria
- Mobile first viewport contains: title, one primary action, one secondary action, no clipped labels.
- First click time decreases for new users (qualitative sessions + analytics).
- Reduced nav ambiguity (fewer repeated labels and action variants).
- Higher completion rate for key route goals (onboarding start, weekly review start, operations action start).

## Screenshot references
- Desktop home: `browser:/tmp/codex_browser_invocations/8ef9c6e003cdcc5b/artifacts/artifacts/home.png`
- Desktop signals: `browser:/tmp/codex_browser_invocations/8ef9c6e003cdcc5b/artifacts/artifacts/signals.png`
- Desktop operations: `browser:/tmp/codex_browser_invocations/8ef9c6e003cdcc5b/artifacts/artifacts/operations.png`
- Desktop onboarding: `browser:/tmp/codex_browser_invocations/8ef9c6e003cdcc5b/artifacts/artifacts/onboarding.png`
- Mobile home: `browser:/tmp/codex_browser_invocations/be59cc1856f65802/artifacts/artifacts/home-mobile.png`
- Mobile signals: `browser:/tmp/codex_browser_invocations/be59cc1856f65802/artifacts/artifacts/signals-mobile.png`
- Mobile operations: `browser:/tmp/codex_browser_invocations/be59cc1856f65802/artifacts/artifacts/operations-mobile.png`
