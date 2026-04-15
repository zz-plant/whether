export type TaskProfile = {
  id: string;
  label: string;
  rationale: string;
  docs: string[];
  targets: string[];
  checks: string[];
  matchedKeywords?: string[];
  score?: number;
  task?: string;
  source?: string;
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

export type FetchLikeResponse = {
  ok: boolean;
  status?: number;
  json(): Promise<unknown>;
};

export type FetchLike = (
  input: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    signal?: AbortSignal;
    body?: string;
  },
) => Promise<FetchLikeResponse>;

export function buildCompactIndexSummary(index: RepoIndex): {
  counts: RepoIndex["fileMap"]["counts"];
  agentGuides: string[];
  skills: string[];
  testsSample: string[];
  taskProfiles: Array<{
    id: string;
    label: string;
    docs: string[];
    targets: string[];
  }>;
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
  route: TaskProfile;
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
  route: TaskProfile;
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

export function buildPrewarmReport(args?: {
  repoRoot?: string;
  outDir?: string;
  skipIndex?: boolean;
  modelRole?: string;
  commandRunner?: (command: string, args: string[], cwd: string) => string;
  commandProbe?: (command: string) => boolean;
}): {
  repoRoot: string;
  commands: {
    lms: boolean;
    ensureModel: boolean;
  };
  lmStudio: {
    running: boolean;
    port: number | null;
    raw: unknown;
  };
  modelWarm: {
    attempted: boolean;
    role: string;
    ok: boolean;
    output: string;
  };
  index:
    | {
        generated: false;
        reason: string;
      }
    | {
        generated: true;
        outputDirectory: string;
        paths: RepoIndexPaths;
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

export function readRepoIndex(args?: {
  repoRoot?: string;
  outDir?: string;
}):
  | {
      outputDirectory: string;
      paths: RepoIndexPaths;
      index: RepoIndex;
    }
  | null;

export function classifyTask(task: string): TaskProfile;

export function classifyTaskWithLocalModel(args?: {
  task?: string;
  repoRoot?: string;
  fetchImpl?: FetchLike;
  baseUrl?: string;
  model?: string;
  timeoutMs?: number;
  outDir?: string;
  refreshIndex?: boolean;
}): Promise<{
  route: TaskProfile;
  mode: "fallback" | "local-model";
  fallbackReason?: string;
  indexPath?: string;
  model?: string;
  baseUrl?: string;
}>;
