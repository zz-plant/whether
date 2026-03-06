---
name: signal-provenance-audit
description: Audit Whether signal outputs for provenance and freshness by verifying source URLs, retrieval timestamps, and method/formula transparency.
allowed-tools:
  - Read
  - Grep
  - Bash
---

# Signal provenance audit (Whether)

## Use this skill when

- Verifying where a signal came from.
- Auditing trust/readiness of macro snapshots or signal cards.
- Running provenance checks before release decisions.

## Do not use this skill when

- The request is strategic interpretation only (no provenance validation).
- Source artifacts are out of scope and inaccessible.

## Workflow

1. Map source → transform → render path.
2. Verify URL, timestamp, and method/formula presence for each surfaced signal.
3. Mark pass/warn/fail with explicit rationale.
4. Rank gaps by release risk.
5. Propose smallest viable patch plan and go/no-go recommendation.

## Output contract (required order)

1. **Skill used + why**
2. **Audit scope**
3. **Provenance matrix**
   - Signal
   - Source artifact/path
   - URL present (`yes/no`)
   - Timestamp present (`yes/no`)
   - Method/formula present (`yes/no`)
   - Status (`pass/warn/fail`)
4. **Top gaps** (ranked)
5. **Fix plan** (smallest viable patches)
6. **Release recommendation** (`go` / `go with conditions` / `no-go`)
7. **Fallback note** (only if audit coverage is blocked)

## Quality checks before finalizing

- No `pass` rating when required fields are missing.
- Findings cite exact files/artifacts.
- Missing data is distinguished from missing display logic.
- Fixes are scoped to practical one-PR increments where possible.

## Guardrails

- Do not redesign the full pipeline during audit.
- Do not assess macro correctness beyond documented formulas.

## Maintenance

- Last reviewed: 2026-03-06
- Canonical policy reference: `docs/agents/data-and-platform.md`.
