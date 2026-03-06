# MCP and agent skills playbook

Practical guidance for introducing Model Context Protocol (MCP) tools and reusable agent skills in this repository.

## Why this matters for Whether

Whether depends on high-quality synthesis (macro + product/engineering implications), stable sourcing, and repeatable contributor workflows. MCP and skills are a strong fit because they:

- reduce prompt re-explaining for recurring tasks,
- make external context access explicit and auditable, and
- give contributors and agents a shared, reusable operating layer.

## What AI teams are doing in practice (2025 snapshot)

### MCP adoption patterns

1. **Standardized connectors over bespoke integrations**
   - Teams are using MCP as a common protocol to connect models to data/tools instead of writing one-off adapters per model host.
2. **Read-mostly, scoped tool surfaces first**
   - Early rollouts bias toward read-only sources (docs, issues, analytics snapshots) before write operations.
3. **Curated server catalogs**
   - Teams often begin with known servers (GitHub, browser automation, search, SQL) and add custom servers only for domain-specific gaps.
4. **Security-by-default controls**
   - Deployments usually emphasize allowlists, least-privilege tokens, and explicit approval gates for mutating actions.

### Agent skills adoption patterns

1. **Task-specific procedural packs**
   - Skills are used as compact runbooks for repeated workflows (bug triage, audit, migration checks, release notes).
2. **Scoped discovery**
   - Teams keep skills close to project folders so the right guidance activates in-context.
3. **Skill + tool pairing**
   - Mature setups pair a skill (how to reason) with MCP tools (how to fetch/verify data).
4. **Opinionated output contracts**
   - Skills define expected outputs (tables, risk sections, command logs) to improve review quality and consistency.

## Recommendations for this repo

## 1) Add a minimal MCP starter profile for contributor agents

Start with a **small, high-signal set**:

- `filesystem` (repo-scoped) for local reads/writes.
- `github` for issue/PR context and linking code changes to roadmap items.
- `playwright` (or equivalent browser MCP) for reproducible web validation/screenshots.
- one trusted `search`/`fetch` server for external research tasks.

Guardrails:

- default read-only access where possible,
- mutation tools behind explicit invocation,
- environment-variable based auth only (no committed credentials),
- short setup instructions in `docs/agents/setup.md`.

## 2) Create first-class repo skills for recurring work

Create a `.codex/skills/` (or tool-equivalent local skills path) with 3 initial skills:

1. **`research-brief`**
   - Purpose: turn web + docs findings into a compact brief with source reliability notes.
   - Output: summary, evidence table, implications for Whether, open questions.
2. **`feature-audit`**
   - Purpose: run UX/content/behavior audits against current product standards.
   - Output: remove/move/modify matrix + severity + follow-up tasks.
3. **`pr-hygiene`**
   - Purpose: enforce repo-required checks, commit quality, and PR body completeness.
   - Output: checks run, outcomes, risk notes, and release impact line.

## 3) Add a “web research safety lane” for browsing agents

For agents that browse external sources:

- require citation capture (URL + retrieval date + confidence tag),
- separate factual extraction from interpretation,
- prefer primary sources (official docs/specs/repos) over commentary,
- include “staleness risk” when citing fast-changing platform docs.

## 4) Add a custom Whether MCP server later (phase 2)

After baseline adoption, implement a lightweight internal MCP server that exposes:

- canonical content artifacts (current specs, roadmap, architecture),
- source-of-truth status for economic signals/datasets,
- query endpoints for glossary/definitions used in product copy.

This helps agents answer product strategy questions without drifting from internal truth.

## Proposed phased implementation

### Phase 0 (1 day): docs + conventions

- Document chosen MCP servers and auth setup in `docs/agents/setup.md`.
- Define skill directory conventions and naming in `AGENTS.md`.
- Add one sample skill template contributors can copy.

### Phase 1 (2–4 days): MVP enablement

- Install/configure the initial MCP server set.
- Add the 3 starter skills above.
- Pilot on 3 real tasks (research, UI audit, PR prep) and capture failure modes.

### Phase 2 (1–2 weeks): tighten quality loops

- Add output schemas/checklists to skills.
- Track agent-run task quality (rework rate, review cycles, citation defects).
- Introduce a custom Whether MCP server if repeated context gaps remain.

## Success metrics

- **Cycle time**: median task completion time for recurring workflows.
- **Review load**: number of review-round comments per PR.
- **Context accuracy**: % of claims backed by primary source links.
- **Rework rate**: % of agent-generated work requiring major rewrite.
- **Onboarding speed**: time for new contributor agents to reach “first good PR.”

## 2026 skill-design best-practice refresh

Based on current MCP/skills guidance, keep repo-local skills high-signal and reviewable:

1. **Deterministic trigger boundaries**
   - Define explicit should-use / should-not-use intent patterns to reduce accidental over-triggering.
2. **Opinionated output contracts**
   - Require fixed output sections (actions taken, result, follow-up, fallback) so reviews can be fast and comparable.
3. **Sequenced multi-skill orchestration**
   - When two skills are needed, encode execution order in the skill itself (for example install/discover before authoring).
4. **Least-privilege and fallback-first behavior**
   - Prefer existing helper scripts/tools and document blocked-path fallback behavior without silent failures.
5. **Maintenance metadata**
   - Add `last reviewed` and refresh cadence to prevent stale process guidance.

Applied in this repo:
- `.codex/skills/system-skill-router/SKILL.md` now encodes deterministic routing, output contract, quality checks, and maintenance notes for skill-management tasks.
- Core repo-local skills (`research-brief`, `feature-audit`, `pr-hygiene`, `regime-briefing-operator`, `signal-provenance-audit`, `executive-brief-pack`) now follow the same pattern: explicit use/non-use boundaries, required output sections, pre-finalization checks, and maintenance metadata.

## Risks and mitigations

- **Tool sprawl** → keep MCP catalog intentionally small and reviewed monthly.
- **Over-triggering skills** → tighten trigger language and add explicit non-goals.
- **Stale external guidance** → require retrieval date and periodic source refresh.
- **Security drift** → centralize token scopes and rotate on a fixed cadence.

## Suggested next action in this repo

Start with **Phase 0 + one pilot skill** (`research-brief`) and evaluate on the next two strategy/research tickets. Expand only after measuring review quality and contributor friction.

Current repo bootstrap:
- Starter skill scaffolds:
  - `.codex/skills/research-brief/SKILL.md`
  - `.codex/skills/feature-audit/SKILL.md`
  - `.codex/skills/pr-hygiene/SKILL.md`
  - `.codex/skills/agent-skill-architect/SKILL.md` (for creating/updating high-quality repo-local skills)
  - `.codex/skills/regime-briefing-operator/SKILL.md` (for weekly decision-ready regime briefs)
  - `.codex/skills/signal-provenance-audit/SKILL.md` (for source/freshness verification)
  - `.codex/skills/executive-brief-pack/SKILL.md` (for share-ready leadership briefs)
- Setup guidance: `docs/agents/setup.md` (MCP starter profile + skill usage)
- Conventions: `AGENTS.md` (repo-local skill conventions)

## External references used for this playbook

- Model Context Protocol introduction/spec hub: https://modelcontextprotocol.io/introduction
- Anthropic MCP announcement: https://www.anthropic.com/news/model-context-protocol
- MCP server ecosystem list: https://github.com/modelcontextprotocol/servers
- Playwright MCP example server: https://github.com/microsoft/playwright-mcp
- Claude Code skills docs: https://docs.anthropic.com/en/docs/claude-code/skills
- Claude Code MCP docs: https://docs.anthropic.com/en/docs/claude-code/mcp
