# ADR 0001: Refactor Boundaries and Migration Seams

- Status: Accepted
- Date: 2026-03-04
- Deciders: Engineering
- Related:
  - `docs/architecture.md` (current-state architecture + phased plan)
  - `docs/feature-specs-current.md` (current behavior contract)

## Context

Current implementation hotspots create broad blast radius for structural changes:

- `lib/report/reportData.ts` is a high fan-in/fan-out orchestrator used by core pages and APIs.
- `lib/regimeEngine.ts` combines multiple policy and scoring concerns.
- Large UI files (`appendixSections`, `reportShell`, `signals/page`) mix view composition with data transforms.
- Summary and cadence APIs are consumed as contracts, but contract drift risk increases during decomposition.
- Signal Ops state currently uses process-local memory while product flows imply durability expectations.

We need a refactor approach that reduces coupling while preserving external behavior.

## Decision

Refactor work will preserve and enforce six explicit seams:

1. `Data acquisition boundary`
   - Treasury + macro fetching, fallback behavior, and provenance contracts.
2. `Regime core boundary`
   - Pure scoring/classification/policy logic with stable typed input/output.
3. `Report composition boundary`
   - `loadReportData` reduced to thin orchestration across composable services.
4. `Summary contract boundary`
   - Stable typed payloads for `/api/weekly`, `/api/monthly`, `/api/cadence`, `/api/summary-delta`.
5. `State boundary`
   - Storage adapter abstraction for alerts, deliveries, and decision memory.
6. `Content boundary`
   - Static content registries isolated from runtime scoring and orchestration code.

Execution sequencing follows the architecture plan (`M0` -> `M6`) with contract and fixture gates before structural moves.

## Consequences

### Positive

- Lowers regression risk by anchoring refactor scope to explicit contracts.
- Makes high-change modules testable in isolation.
- Enables parallel workstreams after orchestrator decomposition.
- Improves rollback optionality by preserving adapters and contract boundaries.

### Negative

- Adds short-term overhead in test fixtures and adapter scaffolding.
- Requires temporary compatibility shims during transition.
- May delay opportunistic product-surface changes until boundary work completes.

## Guardrails

- No milestone may change user-visible behavior without explicit product signoff.
- API contract tests and `loadReportData` golden projections are required merge gates for core refactor PRs.
- Any new cross-boundary import requires rationale in PR description and follow-up to remove if transitional.
