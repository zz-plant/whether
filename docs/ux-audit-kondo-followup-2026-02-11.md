# UX audit follow-up — Kondo pass v2 (remove, move, modify)

Date: 2026-02-11  
Routes reviewed: `/`, `/signals`, `/operations`, `/onboarding`  
Viewports: desktop (1440×900), mobile (390×844)

## Why this follow-up exists
This pass re-audits the product after the prior shell/CTA cleanup work. The goal is to identify what improved and what should be trimmed or reshaped next so the experience feels calmer and more directive.

## What improved (keep)
1. **Mobile CTA overflow appears fixed**. Primary and secondary actions now fit in viewport width without clipping.
2. **Action language is more consistent** (`Start onboarding`, `Start weekly review`, `Open live feed`), reducing semantic drift.
3. **First viewport hierarchy is cleaner** than earlier iterations: one obvious primary CTA, one secondary CTA, then tertiary action under “More actions.”
4. **Status context is less noisy on mobile** due to collapsible “Data status.”

These are meaningful improvements and should be preserved as the baseline.

---

## Remove (declutter)

### 1) Duplicate export pathways in hero zones
**Observed:** Export-oriented actions still appear in both the app bar and hero-level “More actions” patterns (depending on route/state).  
**Impact:** Users see two places to do effectively the same thing, which weakens certainty about where “primary controls” live.

**Recommendation:**
- Keep export action in **one canonical location** per viewport:
  - Desktop: app bar only.
  - Mobile: “More actions” only.
- Remove duplicate render path when canonical placement is already present.

### 2) Repetitive “First action” helper after explicit CTAs
**Observed:** “First action” card often repeats exactly what CTA labels already state.  
**Impact:** Extra vertical weight without new information, especially on short mobile viewports.

**Recommendation:**
- Remove the “First action” card when the hero already has exactly two actions and no special caveat.
- Keep it only when fallback/historical conditions require non-obvious sequencing.

### 3) Sidebar source URL visual noise
**Observed:** Long source URLs still consume visual attention and create rough reading texture in Snapshot.  
**Impact:** High-frequency distraction for low-frequency information.

**Recommendation:**
- Replace raw URL text with `Treasury fiscal API` + `View source` link.
- Keep full URL in tooltip/title or secondary details panel.

---

## Move (re-sequence)

### 1) Move confidence guidance closer to action triggers on desktop
**Observed:** Confidence panel remains detached in the left rail while decision CTAs are in hero content.  
**Impact:** Increases mental join cost (users correlate risk + action manually).

**Recommendation:**
- Move one-line confidence cue directly beneath CTA row (desktop too), matching mobile pattern.
- Keep full confidence panel in sidebar for deeper detail.

### 2) Move command-center prominence below first substantive section for first-time sessions
**Observed:** Command center is still very prominent directly after hero on several routes.  
**Impact:** New users meet navigation mechanics before content comprehension.

**Recommendation:**
- For first session: place one substantive “what this page means” section before command center.
- For returning sessions: keep current order (command center high) if usage analytics justify it.

### 3) Move tertiary actions to a true bottom sheet on mobile
**Observed:** `details` expansion works but behaves like inline content growth, not a deliberate action menu.  
**Impact:** Jumps content and can feel cramped around the fixed bottom nav.

**Recommendation:**
- Replace mobile inline expansion with bottom sheet/modal action list.
- Keep keyboard/touch accessible controls and return focus to trigger on close.

---

## Modify (refine)

### 1) Make disclosure affordance clearer
**Observed:** `Data status` and `More actions` rely on subtle styling; expansion state is not strongly signaled.  
**Impact:** Some users may not realize these controls open additional content.

**Recommendation:**
- Add chevron icon with rotation state.
- Add `Expanded/Collapsed` assistive text for screen readers.
- Increase visual contrast of disclosure border in fallback mode.

### 2) Tune hero spacing rhythm across routes
**Observed:** Hero blocks on desktop have route-by-route spacing variance that changes perceived priority.  
**Impact:** Cross-route learning is slightly less transferable.

**Recommendation:**
- Normalize vertical spacing tokens for: heading, description, CTA row, trust line.
- Use a shared hero spacing contract across all report pages.

### 3) Clarify command-center grouping semantics
**Observed:** Current groups (`Playbook`, `Pages`, `Sections`) are useful but still overlap conceptually in user perception.  
**Impact:** Can still feel like repeated links despite dedupe improvements.

**Recommendation:**
- Add one-line helper under group tabs:
  - **Playbook** = “Do now”
  - **Pages** = “Switch surfaces”
  - **Sections** = “Jump within this page”
- Consider defaulting to `Playbook` instead of `All` on mobile.

### 4) Upgrade fallback message hierarchy
**Observed:** Fallback guidance is present but typography competes with surrounding content.  
**Impact:** Important risk information can be under-read.

**Recommendation:**
- Keep text concise and action-first:
  - “Fallback mode: validate live feed before irreversible decisions.”
- Add a subtle warning icon/tone token where fallback is active.

---

## Priority backlog (next iteration)

### P0
1. Canonicalize export CTA placement (eliminate duplicates by viewport).
2. Improve disclosure affordance for `Data status` and `More actions` (icon + clearer state).
3. Convert mobile tertiary actions from inline `details` to bottom sheet.

### P1
1. Conditionalize “First action” card (show only when it adds information).
2. Bring confidence cue directly beneath CTA row on desktop.
3. Replace raw source URL with compact source label + optional link.

### P2
1. Personalize command-center ordering (first-session vs returning-session strategy).
2. Add helper semantics to group tabs and evaluate default filter choice on mobile.

---

## Suggested validation plan
- **Task test A:** First-time mobile user: start onboarding from home in <10s.
- **Task test B:** Returning operator: open signals and locate threshold logic in <8s.
- **Task test C:** Fallback mode: identify caution and required validation step in <5s.
- Track: first-click time, wrong-click count, and CTA completion rate.

---

## Screenshot evidence
- Desktop home: `browser:/tmp/codex_browser_invocations/4369d314dbde1534/artifacts/artifacts/audit2-home-desktop.png`
- Desktop signals: `browser:/tmp/codex_browser_invocations/4369d314dbde1534/artifacts/artifacts/audit2-signals-desktop.png`
- Desktop operations: `browser:/tmp/codex_browser_invocations/4369d314dbde1534/artifacts/artifacts/audit2-operations-desktop.png`
- Desktop onboarding: `browser:/tmp/codex_browser_invocations/4369d314dbde1534/artifacts/artifacts/audit2-onboarding-desktop.png`
- Mobile home: `browser:/tmp/codex_browser_invocations/4369d314dbde1534/artifacts/artifacts/audit2-home-mobile.png`
- Mobile signals: `browser:/tmp/codex_browser_invocations/4369d314dbde1534/artifacts/artifacts/audit2-signals-mobile.png`
- Mobile operations: `browser:/tmp/codex_browser_invocations/4369d314dbde1534/artifacts/artifacts/audit2-operations-mobile.png`
- Mobile onboarding: `browser:/tmp/codex_browser_invocations/4369d314dbde1534/artifacts/artifacts/audit2-onboarding-mobile.png`
