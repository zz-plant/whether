# Agent Guide for Whether

Whether is weekly operating guidance for startup leaders: public macro signals turned into an action, a pause line and a resume line for each operating area. The product's job is not to explain macroeconomics. It helps an operator answer, fast: what changed this week, what to tighten or loosen, what to revisit, what artifact to share in a meeting or Slack.

Optimize for **decision transmission** (scan the brief, decide, share the artifact in under a minute), not UI ornament or framework sprawl.

## Instruction priority

1. system 2. developer 3. user 4. nested `AGENTS.md` 5. this file 6. other repo docs

If guidance conflicts, obey the higher-priority source and note the conflict in your final summary.

## Repo essentials

- Package manager `bun`. Install `bun install`; dev `bun run dev`; build `bun run build`.
- Tests: `bun run test` — ~20s, sharded across processes (`BUN_TEST_SHARDS` overrides; a path filter runs one process). Runs offline: `bunfig.toml` preloads a network guard, so a test needing data serves it (a fixture fetcher or an assigned `globalThis.fetch`).
- Targeted: `bun run test tests/homeBriefModel.test.ts` (one file), `bun run test -t "reversal trigger"` (by name).
- Iterate with a targeted test plus `bun run typecheck` (~1.5s incremental). `bun run check` (~50s, every task; the landmark audit is the long pole) is for pre-merge.
- CI on GitHub is manual-only (`workflow_dispatch`); the real gates are `.husky/pre-push` and Cloudflare Workers Builds — see the gate invariant below.

## Architectural invariants

- **Read deadlines**: `lib/report/reportData.ts` wraps assembly in `withDeadline(10s)`; the health probe in `withDeadline(3s)`. Do not remove or raise without commensurate fallback work.
- **Cron does not self-fetch**: `worker/index.ts` calls `executeIngest()`, `sendWeeklyBrief()`, `checkRegimeChange()` and `runScheduledAlertDelivery()` directly. The same functions power the manual authenticated HTTP routes. The one exception is the Monday screenshot step (`lib/export/briefScreenshot.ts`): Browser Rendering loads the public homepage because a picture needs the page as served; it carries nothing back and skips itself when unconfigured.
- **Ingest stays off the read path**: the report read serves the materialized model and refreshes due signal families via detached `waitUntil` work behind a KV lock (`lib/runtime/backgroundWork.ts`); only a cold store ingests inline. A successful ingest calls `revalidateTag("report-data")`. `tests/architectureInvariants.test.ts` pins this (Invariants 1, 1b, 1c) against fixture upstreams; a test of this path owns the network.
- **Materialized model includes history**: `recentHistory` carries the trailing 92-day window per signal key, so the read path never scans raw snapshot keys when it is present.
- **Monthly regime history reads stay synchronous**: `getMonthlyRegimeHistory()` runs under the read path's deadline inside sync `buildHomeBriefModelInternal`; KV is primed before assembly (`primeMonthlyRegimeHistoryForRead`, 1s bound), and the bundled `data/` snapshot is the floor. Do not convert the reader to async — priming exists so that chain stays sync.
- **Store selection re-checks bindings**: no module-level memoized stores. `selectStoreByBinding` (`lib/runtime/storeSelection.ts`) picks Durable Object → KV → local file, reinitializing if a binding appears later; add stores through it. The `IngestCoordinator` DO is a preview-lane trial (`WHETHER_INGEST_COORDINATOR=1`).
- **Engine boundary**: scoring modules listed in `tests/architectureInvariants.test.ts` (Invariant 12) import nothing from `lib/report/`, `app/`, React or bundled data; `lib/regimeEngine.ts` is the only composition point. Archived entries carry `engineVersion`; `tests/regimeArchiveReplay.test.ts` replays every archive cadence offline.
- **Falling back to a report read judges readiness first**: `assessReadingReadiness` (`lib/operatingState/resolveSnapshot.ts`) before acting on it — the read path serves the bundled copy on an outage.
- **Two gates, local enforced, remote on every push**: `.husky/pre-push` runs the `pre-push` preset of `scripts/check-tasks.mjs`. Workers Builds runs `bun run check:vinext` — the deploy preset (lint, typecheck, the suite shuffled under `WHETHER_DEPLOY_GATE=1`, assets, suppressions, dead-exports; then the landmark audit on its own) — on every push, `main` included, before anything is built or deployed. A failing test blocks a deploy. The audit serves the production worker under `wrangler dev` (`serve:worker`), which bundles once and renders every route from the bundle. History and the two-gate reasoning: `docs/agents/lessons/automation-and-deploy-gate.md`.

