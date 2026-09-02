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

## VIII. IA boundary checklist (current navigation model)
- **Weekly Brief (`/`):** the only canonical weekly workspace and first stop for posture, decision delta, and shareable artifact.
- **Evidence (`/signals`):** evidence only (drivers, thresholds, timestamps, historical context).
- **Plan (`/operate`):** operating guardrails only (hiring, spend, payback, growth vs. efficiency, cadence).
- **Resolve (`/answer`):** role translation only (founder, product, finance, strategy views).
- **Toolkits (`/toolkits`):** runnable instruments/templates only; do not restate posture logic or evidence narrative.
- **Learn:** diagnostic and conceptual references only; no new canonical guidance should
  originate here. There is no `/learn` route today — this content lives under `/answer` and
  `/toolkits`; the boundary still applies wherever it lands.
- **Trust (`/trust`):** transparency only (formulas, sources, cadence, limitations).
- Avoid overlap between layers; if copy fits two layers, keep it on the earliest layer and link out.

## IX. Homepage weekly brief motion guardrails
- Scope: `app/page.tsx` weekly brief modules and supporting components (reveal/stagger wrappers, decision chips, citation action controls).
- Allowed reveal motion: `transform` + `opacity` only (e.g., `translateY` + fade). Do not animate layout properties (height, width, margin, padding, top/left).
- JS interaction rule: avoid JavaScript layout read/write loops (`getBoundingClientRect`, `offset*`, forced sync reflow) for reveal/chip transitions; use CSS transitions and IntersectionObserver-only visibility toggles.
- Accessibility floor for interactive controls in dark cards:
  - keep minimum hit area at least 44x44 CSS px,
  - preserve high-contrast focus indicators (outline + halo) on `.weather-button`, `.weather-button-primary`, `.weather-pill`, and `.weather-tab`,
  - ensure keyboard users can visibly track focus on citation/copy actions.

## X. Shared action-link primitives
- Reuse `app/components/ui/actionLink.tsx` and `app/components/ui/buttonLink.tsx` for entry-page CTAs before introducing new one-off class chains.
- Use variants consistently:
  - `primary`: main CTA (`weather-button-primary`) with 44px touch target.
  - `pill`: secondary navigation CTA (`weather-pill`) with shared hover/focus/touch behavior.
  - `ghost`: tertiary button-style navigation (`weather-button`) for lower-emphasis actions.
  - `inline`: textual back-navigation links that still preserve focus-visible and touch-manipulation rules.
- Keep touch/manipulation and min-height behavior intact; only add `className` overrides for layout positioning (e.g., `mt-auto`, `justify-center`, icon gaps), not to remove focus affordances.

## XI. Report Shell Hierarchy
- Scope: shared report-shell routes such as `/signals`, `/operate`, `/answer`, and `/trust`.
- MUST: get the first page-specific task block on screen quickly. Shared chrome should orient the user, not delay the workflow.
- MUST: keep pre-content chrome to distinct tiers only:
  - global route context,
  - optional support-path navigation,
  - one page intro block,
  - then the first task block.
- NEVER: restate the same posture, trust, or route-state information in multiple stacked cards before the first task block.
- MUST: treat support-path navigation as secondary. It should help the user leave the page when needed, not compete visually with the current page’s primary decision or action.
- MUST: on mobile, avoid stacked shell layers that force the user through repeated state summaries before they reach the page content.
- MUST: when a `ReportSection` is nested inside a surface that already states its label, title, and
  description — a stepper step, an accordion row — pass `hideHeader` instead of repeating them. It
  keeps the `id` anchor and renders the heading `sr-only` so `aria-labelledby` still resolves. Only
  give the nested section a visible header when its title is *more specific* than the enclosing one
  (e.g. step "Test a decision" → section "Is this move safe right now?").
- NEVER: repeat a section's full description in both a checklist/index entry and that section's own
  header. The index carries titles; the section carries the description.
