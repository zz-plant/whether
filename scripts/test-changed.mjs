#!/usr/bin/env node
/**
 * Runs the test files that own the files you changed.
 *
 * The suite is ~35s across 497 files; a single file is ~0.5s. Most edits touch one or two
 * modules, so the useful question is "which tests import this?" — answered here from the
 * import graph, including one hop through a source module (a changed component is often
 * imported by a route, and the route by its test).
 *
 * Usage:
 *   bun run test:changed                 # vs HEAD (staged, unstaged and untracked)
 *   bun run test:changed -- --base main  # vs the merge-base with main
 *   bun run test:changed -- --path lib/report/homeBriefModel.ts   # name the files
 *   bun run test:changed -- --deep       # also tests one hop away (wider, safer)
 *   bun run test:changed -- --list       # print the files, run nothing
 *   bun run test:changed -- --full       # run the whole suite
 *   bun run test:changed -- --json       # print the plan for a tool to read
 *
 * A changed global file (package.json, the runner itself, tsconfig) runs the full suite:
 * the import graph cannot tell what those affect. A change with no owning test says so
 * and exits 0; it does not pretend the suite passed.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { execOutput } from "./exec.mjs";
import { walkFiles } from "./walk-files.mjs";

const SOURCE_ROOTS = ["app", "lib", "worker", "scripts", "tests"];
const CODE_EXTENSIONS = [".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"];
const RESOLVE_SUFFIXES = ["", ...CODE_EXTENSIONS, ...CODE_EXTENSIONS.map((extension) => `/index${extension}`)];
const TEST_FILE_PATTERN = /\.(test|spec)\.(c|m)?(t|j)sx?$/;

/** Names too generic for a filename match to mean anything. */
const GENERIC_BASENAMES = new Set(["index", "page", "layout", "route", "types", "utils", "helpers"]);

/**
 * Files whose effect is read at runtime rather than imported: stylesheets, snapshots,
 * content and public assets. The import graph cannot see them, so a change here runs the
 * whole suite instead of reporting "no owning tests".
 */
