# UI/UX standards

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
- MUST: Overscroll containment. Any element with its own scrollbar (modals, sidebars) MUST have `overscroll-behavior: contain` to prevent the body from scrolling when the element hits the edge.
- Compact shared controls (36px) require both a fine pointer and hover support; a wide touch screen keeps the 44px floor. Native text fields keep at least 16px text on coarse pointers, including tablets and landscape phones.
- The desktop header keeps all six loop tabs from `md`; Search stays an icon until `xl` to leave room for the wordmark and navigation. Below `md`, the bottom bar owns Search.
- Section names remain readable: the desktop outline wraps long names; the mobile index uses the shared `text-fluid-xs` size and contains horizontal overscroll.
- User-facing metadata uses `text-fluid-nano`, which bottoms at 11px on phones; explanatory text and copy previews use `text-fluid-xs` or larger. All-caps labels inside an aria-hidden graphic may go to 10px (`RegimeRadar` quadrants); text inside a viewBox-scaled SVG is judged at rendered size, not `font-size`.

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
- MUST: make the page intro state the week, not the route (2026-09-25). The status word (the
  regime label) leads, in the regime ink at the reading's own size; the trust headline and record
  date follow in the meta half of the same line; the H1 is secondary below `lg` — the bottom tab
  bar owns the route name on a phone. No kicker: "Weekly brief" above every H1 restated the route
  the header, the sidebar and the tab bar already name. The operating-loop glyph renders from `lg`
  up only — below that its four steps are the tab bar's tabs, and under the intro it was a second
  navigation band.
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
  derivation and the detail behind it folds (2026-10-07, `docs/feature-specs-current.md` §1.1.48).
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
it — cards, surfaces, sheets, dialogs — together with the voice (the semi-condensed display
width, the shadow ladder, the ease-out motion). Sharpness carries information only while it is the
exception, so the soft tier must be visibly softer than the sharp one, and neither register may
take the other's job.

- MUST: take the radius from the role, through the token — never from taste at the call site.

  | Tier | Token | How it is applied | What lives here |
  | --- | --- | --- | --- |
  | Stamp | `--radius-sm` (2px) | `rounded-sm`, `.weather-tag`, `.weather-chip`, `.weather-hub-chip` | status, verdict, regime, confidence and analog badges; chips; tags |
  | Data | `--radius-md` (4px) | `rounded-md`, `rounded` | stat tiles, rule segments, trust lanes, loading stages |
  | Control | `--radius-lg` (6px) | inherited from `.weather-button`, `.weather-button-primary`, `.weather-pill`, `.weather-cta`, `.weather-input`, `.weather-control`; `rounded-lg` on a control that has no class | every button, link-button, tab, input, select, disclosure trigger, toast action |
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
- NEVER: a named container on the control radius, and never a `rounded-*` utility on one. The
  classes that own a card or surface radius are `.weather-card`, `.weather-surface`, and the hub
  section, card and link-card shells; they are `xl` or
  `2xl`, and a shell at 6px reads as a giant button and stops separating the furniture from the
  controls inside it. `.weather-panel` is a layout tier and owns no radius, so a panel that draws
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
  (the 2026-09 UI facelift, Phase 2), not a register change.

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

Scope: every surface that tints, rules, or labels itself by the week's regime.

- MUST: take the regime's colour from the two tokens, never from a hue picked at the call site.
  `--regime-accent` is the 500-level hue the regime plane and the posture stripe draw in
  (`REGIME_HEX_COLORS`), for tints, rules and washes through `color-mix`. `--regime-ink` is the
  same hue as text — the pastel that reads on the dark surfaces, the 700-level that clears 4.5:1
  on the light ground. Both resolve from a `data-regime` attribute (`tokens.css`), which the page
  shells and `DecisionHero` carry via `regimeDataAttribute` (`lib/regimeAccent.ts`). Every
  `ReportShell` caller passes `regime` from its report data — `regimeAccentStyle` was written for
  the section eyebrows and rules to read the week, and until 2026-09-15 no report page fed it, so
  every shell rendered slate under a call its own intro line named. `/history/compare` is the one
  deliberate exception: two weeks on one page, and keying it to either would mislead.
- SHOULD: keep the regime ink for section-level marks — the `ReportSection` eyebrow and rule, and
  `.type-eyebrow-section` on a hand-rolled section's own eyebrow (`/signals`, `/history`,
  `/operate` carry these). A card's own eyebrow inside a section is neutral (`.type-eyebrow`
  alone); `/signals` carried sky card eyebrows beside a rose section eyebrow, two accents for one
  hierarchy. Sky stays for what it means elsewhere: links, and the cards whose border is already
  sky.
