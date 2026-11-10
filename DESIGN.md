---
name: Whether
description: Weekly operating guidance for startup leaders, set as a dated statement on paper whose only ornament is the record
colors:
  paper: "#ecf0e8"
  paper-sheet: "#f4f7f1"
  paper-raised: "#fafcf8"
  paper-nested: "#e1e7db"
  ink: "#10201a"
  ink-secondary: "#2b3b33"
  ink-muted: "#40524a"
  crossed-ink: "#b81f27"
  crossed: "#c4242b"
  crossed-tint: "#f6e2df"
  night: "#0c1511"
  night-sheet: "#111b16"
  night-raised: "#1a271f"
  night-nested: "#09110d"
  night-ink: "#e6ece2"
  night-ink-secondary: "#c5d0c7"
  night-ink-muted: "#a3b2a9"
  night-crossed-ink: "#f0666a"
  night-crossed: "#e5484d"
  night-crossed-tint: "#2a1719"
  sunny: "#e0a81c"
  cloudy: "#9a5b1e"
  stormy: "#8f9be0"
  freezing: "#2a4fa8"
  sunny-ink: "#765600"
  cloudy-ink: "#8a4f16"
  stormy-ink: "#3f47b5"
  freezing-ink: "#1f3f8f"
  night-sunny-ink: "#f0c95a"
  night-cloudy-ink: "#dba463"
  night-stormy-ink: "#b9c1ff"
  night-freezing-ink: "#93b2f5"
  band-line-on-light: "#10201a"
  band-line-on-dense: "#ecf0e8"
typography:
  guidance:
    fontFamily: "Besley, Besley Fallback, Georgia, Archivo, serif"
    fontSize: "clamp(1.75rem, 1.2rem + 2.2vw, 3.25rem)"
    fontWeight: 700
    lineHeight: 1.06
    letterSpacing: "-0.018em"
  figure:
    fontFamily: "Besley, Besley Fallback, Georgia, Archivo, serif"
    fontSize: "5.75rem"
    fontWeight: 800
    lineHeight: 0.9
    letterSpacing: "-0.03em"
    fontFeature: "tnum, lnum"
  condition:
    fontFamily: "Besley, Besley Fallback, Georgia, Archivo, serif"
    fontSize: "2.125rem"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.01em"
  page-title:
    fontFamily: "Besley, Besley Fallback, Georgia, Archivo, serif"
    fontSize: "clamp(1.625rem, 1.15rem + 1.8vw, 2.125rem)"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.015em"
  section:
    fontFamily: "Besley, Besley Fallback, Georgia, Archivo, serif"
    fontSize: "clamp(1.375rem, 1rem + 1.1vw, 1.625rem)"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.012em"
  area-name:
    fontFamily: "Besley, Besley Fallback, Georgia, Archivo, serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1
  title:
    fontFamily: "Archivo, Archivo Fallback, system-ui, sans-serif"
    fontSize: "clamp(1.125rem, 0.95rem + 0.7vw, 1.25rem)"
    fontWeight: 600
    lineHeight: 1.35
  body:
    fontFamily: "Archivo, Archivo Fallback, system-ui, sans-serif"
    fontSize: "clamp(1rem, 0.85rem + 0.5vw, 1.0625rem)"
    fontWeight: 400
  secondary:
    fontFamily: "Archivo, Archivo Fallback, system-ui, sans-serif"
    fontSize: "clamp(0.875rem, 0.75rem + 0.45vw, 0.9375rem)"
    fontWeight: 400
  label:
    fontFamily: "Archivo, Archivo Fallback, system-ui, sans-serif"
    fontSize: "clamp(0.75rem, 0.66rem + 0.15vw, 0.8125rem)"
    fontWeight: 600
    lineHeight: 1
  mono:
    fontFamily: "Chivo Mono, Archivo, ui-monospace, monospace"
    fontWeight: 400
    fontFeature: "tnum"
