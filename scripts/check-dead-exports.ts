#!/usr/bin/env bun
/**
 * Counts exported declarations that nothing else references, and fails when the
 * count rises above the baseline.
 *
 * On 2026-09-15 a hand sweep found 232 runtime exports and 324 exported types
 * under `app/`, `lib/` and `worker/` that no other file mentioned, plus nine
 * whole modules nothing imported. Nothing in the gate had noticed, because an
 * unused export is not a lint finding, not a type error, and not a failing
 * test: it is dead weight that every reader has to rule out before they can
 * trust the module's surface. The sweep deleted them; this check keeps the
 * number from climbing back.
 *
 * "Referenced" is deliberately cheap: the export's name appears as an
 * identifier in any other scanned file, across every source, config and
 * workflow extension the repo uses. That mostly over-counts — a comment or an
 * unrelated symbol with the same name keeps an export alive — so a reported
 * orphan is nearly always real. It is not a proof: a symbol named only from a
 * file type outside `referenceExtensions`, or reached only through a runtime
 * string, reads as dead. When this check fails on an export you believe is
 * live, say where it is consumed from; that is a gap in the scan, not a
 * verdict. Names the framework and runtime consume by convention
 * (`frameworkExports`) are exempt because the framework is the reference.
 *
 * This file is the mechanism and names nothing about the repository it scans.
 * What it scans — the roots, the extensions, the framework's convention names,
 * the data directories, the baseline — is `deadExportsConfig` in
 * `scripts/census.config.ts`, and lowering the baseline is an edit there that
 * lands with the work that earned it.
 *
 * Usage:
 *   bun run scripts/check-dead-exports.ts
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";

import { deadExportsConfig } from "./census.config";
import { walkFiles } from "./walk-files.mjs";

const REPO_ROOT = join(import.meta.dirname ?? __dirname, "..");

/** What the census measures in one repository. `scripts/census.config.ts` holds this one's. */
export type DeadExportsConfig = {
  /** Exported declarations under these roots are the population being measured. */
  declarationRoots: string[];
  declarationExtensions: string[];
  /** Files whose identifiers count as references to a declaration. */
  referenceRoots: string[];
  referenceExtensions: string[];
  /** Files directly at the repository root that also count as references. */
  rootConfigExtensions: string[];
  /** Reference roots a complete checkout always has; an empty one refuses the scan. */
  requiredReferenceRoots: string[];
  /** Names never read, wherever they sit. */
  ignoredDirectories: string[];
  /** Export names a framework or runtime consumes without importing them. */
  frameworkExports: string[];
  /** Module basenames (no extension) a framework loads by convention. */
  conventionModules: RegExp;
  /** Committed data the product reads, judged by filename. */
  dataRoots: string[];
  dataExtensions: string[];
  /** Where a data file's name counts as a reference to it. */
  dataReferenceRoots: string[];
  dataReferenceExtensions: string[];
  /** Importers that make a module shipped rather than test-only. */
  consumerRoots: string[];
  /** Importers that do not. */
  testRoots: string[];
  baseline: number;
};

const DECLARATION_PATTERN =
  /^export (?:declare )?(?:const|let|function|async function|class|abstract class|enum|type|interface) ([A-Za-z_$][A-Za-z0-9_$]*)/gm;

const IDENTIFIER_PATTERN = /[A-Za-z_$][A-Za-z0-9_$]*/g;

/** The ceiling the CLI enforces. Not a budget: see `baseline` in `scripts/census.config.ts`. */
export const DEAD_EXPORT_BASELINE = deadExportsConfig.baseline;

export type DeadExport = { file: string; name: string; kind: "runtime" | "type" };

/**
 * Guarded for the same reason the walk is: a dangling symlink, or a path that
 * disappears between the `readdirSync` and the stat, must cost one entry rather
 * than crash the whole census.
 */
const isDirectory = (path: string): boolean | null => {
  try {
    return statSync(path).isDirectory();
  } catch {
    return null;
  }
};

const collect = (
  root: string,
  config: DeadExportsConfig,
  roots: string[],
  extensions: string[],
  includeRootConfig: boolean,
  { skipAmbient = false }: { skipAmbient?: boolean } = {},
) => {
  const wanted = new Set(extensions);
  const ignored = new Set(config.ignoredDirectories);
  const skip = (name: string) => ignored.has(name);

  const paths: string[] = [];
  for (const name of roots) {
    for (const path of walkFiles(join(root, name), { skip })) {
      if (wanted.has(extname(path))) paths.push(path);
    }
  }
  if (includeRootConfig) {
    const rootConfig = new Set(config.rootConfigExtensions);
    for (const entry of readdirSync(root)) {
      const path = join(root, entry);
      if (isDirectory(path) === false && rootConfig.has(extname(entry)) && !entry.endsWith(".d.ts")) {
        paths.push(path);
      }
    }
  }
  const files = new Map<string, string>();
  for (const path of paths) {
    if (skipAmbient && path.endsWith(".d.ts")) continue;
    try {
      files.set(relative(root, path), readFileSync(path, "utf8"));
    } catch {
      /* Unreadable here means unscannable, which `assertScanIsPlausible` judges. */
    }
  }
  return files;
};

