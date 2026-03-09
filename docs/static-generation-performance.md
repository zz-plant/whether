# Static generation performance notes

## Build concurrency controls

This repo now supports explicit build concurrency tuning through environment variables:

- `NEXT_BUILD_CPUS`: overrides Next.js build worker CPU count.
- `NEXT_STATIC_GENERATION_WORKERS`: sets static generation max concurrency.
- `NEXT_STATIC_GENERATION_MIN_PAGES_PER_WORKER`: sets minimum pages chunked per worker.

These are wired in `next.config.js` and can be used in CI to match runner size.

## Route-set sizing decisions

- `/answers/[slug]` now pre-renders only high-value `decision` and `climate` pages at build time.
- `explanation` long-tail answer pages are served via ISR (`revalidate = 900`) on first request.

This keeps high-intent pages fast while reducing build-time route fanout.

## Benchmark snapshot

Measured on this environment:

- Baseline build: `time bun run build` → `real 1m15.043s` with `2` workers.
- Tuned build: `time NEXT_BUILD_CPUS=4 NEXT_STATIC_GENERATION_WORKERS=8 NEXT_STATIC_GENERATION_MIN_PAGES_PER_WORKER=10 bun run build` → `real 1m16.000s` with `4` workers.

Result: higher worker counts did not improve wall-clock time in this constrained environment, so CI should tune based on actual machine capacity.
