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
 * workflow extension this repo uses. That mostly over-counts — a comment or an
 * unrelated symbol with the same name keeps an export alive — so a reported
 * orphan is nearly always real. It is not a proof: a symbol named only from a
 * file type outside `REFERENCE_EXTENSIONS`, or reached only through a runtime
 * string, reads as dead. When this check fails on an export you believe is
 * live, say where it is consumed from; that is a gap in the scan, not a
 * verdict. Names Next.js and the Workers runtime consume by convention
 * (`metadata`, `GET`, `scheduled`, ...) are exempt because the framework is
 * the reference.
 *
 * Like the suppression census, the baseline is inline: lowering it is an edit
 * to this file that lands with the work that earned it.
 *
 * Usage:
 *   bun run scripts/check-dead-exports.ts
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";

const REPO_ROOT = join(import.meta.dirname ?? __dirname, "..");

/** Exported declarations in these roots are the population being measured. */
const DECLARATION_ROOTS = ["app", "lib", "worker"];
const DECLARATION_EXTENSIONS = new Set([".ts", ".tsx"]);

/**
 * Files whose identifiers count as references. Wider than the declaration
 * roots on purpose: a script, a test, the private decision-engine package or
 * `wrangler.toml` naming a Durable Object class is a real consumer.
 */
const REFERENCE_ROOTS = [...DECLARATION_ROOTS, "scripts", "tests", "packages", ".github"];
/*
 * Wider than the declaration set on purpose. A symbol can be named from a
 * `.jsx` file, an ambient `.d.ts`, a nested `wrangler.toml` naming a Durable
 * Object class, or a workflow YAML — and each one that the scan cannot see
 * turns a live export into a reported orphan.
 */
const REFERENCE_EXTENSIONS = new Set([
  ".ts", ".tsx", ".mts", ".cts", ".js", ".mjs", ".cjs", ".jsx",
  ".json", ".jsonc", ".toml", ".yml", ".yaml",
]);
const ROOT_CONFIG_EXTENSIONS = new Set([".ts", ".js", ".mjs", ".toml", ".jsonc", ".json"]);

const IGNORED_DIRECTORIES = new Set([".next", ".open-next", ".wrangler", "artifacts", "coverage", "dist", "node_modules", "out"]);

/** Names the framework or runtime consumes without importing them. */
const FRAMEWORK_EXPORTS = new Set([
  "metadata",
  "generateMetadata",
  "generateStaticParams",
  "generateViewport",
  "viewport",
  "dynamic",
  "dynamicParams",
  "revalidate",
  "runtime",
  "fetchCache",
  "preferredRegion",
  "maxDuration",
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
  "alt",
  "size",
  "contentType",
  "config",
  "scheduled",
  "fetch",
  "queue",
  "email",
  "tail",
]);

const DECLARATION_PATTERN =
  /^export (?:declare )?(?:const|let|function|async function|class|abstract class|enum|type|interface) ([A-Za-z_$][A-Za-z0-9_$]*)/gm;

const IDENTIFIER_PATTERN = /[A-Za-z_$][A-Za-z0-9_$]*/g;

/**
 * Zero. The sweep that introduced this check left nothing behind, and an
 * export nothing references has no reason to exist, so the baseline is not a
 * budget to spend. Raising it is a policy change and belongs in its own PR.
 */
export const DEAD_EXPORT_BASELINE = 0;

export type DeadExport = { file: string; name: string; kind: "runtime" | "type" };

/**
 * `statSync` throws on a dangling symlink and on a path that disappears between
 * the `readdirSync` and the stat. Neither is hypothetical in a build container,
 * and either one crashed the whole census rather than skipping one entry.
 */
const isDirectory = (path: string): boolean | null => {
  try {
    return statSync(path).isDirectory();
  } catch {
    return null;
  }
};

const walk = (directory: string, extensions: Set<string>, into: string[]) => {
  let entries: string[];
  try {
    entries = readdirSync(directory);
  } catch {
    return;
  }
  for (const entry of entries) {
    if (IGNORED_DIRECTORIES.has(entry)) continue;
    const path = join(directory, entry);
    const directoryEntry = isDirectory(path);
    if (directoryEntry === null) continue;
    if (directoryEntry) {
      walk(path, extensions, into);
    } else if (extensions.has(extname(entry))) {
      into.push(path);
    }
  }
};