const countByRoot = (files: Map<string, string>): Map<string, number> => {
  const counts = new Map<string, number>();
  for (const path of files.keys()) {
    const root = path.split(/[\\/]/)[0] ?? "";
    counts.set(root, (counts.get(root) ?? 0) + 1);
  }
  return counts;
};

/**
 * Refuse to answer from a tree this cannot read.
 *
 * Every verdict here is "no other file mentions this name", so a scan that
 * reaches fewer files reports *more* dead exports — a checkout missing
 * `tests/` would condemn hundreds of live exports, and the failure would read
 * as a real finding. This is the same trap the landmark audit records, where a
 * container that reached no route at all would have reported zero violations:
 * an unreadable tree must fail as an unreadable tree, by name, not be scored.
 *
 * Only callers that pass `requireCompleteTree` are judged: the unit tests
 * scaffold two-file trees on purpose, and a partial tree is exactly what they
 * are measuring.
 */
const assertScanIsPlausible = (references: Map<string, string>, config: DeadExportsConfig) => {
  const counts = countByRoot(references);
  const empty = config.requiredReferenceRoots.filter((root) => (counts.get(root) ?? 0) === 0);
  if (empty.length === 0) return;
  throw new Error(
    `[dead-exports] refusing to report: no files found under ${empty.join(", ")}. ` +
      "Every verdict is \"nothing else mentions this name\", so a tree this scan cannot read " +
      "reports live exports as dead. Run it from a complete checkout.",
  );
};

/**
 * Every exported declaration under the declaration roots whose name no other
 * scanned file mentions. Sorted by file then name so the output is stable.
 */
export const censusDeadExports = (
  root = REPO_ROOT,
  {
    requireCompleteTree = false,
    config = deadExportsConfig,
  }: { requireCompleteTree?: boolean; config?: DeadExportsConfig } = {},
): DeadExport[] => {
  const references = collect(root, config, config.referenceRoots, config.referenceExtensions, true);
  if (requireCompleteTree) assertScanIsPlausible(references, config);
  const declarations = collect(root, config, config.declarationRoots, config.declarationExtensions, false, {
    skipAmbient: true,
  });
  const frameworkExports = new Set(config.frameworkExports);

  const identifiersByFile = new Map<string, Set<string>>();
  for (const [path, source] of references) {
    identifiersByFile.set(path, new Set(source.match(IDENTIFIER_PATTERN) ?? []));
  }

  const dead: DeadExport[] = [];
  for (const [path, source] of declarations) {
    for (const match of source.matchAll(DECLARATION_PATTERN)) {
      const name = match[1];
      if (frameworkExports.has(name)) continue;
      let referenced = false;
      for (const [otherPath, identifiers] of identifiersByFile) {
        if (otherPath === path) continue;
        if (identifiers.has(name)) {
          referenced = true;
          break;
        }
      }
      if (referenced) continue;
      const kind = /^export (?:declare )?(?:type|interface)\b/.test(match[0]) ? "type" : "runtime";
      dead.push({ file: path, name, kind });
    }
  }

  return dead.sort((left, right) => left.file.localeCompare(right.file) || left.name.localeCompare(right.name));
};

/**
 * Data files nothing reads.
 *
 * The export census cannot see these: a JSON file declares no exports, so a
 * dataset that every consumer has been deleted from scores zero findings and
 * sits there looking like part of the product. Two were found on 2026-09-16 —
 * `data/concept_conflicts.json`, a which-principle-wins-per-regime mapping whose
 * slugs matched no content that still exists, and `data/cohort_feedback.json`,
 * 31KB of eight named operators over six weeks, feeding a Python analytics
 * script wired to no command, no route and no reader.
 *
 * Matched on the filename with and without its extension, which is how an import
 * names one, so this over-matches rather than under-matches: a file mentioned
 * anywhere at all passes. A reported orphan is therefore close to certain. Which
 * roots count as a mention — and why a test does not — is `dataReferenceRoots`
 * in the config.
 */
export const censusOrphanedDataFiles = (root = REPO_ROOT, config: DeadExportsConfig = deadExportsConfig): string[] => {
  const dataFiles = collect(root, config, config.dataRoots, config.dataExtensions, false);
  if (dataFiles.size === 0) return [];

  const references = collect(root, config, config.dataReferenceRoots, config.dataReferenceExtensions, true);
  const haystack = [...references.values()].join("\n");

  const orphans: string[] = [];
  for (const path of dataFiles.keys()) {
    const fileName = path.slice(path.lastIndexOf("/") + 1);
    const withoutExtension = fileName.slice(0, fileName.lastIndexOf("."));
    if (haystack.includes(fileName) || haystack.includes(withoutExtension)) continue;
    orphans.push(path);
  }

  return orphans.sort();
};

