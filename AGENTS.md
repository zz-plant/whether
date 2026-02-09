# Agent Guide for Whether

Whether (Regime Station) turns public macro signals into operational guidance for product and engineering leaders.

## Essentials
- Package manager: `bun`
- Install dependencies: `bun install`
- Start dev server: `bun run dev`
- Build for production: `bun run build`
- Run full checks: `bun run check`
- Run lint checks: `bun run lint`
- Run tests: `bun test`

## Operating principles
- Follow instruction priority: system > developer > user > AGENTS > repo docs.
- Always check for nested `AGENTS.md` files in directories you touch; deeper files override this one.
- Keep changes focused; avoid drive-by refactors unless requested.
- Prefer existing patterns/utilities over introducing new parallel systems.
- Use `rg` for discovery; avoid `ls -R` / `grep -R`.
- Update docs/tests when behavior or interfaces change.

## Workflow checklist
1. Read relevant docs in `docs/agents/` before editing.
2. Confirm the source of truth for any content/data changes.
3. Run the smallest useful verification set (`bun run lint`, `bun test`, `bun run check`, or targeted checks).
4. Summarize code/doc changes and commands run in the final response.

## Progressive guidance
- [Setup commands](docs/agents/setup.md)
- [Project layout](docs/agents/project-layout.md)
- [Engineering principles & coding conventions](docs/agents/engineering-principles.md)
- [Documentation expectations](docs/agents/documentation.md)
- [Data sourcing & platform readiness](docs/agents/data-and-platform.md)
- [Testing & PR hygiene](docs/agents/quality-and-pr.md)
- [UI/UX standards](docs/agents/ui-ux-standards.md)
- [Agent docs hub](docs/agents/README.md)
