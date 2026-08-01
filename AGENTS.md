# Agent Guide for Whether

Whether turns public macro signals into weekly operating posture for startup and product leaders.

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
- Tests: `bun run test` (full suite, ~50s)
- CI: `.github/workflows/ci.yml` — runs lint, typecheck, test on push/PR to main

Use targeted tests when possible before running full checks:

- `bun run test tests/homeBriefModel.test.ts` — one file (~0.2s)
- `bun run test -t "reversal trigger"` — filter by test name across the suite

Iterate with a targeted test plus `bun run typecheck` (~9s); save `bun run check` (~90s) for pre-merge.

## Architectural invariants

- **Read deadlines**: `lib/report/reportData.ts` wraps report assembly in `withDeadline(10s)`. Health endpoint wraps its probe in `withDeadline(3s)`. Do not remove or increase these without commensurate fallback work.
- **Cron does not self-fetch**: `worker/index.ts` calls `executeIngest()` directly instead of `fetch(${site}/api/ingest)`. The same `executeIngest` function powers the `/api/ingest` HTTP route.
- **Materialized model includes history**: `MaterializedSignalReadModel.recentHistory` stores the trailing 92-day window per signal key, built at write time. The read path (`loadCanonicalReportInputs`) avoids scanning raw snapshot keys when `recentHistory` is present.
- **`getDefaultIngestionStore` re-checks binding**: No longer permanently memoizes — if the KV binding becomes available after an earlier fallback, the store reinitializes.
- **CI enforced**: `.github/workflows/ci.yml` blocks merges that fail lint, typecheck, or test.

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

It should feel less like:

- a macro blog
- a framework museum
- a methodology-first product
- a sprawling reporting platform

Agents should preserve and reinforce this direction in code, copy, and IA decisions.

---


## Operational definitions (use these terms consistently)

When writing product copy, specs, or PR notes, use these definitions:

- **Decision transmission**: the operator can scan the brief, choose a posture/action, and share a meeting-ready artifact in under 60 seconds.
- **Bounded decision**: includes a clear action, threshold/trigger, and reversal condition.
- **Trust should be compact**: show provenance/confidence/freshness/fallback in-line or one click away; avoid long method exposition on primary screens.
- **New-system overhead**: added maintenance cost across code paths, mental model complexity, and docs/testing burden.
- **Thin SEO page**: any page missing current posture, immediate implication, citeable summary, or link-back to the weekly brief.

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
- `app/components/weeklyDecisionCard.tsx`
- `lib/report/homeBriefModel.ts`
- `lib/report/reportData.ts`
- `lib/report/decisionKnobs.ts`

### Playbooks / bounded rules
- `lib/playbook.ts`
- `lib/report/operatingCalls.ts`
- `lib/thresholds.ts`
- `lib/regimeEngine.ts`

### Export / transmission surfaces
- existing export components under `app/planning/components/`
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

- Preferred skill path: `.codex/skills/<skill-name>/SKILL.md`
- Use kebab-case for skill directories
- Keep skills narrow, task-specific, and output-contract driven
- Default to least-privilege tool access
- If a new skill changes recommended workflows, add a short note to the agent docs hub
