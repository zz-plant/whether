# Cloudflare deployment runbook

## Build + deploy commands

Use this command sequence in CI to keep Cloudflare Pages/Workers deploys deterministic and auditable:

```bash
bun install --frozen-lockfile
bun run vercel:build
NEXT_ON_PAGES_SKIP_BUILD=1 NEXT_ON_PAGES_REUSE_PREBUILT=1 bun run build:cloudflare:skip-next-build
bun run wrangler:upload
```

This flow keeps dependency installation to a single explicit `bun install --frozen-lockfile` step, then reuses prebuilt `.vercel/output` for the Cloudflare conversion/upload stage.

`bun run build:cloudflare` now performs a full conversion by default to avoid serving stale CSS/assets from reused local output. Prebuilt reuse is still available through the explicit `build:cloudflare:skip-next-build` command, and only when commit metadata confirms the prebuilt output is safe to reuse.

`bun run build:pages` is now environment-aware:
- no Cloudflare deploy context -> runs `deploy:cloudflare:nonprod` (plain Next build validation),
- Cloudflare Pages production branch -> runs `build:cloudflare` (next-on-pages conversion),
- Cloudflare Pages preview/unknown branch -> runs `deploy:cloudflare:nonprod` (plain Next build validation).

Use `FORCE_CLOUDFLARE_WORKER_BUILD=1 bun run build:pages` to force worker conversion when needed (including non-production or unknown-branch environments).

## Branch deploy commands

- **Production branch deploy:** `bun run deploy:cloudflare`
- **Non-production branch deploy:** `bun run deploy:cloudflare:nonprod`

`deploy:cloudflare` now auto-detects Cloudflare Pages build context (`CF_PAGES`, `CF_PAGES_BRANCH`, `CF_PAGES_COMMIT_SHA`, `CF_PAGES_URL`, `CF_PAGES_PROJECT_NAME`, or `CLOUDFLARE_PAGES`). In that context it intentionally:
- allows non-worker fallback when `next-on-pages` cannot convert non-Edge routes, and
- skips `wrangler versions upload` because Pages deploys the generated output directly.

Outside Cloudflare Pages context, `deploy:cloudflare` now defaults to resilient build behavior (`REQUIRE_CLOUDFLARE_WORKER_BUILD_SUCCESS=0`) so a failed worker conversion can still fall back to non-worker build validation. Set `REQUIRE_CLOUDFLARE_WORKER_BUILD_SUCCESS=1` when you need strict worker-build enforcement for a given run.

When `CLOUDFLARE_ACCOUNT_ID` is present outside Pages context (for example Worker Builds), `deploy:cloudflare` now forces worker conversion (`FORCE_CLOUDFLARE_WORKER_BUILD=1`) before evaluating upload freshness. This prevents accidental plain-Next fallback that would skip upload with stale or missing worker artifacts.

Before `wrangler versions upload`, the script now verifies fresh worker build state using both `.vercel/output/static/_worker.js/index.js` and `.vercel/output/static/_worker.js/build-meta.json` (target, success, and commit match when commit SHA is available). If that freshness check fails, upload is skipped and the run is treated as build-only validation instead of risking a stale worker upload.

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

This uses `NEXT_ON_PAGES_SKIP_BUILD=1` and forwards `--skip-build` to `next-on-pages`, while `NEXT_ON_PAGES_REUSE_PREBUILT=1` enables explicit reuse only when commit metadata matches the current build context.

`scripts/build.mjs` also auto-enables this skip behavior when all of the following are true:
- target is Cloudflare Pages (`build:cloudflare` / `build:pages`),
- a restored Vercel/Next-on-Pages output exists (`.vercel/output/config.json` or `_worker.js/index.js`), and
- the environment indicates CI/deploy context (`CI=1|true|yes`, `CF_PAGES=1|true|yes`, or `CLOUDFLARE_ACCOUNT_ID` is present).

This keeps CI pipelines from rebuilding the same commit twice while still preserving explicit local behavior by default.