rounded:
  sm: "2px"
  md: "3px"
  lg: "4px"
  xl: "6px"
  2xl: "8px"
  3xl: "10px"
  4xl: "12px"
  full: "9999px"
spacing:
  content-gap: "16px"
  card-padding: "16px"
  section-gap: "24px"
  space-lg: "24px"
  space-xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.lg}"
    padding: "0.55rem 1.05rem"
    height: "46px"
  button-secondary:
    backgroundColor: "{colors.paper-sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "0 1.05rem"
    height: "46px"
  input:
    backgroundColor: "{colors.paper-sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "0.625rem 0.875rem"
    height: "44px"
  condition-word:
    textColor: "{colors.cloudy-ink}"
    typography: "{typography.condition}"
  guidance:
    textColor: "{colors.ink}"
    typography: "{typography.guidance}"
  area-row:
    textColor: "{colors.ink}"
    typography: "{typography.area-name}"
    height: "44px"
  score-figure:
    textColor: "{colors.ink}"
    typography: "{typography.figure}"
  record-band:
    height: "84px"
  record-band-wide:
    height: "150px"
  record-band-history:
    height: "300px"
  caveat-band:
    backgroundColor: "{colors.paper-raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
  line-band:
    backgroundColor: "{colors.crossed-tint}"
    textColor: "{colors.crossed-ink}"
    rounded: "{rounded.sm}"
  chip:
    textColor: "{colors.ink-secondary}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "0.2rem 0.6rem"
---

# Design System: Whether

## Overview

**Creative North Star: "The Covenant"**

The lines are a policy agreed in advance, and the weekly brief is the dated statement of where
each one stands. The page is that statement, printed on pale green-grey safety paper in a
green-black ink, and its one ornament is the record itself: a full-bleed engraved band under the
navigation of every route, drawn from every month-end reading since January 2012. Everything
below the band is a document, read top to bottom: the guidance, the five areas, the two scores,
then the sections that explain them.

The world borrows the discipline of credit agreements and security printing: structure is the
only ornament, every engraved line is drawn from data, each line and tick names itself where it
sits, and nothing decorative is added. It refuses the dark data panel with glowing accents, and
its opposite, the cream editorial page with an italic serif masthead. "Covenant" names the world
for contributors; it never appears in reader copy, and no reader term was minted for it.

Light is the identity; dark is the second theme, the same paper with the lights off. With no
stored choice the device setting picks the theme, and a stored choice wins
(`app/layout.tsx`, the theme bootstrap). With scripts off, the stylesheet's base draws, which is
the dark `:root` block.

**Key Characteristics:**

- One field of colour at page scale: the record band. Everything else is ink on paper.
- Two voices: Besley binds, Archivo explains.
- Ruled sheets, not cards: hairlines, a 2px ink rule over a list, small radii.
- No surface casts a shadow.
- Every drawing puts the easier side up or to the right.
- A quiet week has no motion.

**Open.** Known gaps (controls, report intros, share images and print still in the earlier
world) and the open decisions (Besley against Hepta Slab, per-area history, condition fills on
their weak ground) live in `docs/design/rebuild-covenant.md`, not here.

## Colors

Colour carries two meanings and nothing else: the four conditions, and a crossed line. The
action colour is the ink, in every week.

### Primary

- **Green-black ink** (`ink`, `night-ink` in the dark theme): text, links, buttons and focus
  rings. Links keep their underline (offset 0.18em, thickness from the font). A primary button
  is a solid ink fill with the paper as its label; a secondary is outlined in the strong border.
  The week's condition never colours a control.
- **Secondary and muted ink** (`ink-secondary`, `ink-muted`; `night-` pair): the two most
  rendered inks after the ink, for supporting prose and metadata. Muted is the floor that clears
  AA at 12–13px on both grounds.

### Secondary: the four conditions

Each condition owns one fill, identical in both themes, and one text ink per theme.

