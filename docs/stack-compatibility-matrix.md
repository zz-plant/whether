# Stack compatibility matrix

This matrix is the checked-in source of truth for stack upgrade candidates, blockers, and evidence.

| Element | Current | Candidate | Status | Blockers / risks | Evidence |
| --- | --- | --- | --- | --- | --- |
| Bun | 1.3.9 (package manager target) | 1.3.9+ in CI | In progress | Local environment may run older Bun binaries; keep parity checks in CI. | `package.json`; Bun release notes |
| Node.js | 20.16.x (engine target) | 22 LTS (evaluation) | Pending spike | Confirm Next.js + Cloudflare adapter compatibility with target runtime semantics. | Node release notes; Next.js support matrix |
| Next.js | 16.1.6 | 16.1.x minors | In progress | Validate App Router and route handler behavior on each minor update. | Next.js 16 blog + upgrade guide |
| React / React DOM | 19.2.4 | 19.2.x | Current stable | React 19 typings may surface stricter component typing; watch client/server boundary updates. | React 19 release + upgrade guide |
| TypeScript | 5.9.3 | 5.9.x | Current stable | Monitor stricter inference changes and downstream `@types/*` alignment. | TS 5.9 release notes |
| Tailwind CSS | 3.4.17 | 4.1.x | Pending separate track | CSS-first migration, config/plugin deprecations, global stylesheet adjustments. | Tailwind v4 blog + migration docs |
| `@cloudflare/next-on-pages` | 1.13.16 | latest compatible | Blocked until target versions confirmed | Must verify support against chosen Next.js/React versions before merge. | Cloudflare adapter docs/changelog |
| ESLint | 9.38.0 (`eslint` CLI) | 9.x minors | In progress | Keep compatibility with `eslint-config-next` and local lint rules on each bump. | ESLint 9 release notes |
| Zod | 4.3.6 | 4.x minors | In progress | Monitor minor updates for validator/test compatibility across schema surfaces. | Zod v4 migration docs |

## Acceptance criteria before marking a row as ready
- Candidate version selected and pinned in a spike branch.
- `bun run lint`, `bun run typecheck`, `bun run test`, and `bun run build:pages` pass.
- Cloudflare adapter compatibility evidence recorded.
- Known regressions have file-level remediation notes.
