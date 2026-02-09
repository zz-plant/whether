# Data sourcing & platform readiness

## Data and provenance requirements
- Surface freshness (timestamp) and source metadata for fetched series.
- Prefer explicit source URLs in metadata objects and/or comments.
- Avoid silent fallbacks; return debuggable errors when data is missing.
- Keep snapshots/cache artifacts clearly named and documented in nearby docs.

## Platform readiness guidance
- Isolate external API calls behind small client interfaces.
- Keep transform logic runtime-portable (Node today, edge/serverless-friendly tomorrow).
- Avoid Node-only APIs in shared logic unless intentionally server-only.