const IMPORT_PATTERN = /(?:from|import)\s*\(?\s*["']((?:\.|\.\.)\/[^"']+)["']/g;

/**
 * Modules only a test imports.
 *
 * The export census cannot catch these, and deliberately: a helper used inside
 * its own module and exported for a test is a legitimate seam, and this repo has
 * two hundred of them. What is not a seam is a whole module that no shipping
 * file imports — a feature built, tested, and reachable by nobody. Four were
 * found that way on 2026-09-16 and nine more on 2026-09-17: an SDK client, a
 * second Slack dispatcher, a sector-overlay model, a ship/wait/kill checklist,
 * a runtime boundary whose config resolution had drifted from the resolvers
 * production actually uses.
 *
 * Judged per module rather than per symbol, which is what makes it precise:
 * `driverDecisionViews.ts` has four exports only its test names and is imported
 * by the homepage, so it is a seam and passes. Who counts as a consumer is
 * `consumerRoots` in the config.
 */
export const censusTestOnlyModules = (root = REPO_ROOT, config: DeadExportsConfig = deadExportsConfig): string[] => {
  const shipped = collect(root, config, config.declarationRoots, config.declarationExtensions, false);
  const consumers = collect(root, config, config.consumerRoots, config.referenceExtensions, true);
  const tests = collect(root, config, config.testRoots, config.referenceExtensions, false);

  /** Every module path an importing file resolves to, relative to the repo root. */
  const importedBy = (files: Map<string, string>): Set<string> => {
    const imported = new Set<string>();
    for (const [path, source] of files) {
      const directory = path.slice(0, path.lastIndexOf("/"));
      for (const match of source.matchAll(IMPORT_PATTERN)) {
        const resolved = join(directory, match[1]).replaceAll("\\", "/");
        const bare = resolved.replace(/\.(ts|tsx|js|jsx)$/, "");
        for (const candidate of [bare, `${bare}/index`]) {
          imported.add(`${candidate}.ts`);
          imported.add(`${candidate}.tsx`);
        }
      }
    }
    return imported;
  };

  const shippedImports = importedBy(consumers);
  const testImports = importedBy(tests);

  const orphans: string[] = [];
  for (const path of shipped.keys()) {
    const base = path.slice(path.lastIndexOf("/") + 1).replace(/\.(ts|tsx)$/, "");
    if (config.conventionModules.test(base)) continue;
    if (shippedImports.has(path)) continue;
    if (testImports.has(path)) orphans.push(path);
  }

  return orphans.sort();
};

const main = () => {
  const config = deadExportsConfig;
  const testOnly = censusTestOnlyModules(REPO_ROOT, config);
  process.stdout.write(`[dead-exports] ${testOnly.length} module(s) imported only by tests\n`);
  if (testOnly.length > 0) {
    for (const file of testOnly) process.stdout.write(`  ${file}\n`);
    process.stdout.write(
      "[dead-exports] FAIL: a module no shipping file imports. Wire it to a surface or delete it — a test is not a consumer.\n",
    );
    process.exit(1);
  }

  const orphanedData = censusOrphanedDataFiles(REPO_ROOT, config);
  process.stdout.write(
    `[dead-exports] ${orphanedData.length} unreferenced data file(s) under ${config.dataRoots.join("/, ")}/\n`,
  );
  if (orphanedData.length > 0) {
    for (const file of orphanedData) process.stdout.write(`  ${file}\n`);
    process.stdout.write(
      "[dead-exports] FAIL: committed data nothing reads. Wire it up or delete it — a dataset no code reads still reads as evidence.\n",
    );
    process.exit(1);
  }

  const dead = censusDeadExports(REPO_ROOT, { requireCompleteTree: true, config });
  const runtime = dead.filter((entry) => entry.kind === "runtime").length;
  const types = dead.length - runtime;

  process.stdout.write(
    `[dead-exports] ${dead.length} unreferenced export(s) (${runtime} runtime, ${types} type); baseline ${DEAD_EXPORT_BASELINE}\n`,
  );

  if (dead.length > DEAD_EXPORT_BASELINE) {
    for (const entry of dead) {
      process.stdout.write(`  ${entry.file}: ${entry.name} (${entry.kind})\n`);
    }
    process.stdout.write(
      "[dead-exports] FAIL: an export nothing references was added. Use it, drop the `export`, or delete it.\n",
    );
    process.exit(1);
  }
};

if (import.meta.main) {
  main();
}
