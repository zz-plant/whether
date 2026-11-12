# UI/UX standards

## Read the section you need

This file is long on purpose: each section records the reasoning behind a rule. Read the
section that matches the change, not the file.

| If the change is about… | Read |
| --- | --- |
| clicks, input latency, focus, scroll | §I Interaction physics & latency |
| keyboard use, focus traps, touch targets, contrast | §II Strict accessibility |
| forms, validation, destructive actions | §III Data integrity & form hygiene |
| headings, landmarks, semantic HTML | §IV Semantic rigor |
| URLs, query state, links, back/forward | §V URL & state determinism |
| phone layout, hover, viewport | §VI Mobile hostility defense |
| metrics with no tolerance | §VII Zero-tolerance metrics |
| navigation rails, IA boundaries | §VIII IA boundary checklist |
| homepage motion and the weekly brief | §IX Homepage weekly brief motion guardrails |
| action links, buttons, shared primitives | §X Shared action-link primitives |
| report shell, card hierarchy | §XI Report Shell Hierarchy |
| what collapses, what stays open | §XII Disclosure |
| depth, enclosure, layering | §XIII Depth and enclosure |
| corners, borders, shape | §XIV Shape register |
| numbers, figures, charts, lines | §XV Encoding a number |
| colour, accents, regime colour | §XVI Colour that means something |
| diagrams at different widths | §XVII Responsive diagrams |
| type, fonts, headings, size | §XVIII Type register |
| reading order, narrative flow | §XIX Reading order and narrative progression |
| action placement vs. comprehension | §XX Action placement vs. comprehension |
| margins, padding, gaps | §XXI Spacing ownership |
| what the font files draw | §XXII What the font files draw |
| motion a reader does not notice | §XXIII Motion a reader doesn't notice |
| concept icons, glyphs | §XXIV Glyphs beside words |
| decoration that encodes | §XXV Decoration that encodes something |
| buttons, inputs, toggles, controls | §XXVI Controls as instrument parts |
| display vs. control | §XXVII Display or control |
| screenshots, frames, share cards | §XXVIII Every frame is a screenshot |
| containers, wrapping, stacking | §XXIX How containers wrap and stack |
| the record band under the header | §XXX The record band |

## I. Interaction physics & latency
- MUST: Input latency < 100ms. Visual feedback (active state, spinner, ripple) must render within 100ms of input. Network requests can take longer; the UI response cannot.
- MUST: No layout thrashing. Reading layout properties (offsetWidth, getBoundingClientRect) and writing style in the same synchronous block is banned.
- MUST: 60fps (16ms) animation budget. If an animation drops frames on a mid-tier device (e.g., standard generic Android), it is removed.
- NEVER: Animate width, height, top, left, margin, or padding. Only animate transform and opacity.
- NEVER: Use JavaScript for layout that CSS can achieve (e.g., masonry, grid alignment, aspect ratios).
- MUST: One anchor offset. The sticky stack is described once, as `scroll-padding-top` on
  `html` in `app/styles/typography.css`, and every way a target reaches the top — a hash link,
  J/K, `focus()`, `scrollIntoView` — aligns to it. NEVER add `scroll-margin-top` or a `scroll-mt-*`
  utility to a target: scroll padding and scroll margin are additive, and on 2026-09-15 the app
  carried both (80px on the root plus 112px on every section and 72px on every heading), so a
  tapped section landed a quarter of a phone screen down. `tests/scrollHandling.test.ts` fails
  on any new margin.
- MUST: A row that keeps its current item in view scrolls itself. Use `scrollRowToItem`
  (`app/components/scrollRowToItem.ts`), never `scrollIntoView`, which scrolls every ancestor: on
  a row stuck to the top of the window that meant moving the page 71px whenever the header
  slid back over it, cutting short the anchor jump the reader had just made.
- MUST: Every JS-driven scroll honours `prefers-reduced-motion`. Pass `scrollBehaviorFor(true)`
  rather than a literal `"smooth"`; the CSS `scroll-behavior: auto` override under reduced motion
  does not reach a `behavior` argument. Focus with `preventScroll: true` before a programmatic
  scroll, or the key press moves twice.

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
- A track a reader drags sideways sets `touch-action: pan-y`, so a vertical swipe that starts on it still scrolls the page: the score ladder's track (`none` until 2026-11-10, which swallowed the swipe on the phone brief's first screen) and the record band (§XXX). The history timeline and the conditions map still set `none`.
- MUST: Overscroll containment. Any element with its own scrollbar (modals, sidebars) MUST have `overscroll-behavior: contain` to prevent the body from scrolling when the element hits the edge.
- Compact shared controls (36px) require both a fine pointer and hover support; a wide touch screen keeps the 44px floor. Native text fields keep at least 16px text on coarse pointers, including tablets and landscape phones.
- The desktop header keeps all six loop tabs from `md`; Search stays an icon until `xl` to leave room for the wordmark and navigation. Below `md`, the bottom bar owns Search.
- Section names remain readable: the desktop outline wraps long names; the mobile index uses the shared `text-fluid-sm` size and contains horizontal overscroll.
- User-facing metadata uses `text-fluid-nano`, which bottoms at 12px on phones; explanatory text and copy previews use `text-fluid-sm` or larger; reading prose uses `text-fluid-base`. All-caps labels inside an aria-hidden graphic may go to 10px (`RegimeRadar` quadrants); text inside a viewBox-scaled SVG is judged at rendered size, not `font-size`.

## VII. Zero-tolerance metrics
- CLS (Cumulative Layout Shift) MUST be 0. Content does not jump. Ever.
- LCP (Largest Contentful Paint) < 2.5s.
- Console is clean. No warnings. No "Key prop missing." No "Unrecognized attribute."

## VIII. IA boundary checklist (current navigation model)
- **Weekly Brief (`/`):** the only canonical weekly workspace and first stop for posture, decision delta, and shareable artifact.
- **Evidence (`/signals`):** evidence only (drivers, thresholds, timestamps, historical context).
- **Plan (`/operate`):** operating guardrails only (hiring, spend, payback, growth vs. efficiency, cadence).
- **Resolve (`/resolve`):** role translation only (founder, product, finance, strategy views).
- **Toolkits (`/toolkits/[slug]`, linked from `/resolve`; the `/toolkits` index redirects to `/`):**
  runnable instruments/templates only; do not restate posture logic or evidence narrative.
- **Learn:** diagnostic and conceptual references only; no new canonical guidance should
  originate here. There is no `/learn` route (it redirects to `/trust`); this content lives under
  `/resolve` and the toolkit pages, and the boundary still applies wherever it lands.
- **Trust (`/trust`):** transparency only (formulas, sources, cadence, limitations).
- Avoid overlap between layers; if copy fits two layers, keep it on the earliest layer and link out.

## IX. Homepage weekly brief motion guardrails
- Scope: `app/page.tsx` weekly brief modules and supporting components (reveal/stagger wrappers, decision chips, citation action controls).
- Allowed reveal motion: `transform` + `opacity` only (e.g., `translateY` + fade). Do not animate layout properties (height, width, margin, padding, top/left).
- The week's move (2026-11-09) is the one choreographed sequence on the card: `lib/report/home/weekMove.ts` builds it only for a week the conditions changed or an area changed standing, and `app/styles/week-move.css` plays it once from the first paint (reading travels, stamp turns at the change line, moved areas tick). Every element rests in this week's state and the keyframes only state where it came from, so no script, reduced motion, print and `?screenshot=1` draw the finished card. An earlier value is printed from a `data-text` attribute, never a text node, so the page's text says this week's value once. Do not add a second sequence, and do not play this one on a week nothing moved.
- JS interaction rule: avoid JavaScript layout read/write loops (`getBoundingClientRect`, `offset*`, forced sync reflow) for reveal/chip transitions; use CSS transitions and IntersectionObserver-only visibility toggles.
- Accessibility floor for interactive controls in dark cards:
  - keep minimum hit area at least 44x44 CSS px,
  - preserve high-contrast focus indicators (outline + halo) on `.weather-button`, `.weather-button-primary`, `.weather-pill`,
  - ensure keyboard users can visibly track focus on citation/copy actions.

## X. Shared action-link primitives
- Reuse `app/components/ui/actionLink.tsx` for entry-page CTAs before introducing new one-off class chains.
- Use variants consistently:
  - `primary`: main CTA (`weather-button-primary`) with 44px touch target.
  - `pill`: secondary navigation CTA (`weather-pill`) with shared hover/focus/touch behavior.
  - `ghost`: tertiary button-style navigation (`weather-button`) for lower-emphasis actions.
  - `inline`: textual back-navigation links that still preserve focus-visible and touch-manipulation rules.
- Keep touch/manipulation and min-height behavior intact; only add `className` overrides for layout positioning (e.g., `mt-auto`, `justify-center`, icon gaps), not to remove focus affordances.
- A link that goes somewhere is a link (`ActionLink`, or `Link` with the register's class), not a button that calls `router.push`: it opens in a new tab and says where it goes. The time machine's "Back to this week" and month steps were buttons until 2026-11-06.
- Copy buttons are `ClipboardActionRow`, at `text-fluid-sm` like `ActionLink`, and say "Copied" when done ("Copied!" and "Link copied!" went 2026-11-06).
- Every × that closes a dialog, sheet, popover, toast or notice takes `CLOSE_CONTROL_CLASS` (`app/components/ui/closeControl.ts`) and `<CloseIcon />` at its default size; the call site adds only its position. Ten were hand-written on three radii until 2026-11-06.
- Pick-one choices are `SegmentedControl` (`app/components/ui/segmentedControl.tsx`): `segmented` for a short strip, `choices` for a longer list. The share presets, the share format and the time machine's years were hand-drawn sky-tinted buttons until 2026-11-06, and the presets and years had no pressed state. A choice that navigates on every arrow key (a month grid in a dialog) stays a set of buttons.

## XI. Report Shell Hierarchy
- Scope: shared report-shell routes such as `/signals`, `/operate`, `/resolve`, and `/trust`.
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
- NEVER: let the intro block's one-sentence summary enumerate the sections the page index already
  lists. The summary states the page's job; the index names the sections ("The evidence behind
  this week's guidance", not "What moved, why it matters, and what would change the guidance" —
  found 2026-10-04).
