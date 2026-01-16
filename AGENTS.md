# Agent Guide for Whether

This repository is intentionally minimal right now. Use this guide to keep contributions consistent.

## Setup commands
- Install dependencies: `npm install`
- Start dev server: `npm run dev`
- Build for production: `npm run build`
- Run lint checks: `npm run lint`
- Run tests: `npm test`

## Purpose
Whether (Regime Station) turns public macro signals into operational guidance for product and engineering leaders.
Keep the product intent front-and-center: **translate macro data into plain‑English execution constraints**.

## Project layout
- `app/`: Next.js App Router UI and routes.
- `lib/`: Core logic, data clients, and shared utilities.
- `data/`: Local data snapshots or fixtures (keep sources explicit).
- `tests/`: Automated test coverage for regime logic and decision rules.

## Working agreements
- **Clarity over cleverness**: prioritize readability and explicit naming over terse abstractions.
- **Traceable data**: every output should point back to a verifiable public source (US Treasury).
- **Plain English first**: translate financial jargon into operational consequences.
- **Serious, not cute**: avoid playful UI patterns; aim for professional, high‑density dashboards.

## Coding conventions
- Prefer small, pure functions with clear inputs/outputs.
- Keep scoring and classification logic in a dedicated core module.
- Co-locate types and logic for the Regime Engine to avoid drift.
- Avoid hidden side effects in data fetchers; surface freshness and source metadata explicitly.

## Documentation expectations
- Update `README.md` when product requirements change.
- Keep `LEARNINGS.md` as a concise design/engineering principles reference.
- Every new module should include a short header comment describing its role in the Regime Station flow.

## Data and sourcing requirements
- Surface data freshness (timestamp) and source metadata for every fetched series.
- Prefer explicit source URLs in code comments or metadata objects.
- Avoid silent fallbacks; propagate errors with enough context to debug missing data.

## Testing and verification
- Add unit tests for regime classification, scoring, and decision rules.
- If tests are skipped, call it out explicitly in the PR summary.

## Cloudflare readiness (planned)
- Design data-fetching code so it can run in Cloudflare Workers/Pages functions later.
- Keep API calls isolated behind a small client interface.

## Commit and PR hygiene
- Use clear, descriptive commit messages.
- Summaries should answer: *what changed* and *why it matters*.
