export type TaskProfile = {
  id: string;
  label: string;
  rationale: string;
  docs: string[];
  targets: string[];
  /** Repo-local skill names under `.claude/skills/`. */
  skills: string[];
  checks: string[];
  matchedKeywords?: string[];
  score?: number;
  task?: string;
  source?: string;
};

/** A command from `TOOL_HINTS` that the task's words matched. */
export type ToolHint = {
  id: string;
  command: string;
  why: string;
};

/** A routed task: its profile, plus what the task matched outside it. */
export type TaskRoute = TaskProfile & {
  /** Files CLAUDE.md's "Read before you touch" table links for the task's topics. */
  lessons: string[];
  tools: ToolHint[];
};

export type RepoIndex = {
  fileMap: {
    generatedAt: string;
    repoRoot: string;
    counts: {
      totalFiles: number;
      agentGuides: number;
      scripts: number;
      tests: number;
      skills: number;
    };
    categories: {
      rootAgents: string[];
      nestedAgents: string[];
      docsAgents: string[];
      scripts: string[];
      coreSurfaces: string[];
    };
    taskProfiles: TaskProfile[];
    toolHints: Array<ToolHint & { keywords: string[] }>;
  };
  skillsMap: {
    generatedAt: string;
    repoRoot: string;
    skills: Array<{
      name: string;
      path: string;
    }>;
  };
  testMap: {
    generatedAt: string;
    repoRoot: string;
    tests: string[];
  };
};

export type RepoIndexPaths = {
  fileMap: string;
  skillsMap: string;
  testMap: string;
};

export function buildDoctorReport(args?: {
  repoRoot?: string;
  task?: string;
  inputPaths?: string[];
}): {
  repoRoot: string;
  branch: string;
  clean: boolean;
  changedFiles: Array<{
    status: string;
    file: string;
  }>;
  changedFileCount: number;
  relevantAgentFiles: string[];
  route: TaskRoute;
};

export function buildHandoffPacket(args?: {
  repoRoot?: string;
  task?: string;
  job?: string;
  whyNow?: string;
  doneWhen?: string;
  outOfScope?: string[];
  writeScope?: string[];
  readAnchors?: string[];
  constraints?: string[];
  verification?: string[];
  skill?: string;
}): {
  route: TaskRoute;
  skill: string;
  packet: {
    job: string;
    whyNow: string;
    doneWhen: string;
    outOfScope: string[];
    writeScope: string[];
    readAnchors: string[];
    constraints: string[];
    verification: string[];
    returnContract: string[];
  };
};

export function buildRepoIndex(args?: { repoRoot?: string }): RepoIndex;

export function writeRepoIndex(args?: {
  repoRoot?: string;
  outDir?: string;
}): {
  outputDirectory: string;
  paths: RepoIndexPaths;
  index: RepoIndex;
};

export function classifyTask(task: string, options?: { repoRoot?: string }): TaskRoute;
