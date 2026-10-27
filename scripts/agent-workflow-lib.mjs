/**
 * The engine behind `scripts/agent-workflow.mjs`: keyword routing, the doctor report,
 * handoff packets and the repo index. What it knows about this repository — the task
 * profiles, the tool hints, where the lessons table and the skills live, the core
 * surfaces — is `scripts/agent-workflow.config.mjs`.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  CORE_SURFACES,
  DEFAULT_PROFILE,
  LESSONS_TABLE,
  SKILLS_DIRECTORY,
  TASK_PROFILES,
  TOOL_HINTS,
} from "./agent-workflow.config.mjs";
import { execOutput, execText, parseGitStatus } from "./exec.mjs";
import { walkFiles } from "./walk-files.mjs";

/** The checkout this library sits in: where the lessons table is read when no root is given. */
const LIBRARY_REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Explicit so the order is code-unit order on every runtime, not the default's string coercion.
const byCodeUnit = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

const ROOT_AGENTS = "AGENTS.md";
const ARTIFACTS_AGENT_DIR = path.join("artifacts", "agent");
const INDEX_FILENAMES = {
  fileMap: "file-map.json",
  skillsMap: "skills-map.json",
  testMap: "test-map.json",
};
const SKIP_DIRECTORIES = new Set([
  ".git",
  ".next",
  ".wrangler",
  "artifacts",
  "dist",
  "node_modules",
  "out",
  // `.claude/worktrees/*` are gitignored full checkouts made for parallel agent sessions;
  // indexing them counted every file and nested AGENTS.md once per worktree.
  "worktrees",
]);

/** `.claude/skills/<name>/SKILL.md`, as a repo-relative path prefix. */
const SKILLS_PREFIX = `${SKILLS_DIRECTORY}/`;

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

function listTaskProfiles() {
  return TASK_PROFILES.map((profile) => ({
    id: profile.id,
    label: profile.label,
    rationale: profile.rationale,
    docs: profile.docs,
    targets: profile.targets,
    skills: profile.skills,
    checks: profile.checks,
  }));
}

// Words a topic phrase carries for grammar, not meaning: "a retry" asks only for "retry".
const PHRASE_STOPWORDS = new Set(["a", "an", "the", "any", "anything", "of", "or", "and", "to", "in", "on", "for", "with", "this", "that", "is", "it"]);

/** Drops plural and -ed/-ing endings, so "streams", "stream" and "streaming" compare equal. */
function stem(word) {
  let stemmed = word;
  if (stemmed.length > 4 && stemmed.endsWith("ies")) stemmed = `${stemmed.slice(0, -3)}y`;
  else if (stemmed.length > 3 && stemmed.endsWith("s") && !stemmed.endsWith("ss")) stemmed = stemmed.slice(0, -1);
  if (stemmed.length > 4 && stemmed.endsWith("ed")) stemmed = stemmed.slice(0, -2);
  else if (stemmed.length > 5 && stemmed.endsWith("ing")) stemmed = stemmed.slice(0, -3);
  if (stemmed.length > 3 && stemmed.endsWith("e")) stemmed = stemmed.slice(0, -1);
  return stemmed;
}

const splitWords = (text) => normalizeText(text).split(/[^a-z0-9]+/).filter(Boolean);

/**
 * The word sets a phrase matches, one per alternative. A backticked path is named by its
 * last segment (`lib/runtime/` by "runtime"); a slash between words is a choice
 * ("email/Slack send" is "email send" or "slack send").
 */