- MUST: keep one in-page index per page, derived from the shell's `sectionLinks`, in page order and
  under the sections' own names. Until 2026-09-15 `/operate` carried three — the sidebar list, the
  stepper's own sticky chip row, and a card grid at the tail — with three vocabularies for the same
  five sections.
- MUST: give the mobile index row a scroll affordance. `MobileSectionChips` fades whichever edge
  has content beyond it; a row that silently clips its overflow reads as broken labels, not as
  something you can scroll. The fades are state, tracked on scroll, not decoration.
- MUST: make the page intro state the week as well as the route. The page title leads; under it,
  as one line of facts, come the condition word in the regime ink, the trust headline and the
  record date (2026-11-10). From 2026-09-25 until then the condition word led and the H1 followed,
  a label over a heading on every report route. No kicker: "Weekly brief" above every H1 restated the route
  the header, the sidebar and the tab bar already name. No emblem beside it either (§XXV): the
  operating-loop glyph that sat there, and later on `/about`, is deleted.
- NEVER: give the hero an action that targets the block directly beneath it, or a button to a route
  the header tab already reaches. Four routes pointed the hero button, an inline "↓" link and the
  first index entry at the same anchor, and every secondary button pointed at `/`. A hero action
  earns its place only by leading somewhere the page index and the header do not.
- Heading *copy* — what a heading may say, casing, one name per thing — is governed by
  `docs/editorial-guardrails.md` → Headings. This section governs where headers appear; that one
  governs what they say.

## XII. Disclosure (what earns collapsing, and what carries its state)

Scope: every `<details>`, `Collapsible`, and `Accordion` in `app/`.

### What earns collapsing

- MUST: collapse **evidence for a claim made above it** — the derivation, the source board, the raw
  series, the chart terminal, the per-signal breakdown. The reader has already been told the
  conclusion; the disclosure is there for the person who wants to check it. On `/trust` the check
  is the page's job, so its compact source board (one line per source) is open under the
  derivation and the detail behind it folds (2026-10-07, `docs/decisions/feature-log/01-product-surfaces.md` §1.1.48).
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
- MUST: tell a surface from the page by its hairline and a step of tone, and let its lift say it
  is a sheet. Since 2026-11-12 (Forecast; `.impeccable/surfaces/app-page-tsx.md`) `.weather-surface`
  and `.weather-card` carry `--elev-card`: three layers, a contact edge, a short lift and a wide
  soft fall, each offset downward (`app/styles/tokens.css`, `app/styles/surfaces.css`). The
  homepage sky's panel of paper (`.weather-hero-sky-panel`, `app/styles/forecast.css`) carries the
  same. `.weather-surface-secondary`, the hub section and the hub link card stay flat. From
  2026-11-10 to 2026-11-12 (Covenant) no surface cast a shadow; before that each cast a step of the
  `--elev-*` ladder. What floats over the page casts `--elev-1` to `--elev-4`: a menu, a dialog,
  the toast, the sticky strip. A button carries `--elev-control`, the card's layers at a third of
  the reach, and rises to `--elev-card` on hover (§XXVI); a pill, a field, a key and the segmented
  well are flat.
- NEVER: a zero-offset shadow as depth, or a glow. Every layer of an elevation token has a
  downward offset (`tests/forecastVisualWorld.test.tsx`).
- An offset shadow is elevation. A zero-offset coloured halo is emphasis, and is fine at depth —
  `DecisionHero`'s reconsideration panel tints one by line state (the front red or the clear ink), which carries meaning
  rather than lifting the box.
- MUST: add a new `weather-*` container class to the `:is(...)` lists in that ladder.
  `tests/surfaceDepthLadder.test.ts` derives the set from the stylesheets and fails when one is
  missing, so this is checked rather than remembered. Controls, chips, and the `-sky`/`-indigo`
  tints are excluded there by name: a button inside a card is not a nested container.
- SHOULD: stop at three levels of visible enclosure. Past that the frames stop separating anything —
  a box inside a box inside a box is a list, and spacing and type carry it better. `/operate` sat at
  five, and the fix was to drop frames rather than to restyle them; since 2026-10-09 its only box is
  the page intro (§XXV).
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
it — cards, surfaces, sheets, dialogs — together with the ease-out motion. Until 2026-11-10 the
soft voice also counted the semi-condensed display width and a shadow under every surface; both
are gone (§XVIII, §XIII). Sharpness carries information only while it is the
exception, so the soft tier must be visibly softer than the sharp one, and neither register may
take the other's job.

- MUST: take the radius from the role, through the token — never from taste at the call site.

  | Tier | Token | How it is applied | What lives here |
  | --- | --- | --- | --- |
  | Stamp | `--radius-sm` (2px) | `rounded-sm`, `.weather-tag`, `.weather-chip`, `.weather-hub-chip` | status, verdict, confidence and analog badges; chips; tags |
  | Data | `--radius-md` (3px) | `rounded-md`, `rounded` | stat tiles, rule segments, trust lanes, loading stages |
  | Control | `--radius-lg` (4px) | inherited from `.weather-button`, `.weather-button-primary`, `.weather-pill`, `.weather-cta`, `.weather-input`, `.weather-control`; `rounded-lg` on a control that has no class | every button, link-button, tab, input, select, disclosure trigger, toast action |
  | Card | `--radius-xl` (6px) | `rounded-xl`, `.weather-card`, the hub hero/section/card shells, page section shells | a self-contained item or section |
  | Surface | `--radius-2xl` (8px) | `rounded-2xl`, `.weather-surface`, dialog and drawer popups | the outermost container, sheets, the identicon tile |
  | Round | `--radius-full` | `rounded-full` | dots, markers, spinners, switches, progress bars, icon wells, seals |

  The scale shrank on 2026-11-10; it was 2, 4, 6, 10 and 16px. The condition word left the stamp
  tier the same day: it is a boxless word in the condition's ink (§XXV), except the answer pages'
  standing stamp (`app/resources/components/answerStandingStamp.tsx`), which keeps its frame.

