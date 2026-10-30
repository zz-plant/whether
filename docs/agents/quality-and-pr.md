# Testing & PR hygiene

## Validation depth expectations
Run the smallest meaningful verification set for the scope and risk of your change.

| Change profile | Minimum validation |
| --- | --- |
| Docs/copy-only | Verify links, commands, and references manually |
| Typical product/logic change | `bun run lint` + `bun run test` |
| Broad/refactor/high-risk logic change | `bun run check` + targeted regression coverage |

Additional requirements:
- Nothing on GitHub blocks a merge: `ci.yml` is manual-only (Actions billing), and when it runs it executes the `ci` preset of `scripts/check-tasks.mjs` — the same single source the local gates name theirs from, with bun setup shared through `.github/actions/setup-bun`. Cloudflare Workers Builds runs the deploy gate (`bun run check:vinext`) and the build on every push, so a failing test or broken build blocks the deploy, not the merge. Run `bun run check` before merging.
- Add/update tests when changing scoring, classification, or decision behavior.
- Validate deterministic fallback behavior for data-path changes.
- Capture command outcomes in your PR summary.
- `bun run review:hotspot-preflight` now runs inside `bun run check` and should be run early while developing logic changes. On pre-push it is scoped to the commits the push sends, so the range it reviews there is exactly what lands on the remote.
- Email flows have a lifecycle harness: `bun run e2e:email` drives subscribe → confirm → alert → weekly brief → unsubscribe against a running worker and reads the mail it actually sent. Start the worker with `bun run serve:worker -- --var WHETHER_CRON_SECRET:e2e-secret`; run it from a clean `.wrangler/state` (the local capture store is a dev aid with a row budget). It needs no real address and sends nothing outside the machine. `serve:worker` serves the **built** app routes, so run `bun run build` after changing anything under `app/` before trusting a run.

## Commit quality
- Keep commits coherent, reviewable, and intentionally scoped.
- Use descriptive commit subjects that communicate impact and intent.

## PR quality bar
PR summaries should clearly state:
1. What changed.
2. Why it matters.
3. How it was validated (commands + outcomes).
4. Risks, limitations, and follow-up work.

Recommended PR section headings:
- **Summary**
- **Decision delta** (for product-facing changes)
- **Why this matters**
- **Validation**
- **Risks / follow-ups**

Decision-delta prompts to include when relevant:
- What changed for operators this week?
- What decision should tighten or loosen?
- What should be revisited now?
- What would flip/reverse the call?

Workflow notes:
- `bun run review:hotspot-preflight` remains part of `bun run check` and should be run locally before opening or updating a PR.
- The **Review hotspot checklist** in `.github/pull_request_template.md` is now a manual review discipline rather than an enforced GitHub Actions gate.

Recent trend context:
- `docs/research/2026-03-06-pr-patterns-and-adjustments.md` summarizes recurring merge churn patterns and proposes low-overhead workflow guardrails.

## Pre-merge quick checklist
- [ ] Scope is focused and aligned with the user request.
- [ ] Validation depth matches risk profile.
- [ ] Tests/docs updated where behavior/workflows changed.
- [ ] Known limitations and follow-ups are explicit.

## Local verification and deploy contract
- Local validation should run `bun install --frozen-lockfile` exactly once before build/package/deploy steps when you are testing a clean environment.
- Build and deploy steps must use repo-local CLIs via Bun scripts (for example `bun run check:vinext`, `bun run build:cloudflare`, and `bun run deploy:cloudflare`) instead of `bunx` to avoid implicit re-install and lockfile rewrites.
- For Cloudflare flows, validate Vinext compatibility before deploy and keep deploy evidence tied to the same build lane used in production.
