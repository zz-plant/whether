import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { spawnSync } from "node:child_process";

const SNAPSHOT_ROOT = ".asset-diff";
const FIRST_BUILD_DIR = join(SNAPSHOT_ROOT, "first");
const SECOND_BUILD_DIR = join(SNAPSHOT_ROOT, "second");
const REPORT_PATH = join("artifacts", "static-asset-diff-metric.json");

const STATIC_ROOTS = [
  ".next/static",
  ".vercel/output/static",
];

const EXCLUDED_SUFFIXES = new Set([
  "_worker.js/build-meta.json",
]);

const run = (cmd, args) => {
  const result = spawnSync(cmd, args, { stdio: "inherit", shell: true, env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" } });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

const hashFile = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");

const walk = (root) => {
  const out = [];
  if (!existsSync(root)) return out;

  const stack = [root];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const fullPath = join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.isFile()) {
        out.push(fullPath);
      }
    }
  }
  return out;
};

const capture = (targetDir) => {
  rmSync(targetDir, { recursive: true, force: true });
  mkdirSync(targetDir, { recursive: true });

  const snapshot = new Map();

  for (const root of STATIC_ROOTS) {
    for (const filePath of walk(root)) {
      const rel = relative(root, filePath);
      if (EXCLUDED_SUFFIXES.has(rel)) continue;
      const key = `${root}/${rel}`;
      snapshot.set(key, hashFile(filePath));
    }
  }

  writeFileSync(join(targetDir, "snapshot.json"), JSON.stringify(Object.fromEntries(snapshot), null, 2));
  return snapshot;
};

const diffSnapshots = (first, second) => {
  const added = [];
  const modified = [];
  const deleted = [];

  for (const [path, hash] of second.entries()) {
    if (!first.has(path)) {
      added.push(path);
      continue;
    }

    if (first.get(path) !== hash) {
      modified.push(path);
    }
  }

  for (const path of first.keys()) {
    if (!second.has(path)) {
      deleted.push(path);
    }
  }

  added.sort();
  modified.sort();
  deleted.sort();

  return {
    added,
    modified,
    deleted,
    totals: {
      added: added.length,
      modified: modified.length,
      deleted: deleted.length,
      changed: added.length + modified.length + deleted.length,
      firstAssetCount: first.size,
      secondAssetCount: second.size,
    },
  };
};

rmSync(SNAPSHOT_ROOT, { recursive: true, force: true });
mkdirSync(SNAPSHOT_ROOT, { recursive: true });
mkdirSync("artifacts", { recursive: true });

rmSync(".next", { recursive: true, force: true });
rmSync(".vercel", { recursive: true, force: true });
run("bun", ["run", "build"]);
const firstSnapshot = capture(FIRST_BUILD_DIR);

rmSync(".next", { recursive: true, force: true });
rmSync(".vercel", { recursive: true, force: true });
run("bun", ["run", "build"]);
const secondSnapshot = capture(SECOND_BUILD_DIR);

const report = diffSnapshots(firstSnapshot, secondSnapshot);
writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));

console.log(`Static asset diff metric: changed=${report.totals.changed} (added=${report.totals.added}, modified=${report.totals.modified}, deleted=${report.totals.deleted})`);
console.log(`Report written to ${REPORT_PATH}`);
