export type TestRunPlan = {
  changed: string[];
  tests: string[];
  full: boolean;
  reason: string;
};

export function listCodeFiles(repoRoot: string): string[];

export function resolveSpecifier(repoRoot: string, fromFile: string, specifier: string): string;

export function extractSpecifiers(text: string): string[];

export function buildImportGraph(args?: {
  repoRoot: string;
  files?: string[];
}): Map<string, string[]>;

export function testsForChangedFiles(args?: {
  repoRoot: string;
  changedFiles: string[];
  graph?: Map<string, string[]>;
  allTests?: string[];
  depth?: number;
}): string[];

export function sourceToTestsMap(args?: {
  graph: Map<string, string[]>;
  allTests?: string[];
}): Map<string, string[]>;

export function resolveChangedFiles(args?: {
  repoRoot: string;
  base?: string;
}): string[] | null;

export function expandChangedPaths(repoRoot: string, changedFiles: string[]): string[];

export function planTestRun(args?: {
  repoRoot: string;
  base?: string;
  changedFiles?: string[];
  depth?: number;
}): TestRunPlan;
