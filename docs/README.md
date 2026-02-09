# Documentation map

This directory is organized by audience so developers, contributors, and agents can quickly find the right source of truth.

## For developers & contributors
- Start with [`../CONTRIBUTING.md`](../CONTRIBUTING.md) for setup, workflow, and quality gates.
- Use [`architecture.md`](architecture.md) for system-level design.
- Use [`stack-compatibility-matrix.md`](stack-compatibility-matrix.md) and modernization docs when changing platform/runtime assumptions.

## For agents (AI/code assistants)
- Start with [`agents/README.md`](agents/README.md).
- Follow task-focused guidance in `docs/agents/*`.
- Treat [`../AGENTS.md`](../AGENTS.md) as operating instructions and precedence rules.

## Product and planning artifacts
- PRD/spec direction: `prd-next-level.md`, `specs-next-level.md`, `feature-specs-current.md`.
- Execution and planning: `roadmap-audit.md`, `issue-scan.md`.
- Acquisition narrative: `acquisition/reforge-ready.md`.

## Maintenance conventions
- Prefer updating an existing document over creating a near-duplicate.
- When adding a new document, link it from this map and (if relevant) from `CONTRIBUTING.md` or `docs/agents/README.md`.
- Keep this map concise; detailed policy belongs in audience-specific docs.
