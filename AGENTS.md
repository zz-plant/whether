# Agent Guide for Whether

Whether is weekly operating guidance for startup leaders: public macro signals turned into an action, a pause line and a resume line for each operating area.

The product’s job is not to explain macroeconomics.
It is to help an operator answer, fast:

- What changed this week?
- What should we tighten or loosen?
- What decisions should we revisit?
- What artifact can we share in a meeting or Slack?

Agents working in this repo should optimize for **decision transmission** (a user can scan the weekly brief, decide what to do, and share the artifact in under a minute), not UI ornament or framework sprawl.

---

## Instruction priority

Follow instruction priority in this order:

1. system
2. developer
3. user
4. nested `AGENTS.md`
5. this file
6. other repo docs

If guidance conflicts, obey the higher-priority source and note the conflict in your final summary.

---

## Repo essentials

- Package manager: `bun`
- Install: `bun install`
- Dev server: `bun run dev`
- Build: `bun run build`
- Full checks: `bun run check`
- Lint: `bun run lint`
- Tests: `bun run test` (full suite, ~14s — it runs offline; see docs/agents/lessons/toolchain-and-gates.md)
- CI: `.github/workflows/ci.yml` is manual-only (`workflow_dispatch`). The gates that run are `.husky/pre-push` and Cloudflare Workers Builds; see "Local gate enforced, remote gate on every push" below.

Use targeted tests when possible before running full checks:

- `bun run test tests/homeBriefModel.test.ts` — one file (~0.2s)
- `bun run test -t "reversal trigger"` — filter by test name across the suite

Iterate with a targeted test plus `bun run typecheck` (~6s); save `bun run check` (~50s) for pre-merge.

## Architectural invariants

- **Read deadlines**: `lib/report/reportData.ts` wraps report assembly in `withDeadline(10s)`. Health endpoint wraps its probe in `withDeadline(3s)`. Do not remove or increase these without commensurate fallback work.
- **Cron does not self-fetch**: `worker/index.ts` calls `executeIngest()`, `sendWeeklyBrief()`, `checkRegimeChange()`, and `runScheduledAlertDelivery()` directly instead of fetching its own public endpoints. The same functions power the corresponding HTTP routes, which remain for manual authenticated runs. The one deliberate exception is the Monday screenshot step (`lib/export/briefScreenshot.ts`): Browser Rendering loads the public homepage to capture the weekly-call block, because a picture needs the page as served; it carries no data back into the pipeline and skips itself when unconfigured.
- **Ingest stays off the read path**: `loadCanonicalReportInputs` with `refresh: "background"` (the report read path) serves the existing materialized model and refreshes due signal families via detached `waitUntil` work behind a KV lock (`lib/runtime/backgroundWork.ts`). Only a cold store ingests inline. A successful ingest calls `revalidateTag("report-data")` so tag-cached report data refreshes immediately (`lib/report/cacheTags.ts`). `tests/architectureInvariants.test.ts` pins all three states (Invariants 1, 1b, 1c) against fixture upstreams; a test of this path must own the network, because whether a read writes depends on what an ingest brings back.
- **Materialized model includes history**: `MaterializedSignalReadModel.recentHistory` stores the trailing 92-day window per signal key, built at write time. The read path (`loadCanonicalReportInputs`) avoids scanning raw snapshot keys when `recentHistory` is present.
- **Monthly regime history reads stay synchronous**: `getMonthlyRegimeHistory()` is called from `buildHomeBriefModelInternal`, which is sync and runs under the report read path's deadline. The cron writes the month in progress to KV (`summary:monthly-regime-history`); `loadReportData` primes that copy before assembly, bounded by a 1s deadline, and the snapshot bundled from `data/` is the floor whenever KV is empty, stale, or unreachable. Do not convert the reader to async to pick KV up — priming exists so that chain stays sync.
- **`getDefaultIngestionStore` re-checks binding**: No longer permanently memoizes — if a binding becomes available after an earlier fallback, the store reinitializes. Selection order: the `IngestCoordinator` Durable Object when `WHETHER_INGEST_COORDINATOR=1` and its binding exist (a preview-lane trial; see `lib/ingestion/coordinatorStore.ts`), then KV, then the local file store. The KV store reads only KV; it no longer falls back to `.cache/ingestion`. Every other store singleton (`get…Store()` / `get…Repository()`) selects its backend through `selectStoreByBinding` (`lib/runtime/storeSelection.ts`), which applies the same rule; add new stores through it, not a module-level `let`.
- **Engine boundary**: the scoring modules listed in `tests/architectureInvariants.test.ts` (Invariant 12) import nothing from `lib/report/`, `app/`, React or bundled data; `lib/regimeEngine.ts` is the only composition point. Archived entries carry `engineVersion`; `tests/regimeArchiveReplay.test.ts` replays every archive cadence offline from the bundle.
- **A send or check that falls back to a report read judges readiness first**: `assessReadingReadiness` (`lib/operatingState/resolveSnapshot.ts`) before acting on it, because the report read serves the bundled copy on an outage.
- **Local gate enforced, remote gate on every push**: `.husky/pre-push` runs the `pre-push` preset of `scripts/check-tasks.mjs` on every push; the deploy gate additionally runs the suite in randomized order. `.github/workflows/ci.yml` is `workflow_dispatch` only — the account stopped paying for Actions minutes — so nothing on GitHub blocks a merge. Cloudflare's build is the remaining remote signal, and it gates production too: Workers Builds runs `bun run check:vinext` — the deploy gate (`run-checks.mjs --preset deploy`: lint, typecheck, the suite, assets, suppressions and dead-exports under `WHETHER_DEPLOY_GATE=1`, then the landmark audit on its own) — on every push, `main` included, before anything is built or deployed. `scripts/vinext-run.mjs` guards `vinext build` on preview branches with the same list, but since 2026-09-03 it runs only what the outer command has not already proved for this commit (`scripts/check-gate-marker.mjs`), which on a normal build is nothing — the two gates were running the same five checks twice per pull-request push. A failing test does block a deploy; docs/agents/lessons/automation-and-deploy-gate.md records the two-gate history, why the earlier "production skips it" reading cost two days, and why the inner gate is skipped by evidence rather than deleted.

