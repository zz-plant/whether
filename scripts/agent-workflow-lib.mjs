import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT_AGENTS = "AGENTS.md";

const TASK_PROFILES = [
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
      ".codex/skills/README.md",
    ],
    targets: [
      "docs/agents/mcp-and-skills-playbook.md",
      "docs/agents/README.md",
      ".codex/skills/README.md",
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
      "app/components/weekly-card/",
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
      "app/components/weeklyDecisionCard.tsx",
      "lib/report/homeBriefModel.ts",
      "lib/report/decisionKnobs.ts",
    ],
    checks: [
      "bun run lint",
      "bun run test tests/homeBriefModel.test.ts",
      "bun run test tests/weeklyDecisionCardDecisionTransmissionContract.test.tsx",
    ],
  },
];

const DEFAULT_PROFILE = {
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

function normalizeText(value) {
  return String(value ?? "").trim().toLowerCase();
}

function countMatches(text, keyword) {
  if (!keyword) return 0;
  const normalizedKeyword = normalizeText(keyword);
  if (!normalizedKeyword) return 0;

  if (normalizedKeyword.includes(" ")) {
    return text.includes(normalizedKeyword) ? 2 : 0;
  }

  return text.includes(normalizedKeyword) ? 1 : 0;
}

export function classifyTask(task) {
  const normalizedTask = normalizeText(task);

  if (!normalizedTask) {
    return {
      ...DEFAULT_PROFILE,
      matchedKeywords: [],
      score: 0,
      task: "",
    };
  }

  const scored = TASK_PROFILES.map((profile) => {
    const matchedKeywords = profile.keywords.filter((keyword) => countMatches(normalizedTask, keyword) > 0);
    const score = matchedKeywords.reduce((total, keyword) => total + countMatches(normalizedTask, keyword), 0);
    return { profile, matchedKeywords, score };
  }).sort((left, right) => right.score - left.score);

  const winner = scored[0];

  if (!winner || winner.score === 0) {
    return {
      ...DEFAULT_PROFILE,
      matchedKeywords: [],
      score: 0,
      task,
    };
  }

  return {
    id: winner.profile.id,
    label: winner.profile.label,
    rationale: winner.profile.rationale,
    docs: winner.profile.docs,
    targets: winner.profile.targets,
    checks: winner.profile.checks,
    matchedKeywords: winner.matchedKeywords,
    score: winner.score,
    task,
  };
}

function shell(command, commandArgs, cwd) {
  return execFileSync(command, commandArgs, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function relativeToRepo(repoRoot, candidatePath) {
  const relativePath = path.relative(repoRoot, candidatePath);
  if (!relativePath || relativePath === "") return ".";
  return relativePath;
}

function isInsideRepo(repoRoot, candidatePath) {
  const relativePath = path.relative(repoRoot, candidatePath);
  return relativePath === "" || (!relativePath.startsWith("..") && !path.isAbsolute(relativePath));
}

function resolveInputPaths(repoRoot, values) {
  return unique(values.flatMap((value) => String(value ?? "").split(",")).map((value) => value.trim()).filter(Boolean)).map((value) => {
    const resolved = path.resolve(repoRoot, value);
    return isInsideRepo(repoRoot, resolved) ? resolved : null;
  }).filter(Boolean);
}

export function findRelevantAgentFiles(repoRoot, inputPaths = []) {
  const resolvedPaths = resolveInputPaths(repoRoot, inputPaths);
  const discovered = new Set();

  const rootAgentsPath = path.join(repoRoot, ROOT_AGENTS);
  if (fs.existsSync(rootAgentsPath)) {
    discovered.add(ROOT_AGENTS);
  }

  for (const resolvedPath of resolvedPaths) {
    let currentDirectory = fs.statSync(resolvedPath, { throwIfNoEntry: false })?.isDirectory()
      ? resolvedPath
      : path.dirname(resolvedPath);

    while (isInsideRepo(repoRoot, currentDirectory)) {
      const candidate = path.join(currentDirectory, ROOT_AGENTS);
      if (fs.existsSync(candidate)) {
        discovered.add(relativeToRepo(repoRoot, candidate));
      }

      if (currentDirectory === repoRoot) break;
      currentDirectory = path.dirname(currentDirectory);
    }
  }

  return [...discovered].sort();
}

function parseGitStatusShort(output) {
  if (!output) return [];

  return output.split("\n").filter(Boolean).map((line) => {
    const status = line.slice(0, 2);
    const file = line.slice(3).trim();
    return { status, file };
  });
}

export function buildDoctorReport({
  repoRoot,
  task = "",
  inputPaths = [],
} = {}) {
  const cwd = repoRoot ? path.resolve(repoRoot) : process.cwd();
  const branch = safeShell(() => shell("git", ["rev-parse", "--abbrev-ref", "HEAD"], cwd), "unknown");
  const statusOutput = safeShell(() => shell("git", ["status", "--short"], cwd), "");
  const changedFiles = parseGitStatusShort(statusOutput);
  const route = classifyTask(task);
  const relevantPaths = inputPaths.length > 0 ? inputPaths : changedFiles.map((entry) => entry.file);
  const agentFiles = findRelevantAgentFiles(cwd, relevantPaths);

  return {
    repoRoot: cwd,
    branch,
    clean: changedFiles.length === 0,
    changedFiles,
    changedFileCount: changedFiles.length,
    relevantAgentFiles: agentFiles,
    route,
  };
}

function safeShell(action, fallback) {
  try {
    return action();
  } catch {
    return fallback;
  }
}

function resolveSkillPath(repoRoot, skillName) {
  if (!skillName) return "";
  const candidate = path.join(repoRoot, ".codex", "skills", skillName, "SKILL.md");
  return fs.existsSync(candidate) ? relativeToRepo(repoRoot, candidate) : "";
}

export function buildHandoffPacket({
  repoRoot,
  task = "",
  job = "",
  whyNow = "",
  doneWhen = "",
  outOfScope = [],
  writeScope = [],
  readAnchors = [],
  constraints = [],
  verification = [],
  skill = "",
} = {}) {
  const cwd = repoRoot ? path.resolve(repoRoot) : process.cwd();
  const route = classifyTask(task || job);
  const skillPath = resolveSkillPath(cwd, skill);
  const mergedReadAnchors = unique([
    ...readAnchors,
    ...route.docs,
    ...route.targets.slice(0, 2),
    skillPath,
  ]);
  const mergedConstraints = unique([
    ...constraints,
    skill ? `Preserve the ${skill} skill contract where applicable.` : "",
  ]);
  const mergedVerification = unique([
    ...verification,
    ...route.checks,
  ]);

  return {
    route,
    skill: skill || "",
    packet: {
      job: job || task || "Describe the exact delegated task.",
      whyNow: whyNow || "Tie this delegated task back to the current user request.",
      doneWhen: doneWhen || "State the observable completion condition.",
      outOfScope: outOfScope.length > 0 ? outOfScope : ["Do not expand scope or redesign adjacent surfaces."],
      writeScope: writeScope.length > 0 ? writeScope : ["Declare the exact files or directories this subagent may edit."],
      readAnchors: mergedReadAnchors,
      constraints: mergedConstraints.length > 0 ? mergedConstraints : ["Follow repo semantics in AGENTS.md and keep the change reviewable."],
      verification: mergedVerification,
      returnContract: [
        "Changed files.",
        "Commands run and outcomes.",
        "Open risks, drift, or follow-ups.",
      ],
    },
  };
}

export function formatRouteReport(route) {
  const lines = [
    `Task profile: ${route.label} (${route.id})`,
    `Why: ${route.rationale}`,
  ];

  if (route.matchedKeywords?.length) {
    lines.push(`Matched keywords: ${route.matchedKeywords.join(", ")}`);
  }

  lines.push("", "Read first:");
  for (const doc of route.docs) {
    lines.push(`- ${doc}`);
  }

  lines.push("", "Start with:");
  for (const target of route.targets) {
    lines.push(`- ${target}`);
  }

  lines.push("", "Minimum verification:");
  for (const check of route.checks) {
    lines.push(`- ${check}`);
  }

  return lines.join("\n");
}

export function formatDoctorReport(report) {
  const lines = [
    `Repo: ${report.repoRoot}`,
    `Branch: ${report.branch}`,
    `Working tree: ${report.clean ? "clean" : `${report.changedFileCount} changed file(s)`}`,
  ];

  if (report.changedFiles.length > 0) {
    lines.push("", "Changed files:");
    for (const entry of report.changedFiles.slice(0, 20)) {
      lines.push(`- ${entry.status} ${entry.file}`);
    }
    if (report.changedFiles.length > 20) {
      lines.push(`- ... ${report.changedFiles.length - 20} more`);
    }
  }

  lines.push("", "Relevant AGENTS.md files:");
  for (const file of report.relevantAgentFiles) {
    lines.push(`- ${file}`);
  }

  lines.push("", formatRouteReport(report.route));
  return lines.join("\n");
}

export function formatHandoffPacket(result) {
  const { packet, route, skill } = result;
  const lines = [`Task profile: ${route.label} (${route.id})`];

  if (skill) {
    lines.push(`Skill: ${skill}`);
  }

  lines.push(
    "",
    "Job",
    `- ${packet.job}`,
    "",
    "Why now",
    `- ${packet.whyNow}`,
    "",
    "Done when",
    `- ${packet.doneWhen}`,
    "",
    "Out of scope",
  );

  for (const item of packet.outOfScope) {
    lines.push(`- ${item}`);
  }

  lines.push("", "Write scope");
  for (const item of packet.writeScope) {
    lines.push(`- ${item}`);
  }

  lines.push("", "Read anchors");
  for (const item of packet.readAnchors) {
    lines.push(`- ${item}`);
  }

  lines.push("", "Constraints");
  for (const item of packet.constraints) {
    lines.push(`- ${item}`);
  }

  lines.push("", "Verification");
  for (const item of packet.verification) {
    lines.push(`- ${item}`);
  }

  lines.push("", "Return contract");
  for (const item of packet.returnContract) {
    lines.push(`- ${item}`);
  }

  return lines.join("\n");
}