- **Sunny gold** (`sunny`; ink `sunny-ink` / `night-sunny-ink`): risk appetite on, cheap money.
- **Cloudy sienna** (`cloudy`; ink `cloudy-ink` / `night-cloudy-ink`): risk appetite on, dear money.
- **Stormy periwinkle** (`stormy`; ink `stormy-ink` / `night-stormy-ink`): risk appetite off,
  cheap money.
- **Freezing deep blue** (`freezing`; ink `freezing-ink` / `night-freezing-ink`): risk appetite
  off, dear money.

Warm against cool is risk appetite, light against dense is the price of money. Sunny and Stormy
are the light fields; Cloudy and Freezing the dense. The fills are the same four hexes as
`REGIME_HEX_COLORS` (`lib/regimePhaseSpace.ts`) and the `[data-regime]` map in
`app/styles/tokens.css`; `tests/regimeColourContract.test.tsx` holds all three together. A
component never picks a condition hue: it names its regime with `data-regime` and reads
`--regime-accent` (the fill) or `--regime-ink` (the text ink).

The fill appears as a field in the record band and History's week cells, as a quadrant wash on
the conditions map, and nowhere else. As text, the condition word prints in its ink.

### Tertiary: a crossed line

- **Front red** (`crossed` as a mark, `crossed-ink` as text, `crossed-tint` as a band's ground;
  `night-` trio): a pause line crossed or close. A cleared line, or a restart line met, prints
  in the ink and lets the play glyph say "clear". Red always travels with a glyph and a word.

### Neutral

- **Paper** (`paper`): the ground. **Sheet** (`paper-sheet`) is the paper a step lighter, for
  panels and fields; a sheet is told from the ground by its hairline, not by white.
  **Raised** (`paper-raised`) for a selected key and the caveat band. **Nested**
  (`paper-nested`) steps below the ground in its own hue.
- **Night** (`night`, `night-sheet`, `night-raised`, `night-nested`): the dark theme's tiers, a
  green-black that keeps the ink's hue.
- **Borders** are the ink thinned, never a second grey: faint, subtle, default and strong at
  0.10 / 0.16 / 0.24 / 0.50 alpha on paper and 0.08 / 0.13 / 0.20 / 0.42 on night.
- **Band line inks** (`band-line-on-light`, `band-line-on-dense`): constants of the plate, the
  same in both themes. The dark line prints on the light fields, the pale line on the dense.

### Named Rules

**The Two Meanings Rule.** A hue on the page is a condition or a crossed line. Anything else is
ink. A caveat (cached sources, a scoring note, an archived week, guidance held back) is ink with
an outlined diamond, never red: shape carries the state where hue cannot.

**The Ink Is the Action Rule.** Links, buttons, focus rings, the selected pill and the caret are
the ink in every week. A condition's colour means the condition and nothing else.

**The One Field Rule.** Colour commits at page scale in one place, the record band. The
condition word beside the guidance is the only other coloured element on the first screen. The
regime atmosphere wash is off (`--atmosphere-*: transparent`), because a wash would tint the
paper the band is printed on.

## Typography

**Binding voice:** Besley (with Besley Fallback, metric-matched Georgia, then Archivo)
**Explaining voice:** Archivo (with Archivo Fallback, metric-matched Arial)
**Figure columns:** Chivo Mono (with Archivo for arrows)

**Character:** Besley is a Clarendon, the face of engraved securities and public notices; it
reads sturdy and calm at display sizes. Archivo is a grotesque set at normal width for
everything that explains. Width no longer separates the voices; the face does.

All three are self-hosted variable files, subset to the site's text, with hashed file names
(`app/styles/fonts.css`). Archivo and Besley are preloaded.

### Hierarchy

- **Guidance** (Besley 700, 28 → 52px, line-height 1.06): the week's guidance, the only `h1`
  on `/`. From `md` it sets at `clamp(2.5rem, 3.5vw, 3.25rem)`, line-height 1.02, tracking
  -0.03em. At most 101 characters (`tests/heroCallAssumptions.test.ts`): five lines on a phone,
  four on a desktop.
