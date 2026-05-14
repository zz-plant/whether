# Cloudflare bundle composition report (2026-03-09)

## Scope

Analyzed:

- `.vercel/output/static/_worker.js/__next-on-pages-dist__/webpack/*.js`
- `.vercel/output/functions/*.func/index.js`
- target routes: `/evidence`, `/planning`, `/twitter-image`

## Baseline (before changes)

### Largest webpack chunks

| Chunk | Size (bytes) |
| --- | ---: |
| `d33e06e227608b885c3487c38e3618d2.js` | 2,750,439 |
| `97844cd3d3b100dd70d40df1649af2e9.js` | 667,958 |
| `bc5ead280661bb82e8d80f68b38eb0f9.js` | 194,122 |
| `bc28486865eb4670c252b268e142b67c.js` | 190,548 |
| `3d59b77c1c4adbd59956686c53b39e8a.js` | 152,312 |

- Webpack total: **4,297,839 bytes**

### Largest route functions

| Route function | Size (bytes) |
| --- | ---: |
| `signals.func/index.js` | 4,329,280 |
| `operations.func/index.js` | 1,547,301 |
| `twitter-image.func/index.js` | 714,128 |

- Total `.func/index.js`: **49,499,212 bytes**

## Heavy import contributors identified

### `app/evidence/page.tsx`

- Advanced and diagnostic panels are heavy and not needed in the default executive scan path:
  - `TimeMachinePanel` (depends on `@base-ui/react/field`, `@base-ui/react/input`, `@base-ui/react/popover`, `@base-ui/react/tabs`)
  - `AdvancedThresholdsSection`
  - `RegimeTimelinePanel`
  - `SignalVisualizationSuite`
- `getSummaryArchive()` was imported at top level even when advanced mode was closed.

### `app/planning/page.tsx`

- Panel imports are broad and route-local (`appendixSections` + export/runway panels), but those are core to default `/planning` rendering and were left eager for now.

### `app/twitter-image.tsx`

- Separate edge function emitted exclusively for legacy social image route.
- OG rendering is already handled via `/api/og`, so this was redundant weight for worker upload.

## Changes applied

1. Route-level lazy server imports in `app/evidence/page.tsx`:
   - load `getSummaryArchive()` only when `advanced=1`
   - load `SignalVisualizationSuite` only when `diagnostics=all`
   - load `AdvancedThresholdsSection`, `TimeMachinePanel`, and `RegimeTimelinePanel` only when `advanced=1`

2. OG/social image path consolidation:
   - switched default social image path to `/api/og?template=report`
   - removed duplicate social image entry from `buildPageMetadata` output
   - removed `app/twitter-image.tsx`

## After changes

### Largest webpack chunks

| Chunk | Size (bytes) |
| --- | ---: |
| `d33e06e227608b885c3487c38e3618d2.js` | 2,750,507 |
| `619334023ef8a0566da2eaa8c322500a.js` | 667,454 |
| `bc28486865eb4670c252b268e142b67c.js` | 190,548 |
| `308903efc535445c3bd69af3814072d1.js` | 173,751 |
| `3d59b77c1c4adbd59956686c53b39e8a.js` | 152,312 |

- Webpack total: **4,296,469 bytes** (**-1,370 bytes**)

### Largest route functions

| Route function | Before | After | Delta |
| --- | ---: | ---: | ---: |
| `signals.func/index.js` | 4,329,280 | 4,307,944 | **-21,336** |
| `operations.func/index.js` | 1,547,301 | 1,525,333 | **-21,968** |
| `twitter-image.func/index.js` | 714,128 | 0 | **-714,128** |

- Total `.func/index.js`: **47,702,156 bytes** (**-1,797,056 bytes**)

### Build summary delta

- Edge Function Routes: **28 → 27** (removed `/twitter-image`)
- Bundled Assets: Noto font asset no longer listed in build summary after route removal.

## Wrangler upload verification

Attempted to run `bunx wrangler versions upload` to compare upload size logs.

- Blocked in this environment due missing `CLOUDFLARE_API_TOKEN` in non-interactive mode.
- Command emitted explicit auth requirement and did not provide upload byte totals.
Historical note: this bundle-composition audit refers to the retired `.vercel` / `next-on-pages` worker output and is preserved for migration history only.
