# Contributing

Thanks for contributing to Whether.

## Quick start
1. Use Node.js 20 (`.nvmrc`) and Bun 1.2.
2. Install dependencies: `bun install`.
3. Run locally: `bun run dev`.
4. Run checks before opening a PR: `bun run check` (or at minimum `bun run lint` and `bun test`).

## Documentation by audience
- **Developer workflow (human contributors):** this file + `README.md`.
- **AI/agent workflow:** `AGENTS.md` and `docs/agents/`.
- **System and product context:** `docs/README.md` and linked docs.

## Contribution expectations
- Keep changes focused and avoid unrelated refactors.
- Update docs/tests when behavior or interfaces change.
- Prefer existing patterns and utilities over introducing new abstractions.
- Keep data provenance explicit for macro inputs and derived outputs.

## PR checklist
- [ ] Scope is clear and intentionally small.
- [ ] Lint/tests/checks run locally as appropriate.
- [ ] Documentation updated if behavior, interfaces, or workflows changed.
- [ ] Commit message and PR description explain what changed and why it matters.
