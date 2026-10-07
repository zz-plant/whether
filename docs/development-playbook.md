# Development playbook

This playbook is the practical companion to `CONTRIBUTING.md`: use it for concrete, high-signal workflows to plan, implement, validate, and review changes.


## 0) When to use this playbook

Use this document when you need execution detail (validation depth, PR shaping, troubleshooting).
For baseline project orientation, start with `CONTRIBUTING.md`.

## 1) Preferred day-to-day workflow

**Runtime policy:** Bun is the primary runtime/package manager. Node.js `>=22` is required for Vinext build/deploy scripts.

1. **Sync and install**
   - `git pull --rebase`
   - `bun install`
2. **Run locally**
   - `bun run dev`
3. **Ship in vertical slices**
   - Land thin increments that include implementation + tests + docs when behavior changes.
4. **Validate before push**
   - Typical: `bun run lint && bun run test`
   - Broad/high-risk: `bun run check`
5. **Know what the gates run**
   - `git push` runs `.husky/pre-push`: the `pre-push` preset in `scripts/check-tasks.mjs` (lint,
     lint:types, typecheck, test, assets, suppressions, dead-exports, hotspot-preflight, landmarks).
     `SKIP_PREPUSH=1` skips it, and the push is then unverified.
   - Cloudflare Workers Builds runs `bun run check:vinext`, the `deploy` preset, on every push,
     `main` included. A failure there blocks the deploy, not the merge.
   - GitHub Actions is manual-only (`workflow_dispatch`), so nothing on GitHub blocks a merge. Run
     `bun run check` before merging; it adds `audit`, which needs the network.
   - Details and failure triage: `docs/cloudflare-deployment-runbook.md`.

## 2) Scope management and PR sizing

- Favor PRs that can be reviewed in a single pass.
- Keep one intent per PR.
- Split large work into a sequence of PRs, each opened against `main`:
  - PR 1: enabling refactor/infrastructure
  - PR 2: behavioral change
  - PR 3: cleanup and documentation follow-through
- Don't stack PRs on each other's branches. A squash merge leaves the parent branch alive, so GitHub
  never retargets the child, and it merges into the stale branch instead of `main` (#1513 on
  2026-10-06 needed a re-landing PR). Wait for the parent to merge, or fold both into one PR.

## 3) Risk-based validation matrix

| Risk profile | Examples | Expected validation |
| --- | --- | --- |
| Low | Docs/copy/metadata-only updates | Verify links, references, and command correctness |
| Medium | UI behavior, orchestration/glue logic | `bun run lint` + `bun run test` |
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
- `bun run test`
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

### Build is slow on a constrained machine
- `next.config.js` reads three build knobs: `NEXT_BUILD_CPUS` (build worker count),
  `NEXT_STATIC_GENERATION_WORKERS` (static-generation concurrency) and
  `NEXT_STATIC_GENERATION_MIN_PAGES_PER_WORKER` (pages chunked per worker).
- Measured on 2026-03-08: more workers did not cut wall-clock time on a constrained box, so tune
  them to the machine's actual cores rather than raising them by default.

### PR is hard to review
- Separate concerns and split into smaller PRs.
- Move opportunistic cleanup to a follow-up PR.
- Add a short “review map” in PR summary (file-by-file or concern-by-concern).

## 8) Documentation sync reminders

When behavior or workflows change, update docs in the same PR:
- `README.md` for user-facing quickstart context changes.
- `CONTRIBUTING.md` for human contributor workflow changes.
- `docs/agents/*` when agent-specific instructions shift.

## 9) Team heuristics

- Optimize for **clarity over cleverness**.
- Prefer explicit assumptions and visible validation over implicit behavior.
- Bias toward changes that are easy to reason about six months later.


## 10) Route canonicalization checklist (required for route renames)

Whenever a route is renamed or reorganized, complete all of the following in the same PR:

- [ ] Remove the retired route handler or bridge page instead of preserving in-app redirects.
- [ ] Update first-party navigation and CTA links to canonical routes (no internal link leakage).
- [ ] Update sitemap entries (`app/sitemap.ts`) to canonical routes only.
- [ ] Update breadcrumb mappings (`lib/navigation/*`) for the canonical route labels.
- [ ] Update metadata/canonical URL references for affected route files.
- [ ] Update route smoke checks (`scripts/prod-synthetic-smoke.mjs`) for canonical routes plus explicit 404 expectations on retired URLs.

Rule of thumb: product-owned links must always point to canonical routes, and retired URLs should fall through unless there is an explicit, current product reason to keep them alive.


## 11) Noun discipline glossary (primary surfaces)

Use these canon terms across `/` and `/operate` unless a section is explicitly documenting a different semantic layer.

| Surface type | Preferred noun | Meaning | Avoid drift terms |
| --- | --- | --- | --- |
| Regime logic + score classification | `regime` | The score-derived classification (`SCARCITY`, `DEFENSIVE`, `VOLATILE`, `EXPANSION`) and boundary math. | climate state, mode bucket |
| Weekly operator recommendation copy | `posture` | The operating stance leaders should apply this week based on the current regime. | stance (as primary label), weather mode |
| Macro context and supporting evidence | `environment` | External market conditions that inform confidence and pacing, not the call itself. | backdrop climate (as primary label) |
| Public decision contract | `Current call` / `Action now` / `Pause if` / `Change course if` | The shared user-facing labels for the weekly decision, the immediate move, the hold line, and the reversal signal. | guardrail, flip condition, reversal trigger, threshold (as the primary scan label) |

Rule: write `regime -> posture -> environment` in that order when all three appear together in one artifact.
For decision artifacts, prefer `Current call -> Action now -> Pause if -> Change course if`.
