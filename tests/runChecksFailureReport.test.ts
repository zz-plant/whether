import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, it } from "bun:test";

/*
 * A red build has to be readable from its last screen.
 *
 * Cloudflare's build log viewer keeps a bounded window, and the gate's own
 * output can bury the reason: on a runner whose `bun` prints a line per test,
 * a passing suite alone is ~1,700 lines. A build on 2026-09-15 failed five
 * times in a row and every log anyone could reach showed only passing tests
 * and `exited with code 1` — the `❌` line and the assertion had scrolled out.
 * Whatever the window keeps, it keeps the end, so the end repeats each failure
 * with the lines that name it.
 */
describe("run-checks failure report", () => {
  const REPO_ROOT = process.cwd();
  const roots: string[] = [];

  afterEach(() => {
    for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
  });

  /** A task that buries one failure line in the middle of a long, passing-looking run. */
  const runNoisyFailure = () => {
    const root = mkdtempSync(join(tmpdir(), "run-checks-"));
    roots.push(root);
    const script = join(root, "noisy.mjs");
    writeFileSync(
      script,
      [
        "for (let i = 1; i <= 150; i++) console.log(`(pass) filler ${i}`);",
        'console.log("(fail) tests/buried.test.ts > the assertion that actually failed");',
        "for (let i = 151; i <= 300; i++) console.log(`(pass) filler ${i}`);",
        "process.exit(1);",
      ].join("\n"),
    );

    /* Only the one script the task under test runs; run-checks needs nothing else here. */
    writeFileSync(
      join(root, "package.json"),
      JSON.stringify({ name: "run-checks-fixture", scripts: { "check:suppressions": `node ${script}` } }, null, 2),
    );

    return spawnSync("bun", [join(REPO_ROOT, "scripts/run-checks.mjs"), "suppressions"], {
      cwd: root,
      encoding: "utf8",
    });
  };

  it("repeats the failing task, and the line that named the failure, at the very end", () => {
    const result = runNoisyFailure();

    assert.equal(result.status, 1);
    const trailer = result.stdout.slice(result.stdout.indexOf("check(s) failed"));

    assert.match(trailer, /suppressions failed/, "the end names the failing task");
    assert.match(
      trailer,
      /the assertion that actually failed/,
      "the end carries the failure line, though it sat 150 lines from the end",
    );
    assert.match(trailer, /last \d+ of \d+ lines/, "the end says the output was trimmed");
  });

  /*
   * `engines.bun` is declared and nothing enforces it, so a build image that
   * ships its own `bun` runs this gate on whatever it has. A container failing
   * this gate in September 2026 was printing a line per passing test, which
   * only `bun` 1.1.x does, while the repo pinned 1.3.14 — and no log said so.
   * A mismatch that could explain a failure has to be printed beside it.
   */
  it("names the runtime it ran on, beside the failure", () => {
    const result = runNoisyFailure();
    const trailer = result.stdout.slice(result.stdout.indexOf("check(s) failed"));

    assert.match(trailer, /\[run-checks\] ran on bun \d+\.\d+\.\d+/);
  });
});
