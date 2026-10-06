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

### Engineering workflow

- `development-playbook.md` — day-to-day engineering workflow and validation depth
- `architecture.md` — modules, data flow, diagrams, and extension points (canonical)
- `stack-compatibility-matrix.md` — runtime and platform constraints
- `domain-and-deployment.md` — deployment topology and domain model
- `cloudflare-deployment-runbook.md` — deploy expectations and evidence capture

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
- `../.claude/skills/README.md` — repo-local skill index and overlap guide (canonical; `.codex/skills/` is generated from it by `bun run skills:sync`)

## Working and planning docs

Use these when shaping follow-on work, not as sole implementation truth:

- `design-debt-prioritized.md` — the one UI/UX and IA design-debt tracker: shipped rows and open ones
- `implementation-status.md` — implementation status and milestone tracker
- `roadmap-prioritized-spec.md` — prioritized, detailed specs for open roadmap items
- `premium-launch-readiness.md` — launch readiness for pricing/billing
- `product-marketing-review-2026-08-29.md` — PMM review and launch checks
- `seo/roadmap.md` — prioritized decision topics, answer-page contract and evidence gates for SEO expansion
- `seo/quality-gates.md` — publish gates and QA checklist
- `seo/measurement-model.md` — analytics and event schema
- `seo/refresh-loop.md` — refresh trigger criteria

## Historical specs and proposals

These documents describe earlier architectures, retired routes, or proposals that have been absorbed or superseded. Plans that finished or were dropped are deleted rather than kept here; `git log --diff-filter=D -- docs/` finds them (the 2026-10-05 cleanup removed 22).

- `adoption-driven-change-plan.md` — early adoption analysis (absorbed into AGENTS.md)
- `concepts-enhancements.md` — proposed `/concepts` hub. The route was retired, then restored on 2026-09-23 as the product-writing reading list.
- `toolkits-rewrite-enhancement-audit.md` — standalone `/toolkits` index (redirected to `/`; `/toolkits/[slug]` pages remain)

## Evidence and research docs

- [Responsive page design review](evidence/responsive-page-design-2026-10-04.md) — local mobile/desktop screenshots and verification for the spacing, reading-width and control refinements.

Use these to explain why a decision was made or to support a new proposal:

- `research/*.md`
- `research/2026-04-14-i18n-user-facing-string-audit.md` for i18n-readiness audit
- `evidence/**`
- audits such as `outstanding-issues-audit.md` and similar review notes

## Maintenance rules

- Prefer updating an existing canonical doc over creating a near-duplicate.
- Link every new active doc from this file and the most relevant audience entrypoint.
- Mark historical proposal docs clearly once their decisions are absorbed elsewhere.
- Keep evidence logs clearly separate from behavioral guidance.
- When in doubt, optimize for shorter paths to the right document, not more documentation volume.
