# Cloudflare deployment runbook

## Build + deploy commands

Use this command sequence in CI to keep Cloudflare Pages/Workers deploys deterministic and auditable:

```bash
bun install --frozen-lockfile
bun run deploy:cloudflare
```

`bun run deploy:cloudflare` reuses an existing `.vercel/output` build for the same commit when available and falls back to a full `build:pages` + upload when not.

## Expected warnings (non-blocking)

The warning classes below are currently expected in this project and are tracked by CI baseline:

- `Build not running on Vercel. System environment variables will not be available.`
- `Using edge runtime on a page currently disables static generation for that page`
- `Invalid prerender config for /concepts/[slug]`
- `Invalid prerender config for /guides/[stakeholder]`
- `Invalid prerender config for /guides/stage/[stage]`
- `Invalid prerender config for /solutions/career-paths/[role]`
- `Duplicate key "options" in object literal [duplicate-object-key]`

If CI reports a new warning class, treat it as action-required until triaged and either:
1. fixed in code/dependencies, or
2. intentionally accepted and added to `.github/cloudflare/warning-baseline.txt`.

## Warning budget policy

CI enforces a warning budget after Pages-targeted builds by parsing build logs with:

```bash
node scripts/cloudflare-warning-audit.mjs \
  --log artifacts/cloudflare-build.log \
  --expected .github/cloudflare/warning-baseline.txt \
  --critical .github/cloudflare/warning-critical.txt \
  --metrics-out artifacts/cloudflare-warning-metrics.json \
  --summary-out artifacts/cloudflare-warning-summary.md \
  --fail-on-new
```

This produces two deploy artifacts:
- `artifacts/cloudflare-warning-summary.md` (human-readable warning classes/counts)
- `artifacts/cloudflare-warning-metrics.json` (machine-readable trend data)

## Triage guide

When warning budget fails:
1. Open `cloudflare-warning-summary.md` artifact and identify unexpected classes.
2. Confirm whether warning appears in local Pages build (`bun run build:cloudflare`).
3. If warning is actionable, fix root cause and keep baseline unchanged.
4. If warning is known-safe external noise, add exact warning class to baseline with a short PR note explaining why.

## Faster rebuild mode for Cloudflare (optional)

When CI already has a fresh `.vercel/output` from `vercel build`, you can skip the nested Vercel build that `next-on-pages` normally performs:

```bash
bun run build:cloudflare:skip-next-build
```

This uses `NEXT_ON_PAGES_SKIP_BUILD=1` and forwards `--skip-build` to `next-on-pages`, reducing redundant work in multi-phase pipelines.

`scripts/build.mjs` also auto-enables this skip behavior when all of the following are true:
- `CI=1` (or `CI=true`),
- target is Cloudflare Pages (`build:cloudflare` / `build:pages`), and
- `.vercel/output/config.json` already exists.

This keeps CI pipelines from rebuilding the same commit twice while still preserving explicit local behavior by default.