- **Figure** (Besley 800, 92px in the margin, 46px on a phone, line-height 0.9, tabular lining
  digits): the two published scores. `.type-figure`; the size comes from the caller.
- **Condition word** (Besley 800, 27px, 34px from `sm`): Sunny, Cloudy, Stormy or Freezing, in
  its own ink. `.type-stamp`; on a report intro and in lists it sets at body size.
- **Page title** (Besley 700, 26 → 34px): a report route's `h1`.
- **Section** (Besley 700, 22 → 26px): a page's `h2` and a panel's title. `.type-section`.
- **Area name** (Besley 700, 20px): the five area rows.
- **Wordmark** (Besley 800, 17px).
- **Title** (Archivo 600, 18 → 20px): a card's own heading, `h3` and below.
- **Body** (Archivo 400, 16 → 17px): prose, capped at 60ch.
- **Secondary** (Archivo, 14 → 15px): supporting prose, captions, labels.
- **Label** (Archivo 600, 12 → 13px): metadata, the band's labels, axis years, badges.
- **Mono** (Chivo Mono, inherits size, tabular): only where figures align with each other.

Every Archivo size is a fluid `clamp()` step (`--text-fluid-nano` through `--text-fluid-2xl`),
and Tailwind's `text-xs` through `text-xl` resolve to them, so there is no second scale.
`text-2xl` and up stay fixed, for figures.

### Named Rules

**The Binding Voice Rule.** Besley sets what the page commits to: the guidance, the condition
word, area names, score figures, headings and the wordmark. Archivo sets everything that
explains. The voice reaches the page through real rules only (`:where(h1, h2)`,
`.type-section`, `.text-display`, `.type-stamp`, `.type-figure`); there is no `font-display`
utility.

**The Type Step Rule.** Every step is at least 1.125x the one below it at both ends of the
range (`tests/typeSteps.test.tsx`). Two sizes closer than that read as one job set twice.

**The One Number, One Face Rule.** A figure in a sentence or beside its label stays in its
voice with `tabular-nums`. Mono is for a column, a before/after pair or a rail's own labels. A
figure that appears on more than one surface is the same figure everywhere.

**The Measure Rule.** Prose stops at 60ch, about 75 characters in Archivo, from a base-layer
rule on `p` and on list items holding text; a utility on the element overrides it, and a flex
or grid row is exempt.

The floor is 12px for anything read as a word. Headings and labels are sentence case; capitals
are for `.type-badge` alone. No italics.

## Layout

One frame on every route: the global header, the record band full-bleed beneath it, then the
document. The page gutter is `--weather-shell-pad-inline` (16px); the brief's measure is 72rem,
the wide report shell 84rem.

On `/` from `md`, the guidance block is a reading column and a margin of up to 22rem, separated
by a subtle hairline. The margin holds the two score figures on their ruled lines, then the
trust facts. On a phone the column runs: the week and brief number, the condition word with its
gloss and delta, the guidance, the five areas, the two scores side by side as compact figures,
then the trust facts. The bottom tab bar and the running head stay.

Spacing has one owner per distance: a page separates sections (`section-gap`, 24px, 32px from
640px), a section groups its heading and body (`content-gap`, 16px, 24px from 640px), and a
framed card owns its inset (`card-padding`, 16px, 24px from 640px). Inside the frame, a box sets
its children side by side from its own width (`.weather-switch`, `.weather-sidebar`,
`.weather-grid`), not the viewport's. Past 1800px the root size steps up, so the page scales as
a whole.

Sections are separated by a hairline rule and vertical rhythm. Enumerable content is ruled rows:
a 2px ink rule above, a default hairline under each row.

## Elevation & Depth

Paper has no depth. No surface casts a shadow: a sheet is told from the ground by its hairline
and a step of tone, and a container nested inside another drops its shadow and blur, and at the
third level its border and fill (`app/styles/surfaces.css`). Only what floats over the page
(menus, dialogs, the toast) may lift. The shadow tokens (`--elev-1` to `--elev-4`) are complete
values, scaled by `--shadow-scale` per viewport, and are recorded in the sidecar.

