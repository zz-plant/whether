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
bun run ui:iterate -- --theme light --only home-mobile,home-desktop
bun run ui:iterate -- --visitor returning --only home-mobile,home-desktop
bun run ui:iterate -- --base-url http://127.0.0.1:3001
bun run ui:iterate -- --dev-script dev
bun run ui:iterate -- --no-dev
```

`--theme light` captures the light theme. The app reads its theme from localStorage in a
bootstrap script that runs before first paint, so the capture seeds the same key from a page
init script and the page renders light from the first frame. Light captures land as
`<id>-light.png` with their own `index-light.html` and `manifest-light.json`, so a light set sits
beside the dark one it is compared against instead of overwriting it. The default is dark.
Review both before calling a visual change done — the harness could only capture dark until
2026-09-15, and the light theme accumulated defects nobody had seen.

`--visitor returning` captures the homepage a reader sees after their first visit. The layout
bootstrap folds `/` behind the first-visit picker unless the browser has stored a week before,
so a plain capture is always the first-visit fold. This flag seeds last week's slug and writes
`<id>-returning.png` (and `<id>-returning-light.png` with `--theme light`) with its own gallery
and manifest. Until 2026-10-05 no capture had shown the returning reader's page, and it drew the
same two score ladders three times. Other routes render the same either way.

What `ui:iterate` does:

- reuses an already-running app only when the weekly brief HTML and its referenced assets are coherent
- otherwise starts `bun run dev` against the target host and port
- if a stale local server is occupying the requested port, auto-starts a clean local dev server on a nearby free port instead of capturing the broken one
- waits for the homepage asset references to come up clean and probes `/api/health` when available
- captures the requested mockup targets
- writes a browsable screenshot gallery for quick review

`ui:shots` remains available when you already own the dev server and only want raw capture + gallery output, but it now fails fast if the base URL is serving HTML that references missing `/assets/*` files.

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
5. Only pull the winning idea into `/`, `/signals`, `/operate`, `/resolve`, or `/trust` after the concept is visually coherent.

## Scope rules

- mockups should be noindex
- mockups may use static or representative data
- mockups should prefer shared design tokens and existing primitives where practical
- mockups should not become a second app or long-lived dumping ground
