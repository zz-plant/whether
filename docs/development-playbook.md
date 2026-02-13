# Development playbook

This playbook is the practical companion to `CONTRIBUTING.md`: use it when you want concrete, high-signal workflows for planning, implementing, validating, and reviewing changes.

## 1) Preferred day-to-day workflow

1. **Sync and install**
   - `git pull --rebase`
   - `bun install`
2. **Run locally**
   - `bun run dev`
3. **Ship in vertical slices**
   - Land thin increments that include implementation + tests + docs when behavior changes.
4. **Validate before push**
   - Typical: `bun run lint && bun test`
   - Broad/high-risk: `bun run check`

## 2) Scope management and PR sizing

- Favor PRs that can be reviewed in a single pass.
- Keep one intent per PR.
- Split large work into stacked PRs where possible:
  - PR 1: enabling refactor/infrastructure
  - PR 2: behavioral change
  - PR 3: cleanup and documentation follow-through

## 3) Risk-based validation matrix

| Risk profile | Examples | Expected validation |
| --- | --- | --- |
| Low | Docs/copy/metadata-only updates | Verify links, references, and command correctness |
| Medium | UI behavior, orchestration/glue logic | `bun run lint` + `bun test` |
| High | Regime/scoring/decision logic, data plumbing | `bun run check` + targeted regression tests |

### Regression priorities for high-risk changes
- Boundary conditions around thresholds/classification transitions.
- Deterministic fallbacks when upstream/live data is unavailable.
- User-facing explanation quality (guidance should remain understandable and auditable).

## 4) Data and decision integrity checklist

When touching macro data, regime logic, or decision outputs:

- [ ] Source provenance remains explicit.
- [ ] Freshness metadata behavior is preserved or improved.
- [ ] Offline/deterministic fallback paths still produce stable outputs.
- [ ] Assumptions/tradeoffs are documented in the PR.

## 5) Documentation update contract

Update documentation in the same PR when you change:
- Behavior or user workflows.
- Contributor workflows/commands.
- Source-of-truth locations.

Where to update:
- `README.md` → product overview and local quickstart basics.
- `CONTRIBUTING.md` → human contributor workflow standards.
- `docs/README.md` → documentation map/index discoverability.
- `docs/architecture.md` → meaningful module/data-flow changes.
- `docs/feature-specs-current.md` → current behavior intent.

## 6) Review-ready PR checklist

Before opening PR:
- [ ] Scope is focused and intentional.
- [ ] Tests/docs are updated for behavior/workflow changes.
- [ ] Validation commands are run and outcomes captured.
- [ ] Risks, constraints, and follow-ups are explicitly called out.

Suggested PR body scaffold:

```md
## Summary
## Why this matters
## Validation
- `bun run lint`
- `bun test`
## Risks / follow-ups
```

## 7) Practical troubleshooting

### Dev server does not start
- Confirm runtime versions: `node -v` and `bun -v`.
- Reinstall dependencies: `bun install`.
- Retry with a clean terminal session.

### Lint/tests pass but behavior seems off
- Add a focused regression test in `tests/` reproducing expected behavior.
- Re-check intended behavior in `docs/feature-specs-current.md`.
- Validate nearby assumptions in `lib/` modules touched by the change.

### PR is hard to review
- Separate concerns and split into smaller PRs.
- Move opportunistic cleanup to a follow-up PR.
- Add a short “review map” in PR summary (file-by-file or concern-by-concern).

## 8) Team heuristics

- Optimize for **clarity over cleverness**.
- Prefer explicit assumptions and visible validation over implicit behavior.
- Bias toward changes that are easy to reason about six months later.
