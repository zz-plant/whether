---
name: signal-provenance-audit
description: Audit Whether signal outputs for provenance, freshness, fallback handling, and method transparency by verifying source URLs, retrieval timestamps, and formula visibility.
allowed-tools:
  - Read
  - Grep
  - Bash
---

# Signal provenance audit

Audit whether surfaced signals are trustable enough to ship or cite.

## Use this skill when

- verifying where a signal came from
- auditing trust-readiness of macro snapshots, signal cards, or exported artifacts
- checking provenance before release or distribution decisions

## Do not use this skill when

- the request is strategic interpretation only
- source artifacts or rendering paths are out of scope and inaccessible

## Required inputs

- the target output or surface being audited
- the signals or metrics in scope
- the release or decision context, if any

## Repo anchors

- `docs/agents/data-and-platform.md`
- `lib/report/trustStatus.ts`
- `lib/report/reportFormatting.ts`
- `lib/treasury/`
- `lib/report/`

## Workflow

1. Map source to transform to render for each surfaced signal.
2. Verify URL, timestamp, fallback status, and method or formula visibility.
3. Mark pass, warn, or fail with rationale.
4. Rank gaps by release risk.
5. Propose the smallest viable patch plan and a release recommendation.

## Output contract

Return in this order:

1. **Skill used + why**
2. **Audit scope**
3. **Provenance matrix**
4. **Top gaps**
5. **Fix plan**
6. **Release recommendation**
7. **Fallback note** only if audit coverage was blocked

## Quality checks before finalizing

- No item is marked pass if required trust fields are missing.
- Findings cite exact files, artifacts, or routes.
- Missing source data is distinguished from missing display logic.
- Fixes are scoped to realistic one-PR increments when possible.

## Guardrails

- Do not redesign the full pipeline during audit.
- Do not assess macro correctness beyond documented formulas and surfaced provenance.
- Treat missing freshness and missing fallback markers as trust defects, not minor polish issues.

## Maintenance notes

- Last reviewed: 2026-03-16
- Refresh when provenance policy, trust surfaces, or ingestion pipelines change.