Depth also has an order, one scale named by relationship (`app/styles/tokens.css`):

| Step | Value | What lives there |
| --- | --- | --- |
| `--z-raised` | 10 | in-page sticky: section chips, a sticky panel |
| `--z-chrome` | 20 | global header, running head, tab bar, floating CTA |
| `--z-chrome-top` | 30 | the scroll-progress rule and the skip link |
| `--z-overlay` | 40 | a backdrop |
| `--z-modal` | 50 | the panel a backdrop dims |
| `--z-menu` | 60 | menus, selects, popovers, tooltips |
| `--z-toast` | 70 | toasts |
| `--z-presentation` | 80 | presentation focus mode |

Anything that can meet a global layer uses `z-[var(--z-…)]`; `tests/zLayers.test.ts` fails a
hand-picked 40 or 50. Bare `z-10`/`z-20` stay legal for stacking inside a positioned parent.

### Named Rules

**The Flat Paper Rule.** A container is a ruled sheet. If it needs a shadow to separate, it
needs a hairline instead.

## Shapes

Small radii, in two registers assigned by role (`--radius-*`, mirrored in the `@theme inline`
block; `tests/shapeRegister.test.ts` fails a drift). Sharp asserts: a status stamp or chip
(`sm`, 2px), a data tile or rule segment (`md`, 3px), a control (`lg`, 4px). Soft holds: a card
(`xl`, 6px), a surface, sheet or dialog (`2xl`, 8px). A card is never on the control radius and
a stamp never on the card radius. `full` is for round things (dots, markers, switches, the
ladder's reading ring) and never for a text-bearing element.

The record band, the area rows, the guidance block and History's week cells have square
corners: they are print, not furniture.

## Components

### Buttons

- **Shape:** the control radius (4px), 46px tall, 44px minimum target everywhere.
- **Primary:** a solid ink fill with the paper as its label, no shadow.
- **Secondary:** the sheet with a strong ink-thinned border and the ink as its label.
- **Hover / Focus:** a link or a button rises 1px under a fine pointer; a label never does.
  Focus is a 2px ink outline at 2px offset with a soft halo, declared once on every focusable
  element. Press is a 1px sink.

### Chips and tags

- **Style:** sentence case, 12–13px semibold, 2px radius, a hairline border.
- **Line states:** crossed tags take the red at 8% under a red hairline; clear tags the ink.
  There is no action-colour tag: a tag is a display.
- **Condition:** no box. The word in Besley and its condition ink is the whole mark.

### Inputs / Fields

- **Style:** the sheet on paper (the nested tier on night), a strong border, 4px radius, 44px
  tall, 16px text so a phone does not zoom.
- **Focus:** the shared ink outline and halo.

### Navigation

- **Global header:** the Besley wordmark, then This week, Plan, History, Guides; Share and
  embed, About and search to the right. The current route is underlined in a 2px ink rule.
- **Phone:** a sticky bottom tab bar and a running head that names the week's call once the
  guidance scrolls away.

### The record band (signature)

The page's one field of colour and its only ornament, an `aside` labelled "The record" directly
under the header on every route (`app/components/recordBand.tsx`, `lib/report/recordBand.ts`,
`app/styles/record-band.css`). Server-rendered SVG from the bundled month-end series; the still
image needs no script.

- **Construction.** One slot per month-end reading. Each stretch of conditions is a field in
  that condition's fill, a hair wider than its months so no ground shows between fields; a
  pale seam marks each boundary, and a 1px default border rules the plate top and bottom. Two
  bundles of fine lines cross it: risk appetite above, funding pressure below and drawn
  downward as pressure rises, so easier is up. Lines are 1px, non-scaling, smoothed over three
  months. A dashed pale line marks where publication began.
- **Line inks.** On a light field (Sunny, Stormy) the dark line ink at 0.62 opacity; on a dense
  field (Cloudy, Freezing) the pale line ink at 0.86. The same in both themes.
- **Line pattern per condition** (`recordBandLineY`, `lib/report/recordBandCodec.ts`): plain for
  Sunny, a slow sine wave for Stormy (four-month wavelength), a tight triangle ripple for Cloudy
  (four-thirds of a month), a zigzag for Freezing (two months). The band reads in greyscale.
- **Sizes.** 84px on a phone, drawn with four plain lines a bundle and no pattern, which would
  alias at 2px a month. From a 46rem container, 150px with five patterned lines a bundle, the
  two bundles named in place in the first field, and a longer caption. On History the band is
  the page's figure, `clamp(9rem, 21vw, 18.75rem)` (capped at 300px), with each long stretch
  named in its own field ("Freezing · 32 months").
- **Under the band.** A year axis (every fourth year on a phone, every second from 46rem, every
  year from 80rem) and one 2px ink mark per published brief; a week with no brief has no mark.
  The caption counts both records by name: month-end readings "scored with today's formula",
  briefs "published as written", and links to History.
- **Readout** (`recordBandReadout.tsx`, a lazy island). Once live, the plate becomes a slider
  ("Month on the record"). Moving along it shows a 2px ink cursor and replaces the caption with
  that month, its condition and both scores; arrow keys step a month, Shift steps a year, Home
  and End jump, Enter, Space or a click opens that month's brief, Escape, leaving, cancelling or
  blur restores the caption. A vertical swipe that starts on the band still scrolls the page.
  The readout has no easing.

### History's plate

`app/history/recordPlateCanvas.tsx` lays a canvas over the band's fields on History and redraws
the engraving at fourteen lines a bundle from the same geometry. Under the pointer the bundles
open like a lens, so a month's two readings part from their neighbours. It is off under 736px,
where the band keeps its vector lines; under reduced motion it draws one still frame and does
not follow the pointer; it animates only while the lens is opening or closing.

### Published weeks

`app/components/history/publishedWeeks.tsx`: one 28px cell per week since the first brief, 3px
apart. A published week is its condition's fill with its own pattern (plain Sunny, ruled
Stormy, hatched Cloudy, cross-hatched Freezing); a week with no brief is an empty cell with a
dashed strong border. The caption counts the empty weeks and states no reason. Where a brief and
its month-end name different conditions, a caveat note states both facts and no cause.

