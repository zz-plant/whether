---
name: feature-audit
description: Audit Whether product surfaces against repo standards and return a prioritized remove or move or modify plan with concrete next actions and explicit evidence.
allowed-tools:
  - Read
  - Grep
  - WebFetch
---

# Feature audit

Audit an existing surface for decision clarity, trust, and product-fit drift.

## Use this skill when

- auditing a page, flow, or component against Whether product standards
- a reviewer asks for structured UX or content recommendations
- a task needs explicit severity and effort triage instead of open-ended critique

## Do not use this skill when

- building a new feature from scratch
- fixing a narrow implementation bug with no product or UX review component
- the task needs visual/browser verification but no audit synthesis

## Required inputs

- the target surface and scope
- the user or operator goal for that surface
- the relevant product standard or spec

## Repo anchors

- `AGENTS.md`
- `docs/one-screen-weekly-brief-spec.md`
- `docs/feature-specs-current.md`
- `docs/agents/ui-ux-standards.md`

## Evidence tools

None of these runs in a gate, and each needs Bash, which this skill does not grant. Run them (or ask the caller for their output) when the audit turns on the question each answers; a result is a lead to read, not a finding.

- `bun run audit:near-duplicates`: helpers rewritten under a new name in another file (cosine >=0.93). `-- --copy` does the same for reader sentences said twice. Needs a local Ollama with `embeddinggemma-2:740m`.
- `bun run audit:jev-copy`: the copy audit's four questions asked of every sentence on the reader routes. Needs a running server and Workers AI credentials; add `-- --model clef-flash` when Jev answers 402.
- `bun run telemetry:streams`: rows per Analytics Engine stream over the last 30 days (`WHETHER_TELEMETRY_WINDOW_DAYS` changes it). A stream at zero is dead code or a broken emitter; read the emitter before calling the feature unused. Needs `CLOUDFLARE_ACCOUNT_ID` and an analytics read token.

## Workflow

1. Define the target surface and the user decision it should support.
2. Capture the current behavior from source files, docs, and artifacts.
3. Compare the surface against repo standards with emphasis on decision transmission.
4. Produce a remove or move or modify matrix with severity and effort.
5. End with the smallest set of next actions that materially improve the surface.

## Output contract

Return in this order:

1. **Skill used + why**
2. **Audit target and scope**
3. **Observed issues**
4. **Remove or move or modify matrix**
5. **Top next actions**
6. **Risks or regressions to watch**
7. **Fallback note** only if evidence or scope gaps block a complete audit

## Quality checks before finalizing

- Every recommendation maps to an observed issue.
- Findings cite relevant files, routes, or artifacts.
- High-severity items include a concrete follow-up action.
- Recommendations reduce new-system overhead instead of adding adjacent surfaces.

## Guardrails

- Optimize for operator value, not generalized UX theory.
- Prefer focused changes over redesign sprawl.
- Do not invent new taxonomy when an existing surface can carry the fix.

## Maintenance notes

- Last reviewed: 2026-10-27 (evidence tools added)
- Refresh when primary product standards or homepage brief contracts change, or when an advisory audit command is added or retired.