## The loop to protect

**signals → posture → decision → artifact.** Prefer work that improves weekly ritual use, decision clarity, bounded operating rules, screenshot/shareability, and citation/readiness — over nav neatness, taxonomy purity, route churn, surface proliferation, or speculative platform breadth. Do not add new product surfaces lightly; do not create parallel systems when an existing surface can carry the behavior.

Good work makes the brief faster to understand, the decision delta more explicit, generic advice bounded, output easier to copy/cite/screenshot, or trust more compact — reusing existing flows and primitives. Weak work adds explanation without actionability, a new page where `/` would carry it, new language systems for existing concepts, or platform breadth before depth.

## Product stance

Whether should feel like a weekly operating brief, a pacing authority, a meeting shorthand, a Slack screenshot product, a citeable decision artifact — not a macro blog, framework museum, or sprawling reporting platform. These are internal framings, not copy: outward surfaces use the one category line in `lib/seo.ts` (*weekly operating guidance for startup leaders*); see `docs/editorial-guardrails.md`.

Two framings govern applying the guidance to one company:

- **Shared evidence, company-specific action**: every company reads the same signals and lines; what it does depends on its own cash, stage and runway. Prefer calibration to the reader's numbers over one identical action pushed to every reader.
- **A policy agreed in advance**: lines set ahead of time, so changing course is a line being crossed, not a meeting.

## Operational definitions

- **Decision transmission**: scan the brief, choose a posture/action, share a meeting-ready artifact in under 60 seconds.
- **Bounded decision**: a clear action, threshold/trigger, and reversal condition.
- **Trust should be compact**: provenance/confidence/freshness/fallback in-line or one click away; no long method exposition on primary screens.
- **New-system overhead**: maintenance cost across code paths, mental model, docs/testing.
- **Thin SEO page**: a page missing current posture, immediate implication, a citeable summary, or a link back to the weekly brief.
- **Decision vocabulary is a single source**: regime names, the call, forecast and slot labels each have one vocabulary (`docs/editorial-guardrails.md` → Decision vocabulary). Do not mint synonyms on new surfaces.

## Hard product rules

1. **Delta first.** Lead with what changed, what it changes in decisions, what to revisit, what would flip the call — not with explanation.
2. **Bounded decisions beat generic guidance.** Action, threshold, reversal condition — over "be cautious."
3. **Artifact quality matters.** If a user cannot quickly copy, paste, screenshot or cite the output, the feature is incomplete.
4. **Trust should be compact.** Provenance, confidence, freshness and fallback indicators reduce re-litigation; do not bury primary screens in method.
5. **Reuse before adding.** Before a new route, model or export layer, check whether `/`, `lib/report/homeBriefModel.ts`, `lib/report/reportData.ts`, `lib/report/decisionKnobs.ts`, `lib/playbook.ts`, or existing export builders can carry it.

## Working rules

- Check for nested `AGENTS.md` in directories you modify.
- Prefer existing utilities, labels and formatters over new mappings; prefer strengthening canonical surfaces over adjacent ones.
- Keep diffs focused; no opportunistic refactors unless they unblock the work.
- Use `rg` for discovery; avoid `ls -R` and `grep -R`.
- Update tests and docs when behavior or contracts change; if shared semantics change, update all consumers or document the drift.
- Orient with `docs/agents/README.md` before non-trivial work — it indexes the guides (`setup`, `project-layout`, `engineering-principles`, `documentation`, `data-and-platform`, `quality-and-pr`, `ui-ux-standards`) and the product specs (one-screen brief, IA/navigation, trust/fallback, export/integration) that govern each area.

## Execution loop

