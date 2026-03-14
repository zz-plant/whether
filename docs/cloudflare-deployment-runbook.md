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

## Branch deploy commands

- **Production branch deploy:** `bun run deploy:cloudflare`
- **Non-production branch deploy:** `bun run deploy:cloudflare:nonprod`

`deploy:cloudflare:nonprod` intentionally runs a plain Next build with `ALLOW_NEXT_BUILD_WITH_WORKER_CONFIG=1` and does **not** run Wrangler upload. This keeps branch validation green while Next-on-Pages remains blocked by non-Edge routes.

## Build guardrail for Cloudflare environments

`scripts/build.mjs` now fails fast when all of the following are true:
- Cloudflare environment is detected (`CF_PAGES` or `CLOUDFLARE_ACCOUNT_ID`),
- `wrangler.toml` expects a Next-on-Pages worker entrypoint (`.vercel/output/static/_worker.js`), and
- auto conversion is disabled (`NEXT_ON_PAGES_AUTO` is not truthy).

This prevents a green `bun run build` followed by a failing `wrangler versions upload` due to missing worker output. Use `bun run build:cloudflare`/`bun run deploy:cloudflare`, or set `NEXT_ON_PAGES_AUTO=1` in deploy environments. For non-production branch deploy validation, use `bun run deploy:cloudflare:nonprod`. If you intentionally need plain `next build` elsewhere, set `ALLOW_NEXT_BUILD_WITH_WORKER_CONFIG=1`.

## Expected warnings (non-blocking)

The warning classes below are currently expected in this project and are tracked by CI baseline:

- `Build not running on Vercel. System environment variables will not be available.`
- `Bun is used as a package manager at build time only, not at runtime with Functions`
- `Using edge runtime on a page currently disables static generation for that page`
- `Invalid prerender config for /answers/[slug]` (and `.rsc`)
- `Invalid prerender config for /concepts/[slug]` (and `.rsc`)
- `Invalid prerender config for /concepts/audience/[audience]` (and `.rsc`)
- `Invalid prerender config for /concepts/focus/[focus]` (and `.rsc`)
- `Invalid prerender config for /decide/[slug]` (and `.rsc`)
- `Invalid prerender config for /guides/[stakeholder]` (and `.rsc`)
- `Invalid prerender config for /guides/stage/[stage]` (and `.rsc`)
- `Invalid prerender config for /library/failure-modes/[slug]` (and `.rsc`)
- `Invalid prerender config for /posture/[slug]` (and `.rsc`)
- `Invalid prerender config for /resources/[slug]` (and `.rsc`)
- `Invalid prerender config for /solutions/career-paths/[role]` (and `.rsc`)
- `Invalid prerender config for /startup-macro-posture/[regime]` (and `.rsc`)
- `Invalid prerender config for /toolkits/[slug]` (and `.rsc`)

As of `next@16.1.6`, the latest published `@cloudflare/next-on-pages` is `1.13.16`; no newer adapter release is available yet to remove these adapter warning classes at source.

Known third-party minifier noise (`duplicate-object-key`) is intentionally suppressed at build-log emission time and tracked in `.github/cloudflare/warning-policy.md`.

If CI reports a new warning class, treat it as action-required until triaged and either:
1. fixed in code/dependencies, or
2. intentionally accepted and added to `.github/cloudflare/warning-baseline.txt` (or `.github/cloudflare/warning-policy.md` for explicit suppressions).

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