- Heading *copy* — what a heading may say, casing, one name per thing — is governed by
  `docs/editorial-guardrails.md` → Headings. This section governs where headers appear; that one
  governs what they say.

## XII. Disclosure (what earns collapsing, and what carries its state)

Scope: every `<details>`, `Collapsible`, and `Accordion` in `app/`.

### What earns collapsing

- MUST: collapse **evidence for a claim made above it** — the derivation, the source board, the raw
  series, the chart terminal, the per-signal breakdown. The reader has already been told the
  conclusion; the disclosure is there for the person who wants to check it.
- NEVER: collapse **the claim itself**, or anything a reader needs in order to act this week. The
  weekly call, what to do now, the pause condition, and the reversal condition are always visible.
- NEVER: collapse the only explanation of a term or number that appears above the fold. If a label
  needs a gloss, the gloss is visible and the *detail* behind it collapses — not the other way round.
- SHOULD: open by default when the panel has something the reader must see this week and stay closed
  otherwise. `advancedThresholdsSection` is the reference: it computes `defaultOpen` from whether a
  threshold is actually near, rather than picking a fixed default.
- SHOULD: state in the summary what is behind it. "Detailed verification & source board" earns its
  click; "inspect the signal breakdown" and "tap to expand" do not — they describe the gesture, not
  the content. A summary that shows the current values (`Why this call · Funding pressure 50
  moderate …`) is better still, because it pays the reader back without a click.

### Mechanism

- MUST: opt into the single disclosure contract in `app/styles/controls.css` — `data-chevron` on the
  summary, the `list-none` class on the summary, or `weather-auto-chevron` on the parent `details`.
  All three are equivalent and carry the 44px target, focus ring, list-style reset, and rotating ▾.
  Do not hand-roll a chevron with `after:content`; that is how the codebase ended up with four
  implementations of one affordance.
- SHOULD: prefer a native `<details>` over a JS collapsible. It works before hydration, costs no
  client bundle, and keeps its content server-rendered.

### State

- MUST: persist to the URL any disclosure whose open state changes what a screenshot or a shared
  link would show. Use `UrlDetails` (`app/components/ui/urlDetails.tsx`), which reads the query key
  on the server for the initial state and rewrites it with `replaceState` on toggle.
- Rationale: this product's job includes handing someone an artifact. A link that drops the panel the
  sender had open sends the recipient a different page than the one that was shared.
- Disclosures whose state is incidental — a copy-to-clipboard block, a template list — do not need a
  query key. Ask whether a colleague opening the link should see what you saw.

## XIII. Depth and enclosure

Scope: every element that draws a box — a border, a fill, or a lift — under `app/`.

- MUST: let the outermost container own the elevation. A box nested inside another that casts its
  own offset shadow reads as floating above the thing containing it, and enclosure stops meaning
  grouping. The ladder at the end of `app/styles/surfaces.css` enforces this for boxes made from a
  `weather-*` class; it cannot reach one written as Tailwind utilities, so that case is on the
  author.
- An offset shadow is elevation. A zero-offset coloured halo is emphasis, and is fine at depth —
  `DecisionHero`'s reconsideration panel tints one amber or emerald by state, which carries meaning
  rather than lifting the box.
- MUST: add a new `weather-*` container class to the `:is(...)` lists in that ladder.
  `tests/surfaceDepthLadder.test.ts` derives the set from the stylesheets and fails when one is
  missing, so this is checked rather than remembered. Controls, chips, and the `-sky`/`-indigo`
  tints are excluded there by name: a button inside a card is not a nested container.
- SHOULD: stop at three levels of visible enclosure. Past that the frames stop separating anything —
  a box inside a box inside a box is a list, and spacing and type carry it better. `/operate` sat at
  five, and the fix was to drop frames rather than to restyle them.
- Measuring this needs the browser, not a grep: computed colours arrive as `oklab()` for any
  Tailwind `/opacity` modifier, so a regex looking for `rgb(` reports a page as clean when it is not.
  Normalise colour through a canvas, and treat "is it positioned" as a question about the ancestor
  chain — the popovers in this codebase carry their positioning on a parent.

