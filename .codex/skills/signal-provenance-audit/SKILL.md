---
name: signal-provenance-audit
description: Audit Whether macro/sensor outputs for provenance and freshness when users ask to verify source URLs, timestamps, formulas, or data-quality readiness.
allowed-tools:
  - Read
  - Grep
  - Bash
---

# Signal provenance audit (Whether)

## Use this skill when

- Asked to verify where a signal came from.
- Reviewing trust/readiness of macro snapshots or sensor cards.
- Checking whether outputs meet provenance requirements before release.

## Inputs expected

- Scope (route, component, dataset, or document).
- Audit depth (quick check vs release gate).
- Optional release target date.

## Workflow

1. Locate data source, transform path, and render surface.
2. Verify each surfaced signal includes source URL, retrieval timestamp, and method/formula notes where applicable.
3. Identify stale/implicit/missing provenance fields.
4. Rate risk and propose smallest corrective changes.
5. Produce a release-go/no-go summary for the requested scope.

## Output contract

Return in this order:

1. **Audit scope**
2. **Provenance matrix** with columns:
   - Signal
   - Source artifact/path
   - URL present (`yes/no`)
   - Timestamp present (`yes/no`)
   - Method/formula present (`yes/no`)
   - Status (`pass/warn/fail`)
3. **Top gaps** (ranked)
4. **Fix plan** (smallest viable patches)
5. **Release recommendation** (`go` / `go with conditions` / `no-go`)

## Guardrails

- Do not mark "pass" if any required provenance field is missing.
- Cite exact files for each finding.
- Distinguish missing data from missing display logic.
- Keep recommendations implementable in one PR where possible.

## Non-goals

- Replacing the full data pipeline architecture.
- Validating macro economics correctness beyond documented formulas.
- Writing speculative policy recommendations.

## Maintenance notes

- Last reviewed: 2026-02-23
- Canonical policy reference: `docs/agents/data-and-platform.md`.
