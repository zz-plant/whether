# Stack compatibility matrix

This matrix is the checked-in source of truth for stack upgrade candidates, blockers, and evidence.

| Element | Current | Candidate | Status | Blockers / risks | Evidence |
| --- | --- | --- | --- | --- | --- |
| Bun | 1.3.9 | 1.3.9 | Upgraded in repo | Validate CI parity in GitHub Actions with Bun 1.3 baseline. | `npm view bun version`; Bun release notes |
| Node.js | >=20.16.0 | 22 LTS (evaluation) | Pending spike | Confirm Next.js + Cloudflare adapter compatibility with target runtime semantics. | Node release notes; Next.js support matrix |
| Next.js | 15.5.12 | 16.1.x | Wave 1 complete | App Router caching behavior changed in 15; continue monitoring edge-runtime behavior during 16.x spike. | Next.js 16 blog + upgrade guide |
| React / React DOM | 19.2.4 | 19.2.x | Wave 1 complete | React 19 typings may surface stricter component typing; watch for additional client/server boundary updates. | React 19 release + upgrade guide |
| TypeScript | 5.9.3 | 5.9.x | Upgraded in repo | Continue monitoring stricter inference changes and downstream `@types/*` alignment. | TS 5.9 release notes |
| Tailwind CSS | 3.4.6 | 4.1.x | Pending separate track | CSS-first migration, config/plugin deprecations, global stylesheet adjustments. | Tailwind v4 blog + migration docs |
| `@cloudflare/next-on-pages` | 1.13.16 | latest compatible | Blocked until target versions confirmed | Must verify support against chosen Next.js/React versions before merge. | Cloudflare adapter docs/changelog |
| ESLint | 8.57.0 | 9.x | Deferred after framework migration | Flat config transition and compatibility with `eslint-config-next`. | ESLint 9 release notes |
| Zod | 3.23.8 | 4.x | Deferred after framework migration | API changes may require schema migration in validators/tests. | Zod v4 migration docs |

## Acceptance criteria before marking a row as ready
- Candidate version selected and pinned in a spike branch.
- `bun run lint`, `bun run typecheck`, `bun test`, and `bun run build:pages` pass.
- Cloudflare adapter compatibility evidence recorded.
- Known regressions have file-level remediation notes.