## XIV. Shape register (sharp asserts, soft holds)

Scope: every `border-radius`, every `rounded-*` utility, and every element that reads as a badge,
chip, control, or container under `app/`.

Whether runs two shape registers at once, and the balance between them is a role assignment, not
a slider. **Sharp asserts**: anything that states a fact or a call — a status or verdict stamp, a
data tile, a rule segment, a control the operator presses. **Soft holds**: the furniture around
it — cards, surfaces, sheets, dialogs — together with the voice (the serif display face, the
shadow ladder, the ease-out motion). Sharpness carries information only while it is the
exception, so the soft tier must be visibly softer than the sharp one, and neither register may
take the other's job.

- MUST: take the radius from the role, through the token — never from taste at the call site.

  | Tier | Token | How it is applied | What lives here |
  | --- | --- | --- | --- |
  | Stamp | `--radius-sm` (2px) | `rounded-sm`, `.weather-tag`, `.weather-chip`, `.weather-hub-chip` | status, verdict, regime, confidence and analog badges; chips; tags |
  | Data | `--radius-md` (4px) | `rounded-md`, `rounded` | stat tiles, rule segments, trust lanes, loading stages |
  | Control | `--radius-lg` (6px) | inherited from `.weather-button`, `.weather-button-primary`, `.weather-pill`, `.weather-tab`, `.weather-cta`, `.weather-input`; `rounded-lg` on a control that has no class | every button, link-button, tab, input, disclosure trigger, toast action |
  | Card | `--radius-xl` (10px) | `rounded-xl`, `.weather-card`, the hub hero/section/card shells, page section shells | a self-contained item or section |
  | Surface | `--radius-2xl` (16px) | `rounded-2xl`, `.weather-surface`, dialog and drawer popups | the outermost container, sheets, the identicon tile |
  | Round | `--radius-full` | `rounded-full` | dots, markers, spinners, switches, progress bars, icon wells, seals |

- NEVER: `rounded-full` on a text-bearing element. A pill beside a 2px chip is two badge shapes
  for one class of information, and until 2026-09-02 it put the softest shape on the page around
  the most assertive content (`3 NEED ATTENTION`, `HOLD`, `Q4 2018 analog`). Verdicts are
  stamps.
- NEVER: a `rounded-*` utility on an element that carries a control class. The class owns the
  radius. The header's `rounded-full` overrides on `.weather-button-primary` gave one action row
  two button shapes. Emphasis between controls is carried by fill and border — the `primary` /
  `pill` / `ghost` variants of §X — not by corner shape. This reverses the 2026-08-11 "quiet
  pill" decision in `docs/one-screen-weekly-brief-spec.md`, which made the hero's secondary
  actions round so they would read quieter and produced exactly that mixed row.
- NEVER: a named container on the control radius. `.weather-card`, `.weather-surface`, and the
  hub shells are `xl` or `2xl`; a shell at 6px reads as a giant button and stops separating the
  furniture from the controls inside it. Inner segments inside a card may sit at `md` or `lg`.
- MUST: keep `app/styles/tokens.css` the only place a radius is a number. Stylesheets reference
  `var(--radius-*)` (`inherit` and `50%` excepted). `tests/shapeRegister.test.ts` checks the
  three NEVERs above and keeps the `:root` scale and the `@theme inline` scale in lockstep.
- Uppercase eyebrows (`.type-eyebrow`), tracked badges (`.type-badge`), and tabular or mono
  numerals stay sharp on purpose: they are tag-class labels and figures. Sentence-casing every
  eyebrow was considered for this register and rejected — it stacks near-duplicates (`Plan` over
  `Weekly plan`) across the report shells. Rationing eyebrows is per-surface content work
  (`docs/ui-facelift-plan.md`, Phase 2), not a register change.
