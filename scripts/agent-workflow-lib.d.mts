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

export function buildRepoIndex(args?: { repoRoot?: string }): RepoIndex;

export function writeRepoIndex(args?: {
  repoRoot?: string;
  outDir?: string;
}): {
  outputDirectory: string;
  paths: RepoIndexPaths;
  index: RepoIndex;
};

export function classifyTask(task: string): TaskProfile;
