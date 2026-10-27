# Documentation map

Use this file to find the current source of truth without reading the whole `docs/` tree.

## Read this first

### If you are changing product behavior

- `one-screen-weekly-brief-spec.md` for the primary brief contract
- `feature-specs-current.md` for shipped product intent
- `architecture.md` for system boundaries, data flows, and extension points
- `use-cases/operator-playbooks.md` for concrete operator workflows and automation recipes

### If you are changing contributor workflow

- `development-playbook.md` for engineering workflow
- `cli-command-reference.md` for CLI contracts
- `cloudflare-deployment-runbook.md` for deploy behavior

### If you are changing agent workflow or skills

- `../AGENTS.md` for instruction priority and repo constraints
- `agents/README.md` for task-based agent routing
- `agents/mcp-and-skills-playbook.md` for MCP and skill maintenance

### If you are integrating with Whether externally

- `developer/README.md` for the external docs entrypoint
- `developer/quickstart.md` for first integration
- `developer/api-reference.md` for endpoint contracts
- `developer/integrations.md` for webhook & SDK recipes
- `developer/decision-models.md` for caller-owned text/audio/video checks and advisory brief, screenshot, evidence and model evaluations

## Document types

Use these labels mentally when deciding what to read or update:

- `Canonical`: current source of truth for shipped behavior or workflow
- `Working`: active plan, proposal, or prioritized backlog
- `Evidence`: generated logs, audits, or research snapshots that support decisions but do not define behavior
- `Historical`: older context that may explain why something exists but should not override canonical docs

If a document is not obviously canonical, confirm it against the relevant canonical file before implementing from it.

## Canonical docs by outcome

### Product behavior

- `one-screen-weekly-brief-spec.md` — primary weekly brief contract
- `use-cases/operator-playbooks.md` — role-specific operator workflows, playbooks, and decision rules (canonical)
- `feature-specs-current.md` — current product surface intent
- `current-jtbd-click-paths.md` — current jobs-to-be-done inventory with click-level fulfillment paths
- `editorial-guardrails.md` — copy, claims, and long-form guardrails
- `claims-ledger.md` — each claim a week makes, the one function that builds it, and the surfaces that print it
- `design/palette-directions.md` — the October 2026 palette and type decision (Synoptic), with the options it rejected

### Engineering workflow

- `development-playbook.md` — day-to-day engineering workflow and validation depth
- `architecture.md` — modules, data flow, diagrams, and extension points (canonical)
- `stack-compatibility-matrix.md` — runtime and platform constraints
- `domain-and-deployment.md` — deployment topology and domain model
- `cloudflare-deployment-runbook.md` — deploy expectations and evidence capture
- `vinext-cloudflare-evaluation.md` — the Vinext build lane on Workers and the route counts it was judged on
- `ui-iteration-workflow.md` — the `/mockups` routes and the screenshot loop for visual work
- `assets/README.md` — the README screens and the generated brand kit, and how to remake each

### Developer integrations

- `developer/README.md` — outcome-based entrypoint
- `developer/quickstart.md` — first decision-artifact pull
- `developer/api-reference.md` — endpoint catalog and contract notes
- `developer/integrations.md` — operational integration patterns
- `developer/cli-fallback.md` — curl-first fallback flow

### Agent workflow

- `agents/README.md` — minimal read path by task
- `agents/setup.md` — install/run/check commands and MCP baseline
- `agents/project-layout.md` — directory ownership boundaries
- `agents/documentation.md` — documentation lifecycle and update triggers
- `agents/quality-and-pr.md` — validation depth and PR hygiene
- `agents/mcp-and-skills-playbook.md` — skill usage and maintenance rules
- `../.claude/skills/README.md` — repo-local skill index and overlap guide (canonical; `../.codex/skills/` is generated from it by `bun run skills:sync`)

## Working and planning docs

Use these when shaping follow-on work, not as sole implementation truth:

- `design-debt-prioritized.md` — the one UI/UX and IA design-debt tracker: shipped rows and open ones
- `implementation-status.md` — implementation status and milestone tracker
- `roadmap-prioritized-spec.md` — prioritized, detailed specs for open roadmap items
- `product-marketing-review-2026-08-29.md` — PMM review and launch checks
- `launch/show-hn.md` — Show HN launch kit: title options, post text and prepared answers; not yet posted
- `sales-competitive-messaging.md` — ICP, competitor battlecards and objection handling for internal sales prep; only the primary ICP is validated
- `programmatic-seo-operations.md` — SEO page-building runbook; since 2026-08-29 it covers decision-query answer pages only
- `seo/roadmap.md` — prioritized decision topics, answer-page contract and evidence gates for SEO expansion
- `seo/quality-gates.md` — publish gates and QA checklist
- `seo/measurement-model.md` — analytics and event schema
- `seo/refresh-loop.md` — refresh trigger criteria

## Historical specs and proposals

These documents describe earlier architectures, retired routes, or proposals that have been absorbed or superseded. Plans that finished or were dropped are deleted rather than kept here; `git log --diff-filter=D -- docs/` finds them (the 2026-10-05 cleanup removed 22).

- `adoption-driven-change-plan.md` — early adoption analysis (absorbed into AGENTS.md)
- `architecture/repo-boundaries.md` — proposed decision-engine / content-system / delivery-shell split; names directories that no longer exist (current boundaries: `architecture.md`)
- `concepts-enhancements.md` — proposed `/concepts` hub. The route was retired, then restored on 2026-09-23 as the product-writing reading list.
- `glossary-retirement-plan.md` — plan and record for retiring `/glossary` (shipped 2026-09-22); tests cite it for the reader-vocabulary rules
- `operations/build-speed-audit.md` — build timings from the retired `next-on-pages` pipeline
- `research/2026-03-04-ux-change-proposal.md` — March UX proposal built on trackers since deleted; open UX work lives in `design-debt-prioritized.md`
- `toolkits-rewrite-enhancement-audit.md` — standalone `/toolkits` index (redirected to `/`; `/toolkits/[slug]` pages remain)

## Evidence and research docs

Use these to explain why a decision was made or to support a new proposal:

- `research/premise-test-preregistration.md` and `research/premise-test-results.md` — whether tight readings predict lower U.S. venture deal volume; registered before the data was paired, and not supported
- `research/advice-corpus-preregistration.md` and `research/advice-corpus-results.md` — whether published investor advice moves with the two scores; the predictions counted against
- `research/advice-predictions-preregistration.md` — whether investors' dated market predictions come true; registered 2026-10-13, no results yet
- [Responsive page design review](evidence/responsive-page-design-2026-10-04.md) — local mobile/desktop screenshots and verification for the spacing, reading-width and control refinements.
- `seo/missed-opportunities-audit-2026-09-10.md` — indexation, structured-data and query-matching audit; every finding closed by 2026-09-15
- `research/2026-09-03-alternative-data-endpoints.md` — sourcing research: which of the five upstream data hosts to replace
- `research/2026-05-15-production-key-journey-qa.md` — production QA of the main operator journeys, with the fixes it prompted
- `research/2026-04-14-i18n-user-facing-string-audit.md` for i18n-readiness audit
- `research/2026-03-09-cloudflare-bundle-composition.md` — why the full summary archive stays out of route bundles; measured on the retired `next-on-pages` output
- `research/2026-03-06-pr-patterns-and-adjustments.md` — merge-churn patterns across 400 PRs and the workflow guardrails proposed from them
- `research/2026-03-04-review-comment-patterns.md` — recurring themes in 200 PR review comments
- `research/review-comment-trends.latest.md` — generated by `bun run review:comment-trends:update`; regenerate before citing it
- `research/2026-03-02-persona-click-route-walkthrough.md` — a VP Product persona walking three click routes through the March route model
- `research/2026-03-01-target-persona-frontend-critique.md` — a VP Product persona's critique of the March front end
- `evidence/**`
- audits such as `outstanding-issues-audit.md` and similar review notes

## Maintenance rules

- Prefer updating an existing canonical doc over creating a near-duplicate.
- Link every new active doc from this file and the most relevant audience entrypoint.
- Mark historical proposal docs clearly once their decisions are absorbed elsewhere.
- Keep evidence logs clearly separate from behavioral guidance.
- When in doubt, optimize for shorter paths to the right document, not more documentation volume.
