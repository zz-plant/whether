# Contributing to Whether

Thanks for helping improve Whether.

This guide is the **human contributor** source of truth for day-to-day engineering workflow.
For agent-specific operating instructions, use `AGENTS.md` and `docs/agents/*`.

## 1) Development environment

### Required toolchain
- Node.js 20+ (see `.nvmrc`)
- Bun 1.3.x (repo package manager, pinned in `package.json`)

### Bootstrap
1. Install dependencies: `bun install`
2. Start the app: `bun run dev`
3. Open `http://localhost:3000`

## 2) Command reference

| Goal | Command |
| --- | --- |
| Run development server | `bun run dev` |
| Run development server (Turbopack) | `bun run dev:turbo` |
| Production build pipeline | `bun run build` |
| Lint | `bun run lint` |
| Type-check | `bun run typecheck` |
| Tests | `bun test` |
| Tests in watch mode | `bun run test:watch` |
| Full pre-PR validation | `bun run check` |

## 3) How to contribute effectively

### Keep scope disciplined
- Keep changes intentional; avoid unrelated refactors in the same PR.
- Prefer extending existing modules/patterns over introducing parallel abstractions.

### Protect product trust
- Preserve source provenance and freshness metadata for macro data paths.
- If behavior, interfaces, or workflows change, update tests and docs in the same PR.

### Choose the right place to edit
- `app/` — Next.js App Router pages and UI behavior.
- `lib/` — regime engine, data clients, and decision logic.
- `tests/` — regression and behavior coverage.
- `docs/` — architecture, specs, and contributor guidance.

## 4) Validation expectations (Definition of Done)

Use the smallest meaningful verification set for your scope:

- **Docs-only or copy-only changes:** sanity-check links/references and run targeted checks if needed.
- **Typical product/code changes:** at minimum run:
  - `bun run lint`
  - `bun test`
- **Broad/refactor/high-risk changes:** run full suite:
  - `bun run check`

When changing scoring, classification, or decision behavior, add or update tests.

## 5) Commit and PR quality

### Commits
- Use clear commit messages with user or contributor impact.
- Keep commits coherent and reviewable.

### PRs
PR descriptions should make review fast by covering:
1. What changed.
2. Why it matters.
3. How it was validated (commands + outcomes).
4. Risks, limitations, and follow-ups (if any).

## 6) Documentation ownership map

- `README.md` → product overview + quick local run basics.
- `CONTRIBUTING.md` (this file) → human workflow + quality expectations.
- `AGENTS.md` + `docs/agents/*` → AI/agent operating guidance.
- `docs/README.md` → canonical documentation index.
- `docs/development-playbook.md` → deeper engineering workflow and troubleshooting.

## 7) Need deeper guidance?

Use the extended playbook for opinionated workflows and troubleshooting:
- `docs/development-playbook.md`