- **The test suite owns its upstreams**: `bunfig.toml` preloads `scripts/test-network-guard.ts`, so an outbound fetch from a test throws rather than leaving the box (loopback stays open). A test that needs data serves it — a fixture fetcher, or an assigned `globalThis.fetch`. This is what stops a suite from meaning one thing in Cloudflare's container, which reaches FRED, and another in a sandbox, which reaches nothing; it is also what took the suite from 49.3s to 13.7s.

---

## First principle: protect the core product loop

When choosing between tasks or implementations, prefer the option that strengthens this loop:

**signals → posture → decision → artifact**

In practice, this means agents should prioritize work that improves:

- weekly ritual use
- decision clarity
- bounded operating rules
- screenshot/shareability
- citation/readiness in docs and meetings

over work that primarily improves:

- nav neatness
- taxonomy purity
- route churn
- surface proliferation
- speculative platform breadth

Do not add new product surfaces lightly.
Do not create parallel systems when an existing surface can carry the behavior.

---

## What good work looks like here

A good change in this repo usually does one or more of the following:

- makes the weekly brief faster to understand
- makes the decision delta more explicit
- turns generic advice into bounded rules
- makes the output easier to copy, cite, screenshot, or export
- improves trust through provenance, resilience, or continuity
- reuses existing data flows and UI primitives instead of inventing new ones

A weak change often does the opposite:

- adds explanation without improving actionability
- creates a new page instead of strengthening `/`
- introduces new language systems for existing concepts
- over-invests in IA polish before improving operator value
- broadens the platform without deepening the decision artifact

---

## Product stance agents should preserve

Whether should increasingly feel like:

- a weekly operating brief
- a pacing authority (it sets weekly operating tempo and how aggressively to tighten or loosen)
- a meeting shorthand
- a Slack screenshot product
- a citeable decision artifact (claims and recommendations can be traced to fresh sources)

These are **internal framings for how the product should feel**, not copy. Outward surfaces use the
one category line in `lib/seo.ts` (`websiteName` and `canonicalPositioningLine`) — *weekly operating
guidance for startup leaders* — because a category that changes per surface does not survive being repeated by an
operator in a Slack channel. See `docs/editorial-guardrails.md` -> Category line.

It should feel less like:

- a macro blog
- a framework museum
- a methodology-first product
- a sprawling reporting platform

Two framings govern anything that applies the guidance to one company:

