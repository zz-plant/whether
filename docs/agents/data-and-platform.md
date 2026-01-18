# Data sourcing & platform readiness

## Data and sourcing requirements
- Surface data freshness (timestamp) and source metadata for every fetched series.
- Prefer explicit source URLs in code comments or metadata objects.
- Avoid silent fallbacks; propagate errors with enough context to debug missing data.

## Cloudflare readiness (planned)
- Design data-fetching code so it can run in Cloudflare Workers/Pages functions later.
- Keep API calls isolated behind a small client interface.