- MUST: keep the four regime hues off the action accent. Sky is what every link, button and focus
  ring is drawn in, and until 2026-09-16 Stormy was sky-500 — under that call the regime and the
  controls were one colour. Stormy is violet (`#8b5cf6`, ink `--color-semantic-stormy-fg`);
  `tests/regimeColourContract.test.tsx` fails if a regime lands back on the sky ramp.
- MUST: paint the page atmosphere from `--regime-atmosphere`, via `.weather-regime-ground`, on
  both shells. The brief's container and the report backdrop each held a regime → tint table of
  their own — the report one had Sunny in teal and never faded, so the ground under every card on
  every report route was lifted to a grey and the depth ladder lost half its separation.
- MUST: key the report intro (`CommandCenterNavBlock`, `.weather-page-intro`) to the regime like
  the hero: wash, border and top edge from `--regime-accent`, the status word in `--regime-ink`.
  It was plain slate under a status line that named the week, so `/` showed a colour and every
  other route showed none.
- NEVER: print text in `--regime-accent`. At 12–13px on the light ground it sits near 3:1; the
  section eyebrows did this until 2026-09-15.
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
  no capture had shown.

## XVII. Responsive diagrams

- Keep prose labels in HTML for flow diagrams (`OperatingLoopGlyph`), so labels wrap at
  mobile widths and text zoom. SVG is for the artwork, not a fixed-width page of text.
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

- **One family, three widths** (since 2026-10-05; `app/styles/fonts.css`). Archivo sets every
  word. Width is what separates the voices, through the tokens and never by hand:
  normal width for text, tables and controls; `--font-stretch-display` (semi-condensed) for the
  call, `h1`/`h2`, `.type-section` and the secondary titles; `--font-stretch-stamp` (expanded)
  for `.type-stamp`, which is the regime word and nothing else — the hero's tag, a report
  route's status word, the sticky strip, the cards' chip. A width the role does not assign
  (`font-stretch` or `font-variation-settings` at a call site) is a fourth voice. NEVER: add a
  serif or a second sans; the serif headings were the stronger voice set on the weaker lines.
- **Chivo Mono is the one monospace** (`--font-mono`), from the same foundry, for the figures
  §XV assigns it and for the paste previews. Satori's cards use static instances of the same
  widths (`scripts/generate-og-fonts.mjs`, `lib/image/ogFonts.ts`); re-measure
  `lib/image/textFit.ts` when a face changes.
- **Capitals are for stamps.** A stamp is a short, fixed status mark that is not read as a sentence:
  `.type-badge`, the regime tag in the hero, the sticky strip's call, timeline badges, the
  historical banner, a `<kbd>`. Every other label — section eyebrows, field names, table headers,
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
- **Colour marks state, not labels.** The regime ink marks a section (§XVI); caution, easing and
  the accent mark lines and states. Three labels in three hues say "these three are different
  kinds of thing" when they are three rows of one list.
- **Draw each encoding once.** A fact already carried by position and a key does not also need a
  box, a hue and a case. When a block has a border *and* a coloured heading *and* capitals, pick
  one.
- **Print each fact once per page** (2026-10-09, `docs/feature-specs-current.md` §1.1.62). A fact
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
The shipped files are `public/fonts/*.woff2`. Before relying on a glyph or a feature, list the
file's characters and features with fontTools, the same Python `scripts/generate-og-fonts.mjs`
needs:

```
python3 -c "import glob; from fontTools.ttLib import TTFont; f=TTFont(glob.glob('public/fonts/archivo-variable.*.woff2')[0]); print(''.join(sorted(chr(c) for c in f.getBestCmap() if c > 0xFF))); print(sorted({r.FeatureTag for r in f['GSUB'].table.FeatureList.FeatureRecord}))"
```

