import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { describe, it } from "bun:test";
import { collectFlagArgs, resolveShardCount, shouldQuietAppLogs } from "../scripts/run-tests.mjs";

/**
 * The runner's argument handling. A name filter is not a file filter: every shard still
 * receives files where nothing matches, and bun exits non-zero for a file with no matching
 * test. Before 2026-11-08 that turned the documented `bun run test -t "<name>"` into a red
 * run under the default shard count, and the shard prefix printed `NaN` because the index
 * never reached `spawnShard`.
 */
describe("test runner arguments", () => {
  it("keeps a run with no filter sharded", () => {
    assert.equal(resolveShardCount([], 3), 3);
    assert.equal(resolveShardCount(["--only-failures"], 2), 2);
  });

  it("keeps a path filter in one process", () => {
    assert.equal(resolveShardCount(["tests/homeBriefModel.test.ts"], 3), 1);
    assert.equal(resolveShardCount(["--reporter", "junit", "tests/a.test.ts"], 3), 1);
  });

  it("keeps a name filter in one process", () => {
    assert.equal(resolveShardCount(["-t", "flags the ceilings"], 3), 1);
    assert.equal(resolveShardCount(["--test-name-pattern", "flags the ceilings"], 3), 1);
    assert.equal(resolveShardCount(["--test-name-pattern=flags the ceilings"], 3), 1);
  });

  it("passes a value flag's value to the shard, not only the flag", () => {
    assert.deepEqual(collectFlagArgs(["-t", "flags the ceilings", "tests/a.test.ts"]), ["-t", "flags the ceilings"]);
    assert.deepEqual(collectFlagArgs(["--reporter", "junit", "--reporter-outfile", "out.xml", "tests/a.test.ts"]), [
      "--reporter",
      "junit",
      "--reporter-outfile",
      "out.xml",
    ]);
    assert.deepEqual(collectFlagArgs(["--timeout=5000", "tests/a.test.ts"]), ["--timeout=5000"]);
  });

  /*
   * On 2026-11-09 an unfiltered run printed 740 KB, 95.6% of it three fallback warnings.
   * Across three months of agent sessions, 96% of test runs were piped through `tail` to
   * survive that, and 1,528 of them lost the exit status to the pipe. The run that covers
   * the suite is the one nobody reads line by line, so that is the one that goes quiet.
   */
  it("hides app console output only for a run that covers the suite", () => {
    assert.equal(shouldQuietAppLogs([], {}, false), true);
    assert.equal(shouldQuietAppLogs(["--only-failures"], {}, false), true);
    assert.equal(shouldQuietAppLogs(["tests/homeBriefModel.test.ts"], {}, false), false, "a named file is being read");
    assert.equal(shouldQuietAppLogs(["-t", "flags the ceilings"], {}, false), false, "so is a named test");
    assert.equal(shouldQuietAppLogs([], { WHETHER_TEST_LOGS: "1" }, false), false, "the opt-out");
    assert.equal(shouldQuietAppLogs([], {}, true), false, "the deploy gate, where rerunning one file costs a push");
    assert.equal(shouldQuietAppLogs([], { WHETHER_DEPLOY_GATE: "1" }), false, "the gate signal, read from the environment");
  });

  it("labels a single-process run instead of printing NaN", () => {
    const result = spawnSync("bun", ["scripts/run-tests.mjs", "tests/homeBriefModel.test.ts"], {
      encoding: "utf8",
    });

    assert.equal(result.status, 0);
    assert.match(result.stdout, /\[shard 1\]/);
    assert.doesNotMatch(result.stdout, /shard NaN/);
  });
});
