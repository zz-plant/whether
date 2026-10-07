---
name: whether-ui-standards
description: Whether's UI/UX rules — interaction physics, accessibility, semantics, IA boundaries, motion guardrails, shared action-link primitives, plus the theming/i18n/hydration/empty-state rules the repo doc doesn't cover. Use this whenever editing anything under app/components/, app/styles/, or any page under app/ that renders UI; whenever adding a button, link, modal, form, chart, or animation; and whenever asked to review, audit, or improve the look, feel, accessibility, or UX of this app — even if the request sounds like a small styling tweak.
---

# Whether UI/UX standards

Whether is a macro-signals dashboard whose whole value is that an operator can trust it at a glance. A layout shift, a lost focus ring, or a stale-looking number costs more here than in most apps, because the product's claim is "you can act on this." UI defects read as data defects.

## Start with the repo's own standards

The canonical rules live in `docs/agents/ui-ux-standards.md`. Read it before editing UI — don't work from memory of it, and don't restate it here. It covers:

| Section | What it governs |
|---|---|
| I | Interaction physics & latency (100ms feedback, no layout thrashing, 60fps budget) |
| II | Keyboard-only operation, focus contrast, 44×44px targets |
| III | Form hygiene (never disable submit, preserve input, exclusive spinners) |
| IV | Semantic rigor (`button` vs `a`, labels, image dimensions) |
| V | URL as source of truth, back-button reliability |
| VI | Mobile defense (16px inputs, `touch-action`, `overscroll-behavior`) |
| VII | CLS = 0, LCP < 2.5s, clean console |
| VIII | IA boundaries per route — which page owns which content |
| IX | Homepage weekly-brief motion guardrails |
| X | Shared action-link primitives and their variants |
| XI | Report shell hierarchy for `/signals`, `/operate`, `/answer`, `/trust` |
| XII | Disclosure — what earns collapsing, and URL-carried open state |
| XIII | Depth and enclosure — the outermost container owns the elevation |
| XIV | Shape register — sharp asserts (stamps, controls), soft holds (cards, surfaces); no text-bearing pills |
| XV | Encoding a number — the figure register (mono for columns, `tabular-nums` in prose), and when to draw the line |
| XVI | Colour that means something — the regime ink and accent |
| XVII | Responsive diagrams |
| XVIII | Type register — one family in three widths, capitals for stamps only, one encoding per fact |
| XIX | Reading order — document order is visual order |
| XX | Comprehension before the export action |
| XXI | Spacing ownership |
| XXII | What the font files draw — no glyph, style or feature the shipped files lack |
| XXIII | Motion a reader doesn't notice — named properties, no animation on repeated actions, short and interruptible |

Sections VIII and XI are the ones most often violated by accident, because they're about *what belongs where* rather than about code. Before adding a card, ask which layer owns that information. If copy fits two layers, it goes on the earliest one and the later one links out.

## Reuse the primitives before writing class chains

`app/components/ui/` holds `actionLink.tsx`, `buttonLink.tsx`, and `tag.tsx`. These already encode the 44px target, `touch-action`, and focus-visible behavior. A new one-off `className` chain on a bare `<a>` will silently drop all three. Use `className` overrides for layout positioning only — `mt-auto`, `justify-center`, icon gaps — never to strip a focus affordance.

Design tokens live in `app/styles/tokens.css` (fluid type scale `--text-fluid-*`, semantic posture colors `--color-semantic-*`). Theme overrides live in the `html[data-theme="light"]` block of the same `tokens.css` (there is no `theme-variants.css`). Any new color must come from a token, because a hardcoded hex will look correct in dark mode and break in light. A token added to the dark `:root` block also needs a light override there, or it renders a dark-tuned pastel on `--bg-body`.

