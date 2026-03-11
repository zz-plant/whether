# Project layout

## Primary source directories
- `app/` — Next.js App Router pages, route handlers, and UI components.
- `lib/` — regime engine, data clients, decision logic, and shared utilities.
- `data/` — local snapshots/caches used for deterministic and fallback behavior.
- `tests/` — Node-based test suites.
- `scripts/` — build and data maintenance scripts.

## Supporting directories
- `docs/` — architecture, specs, roadmap, and contributor guidance.
- `.github/` — templates and automation metadata.

## Editing guidance
- Keep scoring/classification logic in core modules under `lib/`.
- Treat `lib/decisionDomainCatalog.ts` as the canonical operator-domain catalog (posture, decide, toolkits, failure modes); keep navigation IA concerns in `lib/navigation/informationArchitecture.ts`.
- Keep user-facing behavior changes paired with nearby tests and docs updates.
- Prefer local edits in existing modules over introducing new top-level structures.
