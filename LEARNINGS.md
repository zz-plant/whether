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

## UI/UX themes (UI UX Pro Max)

- **Design system first**: define tokens (color, typography, spacing, radius, elevation) and reuse them across components.
- **Pattern-driven layouts**: choose a primary layout pattern (e.g., hero-centric with social proof) and use it consistently.
- **Accessible by default**:
  - Maintain WCAG AA contrast.
  - Keep focus states visible.
  - Respect `prefers-reduced-motion`.
- **Polished interaction**: use gentle motion (150–300ms) and subtle depth (soft shadows) to reinforce hierarchy.
- **Clear CTA hierarchy**: surface a primary CTA above the fold and repeat it after supporting content.

## Practical checklist

- [ ] Start from design tokens and document them in a shared theme file.
- [ ] Use consistent spacing scale (e.g., 4/8/12/16/24/32).
- [ ] Ensure clickable elements have `cursor: pointer` and visible hover states.
- [ ] Validate contrast ratios for text and UI affordances.
- [ ] Provide a short “getting started” path with minimal steps.
