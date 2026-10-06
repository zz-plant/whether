/**
 * What `scripts/agent-workflow-lib.mjs` knows about this repository.
 *
 * The library is the engine — keyword routing, the doctor report, handoff packets, the
 * repo index, the local-model router — and names nothing about Whether. This file is the
 * Whether part: the task profiles a request is routed to (with the docs, first files and
 * checks each one recommends), the fallback profile, the core product surfaces the index
 * calls out, and where the repo-local skills live.
 */

/** Where the canonical repo-local skills live. `.codex/skills/` is generated from it (`bun run skills:sync`). */
export const SKILLS_DIRECTORY = ".claude/skills";

/** The name the local-model router uses for this repository in its prompt. */
export const REPOSITORY_NAME = "Whether";

/** The canonical product surfaces the repo index lists as their own category. */
export const CORE_SURFACES = [
  "app/page.tsx",
  "lib/report/homeBriefModel.ts",
  "lib/report/reportData.ts",
  "lib/report/decisionKnobs.ts",
  "lib/playbook.ts",
];

export const TASK_PROFILES = [
  {
    id: "skill-mcp",
    label: "Skill or MCP workflow",
    rationale: "The task is about skills, MCP tooling, delegation, or agent workflow plumbing.",
    keywords: [
      "skill",
      "mcp",
      "subagent",
      "delegat",
      "handoff",
      "tooling",
      "agent experience",
      "sx",
      "ax",
      "workflow",
      "prompt packet",
      "router",
    ],
    docs: [
      "AGENTS.md",
      "docs/agents/README.md",
      "docs/agents/mcp-and-skills-playbook.md",
      "docs/agents/documentation.md",
      ".claude/skills/README.md",
    ],
    targets: [
      "docs/agents/mcp-and-skills-playbook.md",
      "docs/agents/README.md",
      ".claude/skills/README.md",
      "scripts/agent-workflow.mjs",
    ],
    checks: [
      "Verify links, commands, and references manually.",
      "bun test tests/agentWorkflow.test.ts",
    ],
  },
  {
    id: "docs-workflow",
    label: "Docs or workflow",
    rationale: "The task is primarily about contributor guidance, documentation, or command routing.",
    keywords: [
      "docs",
      "documentation",
      "readme",
      "guide",
      "workflow",
      "instructions",
      "onboarding",
      "policy",
      "agent docs",
    ],
    docs: [
      "AGENTS.md",
      "docs/agents/README.md",
      "docs/agents/documentation.md",
      "docs/agents/quality-and-pr.md",
    ],
    targets: [
      "docs/agents/README.md",
      "docs/agents/documentation.md",
      "AGENTS.md",
    ],
    checks: [
      "Verify links, commands, and references manually.",
      "git diff --check",
    ],
  },
  {
    id: "visual-iteration",
    label: "Visual iteration or mockup",
    rationale: "The task is about screenshots, layout, spacing, or visual refinement.",
    keywords: [
      "visual",
      "mockup",
      "screenshot",
      "spacing",
      "alignment",
      "polish",
      "layout",
      "design",
      "accessibility",
    ],
    docs: [
      "AGENTS.md",
      "docs/agents/README.md",
      "docs/agents/ui-ux-standards.md",
    ],
    targets: [
      "app/page.tsx",
      "app/components/home/",
      "app/components/DecisionHero.tsx",
      "app/components/CadenceCallCard.tsx",
    ],
    checks: [
      "bun run lint",
      "bun run ui:iterate -- --only operator-brief-mobile,operator-brief-desktop",
    ],
  },
  {
    id: "data-trust",
    label: "Data, provenance, or trust",
    rationale: "The task touches freshness, provenance, fallback behavior, or data-path semantics.",
    keywords: [
      "trust",
      "provenance",
      "fallback",
      "freshness",
      "source",
      "stale",
      "degraded",
      "pipeline",
      "snapshot",
      "time machine",
      "report data",
    ],
    docs: [
      "AGENTS.md",
      "docs/agents/README.md",
      "docs/agents/data-and-platform.md",
      "docs/agents/quality-and-pr.md",
    ],
    targets: [
      "lib/report/reportData.ts",
      "lib/report/trustStatus.ts",
      "lib/report/reportFormatting.ts",
      "lib/timeMachine/",
    ],
    checks: [
      "bun run test tests/trustStatusFailureModes.test.ts",
      "bun run lint",
    ],
  },
  {
    id: "playbook-decision",
    label: "Playbooks or bounded decisions",
    rationale: "The task affects decision posture, thresholds, or operating rules.",
    keywords: [
      "playbook",
      "threshold",
      "bounded decision",
      "regime",
      "posture",
      "decision",
      "operating call",
      "tighten",
      "loosen",
      "flip condition",
    ],
    docs: [
      "AGENTS.md",
      "docs/agents/README.md",
      "docs/agents/engineering-principles.md",
      "docs/agents/quality-and-pr.md",
    ],
    targets: [
      "lib/playbook.ts",
      "lib/report/operatingCalls.ts",
      "lib/thresholds.ts",
      "lib/regimeEngine.ts",
    ],
    checks: [
      "bun run test tests/playbook.test.ts",
      "bun run test tests/regimeEngine.test.ts",
      "bun run lint",
    ],
  },
  {
    id: "product-ui",
    label: "Product UI or decision-flow",
    rationale: "The task affects the homepage, weekly brief, or operator-facing decision transmission.",
    keywords: [
      "homepage",
      "home page",
      "weekly brief",
      "brief",
      "card",
      "decision flow",
      "route",
      "artifact",
      "export",
      "share",
      "operator",
      "homepage",
    ],
    docs: [
      "AGENTS.md",
      "docs/agents/README.md",
      "docs/agents/project-layout.md",
      "docs/agents/engineering-principles.md",
      "docs/agents/ui-ux-standards.md",
    ],
    targets: [
      "app/page.tsx",
      "app/components/DecisionHero.tsx",
      "lib/report/homeBriefModel.ts",
      "lib/report/decisionKnobs.ts",
    ],
    checks: [
      "bun run lint",
      "bun run test tests/homeBriefModel.test.ts",
      "bun run test tests/homeRouteDecisionTransmissionContract.test.tsx",
    ],
  },
  {
    id: "feature-audit",
    label: "Feature audit",
    rationale: "The task is to audit an existing feature for compliance, completeness, or technical debt.",
    keywords: ["audit", "feature-audit", "compliance", "analysis", "review"],
    docs: [
      "AGENTS.md",
      "docs/agents/README.md",
      "docs/agents/engineering-principles.md",
    ],
    targets: [
      "app/page.tsx",
      "lib/report/reportData.ts",
    ],
    checks: [
      "bun run lint",
      "bun run typecheck",
    ],
  },
  {
    id: "bugfix",
    label: "Bugfix",
    rationale: "The task is to fix a specific bug or regression.",
    keywords: ["bug", "fix", "bugfix", "issue", "patch", "regression"],
    docs: [
      "AGENTS.md",
      "docs/agents/README.md",
      "docs/agents/quality-and-pr.md",
    ],
    targets: [
      "tests/",
      "lib/",
    ],
    checks: [
      "bun run test",
      "bun run lint",
    ],
  },
];

export const DEFAULT_PROFILE = {
  id: "generic-engineering",
  label: "General engineering",
  rationale: "The task does not strongly match a narrower repo workflow, so use the generic engineering baseline.",
  docs: [
    "AGENTS.md",
    "docs/agents/README.md",
    "docs/agents/project-layout.md",
    "docs/agents/quality-and-pr.md",
  ],
  targets: [
    "app/",
    "lib/",
    "tests/",
  ],
  checks: [
    "bun run lint",
    "bun run test",
  ],
};
