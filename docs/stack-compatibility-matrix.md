# Stack compatibility matrix

This matrix is the checked-in source of truth for stack upgrade candidates, blockers, and evidence.

| Element | Current | Candidate | Status | Blockers / risks | Evidence |
| --- | --- | --- | --- | --- | --- |
| Bun | 1.3.9 (package manager target) | 1.3.9+ in CI | **NO-GO for uplift now / GO to keep pinned** | Local shell used Bun 1.2.14, so local-vs-pin drift remains unresolved for modernization work. | `package.json`; `docs/evidence/stack-modernization/2026-03-12-baseline/bun-install.log` |
| Node.js | `>=22` (engine target) | 22 LTS | **GO for active lane** | Vinext requires Node 22+, so keep deploy/build environments pinned there. | `package.json`; `docs/vinext-cloudflare-evaluation.md` |
| Next.js | 16.1.6 | 16.2.0-canary.93 | **NO-GO for production canary uplift** | Canary type generation broke (`PrefetchForTypeCheckInternal` export mismatch, route handler signature type errors) before baseline drift could be isolated. | `docs/evidence/stack-modernization/2026-03-12-canary/typecheck.log`; `docs/evidence/stack-modernization/2026-03-12-canary/framework-upgrade-install.log` |
| React / React DOM | 19.2.5 | 19.3.0-canary-46103596-20260305 | **NO-GO for production canary uplift** | Active Vinext lane now needs the 19.2.5 peer set; candidate runs still cannot be approved while framework typecheck is red and baseline type/test drift is unresolved. | `package.json`; `bun.lock`; `docs/evidence/stack-modernization/2026-03-12-canary/typecheck.log`; `docs/evidence/stack-modernization/2026-03-12-canary/test.log` |
| TypeScript | 5.9.3 | 5.9.x | Current stable | Monitor stricter inference changes and downstream `@types/*` alignment. | TS 5.9 release notes |
| Tailwind CSS | 4.3.3 | 4.3.3 | **GO / completed on active lane** | CSS-first migration remains on the PostCSS lane; Tailwind core and `@tailwindcss/postcss` are pinned together, with styling ownership and configuration guarded by a contract test. | `app/styles/tokens.css`; `postcss.config.js`; `package.json`; `tests/stylingSystemContract.test.ts`; 2026-08-15 `bun run test tests/stylingSystemContract.test.ts`, `bun run lint`, `bun run typecheck`, and `bun run build:cloudflare` |
| Vinext | 0.0.41 | 0.0.41 | **GO on active lane with install repair** | Bun-installed `node_modules/vinext` can still miss required `dist/` runtime files, so the repo-local postinstall repair remains necessary. `0.0.41` also removes the prior Vite 8 Rolldown `treeshake.preset` warning on the active lane. | `package.json`; `scripts/repair-vinext-install.mjs`; `bun.lock`; 2026-04-15 local `bun run build`; `bun run check` |
| ESLint | 9.38.0 (`eslint` CLI) | 9.x minors | **GO to stay pinned; no uplift decision** | Baseline lint passes, but canary run hit operational slowdown after generated artifacts; rerun after clean-artifact workflow fix. | `docs/evidence/stack-modernization/2026-03-12-baseline/lint.log`; `docs/evidence/stack-modernization/2026-03-12-canary/lint.log` |
| Zod | 4.3.6 | 4.x minors | **GO to stay pinned; no uplift decision** | No Zod-specific blockers surfaced; modernization gate remains blocked by framework/type baseline issues. | Baseline and canary logs under `docs/evidence/stack-modernization/2026-03-12-*` |

## Acceptance criteria before marking a row as ready
- Candidate version selected and pinned in a spike branch.
- `bun run lint`, `bun run typecheck`, `bun run test`, and `bun run build:cloudflare` pass.
- Cloudflare adapter compatibility evidence recorded.
- Known regressions have file-level remediation notes.
