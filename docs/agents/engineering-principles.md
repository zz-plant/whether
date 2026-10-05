# Engineering principles & coding conventions

## Working agreements
- **Clarity over cleverness:** explicit names and readable control flow.
- **Traceable outputs:** user-visible data should map to verifiable sources.
- **Plain-English interpretation:** financial signals should become operational language.
- **Serious product posture:** optimize for trust, not novelty.

## Implementation guidance
- Prefer small, composable functions with explicit inputs/outputs.
- Keep regime scoring and classification deterministic and well-tested.
- Avoid hidden side effects in fetch/transformation paths.
- Propagate metadata (source URL, capture timestamp, confidence) whenever available.
- Reuse existing utilities/types before creating new abstractions.

## Styling system boundaries

Whether uses Tailwind v4 as a composition layer, not as a second design-token
source. Keep the styling system split explicit:

- Use Tailwind utilities in components for local layout, spacing, responsive
  behavior, simple typography, and state variants.
- Define shared semantic values (decision state, trust, surface hierarchy,
  typography scale, radius, elevation, and focus treatment) in
  `app/styles/tokens.css`. Prefer those semantic utilities or CSS variables to
  raw colors and one-off values.
- Put durable, multi-property interaction primitives in the existing
  `app/styles/*.css` modules under a `weather-*` class. This includes controls,
  panels, screenshot behavior, pseudo-elements, and accessibility contracts.
- Compose conditional component classes with `cn()` from `lib/utils.ts` so
  `clsx` and `tailwind-merge` remain the single conflict-resolution path.
- Keep shadcn pointed at `app/styles/tokens.css`; do not add a parallel Tailwind
  config or a second styling runtime.

Exceptions should be boundary-driven. Generated images and other renderers that
cannot resolve application CSS variables may use explicit values, but should
document which semantic token they mirror. Before replacing the PostCSS lane or
adding another styling engine, record a measured build/HMR bottleneck and verify
the weekly brief, mobile layouts, image/export output, and Cloudflare build.
