import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  buildImportGraph,
  planTestRun,
  resolveSpecifier,
  testsForChangedFiles,
} from "../scripts/test-changed.mjs";

const write = (root: string, file: string, content: string) => {
  fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
  fs.writeFileSync(path.join(root, file), content);
};

describe("changed-test selection", () => {
  it("resolves a relative import through an extension or an index file", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "whether-test-changed-"));
    try {
      write(root, "lib/report/foo.ts", "export const foo = 1;\n");
      write(root, "lib/report/nested/index.tsx", "export const nested = 1;\n");

      assert.equal(resolveSpecifier(root, "tests/a.test.ts", "../lib/report/foo"), "lib/report/foo.ts");
      assert.equal(resolveSpecifier(root, "tests/a.test.ts", "../lib/report/foo.ts"), "lib/report/foo.ts");
      assert.equal(resolveSpecifier(root, "tests/a.test.ts", "../lib/report/nested"), "lib/report/nested/index.tsx");
      assert.equal(resolveSpecifier(root, "tests/a.test.ts", "react"), "");
      assert.equal(resolveSpecifier(root, "tests/a.test.ts", "../lib/missing"), "");
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("follows one hop from a changed module to the test that renders its importer", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "whether-test-changed-"));
    try {
      write(root, "lib/report/bar.ts", "export const bar = 1;\n");
      write(root, "app/components/Thing.tsx", 'import { bar } from "../../lib/report/bar";\n');
      write(root, "tests/thing.test.tsx", 'import { Thing } from "../app/components/Thing";\n');
      write(root, "tests/unrelated.test.ts", "export const x = 1;\n");

      const graph = buildImportGraph({ repoRoot: root });
      const tests = testsForChangedFiles({ repoRoot: root, changedFiles: ["lib/report/bar.ts"], graph });

      assert.deepEqual(tests, ["tests/thing.test.tsx"]);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("keeps a changed test file and finds a filename match", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "whether-test-changed-"));
    try {
      write(root, "lib/playbook.ts", "export const x = 1;\n");
      write(root, "tests/playbook.test.ts", 'import "../lib/playbook";\n');
      write(root, "tests/other.test.ts", "export const y = 1;\n");

      const graph = buildImportGraph({ repoRoot: root });
      assert.deepEqual(
        testsForChangedFiles({ repoRoot: root, changedFiles: ["tests/other.test.ts"], graph }),
        ["tests/other.test.ts"],
      );
      assert.deepEqual(
        testsForChangedFiles({ repoRoot: root, changedFiles: ["lib/playbook.ts"], graph }),
        ["tests/playbook.test.ts"],
      );
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("reuses the import graph for the same checkout", () => {
    const first = buildImportGraph({ repoRoot: process.cwd() });
    const second = buildImportGraph({ repoRoot: process.cwd() });
    assert.equal(first, second);
  });

  it("selects the real suite's owning tests for a hot module", () => {
    const plan = planTestRun({ repoRoot: process.cwd(), changedFiles: ["lib/report/homeBriefModel.ts"] });

    assert.equal(plan.full, false);
    assert.ok(plan.tests.includes("tests/homeBriefModel.test.ts"));
    assert.ok(plan.tests.length < 100, `selection is too wide (${plan.tests.length} files)`);
  });

  it("runs the full suite for a file the import graph cannot judge", () => {
    const plan = planTestRun({ repoRoot: process.cwd(), changedFiles: ["package.json"] });
    assert.equal(plan.full, true);
    assert.match(plan.reason, /whole suite/);
  });

  it("runs the full suite for a stylesheet, which is read at runtime rather than imported", () => {
    const plan = planTestRun({ repoRoot: process.cwd(), changedFiles: ["app/styles/typography.css"] });
    assert.equal(plan.full, true);
    assert.match(plan.reason, /read at runtime/);
  });

  it("expands a named directory to the files under it", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "whether-test-changed-"));
    try {
      write(root, "lib/foo.ts", "export const x = 1;\n");
      write(root, "tests/foo.test.ts", 'import "../lib/foo";\n');

      const plan = planTestRun({ repoRoot: root, changedFiles: ["lib"] });

      assert.ok(plan.changed.includes("lib/foo.ts"));
      assert.deepEqual(plan.tests, ["tests/foo.test.ts"]);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("runs nothing when nothing changed", () => {
    const plan = planTestRun({ repoRoot: process.cwd(), changedFiles: [] });
    assert.deepEqual(plan.tests, []);
    assert.equal(plan.full, false);
  });

  it("prints the selected files for paths named on the command line", () => {
    const result = spawnSync(
      "bun",
      ["scripts/test-changed.mjs", "--path", "lib/report/homeBriefModel.ts", "--list"],
      { encoding: "utf8" },
    );

    assert.equal(result.status, 0);
    assert.match(result.stdout, /tests\/homeBriefModel\.test\.ts/);
  });
});
