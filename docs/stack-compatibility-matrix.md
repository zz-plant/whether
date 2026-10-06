# Stack compatibility matrix

This matrix is the checked-in source of truth for stack upgrade candidates, blockers, and evidence.

| Element | Current | Candidate | Status | Blockers / risks | Evidence |
| --- | --- | --- | --- | --- | --- |
| Bun | 1.3.14 (package manager pin; 1.3.11 in the sandbox) | 1.4.0 (npm `latest`) | **Trial**: read the release notes before moving the pin | bun.com was unreachable from the session that checked, so 1.4's changes are unverified here. `bun test --randomize` (present in 1.3.11) is adopted in the deploy gate. | `package.json`; `bun test --help`; 2026-09-02 |
| Node.js | `>=22` (engine target) | 22 LTS | **GO for active lane** | Vinext requires Node 22+, so keep deploy/build environments pinned there. | `package.json` |
| Next.js (compat surface under Vinext) | 16.3.4 | in-range minors | **GO** | Only `next/*` import aliases and types are used; Vinext resolves them. 16.2.9 → 16.3.4 typechecked and passed the suite. | `bun update` 2026-09-02; `bun run typecheck`; `bun run test` |
| React / React DOM | 19.2.8 | 19.3 (canary) · React Compiler 1.0 | **Hold** | Compiler arrives via Vinext 1.0's `react: { compiler: true }`; trial it on preview when 1.0.0 ships. | npm dist-tags 2026-09-02 |
| TypeScript | 7.0.2 (native compiler) | 7.1 (programmatic API) | **GO / adopted** | No programmatic API until 7.1: typescript-eslint cannot run on it, which is fine because ESLint is retired. No other TS API consumer in the repo. Typecheck 9s → ~5s locally. | `bun run typecheck` 2026-09-02 |
| Tailwind CSS | 4.3.3 | 4.3.3 | **GO / completed on active lane** | CSS-first migration remains on the PostCSS lane; Tailwind core and `@tailwindcss/postcss` are pinned together, with styling ownership and configuration guarded by a contract test. | `app/styles/tokens.css`; `postcss.config.js`; `tests/stylingSystemContract.test.ts` |
| Vinext / @vinext/cloudflare | 0.2.1 | 1.0.0-beta.8 (2026-08-20); 1.0.0 promised later in 2026 | **Trial on preview; adopt at 1.0.0** | Weekly betas without breaking-change notes; peers move to `@vitejs/plugin-rsc ^0.5.34`. The repo-local postinstall install repair remains necessary. | github.com/cloudflare/vinext/releases |
| Vite | 8.2.2 | 8.2.x | **GO** | Rolldown 1.0 locked its API 2026-05-07. Also lifts picomatch above the audited version. | `bun update` 2026-09-02 |
| Lint: oxlint | 1.81.0 (+ `oxlint-tsgolint` 7.0.2001) | 1.x minors | **GO (syntactic gate) / type-aware advisory** | `.oxlintrc.json` carries the React and Next plugins, the file-size budgets, and the import fence. The gate is at parity with the retired ESLint config: correctness rules with pre-existing findings are off (docs/agents/lessons/toolchain-and-gates.md lists the tightening ladder). Type-aware linting (`lint:types`) reports 28 pre-existing findings and stays advisory until it has a week of identical runs behind it. Lint 24s → ~1s. | `.oxlintrc.json`; `bun run lint`; docs/agents/lessons/toolchain-and-gates.md |
| ESLint | removed | — | **Retired 2026-09-02** | Replaced by oxlint; `eslint-config-next` removed with it. Directive comments (`eslint-disable-*`) are honored by oxlint, so existing ones stand. | this PR |
| Zod | 4.4.3 (pinned exact) | 4.5.x | **NO-GO for 4.5** | 4.5.4 changes schema types such that `@modelcontextprotocol/sdk` 1.30's `registerTool` rejects them (`ZodString` not assignable to `AnySchema`); `scripts/mcp/whether-mcp-server.ts` stops typechecking. Revisit with the MCP SDK v2 migration. | `bun run typecheck` 2026-09-02 |
| @modelcontextprotocol/sdk | 1.30.0 | 2.x (beta for spec 2026-07-28) | **Watch** | v1 is supported at least six months past v2 GA; a codemod exists. The HTTP server in `lib/mcp/httpMcpServer.ts` is hand-rolled and independent of the SDK. | blog.modelcontextprotocol.io 2026-07-28 |
| PDF export | `@cantoo/pdf-lib` 2.9.1 | — | **GO / swapped** | `pdf-lib` upstream has been unreleased since 2021; the fork keeps the API. CLI only. | `tests/whetherCli.test.ts` |
| Wrangler / @cloudflare/vite-plugin | 4.128.0 / 1.54.3 | in-range minors | **GO** | Config validated for both lanes with `wrangler types` after adding tracing, the Durable Object, and the Workflow. | `bun update` 2026-09-02 |

## Acceptance criteria before marking a row as ready
- Candidate version selected and pinned in a spike branch.
- `bun run lint`, `bun run typecheck`, `bun run test`, and `bun run build:cloudflare` pass.
- Cloudflare adapter compatibility evidence recorded.
- Known regressions have file-level remediation notes.