- MUST: one meaning per mark. Small marks are a vocabulary, and a shape that means two things on
  one page means neither (added 2026-10-14, when the trust strip's caveat ring sat one section
  above the score ladder's past-reading ring).

  | Mark | Means | Where |
  | --- | --- | --- |
  | Filled dot | lit: chosen, or as it should be | segment lamps, live sources, a series' current point |
  | Hollow ring | a past reading singled out | the ladder's last reading, the months a call changed and where a trace starts on `/history` |
  | Dashed ring (`CircleDashed`) | a score close to its line | the line-state "close" glyph (§XXIV) |
  | Pause and play | a pause line crossed; clear of it, or a restart line met | the line states (§XXIV) |
  | Outlined diamond (`.weather-caveat-mark`) | read this reading with care | cached sources, a scoring note, an archived week, guidance held back |
  | Numeral in a bordered square (`OrdinalMarker`) | the item's position in a fixed list | the area table, the signals table, the share formats, the presets, the scenario rules |

  The diamond is the one mark that is not round: it is a warning sign's shape, not a data marker,
  and its colour is the caveat ink, never the crossed red. A new kind of mark gets a row here
  before it ships.
- MUST: a caveat that takes a whole band (cached or late data, an archived month, offline,
  guidance held back) is `.weather-caveat-band` (`app/styles/feedback.css`: a 2px top rule in the
  caveat ink since 2026-11-10, a 4px left rule before; the caveat fill and ink) with the diamond
  on its first line, as `HistoricalBanner` draws it. The
  rule and the mark set it apart from an ordinary band. Padding and type size belong to the
  use. Until 2026-10-27 the chain was copied into nine components and two had drifted to a 2px
  rule; `tests/craftDetails.test.ts` now rejects a component that spells it again. Never the `amber-*` or `rose-*` utilities: both resolve to the crossed red, and
  until 2026-10-21 the homepage's late-data line and `/operate`'s cached-data alert drew in them,
  so late data read as a crossed line.
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
- NEVER: a named container on the control radius, and never a `rounded-*` utility on one. The
  classes that own a card or surface radius are `.weather-card`, `.weather-surface`, and the hub
  section, card and link-card shells; they are `xl` or
  `2xl`, and a shell on the control radius (`lg`) reads as a giant button and stops separating the
  furniture from the controls inside it. `.weather-panel` is a layout tier and owns no radius, so a panel that draws
  a border takes `rounded-xl` itself. Inner segments inside a card may sit at `md` or `lg`.
- MUST: keep `app/styles/tokens.css` the only place a radius is a number. Stylesheets reference
  `var(--radius-*)` (`inherit` and `50%` excepted). `tests/shapeRegister.test.ts` checks the
  three NEVERs above and keeps the `:root` scale and the `@theme inline` scale in lockstep.
- NEVER: a plain border or background utility beside a `weather-*` class that paints the same
  property. The stylesheets are unlayered and the utilities are in `@layer utilities`, so the class
  wins whatever the utility says, and the markup reads as styled while the page draws the default.
  Until 2026-09-29 that is how the cached-data warning drew grey instead of amber, `/operate`'s
  Stop and Start lists drew as one grey card each, and the selected `/signals` filter looked
  unselected. A utility that must win takes the important modifier (`!border-amber-500/40`); one
  that repeats the class is deleted; a selected state that belongs to the class is written on the
  class (`.weather-pill[aria-current="page"]`). `tests/unlayeredClassUtilities.test.ts` reads
  which properties each class paints from the stylesheets and holds this.
- Uppercase eyebrows (`.type-eyebrow`), tracked badges (`.type-badge`), and tabular or mono
  numerals stay sharp on purpose: they are tag-class labels and figures. Sentence-casing every
  eyebrow was considered for this register and rejected — it stacks near-duplicates (`Plan` over
  `Weekly plan`) across the report shells. Rationing eyebrows is per-surface content work
  (the 2026-09 UI facelift, Phase 2), not a register change; §XXV says which ones stay.

## XV. Encoding a number (figure register, and when to draw the line)

Scope: any surface that states a reading, a threshold, or the distance between them.

### Figure register

- MUST: set a figure in mono (`--font-mono`, `.mono`, `font-mono`) only when it has to align
  **with other figures** — a table column, the two sides of a before/after comparison, a rail's
  own labels. Monospaced digits share an advance width, which is what makes a column diffable.
- MUST: set every other figure in the sans with `tabular-nums` — a number in a sentence, a score
  beside its label, a delta beside its arrow. That fixes the digit width, so a value updating in
  place does not shift its neighbours, without changing the face.
- NEVER: render the same figure in two faces. The boldness score was mono in `StickyCallStrip`
  and sans in `DecisionHero`, which read as two quantities on one screen. One number, one face,
  across every surface it appears on.
- A score set as a figure is `.type-figure` (`app/styles/typography.css`, 2026-11-10): the display
  voice (Bricolage Grotesque since 2026-11-12) at weight 800 with `tabular-nums`, sized by the caller. `ScoreLadder`'s `figure` prop draws a
  score that way: the number, one sentence of where it stands against its pause line and, unless
  `"compact"`, a ruled line with its lines named where they sit. The brief states its two
  published scores so, in the guidance block's right-hand column from `md` and side by side on a
  phone. The
  working ladder, with its key, ranges and scrub, keeps the plain caption. It is the one place a
  number takes the display face.

### Encode the claim, don't only state it

- MUST: encode a threshold claim on the surface that makes it. A bounded rule is three numbers on
  one scale — the reading, the line that trips it, the line that clears it — and prose can only
  state them and leave the reader to subtract. `ThresholdLadder` draws exactly that; reach for it
  before writing another sentence with numbers in it. The prose stays: it is what gets copied
  into Slack and cited. It just stops being the only thing carrying the distance.
- MUST: use one encoding per concept per screen. Until 2026-09-03 the weekly brief showed
  distance-to-threshold three ways at once — a fill bar on an arbitrary 30-point reference, a
  rail on the real 0–100 scale, and three rows of prose — so a reader had to learn three
  vocabularies for one idea. The rail won because it is the only one that is decodable without
  being told its domain.
- MUST: state the domain of any autoscaled or arbitrary-reference graphic next to it. This is the
  rule `app/components/ui/sparkline.tsx` documents and the deleted `ThresholdProximityBar`
  violated: a bar whose full width silently meant "30 points" cannot be read, only glanced at.
- MUST: draw panels meant to be compared with one encoding, one scale, and one orientation —
  small multiples. A pair where one signal got a rail and the other got a sentence is not a pair.
  Where two signals trip in opposite directions, `invert` the falling one so trouble sits on the
  same side of both rails; the rail ends label themselves, so the flip stays visible.
- NEVER: draw a graphic whose numbers are derived separately from the copy beside it. Parse the
  displayed sentence (`buildBoundedConditionRails` in `lib/report/operatingCalls.ts`) or pass one
  source to both. A second derivation eventually disagrees with the sentence under it, and a
  graphic that contradicts its own caption costs more trust than no graphic at all — so copy that
  will not parse renders nothing.

## XVI. Colour that means something (the regime accent)

Scope: every surface that tints, rules, or labels itself by the week's regime, and every colour on
the site, since 2026-10-09.

The palette's rule is Synoptic's, from 2026-10-09 (`docs/design/palette-directions.md`, applied in
`docs/decisions/feature-log/01-product-surfaces.md` §1.1.69): colour carries two things and nothing else, the four
conditions and where a line stands. Everything else is ink. Its values are Forecast's since
2026-11-12 (`.impeccable/surfaces/app-page-tsx.md`, DESIGN.md); Covenant's from 2026-11-10
(`docs/design/rebuild-covenant.md`) were a green-grey paper with sienna and periwinkle conditions. Light is the site's identity and dark the second
theme; with no stored choice a page follows the device setting, and a stored choice wins (the
bootstrap script in `app/layout.tsx`, `app/components/themeToggleButton.tsx`).

| Role | Token | Dark | Light |
| --- | --- | --- | --- |
| Ground (night ground / paper) | `--bg-body` | `#10141c` | `#eef1f6` |
| Panel | `--bg-panel` | `#161b26` | `#f8fafc` |
| Ink, and the action colour (§XXVII) | `--app-text`, `--accent-action` | `#e8ecf4` | `#0f1419` |
| Secondary ink | `--app-text-secondary` | `#b8c2d4` | `#2a3442` |
| Muted ink | `--app-text-muted` | `#9aa8c0` | `#4a5568` |
| A line crossed or close (front red) | `--line-crossed-ink` / `--line-crossed` | `#f0666a` / `#e5484d` | `#b81f27` / `#c4242b` |
| A line clear | `--line-clear-ink` | the ink | the ink |
| Sunny (gold) | `--color-condition-sunny` / `-ink` | `#e8a81c` / `#f0c95a` | `#e8a81c` / `#765600` |
| Cloudy (overcast) | `--color-condition-cloudy` / `-ink` | `#6a8aaa` / `#a9bdd1` | `#6a8aaa` / `#46607a` |
| Stormy (slate) | `--color-condition-stormy` / `-ink` | `#465290` / `#aab4ec` | `#465290` / `#3d4880` |
| Freezing (ice) | `--color-condition-freezing` / `-ink` | `#9fd0f2` / `#a3d6fa` | `#9fd0f2` / `#1a5e94` |

- MUST: draw a condition from the condition tokens and a line state from the line-state tokens,
  never one from the other. Since 2026-11-12 the fills follow the weather each word names (gold
  sun, overcast grey-blue, storm slate, pale ice) rather than the two axes; Stormy is the one
  dense fill (`isLightField`, `lib/report/recordBandCodec.ts`). The closest pair under simulated
  protan, deutan and tritan vision is Cloudy and Stormy, 16.5 apart in OKLab, which is why every
  condition also carries a glyph (§XXIV) and, where it fills an area, a pattern (§XXX). Covenant's
  fills encoded the axes (warm for risk on, light for cheap money). A cleared
  line printed in Sunny's green and a crossed one in Cloudy's amber until 2026-10-09; on the light
  theme those two would have been one brown. `tests/regimeColourContract.test.tsx` holds the badge
  to the line-state utilities and the data-regime map to the condition inks.
- MUST: name the role, not the hue, in new code: `text-line-crossed-fg`, `border-line-clear-border`,
  `bg-condition-sunny`, `text-condition-freezing-ink`, the `--accent-*` and text tokens. The stock
  ramps components already name are folded onto the roles in `tokens.css` (emerald is the clear
  ink, amber and rose the front red, with amber at half strength as a fill, sky and cyan the
  action ink); they are kept so 630 class names did not move, not as a vocabulary.
- MUST: take the regime's colour from the two tokens, never from a hue picked at the call site.
  `--regime-accent` is the condition's fill, the one hex the regime plane and the band draw in
  (`REGIME_HEX_COLORS`, the same in both themes), for tints, rules and washes through `color-mix`.
  `--regime-ink` is the condition as text: the light ink on the dark ground, the dark one that
  clears 4.5:1 on the light ground. Both resolve from a `data-regime` attribute (`tokens.css`), which the page
  shells and `DecisionHero` carry via `regimeDataAttribute` (`lib/regimeAccent.ts`). Every
  `ReportShell` caller passes `regime` from its report data — `regimeAccentStyle` was written for
  the section eyebrows and rules to read the week, and until 2026-09-15 no report page fed it, so
  every shell rendered slate under a call its own intro line named. `/history/compare` is the one
  deliberate exception: two weeks on one page, and keying it to either would mislead.
- SHOULD: keep the regime ink for the condition word: beside the guidance, a report intro's status
  word, the running head, a `Tag regime` in a list. Chrome takes the ink since 2026-11-10:
  `.type-eyebrow-section` on the label of a reading (`SignalReadingPanel`) drew in the regime ink
  until then and is the secondary ink now, and the section tabs and section chips mark the
  current item in `--app-text`, not the week's fill. The
  `ReportSection` eyebrow and its gradient rule, which carried it on every section, are gone
  (2026-10-09, §XXV). A card's own label inside a section is neutral (`.type-eyebrow` alone);
  `/signals` carried sky card eyebrows beside a rose section eyebrow, two accents for one
  hierarchy.
- MUST: keep the action colour the ink, in every week. Links, buttons and focus rings draw in
  `--accent-action`, which no `data-regime` rule may repoint. From 2026-10-14 to 2026-11-10 a
  shell that knew its regime drew them in the week's ink (`--accent-action: var(--regime-ink)`),
  so "Cloudy" and "click" shared one colour across the first screen and the controls changed with
  the weather. There is no hue that means "click" either: sky meant that until 2026-10-09, forced
  Stormy off blue, and under a Stormy call made the regime and the controls one colour. A
  condition's colour names the condition and nothing else; form tells a control from a display
  (§XXVII). Links keep their underline; the primary button is the action colour as a fill with
  the ground as its label (`--cta-fill`, `--cta-ink`). `tests/regimeColourContract.test.tsx`
  holds both.
- MUST: keep a focus ring visible in both themes. It is the ink, 15.4:1 on the dark ground and
  14.6:1 on the light one, with the soft halo (`--focus-halo`) behind it.
- MUST: tell data series apart by ink and dash, not by a hue, when they are neither a condition
  nor a line state. The rates chart on `/signals` draws its four terms as muted dotted, muted
  solid, ink dashed and ink solid, and its key draws the same lines.
- MUST: paint the page atmosphere from `--regime-atmosphere`, via `.weather-regime-ground`, on
  both shells. The brief's container and the report backdrop each held a regime → tint table of
  their own — the report one had Sunny in teal and never faded, so the ground under every card on
  every report route was lifted to a grey and the depth ladder lost half its separation. The four
  washes are transparent since 2026-11-10. Colour commits at page scale in two places: the record
  band (§XXX) and, since 2026-11-12, the homepage's sky (below). The token and the class stay, so
  a shell still paints nothing of its own.
- MUST: draw the homepage's sky from its tokens: `--regime-sky-top` and `--regime-sky` for the
  gradient, `--regime-sky-ink` and `--regime-sky-muted` for text on it, one set per condition and
  theme in `app/styles/tokens.css` (DESIGN.md "The sky" lists them). Each ink clears 4.5:1 at both
  ends of its gradient, and on the light theme Stormy's is the one dark sky
  (`tests/forecastVisualWorld.test.tsx`). Text on the sky takes the sky's inks through the
  overrides on `.weather-hero-sky`, the condition word and its glyph included; a panel of paper on
  it (`.weather-hero-sky-panel`) puts every page ink back from the `--page-*` captures on
  `.weather-hero-card`. A custom property resolves where it is declared, so an element on the sky
  that carries its own `data-regime` re-declares `--regime-ink` from the map: the glyph did, and
  drew Stormy's dark ink on the light theme's Stormy sky until `forecast.css` gave it the sky's.
  `DecisionHero` draws the sky only where it has a margin (the homepage). The sky's colours are
  registered with `@property` (`tokens.css`), so a change of condition cross-fades in 300ms
  (`forecast.css`), still under reduced motion.
- MUST: print the report intro's status word (`CommandCenterNavBlock`) in `--regime-ink`, and give
  the intro card no other hue. From 2026-09-16 to 2026-10-09 the card also carried the hero's wash,
  border tint and 3px top rule (`.weather-page-intro`, now deleted): a second and third drawing of
  the fact the word states (§XXV). The brief's hero kept its rule until 2026-11-10; it has no box
  now, and the record band above it carries the week's colour.
- NEVER: print text in `--regime-accent`. On the light ground Sunny's fill is 1.9:1 and Stormy's
  2.3:1; the section eyebrows did this until 2026-09-15.
- MUST: key a surface's colour to the regime the copy on it states, from the same source. The
  hero used to be fixed teal — the stripe's colour for Sunny — under every call, and the page
  atmosphere was keyed to the last month-end in the regime history while the hero stated the
  week, so a Freezing call sat on a Sunny wash. `PageContent` mounts the Shell now so the two
  cannot disagree.
- MUST: draw the four regimes in the four canonical hues everywhere they are drawn, and let a
  legend list only what is on the surface. The brief's posture stripe folded Freezing and Stormy
  into one rose and labelled it "Stormy" under two years of Freezing months.
- NEVER: a literal ink or fill in a stylesheet under `app/styles/` (`color: white`,
  `rgb(226 232 240)`, `background: rgba(34, 34, 34, 0.55)`). Those rules are unlayered, outrank
  any utility, and read the same on both themes; every one found on 2026-09-15 was a blank
  heading, an invisible tag, or a dark slab on the light theme — the legal pages rendered their
  sections as grey blocks. Use the text roles (`--app-text`, `--app-text-secondary`,
  `--app-text-muted`), the surface ladder (`--bg-*`), or a semantic token. Print rules are the
  exception: they commit to paper.
- MUST: delete a stylesheet rule when its last consumer goes. A rule nothing renders still ships
  and still carries whatever colour it was written in; the 2026-09-15 sweep removed 52 dead
  classes (the `home-band` system, the cadence checklist, the hub hero and stat tiles, the lever
  and trust cards), most of them dark-only, and the depth ladder had been naming five of them.
- MUST: review a visual change in both themes. `bun run ui:iterate -- --theme light` captures
  the light set beside the dark one; until 2026-09-15 the harness could not, and the light theme
  carried a hard-edged artwork rectangle, invisible tags, and a grey slab behind `/pricing` that
  no capture had shown. Since 2026-11-10 light is the site's identity, so the light captures are
  the primary set; the harness's default run is still dark.

## XVII. Responsive diagrams

- Keep prose labels in HTML for flow diagrams, so labels wrap at mobile widths and text zoom. SVG is for the artwork, not a fixed-width page of text.
- Bound the coordinate and rendered widths of text-bearing charts. `ThresholdLadder`
  caps its coordinate width at 300 and rendered width at 1.4 times that; wider parent
  rows must not reduce its labels to miniature type on phones or inflate them on desktop.
- Keep threshold captions inside the frame using their text width, stack nearby captions,
  and give the current reading a separate row from the domain endpoints.
- Give plot frames padding for endpoint strokes and markers. Use `weather-data-plot`
  for non-scaling line strokes; do not apply that rule to decorative icons.
- Put multi-series legends outside the plot where they can wrap. Labels tied to nearby
  endpoint values overlap as the series converge. Preserve domain and freshness captions.
- Check mobile and desktop in both themes; use the canonical regime colors in diagrams.

## XVIII. Type register (capitals, faces, and one encoding per fact)

Added 2026-09-23 with DD-028 to DD-030 (`docs/design-debt-prioritized.md`).

- **Two voices** (since 2026-11-12, Forecast; `app/styles/fonts.css`). Bricolage Grotesque, a
  grotesque with optical sizes, is the display voice (`--font-display`): the guidance (`.text-display`), `h1`/`h2`, `.type-section`, the
  secondary titles, the condition word (`.type-stamp`) and a score set as a figure
  (`.type-figure`, §XV). Source Sans 3 (`--font-sans`) sets everything else: text, tables,
  controls and labels. The face separates the voices, and it reaches the page through those rules. Three call
  sites name the token themselves (`font-[family-name:var(--font-display)]`): the wordmark in the
  header and the footer, and the area names in `AreaStrip`. `.type-stamp` is the condition word
  and nothing else, in sentence case: beside the guidance, a report route's status word, the
  running head, a `Tag regime`. Besley (a Clarendon) and Archivo were the two voices from
  2026-11-10 to 2026-11-12 (Covenant). From 2026-10-05 to 2026-11-10 Archivo set every word and
  width separated the voices (a semi-condensed display, an expanded capitals stamp);
  `--font-stretch-display` and `--font-stretch-stamp` are 100% now, kept so the rules that read
  them needed no edit. NEVER: add another family, or set a width at a call site (`font-stretch`,
  `font-variation-settings`). Before 2026-10-05 a serif set the headings while the weekly call
  stayed in the sans, so the lesser lines spoke in the stronger voice; the display voice sets the
  guidance as well. Labels stay sentence case: the Forecast contract's tracked uppercase label
  was not adopted, because capitals are for stamps only (below).
- **Chivo Mono is the one monospace** (`--font-mono`), for the figures §XV assigns it and for
  the paste previews; it falls back to Source Sans 3 for arrows. Satori's cards draw the two
  voices from static instances of the site's own files (`scripts/generate-og-fonts.mjs`,
  `lib/image/ogFonts.ts`): Bricolage Grotesque 700 for the call and 800 for the condition word
  and the figures, at optical size 48, and Source Sans 3 400 and 600 for the text. They drew
  Archivo, in semi-condensed, normal and expanded instances, until 2026-11-12. Re-measure `lib/image/textFit.ts` when a
  face changes.
