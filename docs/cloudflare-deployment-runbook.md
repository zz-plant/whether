# Cloudflare deployment runbook

## Build + deploy commands

Use this command sequence in CI to keep Cloudflare Pages/Workers deploys deterministic and auditable:

```bash
bun install --frozen-lockfile
bun run vercel:build
NEXT_ON_PAGES_SKIP_BUILD=1 NEXT_ON_PAGES_REUSE_PREBUILT=1 bun run build:pages
bun run wrangler:upload
```

This flow keeps dependency installation to a single explicit `bun install --frozen-lockfile` step, then reuses prebuilt `.vercel/output` for the Cloudflare conversion/upload stage.

## Expected warnings (non-blocking)

The warning classes below are currently expected in this project and are tracked by CI baseline:

- `Build not running on Vercel. System environment variables will not be available.`
- `Bun is used as a package manager at build time only, not at runtime with Functions`
- `Using edge runtime on a page currently disables static generation for that page`
- `Duplicate key "options" in object literal [duplicate-object-key]`

If CI reports a new warning class, treat it as action-required until triaged and either:
1. fixed in code/dependencies, or
2. intentionally accepted and added to `.github/cloudflare/warning-baseline.txt`.

## Warning budget policy

`Invalid prerender config` is treated as a critical warning matcher via `.github/cloudflare/warning-critical.txt`, so any new occurrence fails CI immediately.


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

When CI already has a fresh `.vercel/output` from `bun run vercel:build`, you can skip the nested Vercel build that `next-on-pages` normally performs:

```bash
bun run build:cloudflare:skip-next-build
```

This uses `NEXT_ON_PAGES_SKIP_BUILD=1` and forwards `--skip-build` to `next-on-pages`, while `NEXT_ON_PAGES_REUSE_PREBUILT=1` allows explicit reuse of restored/prebuilt output.

`scripts/build.mjs` also auto-enables this skip behavior when all of the following are true:
- target is Cloudflare Pages (`build:cloudflare` / `build:pages`),
- a restored Vercel/Next-on-Pages output exists (`.vercel/output/config.json` or `_worker.js/index.js`), and
- the environment indicates CI/deploy context (`CI=1|true|yes`, `CF_PAGES=1|true|yes`, or `CLOUDFLARE_ACCOUNT_ID` is present).

This keeps CI pipelines from rebuilding the same commit twice while still preserving explicit local behavior by default.
