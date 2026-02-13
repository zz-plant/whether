# Development playbook

This playbook expands on `CONTRIBUTING.md` with practical guidance for shipping safe, reviewable changes quickly.

## 1) Fast local workflow

1. **Sync + install**
   - `git pull --rebase`
   - `bun install`
2. **Start app**
   - `bun run dev`
3. **Develop in small slices**
   - Favor thin vertical increments (UI + logic + tests/docs together).
4. **Validate before push**
   - Typical: `bun run lint && bun test`
   - Broad changes: `bun run check`

## 2) Change sizing and branch hygiene

- Prefer PRs that can be reviewed in one sitting.
- Keep one intent per PR (feature, fix, refactor, or docs).
- If a task is large, split into stacked PRs:
  - PR 1: enabling refactor/infrastructure
  - PR 2: behavior change
  - PR 3: cleanup/docs follow-through

## 3) Testing strategy by risk

### Low-risk changes (copy/docs/non-behavioral)
- Validate links, references, and command accuracy.

### Medium-risk changes (UI behavior, glue logic)
- Run `bun run lint` and `bun test`.
- Add/update tests where behavior changed.

### High-risk changes (regime/scoring/decision logic, data plumbing)
- Run `bun run check`.
- Add or expand tests around edge cases and regression boundaries.
- Call out assumptions and tradeoffs in PR notes.

## 4) Data and decision integrity checklist

When touching macro inputs, regime logic, or decision outputs:

- Keep source provenance explicit.
- Preserve or improve freshness metadata behavior.
- Confirm fallback behavior remains deterministic when live data is unavailable.
- Ensure user-facing guidance remains explainable (not just “correct”).

## 5) Documentation contract

Update docs in the same PR when you change:
- Behavior or user workflows.
- Contributor workflows/commands.
- Source-of-truth locations.

Where to update:
- `README.md` for product framing + quickstart basics.
- `CONTRIBUTING.md` for contributor workflow.
- `docs/README.md` for documentation index/map.
- `docs/architecture.md` for meaningful module/data-flow changes.

## 6) Review-ready PR checklist

Before opening PR:
- [ ] Scope is focused and intentional.
- [ ] Tests/docs updated for behavior/workflow changes.
- [ ] Validation commands run; outcomes captured.
- [ ] Risks/follow-ups explicitly documented.

Suggested PR body sections:
- **Summary**
- **Why this matters**
- **Validation**
- **Risks / follow-ups**

## 7) Common issues and fixes

### Dev server fails to start
- Confirm Node + Bun versions (`node -v`, `bun -v`).
- Reinstall dependencies: `bun install`.

### Types pass locally but behavior is wrong
- Add/adjust focused tests under `tests/` around changed behavior.
- Verify assumptions against current docs in `docs/feature-specs-current.md`.

### Large PR is hard to review
- Split by intent and land incrementally.
- Move non-essential cleanup into a follow-up PR.

## 8) Guiding principle

Optimize for **clarity over cleverness**: obvious code, explicit assumptions, and visible validation beat hidden complexity.