const collect = (
  root: string,
  roots: string[],
  extensions: Set<string>,
  includeRootConfig: boolean,
  { skipAmbient = false }: { skipAmbient?: boolean } = {},
) => {
  const paths: string[] = [];
  for (const name of roots) walk(join(root, name), extensions, paths);
  if (includeRootConfig) {
    for (const entry of readdirSync(root)) {
      const path = join(root, entry);
      if (isDirectory(path) === false && ROOT_CONFIG_EXTENSIONS.has(extname(entry)) && !entry.endsWith(".d.ts")) {
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

/**
 * Roots a healthy checkout always has. `packages` and `.github` are excluded:
 * either can be legitimately absent, and a missing one costs precision, not
 * soundness.
 */
const REQUIRED_REFERENCE_ROOTS = [...DECLARATION_ROOTS, "scripts", "tests"];

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
const assertScanIsPlausible = (references: Map<string, string>) => {
  const counts = countByRoot(references);
  const empty = REQUIRED_REFERENCE_ROOTS.filter((root) => (counts.get(root) ?? 0) === 0);
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
  { requireCompleteTree = false }: { requireCompleteTree?: boolean } = {},
): DeadExport[] => {
  const references = collect(root, REFERENCE_ROOTS, REFERENCE_EXTENSIONS, true);
  if (requireCompleteTree) assertScanIsPlausible(references);
  const declarations = collect(root, DECLARATION_ROOTS, DECLARATION_EXTENSIONS, false, { skipAmbient: true });

  const identifiersByFile = new Map<string, Set<string>>();
  for (const [path, source] of references) {
    identifiersByFile.set(path, new Set(source.match(IDENTIFIER_PATTERN) ?? []));
  }

  const dead: DeadExport[] = [];
  for (const [path, source] of declarations) {
    for (const match of source.matchAll(DECLARATION_PATTERN)) {
      const name = match[1];
      if (FRAMEWORK_EXPORTS.has(name)) continue;
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

/** Committed data the product reads. Judged by filename, the way an import names it. */
const DATA_ROOTS = ["data", "content"];
const DATA_EXTENSIONS = new Set([".json", ".csv", ".md", ".txt", ".yaml", ".yml"]);

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
 * anywhere at all passes. A reported orphan is therefore close to certain.
 */
export const censusOrphanedDataFiles = (root = REPO_ROOT): string[] => {
  const dataFiles = collect(root, DATA_ROOTS, DATA_EXTENSIONS, false);
  if (dataFiles.size === 0) return [];

  /* Prose counts here, unlike in the export census: a dataset a runbook or a
     routine names by filename has a consumer, it is just not a compiler. */
  const dataReferenceExtensions = new Set([...REFERENCE_EXTENSIONS, ".md", ".mdx", ".csv", ".txt"]);
  /*
   * And a test does not count, unlike in the export census, which is the whole
   * reason this scan finds anything. `data/` is what the product ships and
   * reads; a file there whose only consumer is a suite is not product data. The
   * cohort dataset was exactly that — its one reader was the test for a script
   * nothing ran — and with `tests/` counted it would have passed this check the
   * same way it passed every other one. A genuine fixture belongs in
   * `tests/fixtures/`, where this scan never looks.
   */
  const dataReferenceRoots = [...REFERENCE_ROOTS.filter((entry) => entry !== "tests"), "docs"];
  const references = collect(root, dataReferenceRoots, dataReferenceExtensions, true);
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

const main = () => {
  const orphanedData = censusOrphanedDataFiles(REPO_ROOT);
  process.stdout.write(`[dead-exports] ${orphanedData.length} unreferenced data file(s) under ${DATA_ROOTS.join("/, ")}/\n`);
  if (orphanedData.length > 0) {
    for (const file of orphanedData) process.stdout.write(`  ${file}\n`);
    process.stdout.write(
      "[dead-exports] FAIL: committed data nothing reads. Wire it up or delete it — a dataset no code reads still reads as evidence.\n",
    );
    process.exit(1);
  }

  const dead = censusDeadExports(REPO_ROOT, { requireCompleteTree: true });
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
