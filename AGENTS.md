# Agent Guide for Whether

This repository is intentionally minimal right now. Use this guide to keep contributions consistent.

## Purpose
Whether (Regime Station) turns public macro signals into operational guidance for product and engineering leaders.
Keep the product intent front-and-center: **translate macro data into plain‑English execution constraints**.

## Dev environment
- Install dependencies: `npm install`
- Run the dev server: `npm run dev`
- Build for production: `npm run build`
- Start production server: `npm run start`

## Working agreements
- **Clarity over cleverness**: prioritize readability and explicit naming over terse abstractions.
- **Traceable data**: every output should point back to a verifiable public source (US Treasury).
- **Plain English first**: translate financial jargon into operational consequences.
- **Serious, not cute**: avoid playful UI patterns; aim for professional, high‑density dashboards.

## Code organization
- Prefer small, pure functions with clear inputs/outputs.
- Keep scoring and classification logic in a dedicated core module.
- Co-locate types and logic for the Regime Engine to avoid drift.
- Avoid hidden side effects in data fetchers; surface freshness and source metadata explicitly.
- Every new module should include a short header comment describing its role in the Regime Station flow.

## Data and sourcing
- Reference public U.S. Treasury data, include the exact series name or identifier in outputs when possible.
- Surface source URLs and timestamps alongside derived metrics.
- Keep API calls isolated behind a small client interface to ease Cloudflare migration.

## Testing and verification
- Add unit tests for regime classification, scoring, and decision rules.
- Run `npm run lint` and `npm run test` for any substantive change.
- If tests are skipped, call it out explicitly in the PR summary.

## Commit and PR hygiene
- Use clear, descriptive commit messages.
- Summaries should answer: *what changed* and *why it matters*.
