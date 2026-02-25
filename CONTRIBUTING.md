# Contributing to Whether

Thanks for helping improve Whether.

This is the **human contributor** source of truth for day-to-day development workflows.
For AI/agent operating rules, use `AGENTS.md` and `docs/agents/*`.

## 1) Environment and bootstrap

### Required toolchain
- Node.js 20+ (see `.nvmrc`)
- Bun 1.3.x (pinned via `packageManager` in `package.json`)

### First run
1. Install dependencies: `bun install`
2. Start local server: `bun run dev`
3. Open `http://localhost:3000`

## 2) Command reference

| Goal | Command |
| --- | --- |
| Development server | `bun run dev` |
| Development server (Turbopack) | `bun run dev:turbo` |
| Production build pipeline | `bun run build` |
| Lint | `bun run lint` |
| Type-check | `bun run typecheck` |
| Tests | `bun test` |
| Tests in watch mode | `bun run test:watch` |
| Full pre-PR checks | `bun run check` |

## 3) Contribution workflow

1. **Sync and install**
   - `git pull --rebase`
   - `bun install`
2. **Implement in focused slices**
   - Prefer one clear intent per PR.
   - Avoid drive-by cleanup unless required for correctness.
3. **Validate by risk**
   - Docs-only: verify links/commands/references.
   - Typical app/logic changes: `bun run lint && bun test`.
   - Broad/high-risk changes: `bun run check`.
4. **Ship with docs/tests**
   - If behavior, interfaces, commands, or contributor workflows change, update relevant docs in the same PR.

## 4) What good contributions look like

### Reuse existing patterns
- Extend existing modules/utilities first.
- Avoid introducing parallel abstractions for already-solved problems.

### Preserve product trust
- Keep macro data provenance and freshness metadata explicit.
- Ensure deterministic fallback behavior remains intact when touching data paths.
- Add/update tests for scoring, classification, or decision-behavior changes.

## 5) Where to make changes

- `app/` — UI, routes, and user-facing interaction surfaces.
- `lib/` — regime engine, data ingestion/normalization, decision logic.
- `tests/` — behavior and regression coverage.
- `docs/` — architecture, specs, audits, and contributor guidance.

If unsure where logic belongs, colocate with the nearest existing feature module and follow established patterns.

## 6) Commit and PR expectations

### Commit quality
- Keep commits coherent and reviewable.
- Use descriptive commit subjects that describe user/contributor impact.

### PR quality
A strong PR description should answer:
1. What changed?
2. Why does it matter?
3. How was it validated? (commands + outcomes)
4. What are the risks, limitations, and follow-ups?

Recommended section headings:
- **Summary**
- **Why this matters**
- **Validation**
- **Risks / follow-ups**

## 7) Documentation ownership map

- `README.md` → product framing + local quickstart basics.
- `CONTRIBUTING.md` (this file) → human workflow and contribution standards.
- `AGENTS.md` + `docs/agents/*` → agent/AI contributor instructions.
- `docs/README.md` → canonical documentation index.
- `docs/development-playbook.md` → detailed engineering workflow, checklists, and troubleshooting.

## 8) Quick links

- Deep workflow guidance: `docs/development-playbook.md`
- System/module orientation: `docs/architecture.md`
- Current product behavior intent: `docs/feature-specs-current.md`
