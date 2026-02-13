# Contributing to Whether

Thanks for helping improve Whether.

This is the **human contributor** source of truth for day-to-day development workflow.
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

## 3) What good contributions look like

### Keep scope intentional
- Prefer one clear intent per PR (feature, fix, refactor, docs).
- Avoid drive-by cleanup unless it is required to safely land your main change.

### Reuse existing patterns
- Extend existing modules/utilities first.
- Avoid introducing parallel abstractions for already-solved problems.

### Preserve product trust
- Keep macro data provenance and freshness metadata explicit.
- If behavior/workflows/interfaces change, update tests and docs in the same PR.

## 4) Where to make changes

- `app/` — UI, routes, and user-facing interaction surfaces.
- `lib/` — regime engine, data ingestion/normalization, decision logic.
- `tests/` — behavior and regression coverage.
- `docs/` — architecture, specs, audits, and contributor guidance.

If unsure where logic belongs, prefer colocating with the nearest existing feature module and follow established patterns.

## 5) Validation depth rubric (Definition of Done)

Pick the smallest meaningful validation set for your risk level:

| Change type | Minimum validation |
| --- | --- |
| Docs/copy only | Verify links/commands/references are accurate |
| Typical product or logic change | `bun run lint` + `bun test` |
| Broad/refactor/high-risk logic changes | `bun run check` |

Additional expectations:
- Add/update tests for scoring, classification, or decision-behavior changes.
- For data-path changes, verify deterministic fallback behavior still works.

## 6) Commit and PR expectations

### Commit quality
- Use clear, descriptive commit subjects that convey user/contributor impact.
- Keep commits coherent and reviewable.

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

- `README.md` → product framing + quick local run basics.
- `CONTRIBUTING.md` (this file) → human workflow and contribution standards.
- `AGENTS.md` + `docs/agents/*` → agent/AI contributor instructions.
- `docs/README.md` → canonical documentation index.
- `docs/development-playbook.md` → deeper engineering workflow, checklists, and troubleshooting.

## 8) Quick links

- Deep workflow guidance: `docs/development-playbook.md`
- System/module orientation: `docs/architecture.md`
- Current product behavior intent: `docs/feature-specs-current.md`
