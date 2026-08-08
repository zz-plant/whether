# Style architecture

`app/globals.css` is the application entrypoint. It loads styles in this order:

1. `tokens.css` — Tailwind integration, design tokens, theme roles, and global base styles.
2. `layout.css` — compatibility entrypoint for page shells, grids, homepage flow, print, and reveal behavior.
3. `components.css` — compatibility entrypoint for surfaces, controls, typography, feedback, and workflow components.

The two compatibility entrypoints contain imports only. Add a rule to the narrowest responsibility-based module instead of growing those files directly. Preserve their import order unless a cascade change is intentional and visually verified.

## Layout modules

- `layout-shells.css` — shared page shells, grids, panels, tags, and responsive layout.
- `home-flow.css` — homepage decision-flow bands and their desktop behavior.
- `layout-effects.css` — shell/reveal motion, compact viewport rules, reduced motion, and print styles.

## Component modules

- `surfaces.css` — cards, surfaces, brief structure, chips, and decision cells.
- `live-state.css` — live-status hero, command bar, signal movement, and status motion.
- `controls.css` — pills, tabs, inputs, buttons, focus states, and skip links.
- `typography.css` — brand/topbar presentation, type utilities, global readability, and base interaction behavior.
- `feedback.css` — loading, skeleton, reveal, and progressive-render feedback.
- `decision-flow.css` — decision hero, delta/step cards, disclosures, and shared content links.
- `mobile-workflows.css` — scrollbars, mobile navigation/panels, cadence, onboarding, and slide panels.