- **Capitals are for stamps.** A stamp is a short, fixed status mark that is not read as a sentence:
  `.type-badge`, timeline badges, the historical banner, a `<kbd>`. The condition word is not
  one: it was expanded capitals until 2026-11-10 and is a name in sentence case now. Every other
  label — section eyebrows, field names, table headers,
  `<dt>`s — is sentence case through `.type-eyebrow`. A page where every label shouts has no way
  left to mark the one that should.
- **Tracking goes with the capitals.** `0.08em`–`0.2em` is spacing for caps; on lowercase it reads
  as a typo. A sentence-case label carries at most `0.02em`.
- **Nothing clickable is capitalised or tracked.** A link or button reads as the sentence it
  completes. `tests/typeRegister.test.tsx` holds this for `<a>` and `<Link>`.
- **Hand-rolled labels use the class.** `text-xs uppercase tracking-wide text-slate-500` beside a
  `<dt>` is `.type-eyebrow` spelled out at a different size; spelling it out is how a case change
  made once in the stylesheet misses nine call sites.
- **Monospace is for figures that must align** — columns of numbers, a code sample. A control
  label ("Workstream:") in the mono face is decoration borrowing the register of data.
- **Colour marks state, not labels.** The regime ink marks the condition word (§XVI); the crossed
  red and the clear ink mark lines and states. Three labels in three hues say "these three are different
  kinds of thing" when they are three rows of one list.
