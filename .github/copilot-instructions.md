# whether — Copilot Instructions

Whether is a site that helps people make decisions. Check [whether.work](https://whether.work). Bun + Cloudflare Workers.

## Quick Commands

```bash
bun run dev       # Dev server
bun run build     # Production build (Cloudflare Worker target)
bun run lint      # ESLint
bun run test      # Vitest
bun run typecheck # TypeScript check
```

## Key Paths

| Path | What |
|---|---|
| `app/` | Application source |
| `scripts/mcp/` | MCP server |
| `tests/` | Test suite |
| `.github/workflows/` | CI (ci, smoke, guardrails, etc.) |

## Conventions

- **Package manager:** Bun
- **Linter:** ESLint (flat config)
- **Tests:** Vitest
- **Pre-commit:** Husky runs ESLint on staged files
- **CI:** CI + prod-smoke + upgrade-guardrails + review-hotspot + weekly-brief
- **Commit style:** Conventional Commits

## Pre-Commit Rule

```bash
bun run check   # Run before pushing.
```
