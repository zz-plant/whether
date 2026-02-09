# Contributing to Whether

Thanks for helping improve Whether.

## Baseline environment
- Node.js 20+ (see `.nvmrc`)
- Bun 1.2.x (repo package manager)

## Quick start
1. Install dependencies: `bun install`
2. Start app: `bun run dev`
3. Validate changes before opening a PR:
   - Preferred: `bun run check`
   - Minimum: `bun run lint` and `bun test`

## Contribution standards
- Keep scope intentional; avoid unrelated refactors.
- Prefer existing patterns/utilities over introducing parallel abstractions.
- Update tests/docs when behavior, interfaces, or workflows change.
- Preserve source provenance and freshness metadata for macro data paths.

## Commit and PR guidance
- Use clear commit messages describing user-facing impact.
- Explain **what changed** and **why it matters** in the PR body.
- Include any risk/tradeoff notes and follow-up items when applicable.

## Documentation ownership map
- `README.md` → product overview + local run basics.
- `CONTRIBUTING.md` (this file) → human workflow + quality expectations.
- `AGENTS.md` + `docs/agents/*` → AI/agent operating guidance.
- `docs/README.md` → canonical documentation index.

## Useful commands
- `bun run dev:turbo` — run Next.js with Turbopack.
- `bun run build` — production build pipeline.
- `bun run typecheck` — TypeScript checks without emit.
- `bun run test:watch` — watch-mode tests.