- **Shared evidence, company-specific action:** every company reads the same signals and the same
  pause and resume lines; what it does about them depends on its own cash, stage and runway. Prefer
  calibration to the reader's own numbers over one identical action pushed to every reader, which
  would synchronize hiring freezes and raises across companies.
- **A policy agreed in advance:** lines set ahead of time, so changing course is a line being
  crossed, not a meeting.

Agents should preserve and reinforce this direction in code, copy, and IA decisions.

---


## Operational definitions (use these terms consistently)

When writing product copy, specs, or PR notes, use these definitions:

- **Decision transmission**: the operator can scan the brief, choose a posture/action, and share a meeting-ready artifact in under 60 seconds.
- **Bounded decision**: includes a clear action, threshold/trigger, and reversal condition.
- **Trust should be compact**: show provenance/confidence/freshness/fallback in-line or one click away; avoid long method exposition on primary screens.
- **New-system overhead**: added maintenance cost across code paths, mental model complexity, and docs/testing burden.
- **Thin SEO page**: any page missing current posture, immediate implication, citeable summary, or link-back to the weekly brief.
- **Decision vocabulary is a single source**: regime names (weather), the call, forecast, and bounded-decision slot labels each have one defined vocabulary — see `docs/editorial-guardrails.md` → Decision vocabulary. Do not mint synonyms on new surfaces.

## Hard product rules

### 1) Delta first
When editing primary surfaces, prefer:

- what changed
- what that changes in decisions
- what to revisit
- what would flip the call

Do not lead with explanation if a decision delta can lead instead.

### 2) Bounded decisions beat generic guidance
When touching playbooks, briefs, exports, or answer pages, prefer:

- action
- threshold
- reversal condition

over broad suggestions like “be cautious” or “spend with guardrails.”

### 3) Artifact quality matters
If a user cannot quickly copy, paste, screenshot, or cite the output, the feature is incomplete.

### 4) Trust should be compact
Use provenance, confidence, freshness, and fallback indicators to reduce re-litigation.
Do not bury primary screens in method exposition.

### 5) Reuse before adding
Before creating a new route, model, or export layer, check whether the behavior belongs in:

- `/`
- `lib/report/homeBriefModel.ts`
- `lib/report/reportData.ts`
- `lib/report/decisionKnobs.ts`
- `lib/playbook.ts`
- existing export builders / report components

---

## Working rules for agents

- Always check for nested `AGENTS.md` files in directories you modify.
- Prefer existing utilities, labels, and display formatters over introducing new mappings.
- Prefer strengthening canonical surfaces over creating adjacent ones.
- Keep diffs focused; avoid opportunistic refactors unless they directly unblock the requested work.
- Use `rg` for discovery; avoid `ls -R` and `grep -R`.
- Update tests and docs when behavior or contracts change.
- If you change shared semantics (labels, scoring, posture language, route meaning), update all consumers or document the remaining drift.

---

## Execution loop for agents

Use this order unless the user explicitly asks for a different workflow:

1. orient with `AGENTS.md`, `docs/agents/README.md`, and the one guide that matches the task
2. identify the canonical surface or module before broad search
3. choose the smallest implementation that improves the product loop
4. run the smallest meaningful verification for the changed behavior
5. update the canonical doc if workflow, semantics, or contracts changed

Do not spend major effort on repo-wide exploration before you know the target surface and likely validation path.

---

## Delegation rules for subagents

Delegate only when the subtask is bounded, reviewable, and materially parallelizable.

- Resolve task shape and product intent locally before delegating.
- Give each subagent one clear job, one owner, and a tight write scope.
- Pass only the minimum repo anchors needed to avoid drift.
- Include the exact done condition, required checks, and expected return format.
- Require the return to name changed files, commands run, and open risks or unanswered questions.
- If a task already matches a repo-local skill, use that skill or explain why direct delegation is better.

Bad delegation usually looks like “explore this area and decide what to do.”
Good delegation looks like “update this bounded surface, under these constraints, and report back in this format.”

When in doubt, keep discovery, architecture choices, and final synthesis in the main agent.

---

## Decision framework for ambiguous changes

If multiple valid implementations exist, choose in this order:

1. the version that improves the one-screen weekly brief
2. the version that sharpens bounded decisions
3. the version that improves exports/citation/shareability
4. the version that improves trust/resilience without adding product sprawl
5. the version with the lowest new-system overhead

If an option mostly improves internal elegance but not operator value, deprioritize it.