- **Draw each encoding once.** A fact already carried by position and a key does not also need a
  box, a hue and a case. When a block has a border *and* a coloured heading *and* capitals, pick
  one.
- **Print each fact once per page** (2026-10-09, `docs/decisions/feature-log/01-product-surfaces.md` §1.1.63). A fact
  restated in another element at the same level of detail is clutter: a sentence over the control
  that shows the same selection, a banner over the section that says it, a score in five places.
  Keep the richer form (a chart or bar over a sentence, a control over a sentence describing its
  state) and, when the removed copy was a visual's only text, an sr-only version. A summary over
  its detail stays. Check both widths first: two elements are duplicates only where both show.
- **Labels on a chart are laid out for the width they are drawn at.** The server cannot measure
  a track, so compute the layout for each width the component is actually drawn at and let a
  container query choose (`ScoreLadder`); computing for the narrowest width and applying it
  everywhere stacks labels that had room to spare.

## XIX. Reading order and narrative progression (Document order = visual order)

Added 2026-09-24 with DD-031 (`docs/design-debt-prioritized.md`).

- **Document order is reading order.** Primary narrative sections on responsive views must never use CSS flex ordering hacks (`order-3 md:order-2`) to rearrange the page sequence.
- **The cognitive loop is fixed.** On the weekly brief, the reader decodes the week in decision order:
  1. The guidance (the call and immediate posture)
  2. What changed (the four public signals and deltas)
  3. What it changes (consequences by business area)
  4. What would flip it (threshold proximity and watch conditions)
  5. What to do now and how to share it
- Reversing steps 2 and 3 on phones to chase a layout quirk broke the logical narrative and violated WCAG 1.3.2 (Meaningful Sequence): a screen reader or keyboard tab navigation met the consequences before knowing what moved.
- If a mobile layout feels awkward, re-architect the vertical spacing and visual hierarchy—do not scramble the DOM order.

## XX. Action placement vs. comprehension (Comprehension before export)

Added 2026-09-24 with DD-033 (`docs/design-debt-prioritized.md`).

- **Comprehension precedes the export artifact.** On direct answer and explanation pages (`/answers/*`), a reader arriving from search or a deep link must see the direct answer, the operational rules, and the threshold lines before encountering a full-width block asking them to copy the brief into a meeting note. Asking a first-time reader to copy an answer they have not yet evaluated creates cognitive dissonance.
- **Quick-action parity for returning operators.** To preserve under-60-second decision transmission for power users who already know what they want, expose a compact copy CTA in `SecondaryPageHeader`'s `actions` slot. Power users copy at the top; evaluators read the evidence and copy at the bottom.

## XXI. Spacing ownership

- Use 8px for closely related labels, 16px for compact groups, and the layout-role tokens for page composition. `--layout-section-gap` is 24px on phones and 32px from `sm`; `--layout-content-gap` and `--layout-card-padding` are 16px / 24px.
- `weather-page-stack` separates sections; `weather-section-stack` separates a section's heading and content and resets direct-child block margins so they cannot double the gap. `weather-inset` supplies framed-card padding.
- Unboxed report and secondary-page sections align with the page column. The report row owns boundary padding; do not add another inset on its top-level `weather-panel`. Nested cards retain their insets.
- A control shelf aligns label columns and option groups. On phones, omit a shelf whose controls already live in the header unless it has a current constraint to show.
- Check rendered section edges and distances on mobile and desktop. A uniform search-and-replace of every gap loses the distinction between a label, a content group and a new section.
- Share groups use a centered 72rem column; the shared format picker caps its preview at 48rem and aligns the tab grid to that width. Keep the subscription and return link on the same page edge.
- Timeline month and zoom buttons and the draggable track keep 44px touch targets. Compact sizes apply only from `sm` with a fine pointer and hover support.

## XXII. What the font files draw (type as material)

Added 2026-10-07 with DD-060 (`docs/design-debt-prioritized.md`). The habit is a type designer's
and font engineer's: Wei Huang (Work Sans, Fragment Mono) and the foundries that circle works
with. A page can only set what the font file contains, so read the file, not the font's name.
The shipped files are `public/fonts/*.woff2`: Source Sans 3 and Bricolage Grotesque since
2026-11-12, and Chivo Mono. (Archivo and Besley were removed that day, and the share cards' static
instances in `public/fonts/og` were rebuilt from the new two.) Before relying on a glyph or a feature, list the
file's characters and features with fontTools, the same Python `scripts/generate-og-fonts.mjs`
needs (swap the glob for `bricolage-grotesque-variable` or `chivo-mono-variable` to read another
face):

```
python3 -c "import glob; from fontTools.ttLib import TTFont; f=TTFont(glob.glob('public/fonts/source-sans-3-variable.*.woff2')[0]); print(''.join(sorted(chr(c) for c in f.getBestCmap() if c > 0xFF))); print(sorted({r.FeatureTag for r in f['GSUB'].table.FeatureList.FeatureRecord}))"
```

- **A character the face does not draw is set in another typeface.** Each missing character falls
  back, glyph by glyph, to whatever the reader's OS has: a different weight, size and baseline on
  every platform.
  - **What the files draw.** Since 2026-10-07 (DD-060) the files are subset to the site's text,
    and `app/styles/fonts.css` records the build. Source Sans 3 draws → ← ↑ ↓ ↔ ↕ ≤ ≥ ≈ ≠ Δ ‰ −.
    Chivo Mono draws the same less the arrows, and `--font-mono` falls back to Source Sans 3 for
    those. Bricolage Grotesque draws → ← ↑ ↓ but no ↔ ↕ or Δ, so its `unicode-range` is exactly
    what its file covers and `--font-display` lists Source Sans 3 behind it for the rest.
  - **What they don't draw.** ▾ ✓ ✕ ⌘, or any other symbol. In chrome, draw the mark with the
    icon set (`app/components/uiIcons.tsx`). The disclosure chevron is a masked SVG
    (`app/styles/controls.css`), never a triangle glyph. `tests/craftDetails.test.ts` rejects
    ▾ ▸ ↗ ✓ ✔ ✕ ✗ under `app/`.
  - **When the copy needs a new symbol, fix the file, not the copy.** Add the codepoint to the
    subset command and the `unicode-range` in `fonts.css`, and ship the file under its new hashed
    name. `tests/fontAssets.test.ts` checks that the text face and Chivo Mono draw the symbols
    the copy uses, that the stylesheet routes them there, that the two preloads are the Source Sans
    3 and Bricolage Grotesque files, and that each file is named by its SHA-256, since
    `public/sw.js` never refetches a `/fonts/` URL. Then run `scripts/generate-og-fonts.mjs` so
    the share cards draw it too. In copy, a word still beats a symbol where it reads as well
    ("at or below").
- **No style the files don't ship.** All three faces are upright only, so `italic` makes the browser
  slant the roman: a faux oblique that reads as a rendering fault. Mark a quotation with quotation
  marks, and a prompt with the muted ink. The one exception is the chat preview's `<em>`
  (`app/share/chatPreview.tsx`), which shows how a chat client renders `_text_`. The test rejects
  the `italic` utility and `font-style: italic` elsewhere.
- **No feature the files lack.** Source Sans 3 keeps `pnum`, `frac`, `liga`, `case` and `zero`,
  and has no `tnum` because its default figures are already tabular (`tabular-nums` changes
  nothing there; `pnum` is what would). Chivo Mono keeps `tnum`, `pnum`, `frac`, `liga` and
  `zero`. Bricolage Grotesque keeps `tnum`, `pnum`, `frac` and `case`, with proportional figures
  by default and no `liga` or `zero`; its axes are weight, 500 to 800, and optical size, 12 to 96,
  which the browser sets from the font size, so a heading takes the text cut and a score figure
  the display cut. `case` is on for `.type-badge`, where it lifts the hyphen to sit between capitals;
  `.type-stamp` carried it while the condition word was capitals (until 2026-11-10). The files
  have no small capitals or old-style figures, so
  `font-variant-caps: small-caps` would synthesize scaled capitals, lighter than the real ones
  beside them. Capitals stay full size and tracked (§XVIII).
- **The figure register absorbs the sign.** In Source Sans 3 `+` and `−` take the 497-unit figure
  width but the hyphen is 311, so a figure signed with a hyphen-minus doesn't line up down a
  column; in Bricolage the figures themselves are proportional until `tabular-nums`. In
  Chivo Mono, `-`, `+` and `−` share the 600-unit advance. That is one more reason a column of
  signed figures is mono (§XV).
- **A first visit draws a stand-in sized to the shipped face, not system-ui.** Measured 2026-10-07
  on `/` with the font requests held back in Playwright: with system-ui as the stand-in, the swap
  reflowed the decision chips at 430px, 0.108 by the layout-shift formula over element rects, and
  a metric-matched Arial took it to 0.0001. Since 2026-11-12 `"Source Sans 3 Fallback"` in
  `fonts.css` is Arial or Liberation Sans at `size-adjust: 94.19%`, with Arial Bold faces at
  89.87% (600) and 92.54% (700–900), each scaled so its average advance matches Source Sans 3's on
  the letter-frequency string next/font uses, and each override the face's own hhea metric over
  that scale. A synthetic bold does not widen the glyphs, so every weight a page sets needs a real
  face here. A `ch` width is measured on "0", which no override matches. Re-measure when a face or
  `--font-sans` changes.
