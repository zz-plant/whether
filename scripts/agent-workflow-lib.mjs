/**
 * The engine behind `scripts/agent-workflow.mjs`: keyword routing, the doctor report,
 * handoff packets, the repo index and the local-model router. What it knows about this
 * repository — the task profiles, the core surfaces, where the skills live — is
 * `scripts/agent-workflow.config.mjs`.
 */
import fs from "node:fs";
import path from "node:path";

import {
  CORE_SURFACES,
  DEFAULT_PROFILE,
  REPOSITORY_NAME,
  SKILLS_DIRECTORY,
  TASK_PROFILES,
} from "./agent-workflow.config.mjs";
import { execOutput, execText, parseGitStatus } from "./exec.mjs";
import { walkFiles } from "./walk-files.mjs";

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
    checks: profile.checks,
  }));
}

export function classifyTask(task) {
  const normalizedTask = normalizeText(task);

  if (!normalizedTask) {
    return {
      ...DEFAULT_PROFILE,
      matchedKeywords: [],
      score: 0,
      task: "",
      source: "keyword-router",
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
      source: "keyword-router",
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
    source: "keyword-router",
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

export function readRepoIndex({ repoRoot, outDir } = {}) {
  const cwd = repoRoot ? path.resolve(repoRoot) : process.cwd();
  const outputDirectory = outDir ? path.resolve(cwd, outDir) : path.join(cwd, ARTIFACTS_AGENT_DIR);
  const paths = {
    fileMap: path.join(outputDirectory, INDEX_FILENAMES.fileMap),
    skillsMap: path.join(outputDirectory, INDEX_FILENAMES.skillsMap),
    testMap: path.join(outputDirectory, INDEX_FILENAMES.testMap),
  };

  if (!Object.values(paths).every((candidate) => fs.existsSync(candidate))) {
    return null;
  }

  return {
    outputDirectory,
    paths,
    index: {
      fileMap: JSON.parse(fs.readFileSync(paths.fileMap, "utf8")),
      skillsMap: JSON.parse(fs.readFileSync(paths.skillsMap, "utf8")),
      testMap: JSON.parse(fs.readFileSync(paths.testMap, "utf8")),
    },
  };
}

export function buildCompactIndexSummary(index) {
  return {
    counts: index.fileMap.counts,
    agentGuides: [
      ...index.fileMap.categories.rootAgents,
      ...index.fileMap.categories.nestedAgents.slice(0, 8),
      ...index.fileMap.categories.docsAgents.slice(0, 8),
    ],
    skills: index.skillsMap.skills.map((skill) => skill.name),
    testsSample: index.testMap.tests.slice(0, 12),
    taskProfiles: index.fileMap.taskProfiles.map((profile) => ({
      id: profile.id,
      label: profile.label,
      docs: profile.docs,
      targets: profile.targets.slice(0, 3),
    })),
  };
}

function extractFirstJsonObject(text) {
  const candidate = String(text ?? "").trim();
  if (!candidate) return null;

  try {
    return JSON.parse(candidate);
  } catch {
    const match = candidate.match(/\{[\s\S]*\}/);
    if (!match) return null;

    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

function extractProfileSuggestion(content) {
  const normalizedContent = String(content ?? "");
  const parsed = extractFirstJsonObject(normalizedContent);
  if (parsed?.profile_id) {
    return parsed;
  }

  const profileIdMatch = normalizedContent.match(/profile_id["']?\s*[:=]\s*["']?([a-z-]+)["']?/i);
  if (profileIdMatch?.[1]) {
    return {
      profile_id: profileIdMatch[1],
      rationale: normalizedContent.trim(),
    };
  }

  const normalized = normalizedContent;
  for (const profile of [...TASK_PROFILES, DEFAULT_PROFILE]) {
    if (normalized.includes(profile.id) || normalized.toLowerCase().includes(profile.label.toLowerCase())) {
      return {
        profile_id: profile.id,
        rationale: normalized.trim() || profile.rationale,
      };
    }
  }

  return null;
}

function sanitizeLocalRationale(rawRationale, fallbackRationale) {
  const text = String(rawRationale ?? "")
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/profile_id\s*[:=]\s*[a-z-]+/gi, "")
    .replace(/```json|```/gi, "")
    .trim();

  return text || fallbackRationale;
}

function findProfileById(profileId) {
  if (!profileId) return null;
  const matched = TASK_PROFILES.find((profile) => profile.id === profileId);
  return matched ?? (profileId === DEFAULT_PROFILE.id ? DEFAULT_PROFILE : null);
}

export async function classifyTaskWithLocalModel({
  task,
  repoRoot,
  fetchImpl = globalThis.fetch,
  baseUrl = process.env.LMSTUDIO_BASE_URL || "http://localhost:1234/v1",
  model = process.env.LMSTUDIO_FAST_MODEL || "qwen3.5-9b",
  timeoutMs = Number(process.env.LMSTUDIO_ROUTE_TIMEOUT_MS || 4000),
  outDir,
  refreshIndex = false,
} = {}) {
  const fallback = classifyTask(task);

  if (!fetchImpl || !task) {
    return {
      route: fallback,
      mode: "fallback",
      fallbackReason: !task ? "missing-task" : "fetch-unavailable",
    };
  }

  const cached = !refreshIndex ? readRepoIndex({ repoRoot, outDir }) : null;
  const indexBundle = cached ?? writeRepoIndex({ repoRoot, outDir });
  const compactIndex = buildCompactIndexSummary(indexBundle.index);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(`${baseUrl.replace(/\/$/, "")}/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        temperature: 0,
        max_tokens: 48,
        prompt: buildLocalRoutePrompt(task, compactIndex),
      }),
    });

    clearTimeout(timer);

    if (!response.ok) {
      return {
        route: fallback,
        mode: "fallback",
        fallbackReason: `http-${response.status}`,
        indexPath: indexBundle.outputDirectory,
      };
    }

    const payload = await response.json();
    const content = payload?.choices?.[0]?.text
      ?? payload?.choices?.[0]?.message?.content
      ?? payload?.output_text
      ?? "";
    const parsed = extractProfileSuggestion(content);
    const selected = findProfileById(parsed?.profile_id);

    if (!selected) {
      return {
        route: fallback,
        mode: "fallback",
        fallbackReason: "invalid-local-response",
        indexPath: indexBundle.outputDirectory,
      };
    }

    return {
      route: {
        id: selected.id,
        label: selected.label,
        rationale: sanitizeLocalRationale(parsed?.rationale, selected.rationale),
        docs: selected.docs,
        targets: selected.targets,
        checks: selected.checks,
        matchedKeywords: fallback.matchedKeywords,
        score: fallback.score,
        task,
        source: "local-model",
      },
      mode: "local-model",
      model,
      baseUrl,
      indexPath: indexBundle.outputDirectory,
    };
  } catch (error) {
    clearTimeout(timer);
    return {
      route: fallback,
      mode: "fallback",
      fallbackReason: error?.name === "AbortError" ? "timeout" : "request-failed",
      indexPath: indexBundle.outputDirectory,
    };
  }
}

function buildLocalRoutePrompt(task, compactIndex) {
  const profileList = compactIndex.taskProfiles.map((profile) => profile.id).join(", ");
  return [
    `You classify a ${REPOSITORY_NAME} repository task into exactly one known profile.`,
    `Known profiles: ${profileList}.`,
    "Respond with only one line in this format:",
    "profile_id=<known-profile-id>",
    `Task: ${task}`,
  ].join("\n");
}

function commandExists(command) {
  try {
    execText("which", [command], process.cwd());
    return true;
  } catch {
    return false;
  }
}

function parseJsonString(value, fallback = null) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function buildPrewarmReport({
  repoRoot,
  outDir,
  skipIndex = false,
  modelRole = "fast",
  commandRunner = execText,
  commandProbe = commandExists,
} = {}) {
  const cwd = repoRoot ? path.resolve(repoRoot) : process.cwd();
  const commands = {
    lms: commandProbe("lms"),
    ensureModel: commandProbe("lmstudio-ensure-model"),
  };

  const serverStatusRaw = commands.lms
    ? safeShell(() => commandRunner("lms", ["server", "status", "--json", "--quiet"], cwd), "")
    : "";
  const serverStatus = serverStatusRaw ? parseJsonString(serverStatusRaw, null) : null;

  const modelWarm = commands.ensureModel
    ? safeShell(() => commandRunner("lmstudio-ensure-model", [modelRole], cwd), "")
    : "";

  const index = skipIndex ? null : writeRepoIndex({ repoRoot: cwd, outDir });

  return {
    repoRoot: cwd,
    commands,
    lmStudio: {
      running: Boolean(serverStatus?.running),
      port: serverStatus?.port ?? null,
      raw: serverStatus,
    },
    modelWarm: {
      attempted: commands.ensureModel,
      role: modelRole,
      ok: commands.ensureModel ? modelWarm.length > 0 || modelWarm === "" : false,
      output: modelWarm,
    },
    index: skipIndex
      ? { generated: false, reason: "skipped" }
      : {
        generated: true,
        outputDirectory: index.outputDirectory,
        paths: index.paths,
      },
  };
}

export function formatRouteReport(route, meta = {}) {
  const lines = [
    `Task profile: ${route.label} (${route.id})`,
    `Why: ${route.rationale}`,
  ];

  if (meta.mode === "local-model") {
    lines.push(`Route source: local model (${meta.model ?? "unknown"})`);
  } else if (meta.mode === "fallback" && meta.fallbackReason) {
    lines.push(`Route source: keyword fallback (${meta.fallbackReason})`);
  }

  if (meta.indexPath) {
    lines.push(`Repo index: ${meta.indexPath}`);
  }

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

  if (route.targets?.length > 0) {
    lines.push("", "Work Targets:");
    for (const target of route.targets) {
      lines.push(`- ${target}`);
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

export function formatPrewarmReport(report) {
  const lines = [
    `Repo: ${report.repoRoot}`,
    `LM Studio: ${report.lmStudio.running ? `running on port ${report.lmStudio.port}` : "not running"}`,
    `Warm fast model: ${report.modelWarm.attempted ? (report.modelWarm.ok ? "ok" : "failed") : "helper unavailable"}`,
  ];

  if (report.index.generated) {
    lines.push(`Repo index: ${report.index.outputDirectory}`);
  } else {
    lines.push(`Repo index: ${report.index.reason}`);
  }

  return lines.join("\n");
}
