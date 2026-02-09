# Whether — Regime Station

Whether translates public macro signals into operational guidance for product and engineering leaders.

## What Whether does
- Detects the current market regime from Treasury yield data and companion macro signals.
- Converts that regime into concrete operating constraints (pace, hiring posture, roadmap bias).
- Provides decision support tools (Decision Shield, assumption locks, scenario previews, brief exports).
- Keeps outputs auditable with explicit source metadata and freshness timestamps.

## Who this is for
- Product and engineering leaders aligning roadmap and team velocity to market conditions.
- COO/CFO/strategy partners setting spend, runway, and risk posture.
- Planning and operations teams that need copy-ready, source-backed leadership summaries.

## Local development
1. Use Node.js 20+ (`.nvmrc`) and Bun 1.2.x.
2. Install dependencies: `bun install`
3. Start development server: `bun run dev` (or `bun run dev:turbo`)
4. Open `http://localhost:3000`

## Quality gates
- Full pre-PR check: `bun run check`
- Lint only: `bun run lint`
- Typecheck only: `bun run typecheck`
- Tests only: `bun test`

## Project map (high signal)
- `app/` — Next.js App Router pages and UI features.
- `lib/` — Regime logic, data clients, thresholds, and shared utilities.
- `data/` — Snapshot/cache artifacts used for deterministic and offline-safe behavior.
- `tests/` — Node test suites for engine logic and decision rules.
- `scripts/` — Build and data-maintenance scripts.
- `docs/` — Architecture, roadmap, specs, and contributor/agent guidance.

## Contributor entry points
- Human contributors: `CONTRIBUTING.md`
- Agent contributors: `AGENTS.md` and `docs/agents/`
- Documentation index: `docs/README.md`

## Product and architecture references
- Architecture: `docs/architecture.md`
- Current feature scope: `docs/feature-specs-current.md`
- Next-level direction: `docs/prd-next-level.md`, `docs/specs-next-level.md`
- Stack modernization status: `docs/stack-modernization-*.md`

## Notes
- Whether provides operational strategy guidance, not investment advice.
- Keep data provenance explicit in code and UI outputs when extending data sources.
