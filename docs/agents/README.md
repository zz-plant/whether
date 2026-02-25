# Agent docs hub

Task-focused guidance for AI agents and code assistants working in this repository.

## How to use this hub
1. Start with `../../AGENTS.md` for instruction priority and operating constraints.
2. Read `setup.md` for install/run/check commands.
3. Read `project-layout.md` before editing unfamiliar areas.
4. Pull in only the additional guide(s) needed for your current task.

## Guide index
- `setup.md` — local setup commands, quality checks, and MCP baseline.
- `project-layout.md` — key directories and ownership boundaries.
- `engineering-principles.md` — coding conventions and implementation posture.
- `documentation.md` — documentation source-of-truth and update expectations.
- `data-and-platform.md` — provenance and platform readiness constraints.
- `quality-and-pr.md` — validation depth, commit hygiene, and PR quality bar.
- `ui-ux-standards.md` — accessibility, visual consistency, and interaction standards.
- `mcp-and-skills-playbook.md` — practical MCP + repo-skill workflows.
- `agent-interface.md` — concrete HTTP + MCP entrypoints for agentic integrations.

## Decision checklist for every task
- **Scope:** is the change tightly aligned with the user request?
- **Safety:** are provenance, fallbacks, and trust surfaces preserved?
- **Validation:** did you run the smallest meaningful checks?
- **Documentation:** if behavior/workflows changed, did docs change in the same PR?

## Scope note
These files are contributor-operational guidance. Product docs and strategic specs are indexed in `../README.md`.
