# Stack compatibility matrix

This matrix is the checked-in source of truth for stack upgrade candidates, blockers, and evidence.

| Element | Current | Candidate | Status | Blockers / risks | Evidence |
| --- | --- | --- | --- | --- | --- |
| Bun | 1.3.9 (package manager target) | 1.3.9+ in CI | **NO-GO for uplift now / GO to keep pinned** | Local shell used Bun 1.2.14, so local-vs-pin drift remains unresolved for modernization work. | `package.json`; `docs/evidence/stack-modernization/2026-03-12-baseline/bun-install.log` |
| Node.js | `>=22` (engine target) | 22 LTS | **GO for active lane** | Vinext requires Node 22+, so keep deploy/build environments pinned there. | `package.json`; `docs/vinext-cloudflare-evaluation.md` |
| Next.js | 16.1.6 | 16.2.0-canary.93 | **NO-GO for production canary uplift** | Canary type generation broke (`PrefetchForTypeCheckInternal` export mismatch, route handler signature type errors) before baseline drift could be isolated. | `docs/evidence/stack-modernization/2026-03-12-canary/typecheck.log`; `docs/evidence/stack-modernization/2026-03-12-canary/framework-upgrade-install.log` |
| React / React DOM | 19.2.4 | 19.3.0-canary-46103596-20260305 | **NO-GO for production canary uplift** | Candidate runs build/test envelope but cannot be approved while framework typecheck is red and baseline type/test drift is unresolved. | `docs/evidence/stack-modernization/2026-03-12-canary/typecheck.log`; `docs/evidence/stack-modernization/2026-03-12-canary/test.log` |
| TypeScript | 5.9.3 | 5.9.x | Current stable | Monitor stricter inference changes and downstream `@types/*` alignment. | TS 5.9 release notes |
| Tailwind CSS | 4.2.2 | 4.2.2 | **GO / completed on active lane** | CSS-first migration shipped via `@import "tailwindcss"` + `@theme`, with one custom `@apply` chain rewritten manually and focused UI/build verification completed. | `app/globals.css`; `postcss.config.js`; `package.json`; 2026-03-31 local `bun run lint`, `bun run build`, and targeted regression tests |
| Vinext | 0.0.30 | 0.0.38 | **GO to stay pinned at 0.0.30; NO-GO for 0.0.38** | `0.0.38` recognizes `next/web-vitals` but regressed production build parsing in `app/layout.tsx`; keep 0.0.30 until that upstream/toolchain issue is resolved. | `package.json`; 2026-03-31 local `bun run build`; `bun run check:vinext` on both pins |
| ESLint | 9.38.0 (`eslint` CLI) | 9.x minors | **GO to stay pinned; no uplift decision** | Baseline lint passes, but canary run hit operational slowdown after generated artifacts; rerun after clean-artifact workflow fix. | `docs/evidence/stack-modernization/2026-03-12-baseline/lint.log`; `docs/evidence/stack-modernization/2026-03-12-canary/lint.log` |
| Zod | 4.3.6 | 4.x minors | **GO to stay pinned; no uplift decision** | No Zod-specific blockers surfaced; modernization gate remains blocked by framework/type baseline issues. | Baseline and canary logs under `docs/evidence/stack-modernization/2026-03-12-*` |

## Acceptance criteria before marking a row as ready
- Candidate version selected and pinned in a spike branch.
- `bun run lint`, `bun run typecheck`, `bun run test`, and `bun run build:cloudflare` pass.
- Cloudflare adapter compatibility evidence recorded.
- Known regressions have file-level remediation notes.