- **A character the face does not draw is set in another typeface.** Each missing character falls
  back, glyph by glyph, to whatever the reader's OS has: a different weight, size and baseline on
  every platform.
  - **What the files draw.** Since 2026-10-07 (DD-060) the files are subset to the site's text,
    and `app/styles/fonts.css` records the build. Archivo draws → ← ↑ ↓ ↔ ≤ ≥ ≈ ≠ Δ ‰ −. Chivo
    Mono draws the same less the arrows, and `--font-mono` falls back to Archivo for those.
  - **What they don't draw.** ▾ ✓ ✕ ⌘, or any other symbol. In chrome, draw the mark with the
    icon set (`app/components/uiIcons.tsx`). The disclosure chevron is a masked SVG
    (`app/styles/controls.css`), never a triangle glyph. `tests/craftDetails.test.ts` rejects
    ▾ ▸ ↗ ✓ ✔ ✕ ✗ under `app/`.
  - **When the copy needs a new symbol, fix the file, not the copy.** Add the codepoint to the
    subset command and the `unicode-range` in `fonts.css`, and ship the file under its new hashed
    name. `tests/fontAssets.test.ts` checks that each face draws the symbols the copy uses, that
    the stylesheet routes them to it, and that each file is named by its SHA-256, since
    `public/sw.js` never refetches a `/fonts/` URL. Then run `scripts/generate-og-fonts.mjs` so
    the share cards draw it too. In copy, a word still beats a symbol where it reads as well
    ("at or below").
- **No style the files don't ship.** Both faces are upright only, so `italic` makes the browser
  slant the roman: a faux oblique that reads as a rendering fault. Mark a quotation with quotation
  marks, and a prompt with the muted ink. The one exception is the chat preview's `<em>`
  (`app/share/chatPreview.tsx`), which shows how a chat client renders `_text_`. The test rejects
  the `italic` utility and `font-style: italic` elsewhere.
- **No feature the files lack.** The files keep `tnum`, `pnum`, `frac`, `liga`, `kern`, `case`
  and `zero`. `case` is on for the stamps (`.type-badge`, `.type-stamp`), where it lifts the
  hyphen to sit between capitals. The files have no small capitals or old-style figures, so
  `font-variant-caps: small-caps` would synthesize scaled capitals, lighter than the real ones
  beside them. Capitals stay full size and tracked (§XVIII).
- **The figure register absorbs the sign.** In Archivo the hyphen is 333 units wide and `+` is
  636, so signed figures set in the sans don't line up down a column, even with `tabular-nums`. In
  Chivo Mono, `-`, `+` and `−` share the 600-unit advance. That is one more reason a column of
  signed figures is mono (§XV).
- **A first visit draws a stand-in sized to Archivo, not system-ui.** Measured 2026-10-07 on `/`
  with the font requests held back in Playwright (dev server; system-ui was Inter in that
  container): the swap reflowed the decision chips at 430px, 0.108 by the layout-shift formula
  over element rects (0.044 in the one run Chrome's `layout-shift` observer attributed it; it
  reported 0 on the rest), and 0.008 at 1280px. `"Archivo Fallback"` in `fonts.css` (Arial or
  Liberation Sans at `size-adjust: 98.81%`, and Arial Bold at 88.1% for the 87.5% display width)
  sets the page's copy within about 1% of Archivo. After: 0.0001 at 430px and 0.009 at 1280px
  (observer 0.0000 and 0.0001). The 1280px remainder is a `max-w-[64ch]` paragraph: `ch` is
  measured on "0", which no override matches. Semibold and bold at normal width have their own
  Arial Bold faces (95.02% for 600, 98.39% for 700–900): on the regular face alone they were
  synthetic bold, which does not widen the glyphs, and set 3–8% narrower than Archivo; with them a
  20px line measures −0.2% (600) and −0.3% (700) in headless Chromium. Every weight a page sets
  needs a real face here, not only the ones measured on `/`. Re-measure when a face or
  `--font-sans` changes.

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
| Line state | crossed `Pause`, close `CircleDashed`, clear or resume met `Play` | `LINE_STATE_ICONS` (`lib/report/operatingCalls.ts`), state from `resolveLineState` | `LineStateBadge`, `LineStateIcon` |

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
  in the caution ink (crossed, close) or the easing ink (clear); an area in the text colour around
  it. The shape alone still says it in greyscale, which is what the `/history` band needed: its
  runs and key told Sunny, Cloudy and Freezing apart by colour alone.
- "Close" is the margin's own distance: within 5 points (`REGIME_CONFIDENCE_NEAR_THRESHOLD`). A
  resume line has a state only once it is met; short of it the distance stays plain text.
- A line in force is a stamp (§XIV): the badge is framed for a pause line crossed and a resume line
  met, unframed for a distance still to go.
- NEVER: a glyph in a plain-text artifact. Slack and email pastes, citations, RSS, `llms.txt` and
  `/brief.md` render words only; the same test holds them to it. The Satori share cards do not
  draw these glyphs either: lucide's components are client components that read a React context,
  which Satori cannot render, and a hand-copied vector table would be a second mapping.