### The guidance block

`app/components/DecisionHero.tsx`. No box: the document's opening. In order: the week control
and the brief's number ("No. 2026-W45"); the condition word in its ink with a stroke icon and
its gloss; since when and the week's direction; the guidance as the `h1`; a facts line with
both scores and "Why"; the five area rows; whose rules these are ("Rules for … · change"); then
the phone figures, and the margin from `md`. It names its regime with `data-regime`, and the
week's move is keyed on it.

### Area rows

`app/components/home/AreaStrip.tsx`: five numbered rows under a 2px ink rule, each a link at
least 44px tall with a hairline under it. Number, the area name in Besley, the standing with its
line-state glyph (red and a pause glyph when on hold, ink and a play glyph when clear), and from
`lg` the action beside it. Numbered in the one order the areas are always given.

### Score figure and ladder

`app/components/ui/scoreLadder.tsx`, two displays of one component.

- **Figure** (`figure`): the number in Besley 800, the label with "(higher is worse)" or
  "(higher is better)", one sentence of standing led by its glyph, and a 2px ink rule with the
  pause range as a red bar, a 3px red pause tick, 2px ink ticks, an 18px ink reading ring, and
  "pause 76" / "restart 66" named in place in 12px. The two names read away from each other.
  `"compact"` drops the rule and moves the direction to screen readers, for two figures side by
  side on a phone.
- **Working ladder** (default): a 0–100 track with ticks for the change, pause and restart
  lines, a dot for the reading, the month range, and a scrub. Labels never overlap; the track
  is `aria-hidden` and the sentence beside it carries the meaning.

