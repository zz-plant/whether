/**
 * What `scripts/agent-workflow-lib.mjs` knows about this repository.
 *
 * The library is the engine — keyword routing, the doctor report, handoff packets, the
 * repo index — and names nothing about Whether. This file is the
 * Whether part: the task profiles a request is routed to (with the docs, first files,
 * skills and checks each one recommends), the fallback profile, the specialised tools a
 * task can match on its own, where the lessons table lives, the core product surfaces the
 * index calls out, and where the repo-local skills live.
 */

/** Where the canonical repo-local skills live. `.codex/skills/` is generated from it (`bun run skills:sync`). */
export const SKILLS_DIRECTORY = ".claude/skills";

/**
 * The topic → lessons-file table the router reads instead of keeping its own copy.
 * CLAUDE.md's "Read before you touch" table is the one list; a row added there is routed
 * here with no second edit. `tests/agentWorkflow.test.ts` fails if the table stops parsing.
 */
export const LESSONS_TABLE = { file: "CLAUDE.md", heading: "## Read before you touch" };

/**
 * Commands a task can need whatever profile it lands in: the advisory audits, censuses
 * and regeneration steps that no gate runs and no profile's checks list names.
 *
 * A keyword is a phrase; it matches when every word in it appears in the task, after
 * plural and -ed/-ing endings are dropped ("telemetry stream" matches "telemetry streams").
 */
export const TOOL_HINTS = [
  {
    id: "near-duplicates",
    keywords: ["duplicate helper", "duplicate function", "duplicate code", "near duplicate", "same helper", "said twice"],
    command: "bun run audit:near-duplicates",
    why: "Cross-file function pairs at cosine >=0.93; `-- --copy` does reader sentences. Needs a local Ollama with embeddinggemma-2:740m.",
  },
  {
    id: "telemetry-streams",
    keywords: ["telemetry", "analytics engine"],
    command: "bun run telemetry:streams",
    why: "Rows per Analytics Engine stream with each stream's consumer; a stream at zero is dead code or a broken emitter.",
  },
  {
    id: "brief-golden",
    keywords: ["brief format", "format string", "share format", "export format", "brief golden"],
    command: "WHETHER_UPDATE_BRIEF_GOLDEN=1 bun run test tests/briefFormatsPinned.test.ts",
    why: "Every share format is pinned; regenerate the golden in the commit that means to move a string.",
  },
  {
    id: "og-fonts",
    keywords: ["og font", "satori font", "share card font"],
    command: "node scripts/generate-og-fonts.mjs",
    why: "Rebuilds the static TTFs in public/fonts/og/ that the OG routes load. Needs python3 with fonttools.",
  },
  {
    id: "unchecked-access",
    keywords: ["unchecked index", "indexed access", "nouncheckedindexedaccess", "unchecked access"],
    command: "bun run check:unchecked-access",
    why: "Per-file count of indexing the flag would reject; the baseline only falls.",
  },
  {
    id: "production-edge",
    keywords: ["403", "waf", "production edge", "cloudflare challenge"],
    command: "bun run check:production-edge",
    why: "Names a Cloudflare challenge, a 403 or a DNS failure on production / and /api/health.",
  },
  {
    id: "production-assets",
    keywords: ["production asset", "deployed asset", "favicon", "asset 404"],
    command: "bun run check:production-assets",
    why: "Probes every static asset, font and OG route on production for status and content type.",
  },
  {
    id: "jev-copy",
    keywords: ["copy audit", "reader copy", "jev"],
    command: "bun run audit:jev-copy",
    why: "Asks the copy audit's four questions of every reader-route sentence. Needs a running server and Workers AI credentials.",
  },
  {
    id: "cold-reader",
    keywords: ["cold reader", "first visit", "first time reader", "comprehension"],
    command: "bun run eval:cold-reader",
    why: "A resident local model reads a page cold; its answers are checked against the agent state.",
  },
  {
    id: "frames",
    keywords: ["frame audit", "screen height", "running head"],
    command: "bun run ui:frames",
    why: "Every screen-height frame of each live route at a laptop and a phone, checked for the site, date and conditions.",
  },
  {
    id: "landmarks",
    keywords: ["landmark", "skip link"],
    command: "bun run check:landmarks",
    why: "Boots a server and checks every route's skip-link target.",
  },
  {
    id: "dead-exports",
    keywords: ["dead export", "unused export"],
    command: "bun run check:dead-exports",
    why: "Exports nothing references, held at zero; flags modules only a test imports.",
  },
  {
    id: "suppressions",
    keywords: ["suppression", "lint disable", "expect error"],
    command: "bun run check:suppressions",
    why: "Counts the suppressions that could turn another ratchet green without a fix.",
  },
  {
    id: "ui-ratchets",
    keywords: ["ratchet", "touch target", "raw palette"],
    command: "RATCHET_REPORT=1 bun run test tests/uiPrimitiveRatchet.test.ts tests/themeRawPaletteRatchet.test.ts",
    why: "Prints the current counts to write as the next baseline after a migration.",
  },
  {
    id: "reader-vocabulary",
    keywords: ["reader vocabulary", "banned word", "ratcheted word"],
    command: "WHETHER_VOCABULARY_REPORT=1 bun run test tests/readerVocabulary.test.tsx",
    why: "Lists each surface's count of every ratcheted word.",
  },
  {
    id: "curated-freshness",
    keywords: ["curated series", "hand curated", "curated freshness"],
    command: "bun run check:curated-freshness",
    why: "Ages the hand-curated macro series against their freshness SLA (warn-only).",
  },
  {
    id: "refresh-fallbacks",
    keywords: ["fallback snapshot", "refresh fallback"],
    command: "bun run data:refresh-fallbacks",
    why: "Fetches the live upstreams and rewrites the checked-in snapshots under data/.",
  },
  {
    id: "page-load",
    keywords: ["page load", "load time", "ttfb"],
    command: "python3 scripts/perf/audit_page_load_times.py",
    why: "curl timings for production routes, printed as JSON. Seven of its eight URLs now redirect, so update its URL list first.",
  },
  {
    id: "ledger-token",
    keywords: ["ledger token", "client token"],
    command: "WHETHER_LEDGER_SECRET=<secret> bun scripts/issue-ledger-token.ts <client-id>",
    why: "Mints the x-whether-client-token an integrator sends for verified ledger writes.",
  },
];

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
    skills: ["agent-skill-architect", "subagent-handoff", "system-skill-router"],
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
    skills: ["pr-hygiene"],
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
    skills: ["whether-ui-loop", "whether-ui-standards"],
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
    skills: ["signal-provenance-audit"],
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
    skills: [],
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
    skills: ["whether-ui-standards", "whether-ui-loop"],
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
    skills: ["feature-audit"],
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
    skills: ["pr-hygiene"],
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
    // Where the work lands, for a task too general to name its own first file.
    "docs/agents/hot-files.md",
  ],
  targets: [
    "app/",
    "lib/",
    "tests/",
  ],
  skills: [],
  checks: [
    "bun run lint",
    "bun run test",
  ],
};
