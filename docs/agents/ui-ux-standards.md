# UI/UX standards

## I. Interaction physics & latency
- MUST: Input latency < 100ms. Visual feedback (active state, spinner, ripple) must render within 100ms of input. Network requests can take longer; the UI response cannot.
- MUST: No layout thrashing. Reading layout properties (offsetWidth, getBoundingClientRect) and writing style in the same synchronous block is banned.
- MUST: 60fps (16ms) animation budget. If an animation drops frames on a mid-tier device (e.g., standard generic Android), it is removed.
- NEVER: Animate width, height, top, left, margin, or padding. Only animate transform and opacity.
- NEVER: Use JavaScript for layout that CSS can achieve (e.g., masonry, grid alignment, aspect ratios).

## II. Strict accessibility (the "no mouse" rule)
- MUST: Pass the "Unplugged Mouse" Test. The entire feature must work with only a keyboard.
  - Constraint: Focus must be trapped in modals.
  - Constraint: Focus must return to the trigger when a modal closes.
- MUST: Focus contrast ratio ≥ 3:1. The default browser ring is insufficient if it doesn't meet contrast against your background.
- MUST: 44x44px minimum touch target. Not "about that size." Strictly ≥44 CSS pixels. Use negative margins or pseudo-elements to expand invisible hitboxes.
- NEVER: `outline: none` in CSS. If you remove the outline, you MUST replace it immediately with a box-shadow or background change in the same rule.

## III. Data integrity & form hygiene
- MUST: Unblock the UI. Never disable a "Submit" button because a form is invalid. Allow the click, then focus the first invalid field with an error. Disabled buttons are lazy UX that hide feedback.
- MUST: Preserve user data. If a submission fails (network error) or the user navigates back, their input must remain. State must be persisted (LocalState/SessionStorage).
- MUST: Spinners are exclusive. When a mutation is in flight, the trigger button must be disabled and show a loading state to prevent double-submission.
- NEVER: Use the change event for validation. Use blur (focus out) for inline errors. Do not yell at the user while they are still typing.

## IV. Semantic rigor
- MUST: HTML5 validity.
  - Clickable text/icon = `<button type="button">` (not `<a>`, not `<div>`).
  - Navigational link = `<a href="...">` (not `<button>`).
  - Input label = `<label for="...">`.
- MUST: Image dimensions. Every `<img>` tag MUST have width and height attributes or aspect-ratio CSS to reserve layout space before the byte stream arrives.
- NEVER: `div` onClick. If you attach a click handler to a non-interactive element, you must also add `tabIndex="0"` and `onKeyDown` handlers for Enter/Space, and `role="button"`. Better: just use a button.

## V. URL & state determinism
- MUST: The URL is the source of truth.
  - Search queries `?q=...`
  - Filters `?sort=...`
  - Open tabs `?tab=...`
  - Open modals `?modal=...`
- MUST: Back button reliability. Clicking "Back" must strictly reverse the last state change (close the modal, undo the filter), not dump the user on the previous domain.

## VI. Mobile hostility defense
- MUST: Prevent zoom-on-focus. All inputs on mobile must have font-size: 16px. If the design calls for smaller text, use `transform: scale()` to shrink it visually while keeping the computed font size at 16px.
- MUST: Touch action manipulation. Add `touch-action: manipulation` to all interactive elements to eliminate the 300ms tap delay on legacy WebKit.
- MUST: Overscroll containment. Any element with its own scrollbar (modals, sidebars) MUST have `overscroll-behavior: contain` to prevent the body from scrolling when the element hits the edge.

## VII. Zero-tolerance metrics
- CLS (Cumulative Layout Shift) MUST be 0. Content does not jump. Ever.
- LCP (Largest Contentful Paint) < 2.5s.
- Console is clean. No warnings. No "Key prop missing." No "Unrecognized attribute."

## VIII. Quantitative visual communication (Tufte-aligned)
Apply these principles to every quantitative visualization whenever possible.

- MUST: Maximize data-ink ratio. Prefer direct marks and labels over decorative chrome, gradients, shadows, or heavy containers.
- MUST: Use high information density with legibility. Show meaningful context (baselines, historical ranges, comparators) without forcing drill-down for basic interpretation.
- MUST: Preserve graphical integrity. Visual magnitude must match numerical magnitude (no truncated axes without explicit annotation; no area/3D distortion).
- MUST: Prefer small multiples over overloaded combo charts when comparing related series across time or categories.
- MUST: Integrate words, numbers, and marks. Keep annotations near data points so users do not have to cross-reference distant legends.
- MUST: Surface uncertainty and data quality. Confidence bands, source recency, and missing-data states should be explicit.
- MUST: State quantitative framing in-view: unit, time window, aggregation method (e.g., 7-day avg), and denominator if rates/ratios are shown.
- SHOULD: Replace detached legends with direct labels at line ends or near bars/points when space allows.
- NEVER: Add chartjunk (ornamental icons, redundant pictograms, gratuitous motion) that competes with quantitative signal.
- NEVER: Hide units, timescales, denominators, or smoothing/normalization transforms.

### Review checklist for chart PRs
- Axes and scales are truthful; any truncation/break is clearly annotated.
- Labels are close to data; users can interpret key takeaways without legend-hopping.
- Uncertainty, missing data, and freshness are visible.
- Visual hierarchy favors signal over decoration.
