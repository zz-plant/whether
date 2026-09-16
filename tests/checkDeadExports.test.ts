import assert from "node:assert/strict";
import { afterEach, describe, it } from "bun:test";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  censusDeadExports,
  censusOrphanedDataFiles,
  DEAD_EXPORT_BASELINE,
} from "../scripts/check-dead-exports";

const roots: string[] = [];

const scaffold = (files: Record<string, string>) => {
  const root = mkdtempSync(join(tmpdir(), "dead-exports-"));
  roots.push(root);
  for (const [path, source] of Object.entries(files)) {
    mkdirSync(join(root, path, ".."), { recursive: true });
    writeFileSync(join(root, path), source);
  }
  return root;
};

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("dead export census", () => {
  it("reports an export no other file mentions, and only that one", () => {
    const root = scaffold({
      "lib/a.ts": [
        "export const usedElsewhere = 1;",
        "export const usedOnlyHere = 2;",
        "export type Orphan = { x: number };",
        "const twice = usedOnlyHere + 1;",
        "export const alsoUsed = twice;",
      ].join("\n"),
      "lib/b.ts": 'import { usedElsewhere, alsoUsed } from "./a";\nconsole.log(usedElsewhere, alsoUsed);\n',
    });

    const dead = censusDeadExports(root);
    assert.deepEqual(dead, [
      { file: "lib/a.ts", name: "Orphan", kind: "type" },
      { file: "lib/a.ts", name: "usedOnlyHere", kind: "runtime" },
    ]);
  });

  it("counts a test, a script, or the package boundary as a reference", () => {
    const root = scaffold({
      "lib/a.ts": "export const testedOnly = 1;\nexport const scriptedOnly = 2;\nexport const packaged = 3;\n",
      "tests/a.test.ts": 'import { testedOnly } from "../lib/a";\n',
      "scripts/run.ts": 'import { scriptedOnly } from "../lib/a";\n',
      "packages/engine/src/index.ts": 'export { packaged } from "../../../lib/a";\n',
    });

    assert.deepEqual(censusDeadExports(root), []);
  });

  it("exempts the names the framework consumes by convention", () => {
    const root = scaffold({
      "app/page.tsx": "export const metadata = {};\nexport const revalidate = 60;\nexport async function GET() {}\n",
      "worker/index.ts": "export async function scheduled() {}\n",
    });

    assert.deepEqual(censusDeadExports(root), []);
  });

  it("ignores ambient declaration files", () => {
    const root = scaffold({
      "worker/env.d.ts": "export interface Env { KV: unknown }\n",
    });

    assert.deepEqual(censusDeadExports(root), []);
  });

  /*
   * Every verdict here is "no other file mentions this name", so a scan that
   * reaches fewer files reports more dead exports, not fewer. A checkout
   * missing `tests/` would condemn hundreds of live exports and read as a real
   * finding — which is how a container that cannot see the tree turns into a
   * blocked deploy nobody can diagnose. It has to refuse instead.
   */
  it("refuses to report from a tree it cannot read, rather than scoring it", () => {
    const root = scaffold({
      "lib/a.ts": "export const referencedFromTests = 1;\n",
    });

    assert.deepEqual(censusDeadExports(root), [{ file: "lib/a.ts", name: "referencedFromTests", kind: "runtime" }]);
    assert.throws(
      () => censusDeadExports(root, { requireCompleteTree: true }),
      /refusing to report: no files found under app, worker, scripts, tests/,
    );
  });

  /*
   * The repo itself. This is the assertion the gate makes on every push; the
   * test repeats it so a red gate has a failing test naming the export.
   */
  it("holds the repo at its baseline", () => {
    const dead = censusDeadExports(undefined, { requireCompleteTree: true });
    assert.ok(
      dead.length <= DEAD_EXPORT_BASELINE,
      `${dead.length} unreferenced export(s):\n${dead.map((entry) => `  ${entry.file}: ${entry.name}`).join("\n")}`,
    );
  });
});

/*
 * A JSON file declares no exports, so the census above cannot see it: a dataset
 * every consumer was deleted from scores zero findings and goes on looking like
 * part of the product. Two were found that way on 2026-09-16, one of them 31KB
 * of named operators that read as evidence of a pilot that never ran.
 */
describe("orphaned data census", () => {
  it("reports a data file nothing mentions, and passes one an import names", () => {
    const root = scaffold({
      "data/read.json": "[]",
      "data/orphan.json": "[]",
      "lib/reader.ts": [
        'import rows from "../data/read.json";',
        "export const count = rows.length;",
      ].join("\n"),
    });

    assert.deepEqual(censusOrphanedDataFiles(root), ["data/orphan.json"]);
  });

  it("counts a mention without the extension, which is how a loader often names one", () => {
    const root = scaffold({
      "data/by_stem.json": "[]",
      "lib/reader.ts": 'export const file = "by_stem";',
    });

    assert.deepEqual(censusOrphanedDataFiles(root), []);
  });

  /*
   * The rule that makes this scan find anything. With `tests/` counted, the
   * cohort dataset would have passed here the way it passed every other gate:
   * its one reader was the test for a script nothing ran.
   */
  it("does not count a test, unlike the export census beside it", () => {
    const root = scaffold({
      "data/fixture_only.json": "[]",
      "tests/thing.test.ts": 'import rows from "../data/fixture_only.json";\nconsole.log(rows);\n',
    });

    assert.deepEqual(censusOrphanedDataFiles(root), ["data/fixture_only.json"]);
  });

  it("counts a mention from docs, where a data file is often only described", () => {
    const root = scaffold({
      "data/described.json": "[]",
      "docs/notes.md": "The archive lives in data/described.json and fills forward.\n",
    });

    assert.deepEqual(censusOrphanedDataFiles(root), []);
  });
});
