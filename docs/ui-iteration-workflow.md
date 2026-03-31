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

Use the repo-local visual iteration lane as the default fast path:

```bash
bun run ui:iterate:list
bun run ui:iterate
```

Defaults:

- base URL: `http://127.0.0.1:3000`
- output directory: `artifacts/ui`
- review gallery: `artifacts/ui/index.html`
- manifest: `artifacts/ui/manifest.json`

Useful options:

```bash
bun run ui:iterate -- --only operator-brief-mobile,operator-brief-desktop
bun run ui:iterate -- --base-url http://127.0.0.1:3001
bun run ui:iterate -- --dev-script dev:turbo
bun run ui:iterate -- --no-dev
```

What `ui:iterate` does:

- reuses an already-running app when reachable
- otherwise starts `bun run dev` against the target host and port
- waits for `/api/health` to come up
- captures the requested mockup targets
- writes a browsable screenshot gallery for quick review

`ui:shots` remains available when you already own the dev server and only want raw capture + gallery output.

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
4. Use `artifacts/ui/index.html` as the default comparison surface before moving on.
5. Only pull the winning idea into `/`, `/signals`, `/operations`, `/decide`, or `/method` after the concept is visually coherent.

## Scope rules

- mockups should be noindex
- mockups may use static or representative data
- mockups should prefer shared design tokens and existing primitives where practical
- mockups should not become a second app or long-lived dumping ground