1. orient with `AGENTS.md`, `docs/agents/README.md`, and the one matching guide
2. identify the canonical surface or module before broad search
3. choose the smallest implementation that improves the product loop
4. run the smallest meaningful verification for the changed behavior
5. update the canonical doc if workflow, semantics or contracts changed

Do not spend major effort on repo-wide exploration before you know the target surface and validation path.

## Delegation

Delegate only bounded, reviewable, parallelizable subtasks. Resolve task shape and product intent locally first. Give each subagent one clear job, one owner, a tight write scope, the minimum repo anchors, the exact done condition, required checks, and a return format naming changed files, commands run, and open risks. Bad delegation is "explore this area and decide"; good is "update this bounded surface, under these constraints, report in this format." If a task matches a repo-local skill, use it or say why not. Keep discovery, architecture and synthesis in the main agent.

## Ambiguous changes, choose in order

1. improves the one-screen weekly brief 2. sharpens bounded decisions 3. improves exports/citation/shareability 4. improves trust/resilience without sprawl 5. lowest new-system overhead. Internal elegance without operator value goes last.

## Implementation targets

- **Core brief**: `app/page.tsx`, `app/components/DecisionHero.tsx`, `app/components/CadenceCallCard.tsx`, `lib/report/homeBriefModel.ts`, `lib/report/reportData.ts`, `lib/report/decisionKnobs.ts`
- **Playbooks / bounded rules**: `lib/playbook.ts`, `lib/report/operatingCalls.ts`, `lib/thresholds.ts`, `lib/regimeEngine.ts`
- **Export / transmission**: `lib/report/briefDocument.ts` (the one document every export renders), `app/operate/components/`, `lib/export*`, trust helpers in `lib/report/*`
- **Agent interface** (`/llms.txt`, `/api/agent`, MCP tools): `lib/agentState.ts`, `lib/seo/llmsTxt.ts`, `lib/mcp/`, `lib/agent/tools.ts` — the router lists answer pages from the same data the routes serve, so it cannot drift
- **Trust / continuity**: `lib/report/trustStatus.ts`, `lib/report/reportFormatting.ts`, `lib/timeMachine/*`, snapshot/fallback paths

Only add a new module if the existing structure clearly cannot support the change.

## By work type

- **Homepage / brief**: 10-second readability, 30-second decisiveness, visible decision delta, explicit revisit logic, screenshot-safe compression.
- **Answer / SEO surfaces**: direct question match, current posture, immediate implication, citeable summary, strong link back to the brief. Never ship a thin SEO page (see definitions).
- **Playbooks**: bounded rules, thresholds, stop/pause triggers, reversal conditions, role clarity.
- **Trust / data plumbing**: clear degraded-state behavior, consistent labels, explicit fallback markers, stable provenance, non-fatal failures.
- **UI work**: follow `docs/agents/ui-ux-standards.md` and the `whether-ui-standards` / `whether-ui-loop` skills — measure with `bun run ui:iterate` (both themes) rather than editing CSS blind.

## Verification and docs

Run the smallest useful set: targeted unit tests for logic, route/redirect tests for IA, rendering tests for exports, `bun run lint` for UI or shared modules, `bun run check` when scope justifies it. Do not claim validation you did not run; say clearly if a broader suite fails for unrelated reasons.

Update the most relevant doc when weekly-brief contracts, product semantics, route/IA meaning, data contracts, fallback/trust, or export/citation behavior changes; note any code/spec drift you find.

## Final response

Include: what changed; why; which files/modules; what verification you ran; follow-up risks, drift, or next-best improvements. Be concrete — no vague "improved UX".

## Non-goals

Renaming routes for style; inventing posture taxonomies; adding datasets before improving compression/actionability; platform breadth ahead of the brief; verbose methodology copy on primary screens; speculative personalization.

## Repo-local skills

Path `.claude/skills/<name>/SKILL.md` (canonical); `.codex/skills/` is generated by `bun run skills:sync` and never edited by hand. Kebab-case directories, narrow task-specific output contracts, least-privilege tools. If a new skill changes recommended workflows, note it in the agent docs hub.
