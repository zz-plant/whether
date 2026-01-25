# Agent Guide for Whether

Whether (Regime Station) turns public macro signals into operational guidance for product and engineering leaders.

## Essentials
- Package manager: `bun`.
- Install dependencies: `bun install`
- Start dev server: `bun run dev`
- Build for production: `bun run build`
- Run lint checks: `bun run lint`
- Run tests: `bun test`

## Operating principles
- Follow instruction priority: system > developer > user > AGENTS > repo docs. If conflicts arise, call them out and follow the higher-priority rule.
- Always look for nested `AGENTS.md` files in the directories you touch; deeper files override this one.
- Keep changes focused and minimal; avoid drive-by refactors unless requested or required.
- Prefer editing existing patterns and utilities over inventing new ones.
- Use `rg` (ripgrep) for searching the codebase; avoid recursive `ls` or `grep -R`.
- When you change behavior or interfaces, update relevant documentation or tests to match.

## Workflow checklist
1. Identify relevant docs in `docs/agents/` before making code changes.
2. Confirm the data/source of truth for content changes (see data & platform guidance).
3. Run the smallest set of checks that gives confidence (lint, tests, or targeted scripts).
4. Summarize changes and report tests in the final response.

## More guidance (progressive disclosure)
- [Setup commands](docs/agents/setup.md)
- [Project layout](docs/agents/project-layout.md)
- [Engineering principles & coding conventions](docs/agents/engineering-principles.md)
- [Documentation expectations](docs/agents/documentation.md)
- [Data sourcing & platform readiness](docs/agents/data-and-platform.md)
- [Testing & PR hygiene](docs/agents/quality-and-pr.md)
- [UI/UX standards](docs/agents/ui-ux-standards.md)
- [Docs structure suggestion](docs/agents/README.md)