- **The display face has stand-ins of its own:** `"Bricolage Grotesque Fallback"`, second in
  `--font-display`. Arial Bold, the nearer shape for a grotesque (Besley's was Georgia), at
  `size-adjust: 100.65%` for 500 to 700 and 102.03% for 800 to 900, measured at optical size 32.
  `fonts.css` records the measurement; no layout-shift figure has been taken for the Forecast
  swap yet.

## XXIII. Motion a reader doesn't notice

Added 2026-10-07. This extends §I and §IX with the habits of the interaction designers whose work
this site's controls most resemble: Rauno Freiberg, Emil Kowalski, Jakub Krehel and Vercel's Web
Interface Guidelines. On a control someone uses every week, the best transition is often none,
and the rest are short and interruptible.

- **Name what moves.** Use `transition-colors`, `transition-transform`, or the bare `transition`
  utility, which is a named list. Never use `transition-all`: on the page shell it animated the
  `sm` breakpoint's padding while a window resized. `tests/craftDetails.test.ts` rejects it.
- **Feedback on a repeated action is a state change, not an animation.** A copy confirmation swaps
  its label and a tab switch swaps its content. By the tenth use, a transition on a repeated action
  is felt as latency. J and K jump to the next section (`scrollIntoView({ behavior: "auto" })` in
  `KeyboardShortcuts.tsx`) rather than glide; a scroll the page makes on its own, like the phone
  chip row keeping its chip in view, may still go through `scrollBehaviorFor(true)`.
- **Use transitions, not keyframes, for anything a reader can reverse partway:** a disclosure, a
  hover, a press. A transition retargets from where it is; a keyframe animation restarts.
  Keyframes are for one-way entrances and loading shimmer.
- **Keep it short and ease-out.** Feedback runs under 200ms, and a panel or sheet under 300ms,
  entering with `ease-out`. An exit is quicker than its entrance.
- **Every new transition has a reduced-motion end state:** `motion-reduce:transition-none` on the
  element, or a `prefers-reduced-motion` block beside the rule.

## XXIV. Glyphs beside words (the concept icons)

Added 2026-10-09. Three concepts carry a glyph, and only these three: the four conditions, the five
decision areas, and where an area stands against its pause line. Everything else stays words.

| Concept | Glyphs | The one mapping | The one component |
| --- | --- | --- | --- |
| Conditions | Sunny `Sun`, Cloudy `Cloud`, Stormy `CloudLightning`, Freezing `Snowflake` | `REGIME_ICONS` (`lib/regimePresentation.ts`) | `ConditionIcon`, `ConditionLabel`, and `Tag regime` |
| Areas | Hiring `Users`, Roadmap `Route`, Fundraising `Landmark`, Spending `Wallet`, New bets `Sprout` | `DECISION_AREA_ICONS` (`lib/report/boundedDecisionRules.ts`) | `AreaIcon`, `AreaLabel`, `GovernedAreas` |
| Line state | crossed `Pause`, close `CircleDashed`, clear or restart met `Play` | `LINE_STATE_ICONS` (`lib/report/operatingCalls.ts`), state from `resolveLineState` | `LineStateBadge`, `LineStateIcon` |

The components live in `app/components/ui/conceptIcons.tsx`.

- MUST: put the glyph beside its words, never in place of them, and mark it `aria-hidden`. The words
  carry the meaning for a screen reader and for a paste.
- MUST: draw a concept through its component. A page that imports `Sun` or `Pause` from
  `lucide-react` for one of these concepts draws the right glyph until the mapping changes and that
  page does not. `tests/conceptIcons.test.tsx` rejects the import outside the three mappings (the
  theme toggle's sun in `uiIcons.tsx` is a lamp, not the weather).
- MUST: one size scale. 16px (`size-4`) inline, 20px (`size-5`) on a card such as the decision
  picker's choices or the comparison's period headings. Inside a scaled SVG, pass `width` and
  `height` in the drawing's units so the glyph lands at 16px at the drawing's cap (the conditions
  chart uses 12.5 units at its 256px cap).
- MUST: colour from the tokens the words already use, so shape and colour say the same thing. A
  condition draws in its regime ink (`data-regime` on the glyph resolves `--regime-ink`); a state
  in the line-state ink (the front red for crossed or close, the neutral ink for clear); an area in the text colour around
  it. The shape alone still says it in greyscale, which is what the `/history` band needed: its
  runs and key told Sunny, Cloudy and Freezing apart by colour alone.
- "Close" is the margin's own distance: within 5 points (`REGIME_CONFIDENCE_NEAR_THRESHOLD`). A
  restart line has a state only once it is met; short of it the distance stays plain text.
- A line in force is a stamp (§XIV): the badge is framed for a pause line crossed and a restart line
  met, unframed for a distance still to go.
- NEVER: a glyph in a plain-text artifact. Slack and email pastes, citations, RSS, `llms.txt` and
  `/brief.md` render words only; the same test holds them to it. The Satori share cards do not
  draw these glyphs either: lucide's components are client components that read a React context,
  which Satori cannot render, and a hand-copied vector table would be a second mapping.

## XXV. Decoration that encodes something

Added 2026-10-09 with `docs/decisions/feature-log/01-product-surfaces.md` §1.1.65, after a design audit of the
patterns generated interfaces reach for by default. Structure and decoration must encode something
true about the content. The site spends its boldness in one place, its signature: the record band
(§XXX), the conditions chart, the weather glyphs and the pause and play line states (§XXIV).
Everything else stays quiet.

- NEVER: an emblem beside a page heading. Seven pages drew one (a calibration curve, the operating
  loop, an editorial desk, a search radar, a decision shield, a toolkit playbook, valuation
  multiples) and none plotted anything on the page; they are deleted with their components. A
  drawing earns its place by drawing data: `TrendGlyph`, `ThresholdLadder`, the conditions chart.
- NEVER: a row of stat tiles, a large figure over a small label in a box. A figure set larger than
  the sentence beside it claims to be the page's point, and a row of them makes that claim three or
  five times. A page with one number to lead with sets it as its own line (`/comps` leads with the
  median multiple); every other figure is a `FactList` (`app/components/ui/factList.tsx`) in the
  text's size, beside what it qualifies. Its labels are sentence case.
- NEVER: a small label above a heading as a kicker. A kicker that restates the heading is deleted.
  One that carries a fact (the week, the period, the plan tier) moves into the heading's line or a
  stamp. Small labels stay where they label data: table column heads, `<dt>`s, form fields and
  legends, chart panels and navigation groups.
- NEVER: a closing "Next" card. A link a header tab, the footer or a sub-tab already carries is
  not repeated at the foot of the page. An action only that page knows is an inline link in its
  last section.
- MUST: headings and whitespace before boxes. A reading page keeps at most one boxed artifact; on
  `/` it was the call card until 2026-11-10, when the guidance block lost its box
  (`.weather-hero-card` draws no border, fill or shadow). A card inside a card is a list: set it as
  columns under headings. On `/operate` each step is a section under an h2 with a rule between
  them; the steps a reader acts on this week are open with no toggle, and only secondary content
  folds (§XII).
- MUST: draw a fact once (§XVIII). Stop, Start and Keep limited carry their colour on the list's
  name only, not also in a tinted box and a coloured edge.
- NEVER: an emoji in text that leaves the site, whether as a label's prefix or anywhere else. The
  label carries the meaning. `tests/conceptIcons.test.tsx` renders every share format, the meeting
  slide, the operator brief, the investor update and the weekly paste, and scans the source of every
  paste, slide, Slack and email builder.
- MUST: decoration only where it encodes meaning. No wash over the page ground, no gradient or
  specular on a control (controls fill from `--bg-raised` and `--bg-nested`, the primary from
  `--cta-fill`), no halo on hover, no coloured stripe across the top of a card, no accent discs on
  a slide. Condition colour stays where a condition is named: the condition word, the conditions
  chart, the record band and the homepage's sky.
- The sky is the one sanctioned gradient (2026-11-12, Forecast). It encodes the week's condition at
  the scale of the first screen, with the glyph and the word beside it, so a storm week and a sunny
  week look like different pages before a word is read. Its clouds are its one ornament: four
  blurred masses drifting by `transform`, still under reduced motion (§XXIII). No other surface
  takes a gradient, and the sky takes no glow.
- What stays, and why. Focus rings: they mark where the keyboard is. The skeleton shimmer: it says
  something is loading. The backdrop blur on the sticky strip, the phone tab bar and the command
  palette: it keeps their text legible over a scrolling page. The site's name inside the guidance
  block, on `/` and on a published week: that block is the one people crop and share, and every
  other page's header names the site already. Its regime rule went with its box on 2026-11-10;
  the condition word beside the guidance names the week in a crop.
- The week's word (2026-11-10). Beside the guidance and on a report intro the condition word is
  a boxless word in the condition's ink (`.weather-tag-placard`), set in the display voice
  (`.type-stamp`, §XVIII); on the homepage's sky it takes the sky's ink. A list of past weeks prints it the same way through `.weather-tag-regime`. From
  2026-10-21 to 2026-11-10 it was a placard: capitals on the condition's solid fill, in
  `--regime-on-accent` ink. The record band carries the solid condition colour on every page now
  (§XXX). The conditions chart lights the week's quadrant and dims the other
  three, so its colour field says which weather it is before the eye finds the dot.


## XXVI. Controls as instrument parts

Added 2026-10-13 with `docs/decisions/feature-log/01-product-surfaces.md` §1.1.73. A control is drawn as a part of
an instrument: what it is shaped like says how it works. The form is physical, the paint is not —
§XXV's ban on gradients and specular on a control stands.

- MUST: a segmented control is a well with keys in it. The track is a tone below the card
  (`--bg-nested`); the chosen key takes the raised fill and a strong border (`--bg-raised`);
  a key sinks while pressed (`translateY(1px)`). No part of it casts or insets a shadow
  (2026-11-10, DESIGN.md "Elevation & Depth"): until then the well was `--well-inset` and the
  chosen key `--elev-1`, the last depth on the paper. All of it lives on
  `.weather-segment-track` and `.weather-segment-option` in `app/styles/controls.css`, driven by
  the native radio's `:checked`, `:hover` and `:active`; `ui/segmentedControl.tsx` only lays the
  parts out. A tint was the whole selected state until now, and at 15% of the ink it barely
  separated from the track.
- MUST: every key carries a lamp, unlit until chosen. The choice then reads by form and by a mark
  as well as by fill, which is what a reader with low contrast sensitivity or a washed-out screen
  needs. It is a dot, so it is round (§XIV).
- MUST: options that are points on one ordered scale (runway bands, the funded stages) pass
  `ordinal`: a rule along the foot of the well with a tick under each key and a pointer under the
  chosen one. An option off that scale passes `apart` and stands after a divider with no tick:
  Bootstrapped is not a stage after Series B+.
- NEVER: a gradient, a specular edge, a texture or a coloured glow to make a control look
  physical, and no shadow on a key or a well. Its form is its border, its fill, the lamp and the
  1px press. A button's one shadow is `--elev-control` (§XIII, 2026-11-12), the same on every
  button, which says it can be pressed rather than drawing it as a part.
- Motion is the press only: 120ms on the transform, and none under reduced motion.
- MUST: the same parts outside a track. A stepper's ends are `.weather-step-key`s standing in a
  well around what they step (the week stepper, `app/components/home/WeekStepper.tsx`); the end
  with nothing beyond it sinks flat and unlit rather than drawing a faded copy of a key. Above the
  guidance the week stepper has drawn without its well or its keys' frames since 2026-11-10
  (`.weather-hero-period` in `app/styles/surfaces.css`): two nested boxes were the first thing in
  the reading column. A toggle
  button whose state is `aria-pressed` is a `.weather-key` (the calendar's months). An option in a
  picker's list carries the lamp (`.weather-choice-item`), not a check over an action-ink wash.
- NEVER: a translucent popup with nothing blurred behind it. At 95% the page's text read through
  the header's pickers and the calendar; a popup is opaque, or it blurs what it covers (§XXV keeps
  the blur where text must stay legible over a scrolling page).

## XXVII. Display or control

Added 2026-10-21. A **control** changes what the page shows or takes the reader somewhere: a
link, a button, a disclosure, a picker, a segment, a key, a field. A **display** states a fact and
does nothing when pressed: a stamp, a delta, a figure, a mark, a label, a callout, a chart. Each
cue below belongs to one side, and a reader learns the split from the first page they use. The
action colour is the ink (§XVI), which most displays are drawn in too, so these cues are what
tells a control from a display. From 2026-10-14 to 2026-11-10 it was the week's ink under a
regime shell, the same hue as the condition word.

| Cue | Belongs to | Notes |
| --- | --- | --- |
| The action colour: `--accent-action`, and the `sky-*` / `cyan-*` utilities folded onto it | controls | A display that names the condition takes `--regime-ink` from its own token (the condition word beside the guidance, the intro's status word, the running head), never through the action aliases |
| An underline | links | A term with a definition is a link to it, or plain text with the gloss beside it |
| The control radius (`--radius-lg`) with a frame | controls | §XIV: a framed display is a stamp at `--radius-sm`, a data tile at `--radius-md`, or unframed |
| A 1px rise under a fine pointer, or a press (`translateY`) | controls | |
| A chevron | disclosures and pickers | §XII |
| `cursor: pointer`, or any `hover:` change | controls | A row or a run that brightens under the pointer promises a click it does not answer |
| A lamp (a filled dot in a key) | controls, for the chosen option | A filled dot outside a key is a data mark (§XIV's mark table), drawn in ink or its condition's ink |
| The stamp frame (`.weather-tag`, `type-stamp`, `rounded-sm border`) | displays | A link drawn as a stamp reads as a label; give it the `pill` or `inline` variant (§X) |
| The line-state glyphs, the caveat diamond, the condition glyphs | displays | §XIV, §XXIV |

- MUST: draw a display in the ink roles (`--app-text`, `-secondary`, `-muted`, the `slate-*`
  utilities folded onto them), a condition ink, a line-state ink or the caveat ink. A callout
  that wants to stand apart takes a neutral frame (`border-slate-700/70` on a `slate-900/40`
  fill), not a tint of the action colour: under a Cloudy week before 2026-11-10 a sky-tinted note
  drew as a tan box beside the tan stamp and the tan Copy button, three different jobs in one hue.
- MUST: draw a data series, a marker line or a progress bar in ink (§XVI's ink-and-dash rule).
  A scatter in the action colour reads as a selection.
- A control's own state marks take the action colour: the current tab's rule, a picker's chosen
  item, a segment's lit lamp, a focused field's ring. They sit inside the control, and the guard
  reads them as part of it.
- NEVER: a display set in a control's box. The sticky strip's direction badge was a 28px icon in
  a 6px frame, the same shape as the download button three items to its right; it is a glyph now,
  unframed, beside the words it qualifies.
- NEVER: a control class on a display. `.weather-hub-chip` lifts on hover and sets a pointer; the
  toolkit cards wrapped one around the word "Tool", inside a card that was itself the link, so it
  read as a second button. A label inside a link card is a `Tag`.
- `tests/displayControlCues.test.ts` reads every component under `app/` and fails when an element
  outside any link, button, label or picker part carries the action colour, a `hover:` change or
  a control class, or when a link or button carries the stamp frame.

## XXVIII. Every frame is a screenshot

Added 2026-10-27 with `docs/decisions/feature-log/01-product-surfaces.md` §1.1.87. A reader shares a page in one of two
ways. On a phone it is the whole screen, wherever they stopped scrolling. On a laptop it is a box
dragged around one block. A page reads well as a screenshot only if both pictures name their source
and hold their unit whole. `bun run ui:frames` (scripts/ui-frames.mjs) walks every live route at a
1440×900 laptop and a 390×844 phone, frame by frame, and fails a route on either. It is not in the
gate, which has no browser: run it after layout work, beside `bun run ui:iterate`.

- MUST: name the site in every frame, and on a page that reports a reading, the date and the
  conditions too. The header hides on scroll, so past the first screen this is the running head's
  job (`app/components/runningHead.tsx`). A page hands it the facts by spreading
  `frameFactsAttributes(…)` (`lib/navigation/runningHead.ts`) onto its intro block: the report
  intro, the brief's call block, `/share`'s heading, a reading page's `SecondaryPageHeader`. A page
  that marks nothing is named by its h1. On 2026-10-27, before the head, 7 of 83 frames past the
  first screen named all three.
- MUST: keep a sticky row below the head and the header, not under them:
  `top-[var(--top-chrome-height,0px)]`, as the section chips and the report rail do. The head sets
  the variable to where the two end, so it follows the header in and out.
- MUST: fit every block a reader would frame in one phone frame under the head (about 810px). A
  block that is a list of units marks each unit `data-frame-block` (the `/signals` rows, the area
  rows, the published briefs, the `/concepts` pairs), and each unit carries its own labels: a
  phone row of the signals table says "Since Sep 30" over its change because the column head is
  hidden there. A block long by nature, opened on purpose, carries `data-frame-exempt` and the
  reason beside it.
- MUST: end a chart a reader crops in `ScreenshotCaption`, inside its border, with its period
  where the figure does not already print one: the record's phase map, the month strip, the score
  trends, the calibration chart, the signal panels, the `/concepts` charts and the payback chart.
- MUST: hide a screen-reader table behind a wrapper (`<div className="sr-only"><table>`), never
  with `sr-only` on the `<table>`. A table cannot shrink below its content, so a 1px one lays out
  at full width: one on `/concepts` made the phone page 651px wide and every screenshot of it came
  out zoomed out. `tests/uiFramesLib.test.ts` scans for it.
- SHOULD: from `xl`, set parallel blocks side by side rather than stacking them in a column whose
  prose stops at reading width. The homepage's two "what would change" questions, its readings
  beside what they leave out, and its record's spells beside its changes do this; a laptop frame
  then holds both halves of an answer.
- A heading left at the foot of a frame depends on where the reader stopped, and no layout removes
  it everywhere. The head names the section in the next frame; the audit reports the rest.

### Frames worth opening (2026-10-27, §1.1.88)

A frame that names its source is attributable; one people open also leaves them a question
and shows them where to look. What the research on images people engage with says, as rules here:

- MUST: carry the week's open question, how near the reading is to changing and to what. The
  margin names the conditions across the nearer line ("A common risk-appetite move from Freezing",
  `formatMarginReading` with the regime, the distance as a move the record makes since 2026-11-03; `regimeAcrossLine` in `lib/regimePhaseSpace.ts`), and the
  running head prints the same fact in four words (`formatNearestChange`), in the caveat ink when
  the call could change next week. A small, specific gap ("2 points from Freezing") is what
  provokes curiosity; a state ("Cloudy") does not. Screens only: pastes keep `formatMargin`.
- MUST: draw the claim the frame leads with. The brief's guidance block on a phone draws both
  scores as figures above the trust strip (`DecisionHero`'s `phoneFigure`): each number and where
  it stands against its pause line. Without a figure there a phone screenshot of the block was
  text alone. From `md` the block's right-hand column holds both scores, each over a ruled line
  with its lines named in place (`DecisionHero`'s `aside`, `ScoreLadder`'s `figure`, 2026-11-10).
  The conditions map held that column until then; it is in "What would change our mind"
  (`WhatWouldChangeSection`) at every width now. Last week's dot, which shows a move toward a
  line, is on the working ladder in "What changed this week".
- MUST: lead a section with its answer, before its evidence. `HomeSection`'s `lead` is the
  finding, set at `text-fluid-lg` between body and heading: a reader's eye reaches a frame's title
  first and keeps its claim. "Has this happened before?" leads with this spell beside the earlier ones
  (`describeSpellLengths` returns `{ lead, rest }`); "Why conditions are …" leads with the rule
  that answers it, over the table.
- MUST: keep a focal point at preview size where a frame can. Slack previews an image about 360px
  tall, so a phone frame shrinks to about 0.43 and a laptop frame to 0.4, and type under about
  9px there cannot be made out. The brief's section headings are 22px on a phone for this.
  `bun run ui:frames` reports, per route, how many frames keep one (`hasThumbnailFocal`); it is
  advisory, because a page's middle cannot all be large type.
- SHOULD: point a frame at where the rest is. The running head prints the page's address
  (`whether.work/signals`), short enough to type from a screenshot, and a 2px rule in the week's
  colour, which still says which weather it is when the words are too small to read.

### Sizes that hold at every width (2026-10-27, §1.1.90)

A size audit of eleven routes at 390px and 1440px found the page title the smallest heading on
four report pages on a phone (15px under 20px sections), page titles at five sizes from 15px to
48px, section headings at 13px to 26px, 215 pieces of phone text under 12px (29 under 10px, the
`/concepts` chart's labels at 5px), and the brief's decision lists at 13px. One step per role now:

- MUST: set a page title in `text-fluid-2xl` (24px on a phone, 34px wide) on every shell: the
  report intro (`CommandCenterNavBlock`), `.weather-secondary-title`, and the reading pages' h1s.
  The brief's call is the one exception, as its card's headline.
- MUST: set a section heading at 22px on a phone and 24px from `sm`
  (`text-[1.375rem] leading-tight sm:text-2xl`; `.weather-secondary-section-title` matches). The
  brief's own sections step to `text-fluid-xl` from `sm`. A heading styled as a small label
  (`type-eyebrow` on an h2) is a section heading at the wrong size.
- MUST: draw nothing on a phone under 12px. `text-fluid-nano` has a 12px floor; the ladder's line
  numbers are 12px. A chart whose coordinate box is wider than a phone draws a phone version
  rather than scaling its labels down (`adviceCorpusSection.tsx` draws a 360-unit drawing below
  `sm`); a fixed-size diagram sets its labels so they render at 10px or more.
- MUST: set the lines a reader acts on at `text-fluid-sm`, not caption size: the brief's "Conditions
  change if", "Pause if", "Restart when" and the chosen area's answer.
- MUST: keep the trust strip's phone line to one short phrase per cell. The basis warning prints
  its four-word form there (`ScoringBasis.warningShort`, "startup-market inputs left out"); the full
  sentence from `sm`, and always when a note explains a different published week.

## XXIX. How containers wrap and stack

Added 2026-11-03. The page frame answers to the viewport; everything inside it answers to its own
box. Until now about ninety layouts each chose a viewport breakpoint at which to set their children
side by side: two equal columns split at `sm` in 24 places, `md` in 12, `lg` in 7 and `xl` in 2. A
breakpoint reads the screen, not the room. The report intro split into a title column and an action
column at `lg`, which is where the report rail appears and takes 13rem of that room. On the
homepage, the two "what would change" answers stayed stacked until `xl`, though a 1024px laptop
holds both.

Three shapes in `app/styles/layout-shells.css` cover nearly every case. Each one decides from the
width it is given:

| Shape | For | Settings |
| --- | --- | --- |
| `weather-switch` | Two to four peers. They sit all side by side or all stacked, never 2 + 1. | `--col-min`: the narrowest a peer reads at |
| `weather-sidebar` / `weather-sidebar-start` | A main column and an aside of fixed width. The aside comes last or first. | `--aside`, `--main-min` (a share of the box, 55% by default, or a length) |
| `weather-grid` | A list of like items, filled in order. | `--col-min`, `--grid-max` (3 by default) |

- MUST: set a column change inside the page frame with one of these, or with a container query
  (`@container` on an ancestor, `@md:`-style variants) when the layout needs fixed steps. Four
  preset keys go two by two and then one row, which a fitted grid cannot promise. So does a row
  whose cells realign when they sit side by side (the report intro, the `/trust` source ledger).
  `tests/containerLayout.test.ts` rejects a viewport-keyed `grid-cols-`, `col-span-`, `row-span-`,
  `flex-row` or `contents` anywhere else.
- A layout stays keyed to the screen only when it is the frame (header, footer, report rail) or
  changes something else by the screen at the same moment. Examples are a figure swapped for
  another at `md`, a native select in place of a list on a phone, and a table whose column heads
  hide by the screen. The test names each such file with its reason, and fails when an entry no
  longer needs one.
- `--col-min` is a reading width, not a breakpoint: 10rem for a figure with its label, 13rem for a
  field or short card, 16rem (the default) for a card or paragraph, 20rem for a chart or long
  paragraph. Set it beside the shape, as `[--col-min:13rem]`; the test rejects one set anywhere
  else.
- NEVER: make a shape's direct child another shape. The child reads its own `--col-min` for its
  parent's threshold. Wrap the inner one, or use a plain `flex flex-wrap` cluster inside a card.
- Content that wraps on its own widths (stamps, links, facts beside each other, an input and its
  button) is a cluster: `flex flex-wrap` with a gap, and `grow-[999] basis-56` on the part that
  should take the room. It needs no breakpoint at all.
- The shapes live in `@layer components`, so a gap or `items-start` on the same element wins. The
  one exception is the sidebar's `--main-min`, which is `!important`, because a `min-w-0` on the
  main column would otherwise cancel the stacking.

## XXX. The record band

Added 2026-11-10 with the Covenant rebuild (`docs/design/rebuild-covenant.md`). The record band is
the strip under the header of every route: every month-end reading since the record began, drawn
once. With the homepage's sky, it is one of the two places colour commits at page scale (§XVI,
§XXV). Since 2026-11-12 it is the Forecast's weather strip: each field is a small sky, and the
readout shows the month as a card with its scores as large figures.

Its parts are `app/components/recordBand.tsx` (the server drawing), `lib/report/recordBand.ts`
(its model), `lib/report/recordBandCodec.ts` (the month tokens and the line geometry),
`app/components/recordBandReadout.tsx` (the month readout), `app/styles/record-band.css` and, on
`/history`, `app/history/recordPlateCanvas.tsx`. `tests/recordBand.test.ts` holds the drawing and
the frame.

- MUST: mount it once, in `app/layout.tsx`, directly under `GlobalHeader`. A route never mounts a
  second one; `/history` changes the one it has.
- MUST: make every mark a reading. A field is a stretch of conditions, filled from `data-regime`
  through `--regime-accent`. Two bundles of fine lines cross the fields, risk appetite above and
  funding pressure below, so easier is up, as on every other drawing. The band carries no
  decoration.
- MUST: give a condition a line pattern as well as a fill, so a stretch reads without its colour:
  plain for Sunny, a slow wave for Stormy, a tight ripple for Cloudy, a zigzag for Freezing. Where
  the band is narrower than 46rem every line is plain: at two pixels a month a pattern aliases
  into noise.
- MUST: keep the two line inks the same in both themes, as the fills are: `--band-line-on-light`
  on Sunny, Cloudy and Freezing, `--band-line-on-dense` on Stormy, the one dense fill since
  2026-11-12 (`isLightField`). A field's sky lifts its top a fifth toward the paper, never more,
  so the line ink chosen for its fill still holds at the top.
- MUST: keep the two records apart. The fields and lines are the month-end readings, scored with
  today's formula. The marks under the band are the briefs as published, one each, from a dashed
  line where publication began; a week with no brief has no mark. The caption counts each record
  under its own name. Where a brief and its month-end name different conditions,
  `findRecordDifferences` states both facts and claims no cause.
- MUST: draw the still band on the server from the bundled month-end series, with no request and
  no script. The two client pieces read the band's own `data-months` attribute and take their
  geometry from `recordBandCodec.ts`, never from `recordBand.ts`, `timeMachineCache` or
  `publishedBriefs`: a client component that reaches a data module ships the data.
- The month readout makes the band a slider once the page is live. The caption names the month
  under the pointer, its conditions and its two scores. Arrow keys step a month, or a year with
  Shift; Home and End go to the ends; a click or Enter opens the brief as it read that month;
  Escape, leaving or blurring restores the caption. The strip sets `touch-action: pan-y` (§VI).
- The readout's card (`[data-record-band-reading]`) is drawn on the server, empty and hidden, and
  filled by the readout: the month, the condition word with its glyph (`ConditionIcon`, §XXIV)
  and both scores in `.type-figure`. It is `aria-hidden`; the slider's `aria-valuetext` carries
  the same words. It slides with the pointer without measuring itself (`--at`, the cursor's share
  of the band, sets its left edge and moves it back by the same share of its own width), and takes
  `width: max-content`, or near the right end it was squeezed into what was left of the band.
- MUST: hand the month's condition to the homepage's sky while it is read (`data-regime` on
  `[data-hero-sky]`, resolved by the data-regime map and cross-fading in 300ms, §XVI) and take it
  back on every way the reading ends. The guidance on the sky does not change; the card names the
  month the sky shows.
- The drawn strip is 4.25rem tall where the band is narrower than 46rem and 9.375rem from there.
  On `/history` it opens to `clamp(9rem, 21vw, 18.75rem)`: `RecordPlateCanvas` renders the
  `data-record-plate` marker
  the stylesheet keys on, so the height is in the first paint, then lays a canvas over the same
  fields with a denser engraving that opens under the pointer. The canvas stays out below 736px
  and draws one still frame under reduced motion.