function phraseAlternatives(phrase) {
  const trimmed = phrase.trim();
  const codePath = /^`([^`]+)`$/.exec(trimmed);
  if (codePath) {
    const segment = codePath[1].split("/").filter(Boolean).at(-1) ?? "";
    const name = segment.replace(/\.[a-z]+$/i, "").toLowerCase();
    return name ? [[stem(name)]] : [];
  }

  const words = normalizeText(trimmed).split(/\s+/).filter(Boolean);
  const choiceIndex = words.findIndex((word) => word.includes("/"));
  const variants = choiceIndex === -1
    ? [words]
    : words[choiceIndex].split("/").filter(Boolean).map((choice) => words.with(choiceIndex, choice));
  return variants
    .map((variant) => splitWords(variant.join(" ")).filter((word) => !PHRASE_STOPWORDS.has(word)).map(stem))
    .filter((required) => required.length > 0);
}

const phraseMatches = (taskWords, phrase) =>
  phraseAlternatives(phrase).some((required) => required.every((word) => taskWords.has(word)));

/** Splits a table cell on commas, keeping a quoted phrase ("green here, red there") whole. */
function splitTopics(cell) {
  const topics = [];
  let current = "";
  let quoted = false;
  for (const character of cell) {
    if (character === '"') quoted = !quoted;
    if (character === "," && !quoted) {
      topics.push(current);
      current = "";
    } else {
      current += character;
    }
  }
  topics.push(current);
  return topics.map((topic) => topic.replace(/"/g, "").trim()).filter(Boolean);
}

/**
 * The rows of CLAUDE.md's "Read before you touch" table: each row's topics and the file it
 * links. Empty when the file or the heading is missing; the router then names no lessons.
 */
function readLessonsTable(repoRoot) {
  let text;
  try {
    text = fs.readFileSync(path.join(repoRoot, LESSONS_TABLE.file), "utf8");
  } catch {
    return [];
  }

  const lines = text.split("\n");
  const start = lines.findIndex((line) => line.startsWith(LESSONS_TABLE.heading));
  if (start === -1) return [];

  const rows = [];
  for (const line of lines.slice(start + 1)) {
    if (line.startsWith("#")) break;
    if (!line.startsWith("|")) continue;
    const [topics = "", read = ""] = line.split("|").slice(1, -1).map((cell) => cell.trim());
    const file = /\]\(([^)\s]+)\)/.exec(read)?.[1];
    if (file) rows.push({ topics: splitTopics(topics), file });
  }
  return rows;
}

function matchLessons(task, repoRoot) {
  const taskWords = new Set(splitWords(task).map(stem));
  return unique(
    readLessonsTable(repoRoot)
      .filter((row) => row.topics.some((topic) => phraseMatches(taskWords, topic)))
      .map((row) => row.file),
  );
}

function matchTools(task) {
  const taskWords = new Set(splitWords(task).map(stem));
  return TOOL_HINTS.filter((hint) => hint.keywords.some((keyword) => phraseMatches(taskWords, keyword))).map(
    ({ id, command, why }) => ({ id, command, why }),
  );
}

export function classifyTask(task, { repoRoot = LIBRARY_REPO_ROOT } = {}) {
  const normalizedTask = normalizeText(task);

  if (!normalizedTask) {
    return {
      ...DEFAULT_PROFILE,
      matchedKeywords: [],
      score: 0,
      task: "",
      source: "keyword-router",
      lessons: [],
      tools: [],
    };
  }

  const lessons = matchLessons(task, repoRoot);
  const tools = matchTools(task);

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
      source: "keyword-router",
      lessons,
      tools,
    };
  }

  return {
    id: winner.profile.id,
    label: winner.profile.label,
    rationale: winner.profile.rationale,
    docs: winner.profile.docs,
    targets: winner.profile.targets,
    skills: winner.profile.skills,
    checks: winner.profile.checks,
    matchedKeywords: winner.matchedKeywords,
    score: winner.score,
    task,
    source: "keyword-router",
    lessons,
    tools,
  };
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

function findRelevantAgentFiles(repoRoot, inputPaths = []) {
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

  return [...discovered].sort(byCodeUnit);
}

export function buildDoctorReport({
  repoRoot,
  task = "",
  inputPaths = [],
} = {}) {
  const cwd = repoRoot ? path.resolve(repoRoot) : process.cwd();
  const branch = safeShell(() => execText("git", ["rev-parse", "--abbrev-ref", "HEAD"], cwd), "unknown");
  // Untrimmed: the first entry's leading space is its status column (see scripts/exec.mjs).
  const statusOutput = safeShell(() => execOutput("git", ["status", "--porcelain"], cwd), "");
  const changedFiles = parseGitStatus(statusOutput).map(({ code, path: file }) => ({ status: code, file: file.trim() }));
  const route = classifyTask(task, { repoRoot: cwd });
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

/*
 * The canonical skills directory, not a runtime mirror. This read `.codex/skills` until
 * 2026-10-06, so the two skills that existed only under `.claude/skills` (whether-ui-loop,
 * whether-ui-standards) could never be resolved for a handoff or appear in the index.
 */
function resolveSkillPath(repoRoot, skillName) {
  if (!skillName) return "";
  const candidate = path.join(repoRoot, SKILLS_DIRECTORY, skillName, "SKILL.md");
  return fs.existsSync(candidate) ? relativeToRepo(repoRoot, candidate) : "";
}

const isSkillFile = (file) => file.startsWith(SKILLS_PREFIX) && file.endsWith("/SKILL.md");

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
  const route = classifyTask(task || job, { repoRoot: cwd });
  const skillPath = resolveSkillPath(cwd, skill);
  const mergedReadAnchors = unique([
    ...readAnchors,
    ...route.docs,
    ...route.lessons,
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

/** Every file in the repo, repo-relative; symlinks are left out, as a `Dirent` walk leaves them. */
function walkRepoFiles(repoRoot) {
  return walkFiles(repoRoot, {
    followSymlinks: false,
    skip: (name, isDirectory) => name.startsWith(".DS_Store") || (isDirectory && SKIP_DIRECTORIES.has(name)),
  }).map((file) => relativeToRepo(repoRoot, file));
}

function categorizeFiles(files) {
  return {
    rootAgents: files.filter((file) => file === "AGENTS.md"),
    nestedAgents: files.filter((file) => file.endsWith("/AGENTS.md")),
    docsAgents: files.filter((file) => file.startsWith("docs/agents/")),
    scripts: files.filter((file) => file.startsWith("scripts/")),
    coreSurfaces: files.filter((file) => CORE_SURFACES.includes(file)),
  };
}

function buildSkillRecords(files) {
  return files
    .filter(isSkillFile)
    .map((file) => ({
      name: file.slice(SKILLS_PREFIX.length).split("/")[0],
      path: file,
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

function buildTestRecords(files) {
  return files
    .filter((file) => file.startsWith("tests/") && /\.(test|spec)\.(c|m)?(t|j)sx?$/.test(file))
    .sort();
}

export function buildRepoIndex({ repoRoot } = {}) {
  const cwd = repoRoot ? path.resolve(repoRoot) : process.cwd();
  const files = walkRepoFiles(cwd).sort(byCodeUnit);

  const fileMap = {
    generatedAt: new Date().toISOString(),
    repoRoot: cwd,
    counts: {
      totalFiles: files.length,
      agentGuides: files.filter((file) => file.endsWith("/AGENTS.md") || file === "AGENTS.md").length,
      scripts: files.filter((file) => file.startsWith("scripts/")).length,
      tests: files.filter((file) => file.startsWith("tests/")).length,
      skills: files.filter(isSkillFile).length,
    },
    categories: categorizeFiles(files),
    taskProfiles: listTaskProfiles(),
    toolHints: TOOL_HINTS,
  };

  const skillsMap = {
    generatedAt: fileMap.generatedAt,
    repoRoot: cwd,
    skills: buildSkillRecords(files),
  };

  const testMap = {
    generatedAt: fileMap.generatedAt,
    repoRoot: cwd,
    tests: buildTestRecords(files),
  };

  return { fileMap, skillsMap, testMap };
}

export function writeRepoIndex({ repoRoot, outDir } = {}) {
  const cwd = repoRoot ? path.resolve(repoRoot) : process.cwd();
  const outputDirectory = outDir ? path.resolve(cwd, outDir) : path.join(cwd, ARTIFACTS_AGENT_DIR);
  const index = buildRepoIndex({ repoRoot: cwd });

  fs.mkdirSync(outputDirectory, { recursive: true });

  const paths = {
    fileMap: path.join(outputDirectory, INDEX_FILENAMES.fileMap),
    skillsMap: path.join(outputDirectory, INDEX_FILENAMES.skillsMap),
    testMap: path.join(outputDirectory, INDEX_FILENAMES.testMap),
  };

  fs.writeFileSync(paths.fileMap, `${JSON.stringify(index.fileMap, null, 2)}\n`);
  fs.writeFileSync(paths.skillsMap, `${JSON.stringify(index.skillsMap, null, 2)}\n`);
  fs.writeFileSync(paths.testMap, `${JSON.stringify(index.testMap, null, 2)}\n`);

  return { outputDirectory, paths, index };
}

export function formatRouteReport(route) {
  const lines = [
    `Task profile: ${route.label} (${route.id})`,
    `Why: ${route.rationale}`,
  ];

  if (route.matchedKeywords?.length) {
    lines.push(`Matched keywords: ${route.matchedKeywords.join(", ")}`);
  }

  const readAnchors = unique([
    ...(route.docs || []),
    ...(route.targets || []).slice(0, 2),
  ]).slice(0, 5);

  if (readAnchors.length > 0) {
    lines.push("", "Read Anchors:");
    for (const anchor of readAnchors) {
      lines.push(`- ${anchor}`);
    }
  }

  if (route.lessons?.length > 0) {
    lines.push("", `Read Before You Touch (${LESSONS_TABLE.file}):`);
    for (const lesson of route.lessons) {
      lines.push(`- ${lesson}`);
    }
  }

  if (route.skills?.length > 0) {
    lines.push("", "Skills:");
    for (const skill of route.skills) {
      lines.push(`- ${skill} (${SKILLS_PREFIX}${skill}/SKILL.md)`);
    }
  }

  if (route.targets?.length > 0) {
    lines.push("", "Work Targets:");
    for (const target of route.targets) {
      lines.push(`- ${target}`);
    }
  }

  if (route.tools?.length > 0) {
    lines.push("", "Specialised Tools:");
    for (const tool of route.tools) {
      lines.push(`- ${tool.command} — ${tool.why}`);
    }
  }

  if (route.checks?.length > 0) {
    lines.push("", "Verification Commands:");
    for (const check of route.checks) {
      lines.push(`- ${check}`);
    }
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

export function formatIndexReport(report) {
  const lines = [
    `Repo index written to: ${report.outputDirectory}`,
    `- file map: ${report.paths.fileMap}`,
    `- skills map: ${report.paths.skillsMap}`,
    `- test map: ${report.paths.testMap}`,
    "",
    "Counts:",
    `- total files: ${report.index.fileMap.counts.totalFiles}`,
    `- agent guides: ${report.index.fileMap.counts.agentGuides}`,
    `- scripts: ${report.index.fileMap.counts.scripts}`,
    `- tests: ${report.index.fileMap.counts.tests}`,
    `- skills: ${report.index.fileMap.counts.skills}`,
  ];

  return lines.join("\n");
}

