---
name: Whether
description: Weekly operating guidance for startup leaders — dark, calm, weather-coded
colors:
  bg-body: "#0f1316"
  bg-panel: "#171c20"
  bg-nested: "#12171a"
  bg-raised: "#232a2f"
  ink: "#edf0ee"
  ink-muted: "#a0a9a7"
  line-crossed: "#e5484d"
  line-clear: "#cdd3d1"
  light-bg-body: "#f1f4f3"
  light-bg-panel: "#ffffff"
  light-ink: "#121719"
typography:
  display:
    fontFamily: "Archivo, Archivo Fallback, system-ui, sans-serif"
    fontSize: "clamp(1.75rem, 1.2rem + 2.2vw, 3.25rem)"
    fontWeight: 600
    lineHeight: 1.06
    letterSpacing: "-0.018em"
  section:
    fontFamily: "Archivo, Archivo Fallback, system-ui, sans-serif"
    fontSize: "clamp(1.375rem, 1rem + 1.1vw, 1.625rem)"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.015em"
  body:
    fontFamily: "Archivo, Archivo Fallback, system-ui, sans-serif"
    fontSize: "clamp(0.9375rem, 0.8rem + 0.5vw, 1.0625rem)"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Archivo, Archivo Fallback, system-ui, sans-serif"
    fontSize: "clamp(0.75rem, 0.66rem + 0.15vw, 0.8125rem)"
    fontWeight: 600
    letterSpacing: "0.08em"
  mono:
    fontFamily: "Chivo Mono, Archivo, ui-monospace, monospace"
    fontSize: "inherit"
    fontWeight: 400
    fontVariantNumeric: "tabular-nums"
rounded:
  sm: "2px"
  md: "4px"
  lg: "6px"
  xl: "10px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  surface:
    backgroundColor: "{colors.bg-panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
  surface-nested:
    backgroundColor: "{colors.bg-nested}"
    rounded: "{rounded.lg}"
  line-crossed:
    backgroundColor: "{colors.line-crossed}"
    textColor: "{colors.ink}"
---

# Design

Whether's interface is a reading, not a dashboard. The weekly brief is the page; every other
surface is either evidence for it or a tool that acts on it. The visual language is dark, quiet
and typographic, and it spends colour on exactly two things.

## Overview

The product is read on a Monday in under a minute and then shared. That sets the register:
high contrast on the one action, low contrast on everything that explains it, and no ornament
that competes with the number the reader came for.

Both themes ship. Dark is the default and the identity; light exists because a board pack and a
printed page are part of the job.

## Color

Colour carries two meanings and nothing else — a rule the palette file states and the code
enforces:

1. **The four conditions.** Sunny, Cloudy, Stormy and Freezing each own one fill, identical in
   both themes and shared with the conditions map and the data attributes.
2. **Where a line stands.** A pause line crossed or close prints in the front red
   (`#e5484d`). A line cleared, or a restart line met, prints in neutral ink and lets the play
   glyph say "clear".

Everything else is ink on a near-black ground. Caveats — cached sources, scoring notes, an
archived week — are deliberately *not* red: they are ink with a hollow ring, because red now
means "a line" and nothing else. That distinction exists for deuteranopes as much as for anyone:
shape carries the state where hue cannot.

Light theme swaps the ground and the ink and keeps the four condition fills.

## Typography

**Archivo** (variable, self-hosted) is the whole interface: one family, hierarchy from size,
weight and width, not from a second face. It is a grotesque with a real provenance and a real
reason — its variable `wdth` axis is what lets the same face set the call semi-condensed
(87.5%) and the regime stamp expanded (125%), so the placard and the headline are one voice at
two widths instead of two typefaces agreeing by accident. Nothing in the interface is set in a
default: no Inter, no Roboto, no system-ui as identity.

**Chivo Mono** (same foundry) is the one companion, and only where figures must line up: pasted
previews, the compare table, anything carrying `.mono`. It is a role, not a mood.

Sizes are fluid `clamp()` tokens (`--text-fluid-nano` through `--text-fluid-2xl`), so the brief
reflows from a 390px phone to a wide desktop without a breakpoint ladder. The role ladder, and
why the steps are these:

| Role | Size | Class |
| --- | --- | --- |
| The week's call (h1) | 28 → 52px | `.text-display` |
| A page section or panel title (h2/h3) | 22 → 26px | `.type-section` |
| A card's own heading | 17 → 20px | `text-fluid-lg` |
| Body and prose | 15 → 17px | `text-fluid-base` |
| Secondary prose | 13 → 15px | `text-fluid-sm` |
| Label, eyebrow, metadata | 12 → 14px | `.type-eyebrow`, `.type-label` |
| Stamp, badge | 12 → 13px | `.type-stamp`, `.type-badge` |

Every step is at least 1.15x the one below it at both ends of the range; two sizes closer than
that read as one job set twice. A role with no class above is a role that will be hand-rolled:
the section heading was, at 32 call sites in five spellings, until `.type-section` became the one
primitive.

The floor is 12px for anything read as a word. Chart annotations inside a fixed-geometry drawing
(the conditions map's quadrant labels and tick numbers) sit at 11px, where 12px collides with the
plane's own edges; they are drawing, not prose, and the sentence beside each chart carries the
meaning.

Headings are sentence case, semibold, tight tracking. Eyebrows are uppercase by CSS only — never
typed in caps — and classify without repeating the heading.

## Layout

One column of measure for reading (`weather-brief-measure`), wider bands for tables and maps.
Sections are separated by a hairline rule and generous vertical rhythm rather than by cards; a
card inside a card is the depth error the surface ladder exists to prevent.

The phone layout is the primary one: a sticky bottom tab bar, a sticky running head that names
the week's call once the card scrolls away, and controls that keep a 44px touch target.

## Elevation & Depth

Two levels only: the page ground and a raised panel. Nested content uses the nested ground, not a
shadow. Shadows are reserved for things that genuinely float — menus, the command palette, the
toast — and are written as tokens so a utility cannot smuggle in a third level.

## Shapes

Small radii: 2px for badges and inline stamps, 4–6px for panels and controls, 10px for the
largest surfaces. Nothing is pill-shaped except a status dot. The geometry should read as
precision instrument, not as a consumer app.

## Components

- **The call card** — the week's action as the `h1`, the condition stamp beside it, the trust
  strip beneath. It is the only place a large type size appears above the fold.
- **The five areas** — a picker of five choices, each carrying its standing (`On hold`,
  `11 pts from pausing`). Selecting one opens its action, pause line and restart line.
- **The line ladder** — a 0–100 track with ticks for the change line, the pause line and the
  restart line, and a dot for the reading. Labels never overlap; the track is aria-hidden and
  the sentence beside it carries the meaning.
- **The conditions map** — a quadrant plane with a monthly trail, drawn from the same four
  fills, with the domain stated in its caption.
- **The trust strip** — data as of, sources, room before a change. Always present, always
  compact, one link to `/trust`.
- **Action links** — one shared component; an arrow only where the destination is a next step,
  never for a control that acts in place.

## Motion

Motion is functional and short: 150–300ms, `ease-[cubic-bezier(0.22,1,0.36,1)]`, and disabled
under `prefers-reduced-motion`. Press feedback is a 1–2% scale, not a bounce. Nothing animates on
scroll, and nothing loops.

## Voice & Content

Copy is part of the design system and is governed by `docs/editorial-guardrails.md`: one name per
thing, sentence case, no superlatives, no fear. Headings name what the reader gets in the
reader's words. Numbers always carry their meaning — "90 of 100" never appears alone.
