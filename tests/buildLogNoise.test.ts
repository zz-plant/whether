import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, it } from "bun:test";
import { createModuleTableFilter } from "../scripts/cloudflare-run.mjs";

/*
 * A Workers Builds log is a bounded window. On 2026-10-13 the gate's passing output
 * (~1,900 lines, ~700 of them one fallback warning), Vite's chunk tables and Wrangler's
 * module table filled it, and the deploy's own result was cut off. What passes says so
 * in a line; what fails keeps its output.
 */
describe("Wrangler's module table", () => {
  const run = (chunks: string[]) => {
    let printed = "";
    const filter = createModuleTableFilter((text: string) => {
      printed += text;
    });
    for (const chunk of chunks) filter.write(chunk);
    filter.end();
    return printed;
  };

  const TABLE = [
    "Attaching additional modules:",
    "┌──────────┬──────┐",
    "│ Name     │ Type │",
    "├──────────┼──────┤",
    "│ a.js     │ esm  │",
    "├──────────┼──────┤",
    "│ b.wasm   │ wasm │",
    "└──────────┴──────┘",
    "Current Version ID: de266f59-b3d4-4507-97e0-24150149713c",
    "",
  ].join("\n");

  it("prints a count in place of the rows, and every other line as it was", () => {
    const printed = run([TABLE]);
    assert.doesNotMatch(printed, /│/);
    assert.match(printed, /module table hidden: 2 module\(s\) attached/);
    assert.match(printed, /^Attaching additional modules:$/m);
    assert.match(printed, /^Current Version ID: de266f59/m);
  });

  it("reads a table split across chunks mid-line the same way", () => {
    const split = TABLE.match(/[\s\S]{1,7}/g) ?? [];
    assert.equal(run(split), run([TABLE]));
  });
});

describe("run-checks output", () => {
  const REPO_ROOT = process.cwd();
  const roots: string[] = [];

  afterEach(() => {
    for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
  });

  const runTask = (body: string[], env: Record<string, string> = {}) => {
    const root = mkdtempSync(join(tmpdir(), "run-checks-quiet-"));
    roots.push(root);
    const script = join(root, "task.mjs");
    writeFileSync(script, body.join("\n"));
    writeFileSync(
      join(root, "package.json"),
      JSON.stringify({ name: "run-checks-fixture", scripts: { "check:suppressions": `node ${script}` } }),
    );
    return spawnSync("bun", [join(REPO_ROOT, "scripts/run-checks.mjs"), "suppressions"], {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, CHECK_VERBOSE: "", ...env },
    });
  };

  const PASSING = [
    "for (let i = 1; i <= 200; i++) console.log(`(pass) filler ${i}`);",
    'console.log(" 200 pass");',
    'console.log(" 0 fail");',
    "process.exit(0);",
  ];

  it("reduces a passing task to the lines it closes with", () => {
    const { status, stdout } = runTask(PASSING);
    assert.equal(status, 0);
    assert.doesNotMatch(stdout, /filler 100\b/);
    assert.match(stdout, / 200 pass/);
    assert.match(stdout, /earlier line\(s\) hidden; CHECK_VERBOSE=1 prints them/);
  });

  it("prints a passing task whole under CHECK_VERBOSE=1", () => {
    const { stdout } = runTask(PASSING, { CHECK_VERBOSE: "1" });
    assert.match(stdout, /filler 100\b/);
  });

  it("keeps a failing task's output, printing a repeated warning once with its count", () => {
    const { status, stdout } = runTask([
      'for (let i = 0; i < 50; i++) console.log("[families] Ingest error: FRED circuit breaker open");',
      'console.log("(fail) tests/x.test.ts > the real failure");',
      "process.exit(1);",
    ]);
    assert.equal(status, 1);
    const body = stdout.slice(0, stdout.indexOf("check(s) failed"));
    assert.equal(body.match(/FRED circuit breaker open/g)?.length, 1);
    assert.match(body, /×50, later repeats hidden/);
    assert.match(body, /the real failure/);

    const trailer = stdout.slice(stdout.indexOf("check(s) failed"));
    assert.ok((trailer.match(/FRED circuit breaker open/g)?.length ?? 0) <= 1, "the end repeat collapses it too");
    assert.match(trailer, /the real failure/);
  });
});
