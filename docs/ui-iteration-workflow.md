# UI iteration workflow

Use `/mockups` as the default place for fast visual experiments before changing primary routes.

## Why

- isolate design work from the live operator flow
- compare concepts quickly at mobile, tablet, and desktop widths
- keep visual state shareable through URL params
- make screenshot review easier for product and engineering

## Routes

- `/mockups` — index of current visual experiments
- `/mockups/operator-brief` — operator-first weekly brief concept

## Screenshot workflow

Use the repo-local capture runner for repeatable screenshots:

```bash
bun run ui:shots:list
bun run ui:shots
```

Defaults:

- base URL: `http://localhost:3000`
- output directory: `artifacts/ui`

Useful options:

```bash
bun run ui:shots -- --only operator-brief-mobile,operator-brief-desktop
bun run ui:shots -- --base-url http://127.0.0.1:3001
```

The capture runner assumes the app is already running.

## URL controls

Mockups support lightweight URL-driven view presets:

- `?viewport=mobile|tablet|desktop|full`
- `?density=compact|comfortable`

Examples:

- `/mockups/operator-brief?viewport=mobile&density=compact`
- `/mockups/operator-brief?viewport=desktop&density=comfortable`

## Working pattern

1. Start new UI concepts in `/mockups` instead of reshaping production routes immediately.
2. Keep each mockup focused on one strong product idea.
3. Use the built-in viewport and density controls to compare scan behavior.
4. Only pull the winning idea into `/`, `/signals`, `/operations`, `/decide`, or `/method` after the concept is visually coherent.

## Scope rules

- mockups should be noindex
- mockups may use static or representative data
- mockups should prefer shared design tokens and existing primitives where practical
- mockups should not become a second app or long-lived dumping ground
