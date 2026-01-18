# Engineering principles & coding conventions

## Working agreements
- **Clarity over cleverness**: prioritize readability and explicit naming over terse abstractions.
- **Traceable data**: every output should point back to a verifiable public source (US Treasury).
- **Plain English first**: translate financial jargon into operational consequences.
- **Serious, not cute**: avoid playful UI patterns; aim for professional, high-density dashboards.

## Coding conventions
- Prefer small, pure functions with clear inputs/outputs.
- Keep scoring and classification logic in a dedicated core module.
- Co-locate types and logic for the Regime Engine to avoid drift.
- Avoid hidden side effects in data fetchers; surface freshness and source metadata explicitly.