Every ladder puts its pause range on the left and its restart range on the right; funding
pressure, which is worse higher, is drawn high to low.

### Conditions map

A quadrant plane with a monthly trail, washed in the four fills at a fifth to a third of their
strength. Funding pressure rises downward, so up and right are both the easier side: Sunny top
right, Freezing bottom left. The same orientation on `/`, `/history`, `/trust` and `/concepts`.

**Easier is up and right.** The two scores point opposite ways and the published record prints
both as they are. Every drawing aligns instead: a plot, ladder, corridor or band puts the easier
side up or to the right. Time-series line charts keep the natural axis and say
"(higher is worse)".

### Report intros

`app/components/report-shell/CommandCenterNavBlock.tsx`: the page title leads, then a line of
facts with the condition word in its ink and the date, then the summary and the trust strip.
No kicker above the title, no hue on the block.

### Caveat and line bands

- **Caveat band:** ink on the raised tier, a caveat-border hairline with a 2px ink top rule,
  2px radius, an outlined diamond on its first line.
- **Line band:** the crossed red's tint, a red hairline with a 2px red top rule, red text. The
  week's exception, above the guidance.

Both are leaves, never containers.

### Motion

Motion is functional and short: 120ms for a press, 200–240ms for state changes
(`--transition-fast`, `--transition-base`, `--ease-out: cubic-bezier(0.22, 1, 0.36, 1)`), and
none under `prefers-reduced-motion`. Pages cross-fade (100ms out, 220ms in) with the title
morphing in place. Nothing animates on scroll, and nothing loops except a loading skeleton,
which stops under reduced motion.

**The week's move** is the one authored exception: on a week the conditions changed or an area
changed standing, the guidance block replays it once on arrival. The reading travels from the
earlier scores to this week's (760ms, `cubic-bezier(0.65, 0, 0.35, 1)`), the condition word
turns as the reading crosses the change line, and each moved area ticks from its earlier
standing in row order. CSS keyed on `data-week-move` (`app/styles/week-move.css`), transform
and opacity only, under two seconds, still under reduced motion, print and screenshot mode
(`tests/weekMove.test.tsx`). A week nothing moved has no motion, which is most weeks.

## Do's and Don'ts

### Do:

- **Do** name a condition with `data-regime` and read `--regime-accent` or `--regime-ink`;
  never type a condition hex at the call site.
- **Do** draw links, buttons and focus rings in the ink, with links underlined.
- **Do** set the guidance, condition word, area names, score figures, headings and wordmark in
  Besley, and everything that explains in Archivo.
- **Do** separate sheets with a hairline and a step of tone, and lists with a 2px ink rule over
  hairline rows.
- **Do** give every condition a pattern as well as a fill wherever it fills an area, so the
  drawing survives greyscale and colour-vision deficiency.
- **Do** label each line and tick where it sits, and keep the easier side up or to the right.
- **Do** keep red for a crossed line, always with a glyph and a word.
- **Do** keep the record band's two records apart: fields are month-end readings scored today;
  marks are briefs as published.

### Don't:

- **Don't** put a shadow on a container, or a card inside a card.
- **Don't** use a condition's colour for a control, a section label or a page wash.
- **Don't** add a hue that is neither a condition nor a crossed line; a caveat is ink with a
  diamond.
- **Don't** add a legend where a label in place will do.
- **Don't** add a decorative mark the record did not draw.
- **Don't** set Chivo Mono for a figure that does not align with another.
- **Don't** set a word under 12px, set italics, or type capitals outside a badge.
- **Don't** hand-pick a z-index that can meet a global layer.

## Voice & Content

Copy is part of the design system and is governed by `docs/editorial-guardrails.md`: one name
per thing, sentence case, no superlatives, no fear. Headings name what the reader gets in the
reader's words. Numbers always carry their meaning: "90 of 100" never appears alone. The world's
name and its borrowed vocabulary (covenant, certificate, compliance, attestation) never appear
in reader copy.
