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
    const stats = statSync(path);
    if (stats.isDirectory()) {
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
      if (statSync(path).isFile() && ROOT_CONFIG_EXTENSIONS.has(extname(entry)) && !entry.endsWith(".d.ts")) {
        paths.push(path);
      }
    }
  }
  const files = new Map<string, string>();
  for (const path of paths) {
    if (skipAmbient && path.endsWith(".d.ts")) continue;
    files.set(relative(root, path), readFileSync(path, "utf8"));
  }
  return files;
};

/**
 * Every exported declaration under the declaration roots whose name no other
 * scanned file mentions. Sorted by file then name so the output is stable.
 */
export const censusDeadExports = (root = REPO_ROOT): DeadExport[] => {
  const references = collect(root, REFERENCE_ROOTS, REFERENCE_EXTENSIONS, true);
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

const main = () => {
  const dead = censusDeadExports();
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