const UNGRAPHABLE_PATTERNS = [/^app\/styles\//, /^data\//, /^content\//, /^public\//, /\.css$/];

/**
 * Files whose effect the import graph cannot see: configuration the whole suite reads.
 * A change here runs everything rather than a plausible subset.
 */
const GLOBAL_FILES = new Set([
  "package.json",
  "bun.lock",
  "bunfig.toml",
  "tsconfig.json",
  ".oxlintrc.json",
  "scripts/run-tests.mjs",
  "scripts/check-tasks.mjs",
  "scripts/exec.mjs",
  "scripts/walk-files.mjs",
]);

const SPECIFIER_PATTERNS = [
  /\bfrom\s+["']([^"']+)["']/g,
  /\bimport\s*\(\s*["']([^"']+)["']/g,
  /\brequire\s*\(\s*["']([^"']+)["']/g,
  /\bimport\s+["']([^"']+)["']/g,
];

/** One graph per checkout for the life of the process; see buildImportGraph. */
const importGraphCache = new Map();

const toPosix = (file) => file.split(path.sep).join("/");
const byCodeUnit = (left, right) => (left < right ? -1 : left > right ? 1 : 0);
const isTestFile = (file) => TEST_FILE_PATTERN.test(file);
const isInsideRepo = (relativePath) => relativePath !== "" && !relativePath.startsWith("..") && !path.isAbsolute(relativePath);

/** Every source file the graph needs: the roots tests and app code live under. */
export function listCodeFiles(repoRoot) {
  return SOURCE_ROOTS.flatMap((root) => {
    const directory = path.join(repoRoot, root);
    if (!existsSync(directory)) return [];
    return walkFiles(directory, { followSymlinks: false }).map((file) => toPosix(path.relative(repoRoot, file)));
  })
    .filter((file) => CODE_EXTENSIONS.some((extension) => file.endsWith(extension)))
    .sort(byCodeUnit);
}

/** The repo file a relative import names, or "" when it is a package, alias or missing file. */
export function resolveSpecifier(repoRoot, fromFile, specifier) {
  if (!specifier.startsWith(".")) return "";
  const cleaned = specifier.split(/[?#]/)[0];
  const base = path.resolve(repoRoot, path.dirname(fromFile), cleaned);

  for (const suffix of RESOLVE_SUFFIXES) {
    const candidate = `${base}${suffix}`;
    let stats;
    try {
      stats = statSync(candidate);
    } catch {
      continue;
    }
    if (!stats.isFile()) continue;
    const relativePath = toPosix(path.relative(repoRoot, candidate));
    return isInsideRepo(relativePath) ? relativePath : "";
  }
  return "";
}

export function extractSpecifiers(text) {
  const specifiers = new Set();
  for (const pattern of SPECIFIER_PATTERNS) {
    for (const match of text.matchAll(pattern)) {
      if (match[1]) specifiers.add(match[1]);
    }
  }
  return [...specifiers];
}

/** file → the repo files it imports. Only edges inside the repo are kept. */
export function buildImportGraph({ repoRoot, files } = {}) {
  // The graph for a checkout is stable for the life of the process (one CLI run, one test
  // file). Cache the default walk so `agent:index` and repeated route calls do not re-read
  // ~1,500 files; an explicit `files` list is never cached, so temp repos stay correct.
  const cacheable = files === undefined;
  const cacheKey = cacheable ? path.resolve(repoRoot) : "";
  if (cacheable && importGraphCache.has(cacheKey)) return importGraphCache.get(cacheKey);

  const graph = new Map();
  const targets = files ?? listCodeFiles(repoRoot);

  for (const file of targets) {
    let text;
    try {
      text = readFileSync(path.join(repoRoot, file), "utf8");
    } catch {
      continue;
    }

    const imports = new Set();
    for (const specifier of extractSpecifiers(text)) {
      const resolved = resolveSpecifier(repoRoot, file, specifier);
      if (resolved) imports.add(resolved);
    }
    graph.set(file, [...imports]);
  }

  if (cacheable) importGraphCache.set(cacheKey, graph);
  return graph;
}

function reverseGraph(graph) {
  const reverse = new Map();
  for (const [file, imports] of graph) {
    for (const imported of imports) {
      const importers = reverse.get(imported) ?? [];
      importers.push(file);
      reverse.set(imported, importers);
    }
  }
  return reverse;
}

/** `foo.test.ts` → `foo`; used only as a fallback when the import graph has no edge. */
function testBasename(file) {
  const basename = path.posix.basename(file);
  return basename.replace(TEST_FILE_PATTERN, "");
}

/**
 * source file → the tests that import it, directly or one hop through another module.
 * One pass over the tests, so the index can answer "which tests own this file?" without
 * walking the graph once per source file.
 */
export function sourceToTestsMap({ graph, allTests } = {}) {
  const tests = allTests ?? [...graph.keys()].filter(isTestFile);
  const owners = new Map();
  const add = (source, test) => {
    const list = owners.get(source) ?? [];
    if (!list.includes(test)) list.push(test);
    owners.set(source, list);
  };

  for (const test of tests) {
    for (const imported of graph.get(test) ?? []) {
      add(imported, test);
      for (const second of graph.get(imported) ?? []) add(second, test);
    }
  }

  for (const list of owners.values()) list.sort(byCodeUnit);
  return owners;
}

/**
 * The test files that own `changedFiles`: direct importers, one hop through a source
 * module, changed test files themselves, and a filename match as a fallback.
 */
export function testsForChangedFiles({ repoRoot, changedFiles, graph, allTests, depth = 1 } = {}) {
  const normalized = [...new Set(changedFiles.map((file) => toPosix(file).replace(/^\.\//, "")))];
  const importGraph = graph ?? buildImportGraph({ repoRoot });
  const tests = allTests ?? [...importGraph.keys()].filter(isTestFile);
  const testSet = new Set(tests);
  const reverse = reverseGraph(importGraph);
  const selected = new Set();

  const importersOf = (file) => reverse.get(file) ?? [];

  for (const changed of normalized) {
    if (testSet.has(changed)) selected.add(changed);

    for (const importer of importersOf(changed)) {
      if (testSet.has(importer)) {
        selected.add(importer);
        continue;
      }
      if (depth < 1) continue;
      // One hop: a changed component is imported by a route, and the route by its test.
      for (const second of importersOf(importer)) {
        if (testSet.has(second)) selected.add(second);
      }
    }

    const basename = path.posix.basename(changed).replace(/\.[^.]+$/, "");
    if (GENERIC_BASENAMES.has(basename) || basename.length < 4) continue;
    for (const test of tests) {
      if (testBasename(test) === basename || testBasename(test).startsWith(`${basename}.`) || testBasename(test).startsWith(`${basename}-`)) {
        selected.add(test);
      }
    }
  }

  return [...selected].sort(byCodeUnit);
}

/** A named directory expands to the files under it; a file stays itself. */
export function expandChangedPaths(repoRoot, changedFiles) {
  const expanded = [];
  for (const file of changedFiles) {
    const absolute = path.resolve(repoRoot, file);
    let stats;
    try {
      stats = statSync(absolute);
    } catch {
      expanded.push(file);
      continue;
    }
    if (!stats.isDirectory()) {
      expanded.push(file);
      continue;
    }
    for (const entry of walkFiles(absolute, { followSymlinks: false })) {
      expanded.push(toPosix(path.relative(repoRoot, entry)));
    }
  }
  return [...new Set(expanded)].sort(byCodeUnit);
}

/** The changed files, from git: tracked drift against `base` plus untracked files. */
export function resolveChangedFiles({ repoRoot, base = "HEAD" } = {}) {
  const split = (output) => output.split("\0").map((entry) => entry.trim()).filter(Boolean);
  try {
    const tracked = split(execOutput("git", ["diff", "--name-only", "--diff-filter=ACMR", "-z", base], repoRoot));
    const untracked = split(execOutput("git", ["ls-files", "--others", "--exclude-standard", "-z"], repoRoot));
    return [...new Set([...tracked, ...untracked])].sort(byCodeUnit);
  } catch {
    return null;
  }
}

/** What to run for a set of changed files: the selected tests, or the whole suite and why. */
export function planTestRun({ repoRoot, base = "HEAD", changedFiles, depth = 0 } = {}) {
  const reported = changedFiles ?? resolveChangedFiles({ repoRoot, base });
  if (reported === null) {
    return { changed: [], tests: [], full: true, reason: "git could not report the changed files" };
  }
  const changed = expandChangedPaths(repoRoot, reported);
  if (changed.length === 0) {
    return { changed, tests: [], full: false, reason: "no changed files" };
  }

  const globalFile = changed.find((file) => GLOBAL_FILES.has(file));
  if (globalFile) {
    return { changed, tests: [], full: true, reason: `${globalFile} affects the whole suite` };
  }

  const ungraphable = changed.find((file) => UNGRAPHABLE_PATTERNS.some((pattern) => pattern.test(file)));
  if (ungraphable) {
    return { changed, tests: [], full: true, reason: `${ungraphable} is read at runtime, not imported` };
  }

  const graph = buildImportGraph({ repoRoot });
  const tests = testsForChangedFiles({ repoRoot, changedFiles: changed, graph, depth });
  return {
    changed,
    tests,
    full: false,
    reason: tests.length > 0 ? `${tests.length} test file(s) own the change` : "no test imports these files",
  };
}

function parseArgs(argv) {
  const options = { base: "HEAD", list: false, json: false, full: false, deep: false, paths: [], passthrough: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--") {
      options.passthrough = argv.slice(index + 1);
      break;
    }
    if (arg === "--base") {
      options.base = argv[index + 1] ?? options.base;
      index += 1;
    } else if (arg.startsWith("--base=")) {
      options.base = arg.slice("--base=".length);
    } else if (arg === "--path" || arg === "--paths") {
      const value = argv[index + 1] ?? "";
      options.paths.push(...value.split(",").map((entry) => entry.trim()).filter(Boolean));
      index += 1;
    } else if (arg.startsWith("--path=")) {
      options.paths.push(arg.slice("--path=".length));
    } else if (arg === "--list") {
      options.list = true;
    } else if (arg === "--json") {
      options.json = true;
    } else if (arg === "--full") {
      options.full = true;
    } else if (arg === "--deep") {
      options.deep = true;
    } else {
      options.passthrough.push(arg);
    }
  }
  return options;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const repoRoot = process.cwd();
  const plan = planTestRun({
    repoRoot,
    base: options.base,
    changedFiles: options.paths.length > 0 ? options.paths : undefined,
    depth: options.deep ? 1 : 0,
  });

  if (options.json) {
    console.log(JSON.stringify(plan, null, 2));
    return;
  }

  if (options.list) {
    for (const test of plan.tests) console.log(test);
    return;
  }

  if (plan.changed.length === 0) {
    console.log("[test-changed] no changed files; nothing to run.");
    return;
  }

  console.log(`[test-changed] ${plan.changed.length} changed file(s); ${plan.reason}.`);

  if (options.full || plan.full) {
    if (plan.full && !options.full) console.log(`[test-changed] running the full suite: ${plan.reason}.`);
    const result = spawnSync("bun", ["run", "test", ...options.passthrough], { stdio: "inherit" });
    process.exit(result.status ?? 1);
  }

  if (plan.tests.length === 0) {
    console.log("[test-changed] no test imports these files. Run `bun run test` before merging.");
    return;
  }

  console.log(`[test-changed] ${plan.tests.join(" ")}`);
  const result = spawnSync("bun", ["run", "test", ...plan.tests, ...options.passthrough], { stdio: "inherit" });
  process.exit(result.status ?? 1);
}

if (import.meta.main) {
  main();
}
