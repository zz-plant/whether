#!/usr/bin/env bun
/**
 * Counts indexing that assumes its key exists (`arr[i]`, `record[key]`), and fails
 * when the count rises above the baseline.
 *
 * `noUncheckedIndexedAccess` is the one `strict` flag this codebase does not carry,
 * and it is the one this codebase most needs: signal history is 92-day trailing
 * windows keyed by signal id, KV payloads arrive shaped, and archive records are
 * read by date — every one of those indexes can be absent, and without the flag
 * the compiler types the read as present. As of 2026-10-09 the tree carries 714
 * such sites (435 in tests, 169 under lib/, 77 under app/, 33 under scripts/), too
 * many to fix in the same change that turns the flag on. So this census ratchets:
 * the baseline below only falls, a fix of a few sites lands with the edit that
 * lowers the number, and at zero the flag goes into tsconfig.json, this check is
 * deleted, and `typecheck` enforces the rule natively — the census is scaffolding
 * for the gap, not a permanent second opinion.
 *
 * Usage:
 *   bun run scripts/check-unchecked-indexed-access.ts
 */
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CONFIG_PATH = join(tmpdir(), "whether-unchecked-access.tsconfig.json");

/**
 * The current count. Lowering it is an edit to this file that lands with the
 * work that earned it; raising it is a policy change and belongs in its own PR.
 */
export const UNCHECKED_ACCESS_BASELINE = 888;

export type TscDiagnostic = { file: string; code: string; line: number };

/**
 * Parses tsc's `--pretty false` output. Pure, so the test owns it without a
 * compiler run. Non-error lines (notes, timings, everything else) do not count.
 */
export const parseTscErrorLines = (output: string): TscDiagnostic[] => {
  const diagnostics: TscDiagnostic[] = [];
  for (const line of output.split("\n")) {
    const match = /^(.+?)\((\d+),\d+\): (error TS\d+):/.exec(line);
    if (match === null) continue;
    const file = match.at(1);
    const lineNumber = match.at(2);
    const code = match.at(3);
    if (typeof file !== "string" || typeof lineNumber !== "string" || typeof code !== "string") continue;
    diagnostics.push({ file, line: Number(lineNumber), code });
  }
  return diagnostics;
};

/** Runs the repo's own tsc with `noUncheckedIndexedAccess` and parses what it finds. */
export const countUncheckedIndexedAccess = (root = process.cwd()): TscDiagnostic[] => {
  writeFileSync(
    CONFIG_PATH,
    JSON.stringify(
      {
        extends: join(root, "tsconfig.json"),
        compilerOptions: {
          noUncheckedIndexedAccess: true,
          /*
           * An incremental noEmit run skips unchanged files and does not replay
           * their diagnostics, so the second run in a tree would count zero and
           * lie. This census always pays the full pass — ~1.5s — instead.
           */
          incremental: false,
        },
      },
      null,
      2,
    ),
  );

  const result = spawnSync(join(root, "node_modules", ".bin", "tsc"), [
    "--noEmit",
    "--pretty",
    "false",
    "-p",
    CONFIG_PATH,
  ], { cwd: root, encoding: "utf8" });

  return parseTscErrorLines(`${result.stdout ?? ""}${result.stderr ?? ""}`);
};

const main = () => {
  const errors = countUncheckedIndexedAccess();

  process.stdout.write(
    `[unchecked-access] ${errors.length} indexing error(s) under noUncheckedIndexedAccess; baseline ${UNCHECKED_ACCESS_BASELINE}\n`,
  );

  if (errors.length > UNCHECKED_ACCESS_BASELINE) {
    const byFile = new Map<string, number>();
    for (const { file } of errors) byFile.set(file, (byFile.get(file) ?? 0) + 1);
    for (const [file, count] of [...byFile.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)) {
      process.stdout.write(`  ${count} ${file}\n`);
    }
    process.stdout.write(
      "[unchecked-access] FAIL: indexing that assumes its key exists was added. Guard the read, " +
        "fall back, or throw where absence is impossible — and lower the baseline here with your fix.\n",
    );
    process.exit(1);
  }
};

if (import.meta.main) {
  main();
}
