# Dependency upgrade research (2026-02-25)

## Scope
Based on `bun outdated`, the highest-impact outdated packages are:
- `next` (`15.5.12` -> latest `16.1.6`)
- `zod` (`3.25.76` -> latest `4.3.6`)
- `@modelcontextprotocol/sdk` (`1.26.0` -> latest `1.27.1`)
- `eslint` (`8.57.0` -> latest `10.0.2`)
- `tailwindcss` (`3.4.6` -> latest `4.2.1`)

## Research summary

### 1) `@modelcontextprotocol/sdk` 1.27.1 (smallest near-term candidate)
Potential benefits:
- Newer SDK release with incremental MCP protocol support and bug fixes in the TypeScript SDK line.
- Usually lower migration risk than framework-level upgrades (`next`, `eslint`, `tailwind`) because surface area is constrained to MCP integration points.

Risks observed in this repo:
- Prior attempt to bump this package triggered deeper TypeScript type-instantiation issues in `scripts/mcp/whether-mcp-server.ts` during typecheck, indicating potential API/type-shape drift that needs targeted adaptation.

Recommendation:
- Re-attempt as a focused follow-up PR with explicit MCP server typing adjustments and full typecheck in CI.

Source:
- MCP TypeScript SDK releases: https://github.com/modelcontextprotocol/typescript-sdk/releases

### 2) `next` 16.1.6 (high benefit, high migration cost)
Potential benefits:
- Performance/runtime improvements and platform updates in the Next.js 16 line.
- Newer Next.js + ecosystem alignment over time.

Likely migration work:
- This repo currently uses `next` and `eslint-config-next` both pinned to `15.5.12`; moving to 16 likely requires coordinated config/tooling updates.
- Existing lint setup is legacy-style (`.eslintrc` + CLI flags); ESLint/Next major upgrades can require flat config migration.

Recommendation:
- Plan as a dedicated framework-upgrade epic (not mixed with small dependency bumps).

Source:
- Next.js releases: https://github.com/vercel/next.js/releases

### 3) `zod` 4.3.6 (medium/high benefit, medium migration cost)
Potential benefits:
- Zod v4 introduces API/runtime/type-system improvements and active maintenance on current major.

Likely migration work:
- Current code depends on Zod v3 (`3.25.76`), and upgrades across major versions may require schema and inference adjustments in validation-heavy paths.

Recommendation:
- Run codemod/migration audit first, then upgrade in a dedicated validation-focused PR.

Source:
- Zod releases: https://github.com/colinhacks/zod/releases

### 4) `eslint` 10 + `eslint-config-next` 16 (high migration cost right now)
Potential benefits:
- Latest lint engine/perf and rule updates.

Risks in this repo:
- ESLint v10 expects flat config (`eslint.config.*`).
- Current lint command + config style is v8-oriented and worked with existing stack; prior full-latest bump failed because ESLint could not find flat config.

Recommendation:
- Keep ESLint on v8 until we intentionally migrate lint config to flat config.

Source:
- ESLint migration docs: https://eslint.org/docs/latest/use/configure/migration-guide

### 5) `tailwindcss` 4.2.1 (high migration cost)
Potential benefits:
- New Tailwind v4 engine/features.

Likely migration work:
- Tailwind v3 -> v4 usually requires config/build pipeline updates; this should be bundled with UI build/tooling validation.

Recommendation:
- Defer until a planned styling/toolchain migration window.

Source:
- Tailwind v4 docs: https://tailwindcss.com/docs/upgrade-guide

## Suggested execution order
1. **Low-risk**: `@modelcontextprotocol/sdk` to `1.27.1` with targeted MCP typing fixes.
2. **Medium-risk**: `zod` v4 migration with focused test updates.
3. **High-risk**: Next 16 + eslint-config-next 16 (+ lint config migration) as a coordinated framework/tooling upgrade.
4. **High-risk**: Tailwind v4 migration.

## Practical conclusion for the original question
There *are* meaningful benefits in newer versions, but most available updates are major-version shifts with non-trivial migration cost. The previous narrow PR only updated `tsx` because it was the safest patch-level move that did not intentionally open framework/tooling migrations.