---

## Preferred implementation targets

When making product-facing changes, start by checking these areas:

### Core brief / homepage
- `app/page.tsx`
- `app/components/DecisionHero.tsx`
- `app/components/CadenceCallCard.tsx`
- `lib/report/homeBriefModel.ts`
- `lib/report/reportData.ts`
- `lib/report/decisionKnobs.ts`

### Playbooks / bounded rules
- `lib/playbook.ts`
- `lib/report/operatingCalls.ts`
- `lib/thresholds.ts`
- `lib/regimeEngine.ts`

### Export / transmission surfaces
- `lib/report/briefDocument.ts` — the one brief document every export renders from
- existing export components under `app/operate/components/`
- shared export helpers in `lib/export*`
- provenance / trust helpers in `lib/report/*`

### Trust / continuity
- `lib/report/trustStatus.ts`
- `lib/report/reportFormatting.ts`
- `lib/timeMachine/*`
- snapshot / fallback paths

Only add a new module if the existing structure clearly cannot support the change cleanly.

---

## What to optimize for by work type

### If working on the homepage or weekly brief
Optimize for:
- 10-second readability
- 30-second decisiveness
- visible decision delta
- explicit revisit/hold logic
- screenshot-safe compression (one screen, readable hierarchy, and copyable decision bullets)

### If working on playbooks
Optimize for:
- bounded rules
- thresholds
- stop / pause triggers
- reversal conditions
- role clarity

### If working on answer pages or SEO surfaces
Optimize for:
- direct user question match
- current posture
- immediate implication
- citeable summary
- strong links back to the weekly brief

Do not ship thin SEO pages that outpace the strength of the core artifact (each page should include current posture, immediate implication, a citeable summary, and a clear link back to the weekly brief).

### If working on trust / data plumbing
Optimize for:
- clear degraded-state behavior
- consistent labels across surfaces
- explicit fallback markers
- stable provenance
- non-fatal failure modes

---

## Documentation expectations

When behavior changes, update the most relevant docs, especially when touching:

- weekly brief contracts
- product semantics
- route/IA meaning
- data contracts
- fallback/trust behavior
- export/citation behavior

If a task changes the intended product shape, update the relevant spec in `docs/`.

If the task reveals drift between code and spec, note that explicitly.

---

## Testing expectations

Run the smallest useful verification set, and prefer targeted checks that validate changed behavior.

Examples:
- targeted unit tests for logic changes
- route/redirect tests for IA changes
- rendering tests for summary / export changes
- `bun run lint` for UI or shared module work
- `bun run check` only when the scope justifies it or before major merges

Do not claim full repo validation unless you actually ran it.

If a broader suite is failing for unrelated reasons, say so clearly.

---

## Final response requirements

In the final response, include:

1. what changed
2. why it changed
3. which files/modules were touched
4. what verification you ran
5. any follow-up risks, drift, or next-best improvements

Be concrete. Avoid vague “improved UX” summaries.

---

## Progressive guidance

Read the relevant docs in `docs/agents/` before making non-trivial changes.

- `docs/agents/setup.md`
- `docs/agents/project-layout.md`
- `docs/agents/engineering-principles.md`
- `docs/agents/documentation.md`
- `docs/agents/data-and-platform.md`
- `docs/agents/quality-and-pr.md`
- `docs/agents/ui-ux-standards.md`
- `docs/agents/README.md`

Also check product specs that govern the feature area you are touching, especially:
- one-screen weekly brief specs
- prioritization specs
- IA/navigation docs
- trust/fallback docs
- export/integration docs

---

## Non-goals for agents

Do not spend major effort on these unless explicitly requested:

- renaming routes for style alone
- inventing new posture taxonomies
- adding datasets before improving compression/actionability
- building platform breadth ahead of the weekly brief
- verbose methodology copy on primary surfaces
- speculative personalization systems without a clear operator need

---

## Repo-local skill conventions

- Skill path: `.claude/skills/<skill-name>/SKILL.md`, canonical; `.codex/skills/` is generated from it by `bun run skills:sync` (overlay: `.codex/skills-overlay/`) and never edited by hand (see `.claude/skills/README.md`)
- Use kebab-case for skill directories
- Keep skills narrow, task-specific, and output-contract driven
- Default to least-privilege tool access
- If a new skill changes recommended workflows, add a short note to the agent docs hub
