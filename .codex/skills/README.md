# Repo-local skills

Use this index to decide whether a first-party Whether skill should be loaded before you open individual `SKILL.md` files.

`.claude/skills/` is the canonical source: Claude Code discovers skills only there, and the repo's
agent helpers (`bun run agent:handoff -- --skill <name>`, `bun run agent:index`) read it.
`.codex/skills/` is generated from it for the Codex runtime by `bun run skills:sync`, plus a
per-runtime overlay in `.codex/skills-overlay/` for the files that deliberately differ:

- `system-skill-router` — the Codex version routes to Codex's built-in `skill-installer` and
  `skill-creator`; the canonical one is rewritten for Claude Code, which has no installer.
- `web-design-guidelines` — Codex only; Claude Code already gets it from a global plugin.

Add, remove, or change a skill under `.claude/skills/` (or the overlay), then run
`bun run skills:sync`. Never edit `.codex/skills/` by hand: `tests/skillsMirror.test.ts` fails when
it differs from what the sync would write, and when a skill directory is missing from the map below.

## When to use this index

- you are deciding which repo-local skill fits the task
- you are updating an existing skill and need to check overlap
- you are adding a new skill and want to avoid duplicating current coverage

## Skill map

| Skill | Use it for | Do not use it for | Typical output |
| --- | --- | --- | --- |
| `research-brief` | External research with citations, freshness, and implications | Pure implementation or unsupported opinion-only brainstorming | Evidence table, implications, next actions |
| `feature-audit` | Product, UX, or content audits with clear remediation triage | Building a feature or fixing a narrow bug | Remove or move or modify matrix |
| `pr-hygiene` | Pre-commit or pre-PR validation and reviewer-ready summaries | Early ideation with no code or docs change | Validation log, PR summary, risk line |
| `regime-briefing-operator` | Weekly or regime briefings from existing Whether artifacts | Deep macro education without operating decisions | Delta-first operating brief |
| `signal-provenance-audit` | Trust, provenance, freshness, and formula audits | Strategic interpretation without artifact verification | Provenance matrix, fix plan, go or no-go |
| `executive-brief-pack` | Share-ready leadership artifacts from current Whether signals | Methodology-heavy explainers | Executive headline, bounded actions, citations |
| `agent-skill-architect` | Creating or upgrading first-party repo-local skills | General product or engineering implementation | Skill spec, trigger test, maintenance notes |
| `subagent-handoff` | Bounded subagent delegation packets with repo anchors and verification | Early ambiguity shaping or broad implementation work | Handoff packet, return contract, open risks |
| `system-skill-router` | Routing skill-management requests (list/install vs create/update) | General task work unrelated to skill management | Routing decision, next tool call |
| `vercel-react-best-practices` | React/Next.js performance review or authoring (rendering, bundling, server, async) | Non-React/Next.js code | Rule-referenced findings and fixes |
| `whether-ui-loop` | Screenshot-driven UI iteration: capture with `bun run ui:iterate`, look, critique, fix, recapture | Logic-only changes, or UI rules without needing to see the page | Before/after captures, critique, recapture |
| `whether-ui-standards` | UI/UX rules for anything that renders under `app/` — interaction, accessibility, semantics, theming, motion | Non-UI code; seeing the result (pair with `whether-ui-loop`) | Rule-referenced findings and fixes |

## Selection rules

- Pick the narrowest skill that fully covers the task.
- If two skills seem relevant, define the order before using them.
- If a task is not repeatable or lacks a stable output shape, do not force it into a skill.
- If a skill would mostly restate repo docs, fix the docs or the skill instead of adding another skill.

## Direct reasoning vs skill vs subagent

Use this order to avoid unnecessary workflow overhead:

- direct reasoning first for one-off implementation or tightly coupled debugging
- a skill when the task has a repeatable workflow and fixed output shape
- a subagent when the work is bounded enough to parallelize cleanly

If you delegate a skill-shaped task, name the skill in the handoff and preserve its output contract instead of inventing a new return format.

## Delegating skill-shaped work

When a subagent is doing work that matches one of these skills:

- pass the skill name explicitly
- include the canonical repo anchors that skill depends on
- keep the delegated job to one repeatable workflow
- require the return to preserve the skill's section order when applicable

## Quality bar for first-party skills

Each first-party skill should have:

- narrow trigger boundaries
- required inputs
- repo anchors
- a fixed workflow
- an output contract
- quality checks
- guardrails
- maintenance metadata

## Maintenance notes

- Update this index when you add, remove, rename, or materially repurpose a skill.
- If two skills start competing for the same task, resolve the overlap here and in both `SKILL.md` files.