The week's regime is a colour, and it is read from two tokens rather than picked per call site: `--regime-accent` (the 500-level hue, for tints, rules and washes via `color-mix`) and `--regime-ink` (the same hue as text — a pastel on the dark ground, 700-level on the light one). Both resolve from a `data-regime` attribute (`tokens.css`); the page shells and `DecisionHero` carry it via `regimeDataAttribute` in `lib/regimeAccent.ts`. Anything that prints in the regime's colour uses `--regime-ink`, never `--regime-accent` — the accent is ~3:1 as small text on cream. Every `ReportShell` caller passes `regime`; the regime ink is for section-level marks (`.type-eyebrow-section`), and a card's own eyebrow inside a section stays neutral. The four regime hues stay off the sky ramp, which is the action accent — Stormy is violet for that reason — and the page atmosphere comes from `--regime-atmosphere` through `.weather-regime-ground` on both shells, never from a per-component tint table. Stylesheets under `app/styles/` must not carry a literal ink or fill (`color: white`, `rgb(226 232 240)`, `rgba(34, 34, 34, 0.55)`): a rule there is unlayered, outranks any utility, and reads the same on both themes — every one of those found on 2026-09-15 was a blank heading or a dark slab on the light theme. Delete a rule when its last consumer goes; the same sweep found 52 classes nothing rendered.

## Five areas the repo doc doesn't cover

These come from the Web Interface Guidelines and matter specifically for this codebase. The code handles some of them partially already — the point is that nothing currently *checks*.

**Theming.** Every theme block in `tokens.css` must set `color-scheme` so form controls, scrollbars, and native selects follow the theme. `<select>` needs explicit styling; it does not inherit. When adding a variant, verify the theme-color meta in `app/layout.tsx` still matches.

**Hydration safety.** This app is server-rendered through vinext, and it renders time-sensitive content — freshness dots, relative timestamps, "as of" labels. Anything derived from `Date.now()` or `localStorage` during render will mismatch between server and client. Compute it in an effect after mount, or pass a server-stamped value down. An input must also be consistently controlled or uncontrolled across the hydration boundary.

**Internationalization.** User-facing numbers and dates go through `Intl.*` rather than manual formatting — this is a macro dashboard, so percentages, currency, and dates are most of the visible surface. See `docs/research/2026-04-14-i18n-user-facing-string-audit.md` for the existing audit. Don't build strings by concatenating fragments; a translator can't reorder them.

**Empty, loading, and truncated states.** Degraded-state behavior is part of the product's trust story, not an edge case. Every panel that renders a signal needs a defined look for: no data yet, stale data, and a label longer than its container. An empty state should say what to do next, not just that nothing is there.

**Safe areas.** `mobile-workflows.css` and `typography.css` already use `env(safe-area-inset-*)`. Any new fixed or sticky element — bottom bars, sheets, the sticky call strip — needs the same treatment or it will sit under the home indicator.

## Read the font file, not the font's name

A type designer's habit (§XXII): a page can only set what `public/fonts/*.woff2` contains. Before you put a symbol in copy or chrome, or reach for an OpenType feature, list what the file draws. §XXII gives the fontTools one-liner. The shipped Archivo draws ↑ ↓ but not → ≤ ≥, has no italic, and has no `case`, `zero` or small capitals. Anything outside the file is set in the reader's OS font, so it looks different on every platform. Chrome marks come from `app/components/uiIcons.tsx`, and `tests/craftDetails.test.ts` holds the line for the common ones.

## Reduced motion is under-covered

Eight of the fourteen files in `app/styles/` have a `prefers-reduced-motion` block (counted 2026-10-07). Any new transition or reveal needs one. Section IX limits reveal motion to `transform` and `opacity`; reduced-motion users should get the end state immediately, not a slower version of the animation.

## Auditing rather than authoring

When the task is "review the UI" instead of "build this," run the `web-design-guidelines` skill. It fetches the current Web Interface Guidelines at runtime and reports violations as `file:line`, which covers the mechanical rules faster and more consistently than reading files by hand. Use it first, then apply the judgment calls above — it won't know about Whether's IA boundaries, the 44px floor, or the 16px mobile input rule, since those are local additions.

For visual work that needs screenshots rather than static reading, use the `whether-ui-loop` skill.
