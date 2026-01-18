# Learnings and principles

This document summarizes product, engineering, and UI/UX principles to guide future work in this repo.
It is inspired by high-level themes from:
- oven-sh (Bun)
- nextlevelbuilder/ui-ux-pro-max-skill

## Product + engineering themes (oven-sh/Bun)

- **Single-tool focus**: consolidate the most common workflows (run, test, install) into one fast, dependable CLI to reduce cognitive load.
- **Speed and resource efficiency**: optimize for fast startup, low memory use, and minimal runtime friction.
- **Drop-in compatibility**: prioritize compatibility with existing ecosystems so adoption requires little to no rewrites.
- **Pragmatic defaults**: ship with sensible defaults and examples so new users can succeed quickly.

## UI/UX themes (modern Regime Station)

- **Data-first hierarchy**: lead with one high-signal summary, then layer supporting panels in a predictable grid.
- **Plain-English regime translation**: provide a dedicated summary panel that turns macro jargon into immediate operating consequences.
- **Design system first**: define tokens (color, typography, spacing, radius, elevation) and reuse them across components.
- **Dense, scannable layouts**: favor compact tables, aligned charts, and clear label/value pairings.
- **Accessible by default**:
  - Maintain WCAG AA contrast.
  - Keep focus states visible.
  - Respect `prefers-reduced-motion`.
- **Calm, purposeful motion**: reserve animation for state changes and clarity (150–250ms).
- **Trust cues everywhere**: show source links and freshness inline with every data view.
- **Traceable scoring**: surface the inputs and timestamps behind every regime classification.

## Weather app inspiration (beloved references)

- **Forecast-at-a-glance**: lead with a single, high-signal summary that answers "what should I do today?" before any charts.
- **Layered detail**: offer progressive disclosure (hourly → daily → historical) so depth is available without overwhelming.
- **Signal density**: compact, information-rich panels (feels-like, wind, precip) that earn their real estate.
- **Contextual alerts**: highlight only meaningful changes (fronts, volatility spikes) with calm, professional emphasis.
- **Visual rhythm**: align cards, charts, and tables on a strict grid to create predictable scanning patterns.
- **Trust cues**: show update times and source links inline to reinforce data credibility.

## Practical checklist

- [ ] Start from design tokens and document them in a shared theme file.
- [ ] Use consistent spacing scale (e.g., 4/8/12/16/24/32).
- [ ] Ensure clickable elements have `cursor: pointer` and visible hover states.
- [ ] Validate contrast ratios for text and UI affordances.
- [ ] Provide a short “getting started” path with minimal steps.
