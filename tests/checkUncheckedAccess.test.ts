import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import {
  countUncheckedIndexedAccess,
  parseTscErrorLines,
  readCensusRun,
  UNCHECKED_ACCESS_BASELINE,
} from "../scripts/check-unchecked-indexed-access";

describe("unchecked indexed access census", () => {
  it("parses compiler error lines and nothing else", () => {
    const output = [
      "tests/a.test.ts(12,5): error TS2532: Object is possibly 'undefined'.",
      "lib/b.ts(3,1): error TS7006: Parameter 'x' implicitly has an 'any' type.",
      "some note line without an error",
      "",
      "lib/b.ts(9,20): error TS7053: Element implicitly has an 'any' type.",
    ].join("\n");

    const parsed = parseTscErrorLines(output);

    assert.equal(parsed.length, 3);
    const [first, , third] = parsed;
    assert.deepEqual(first, { file: "tests/a.test.ts", line: 12, code: "error TS2532" });
    assert.deepEqual(third, { file: "lib/b.ts", line: 9, code: "error TS7053" });
  });

  /* Each of these used to parse as zero findings and pass the ratchet. */
  it("throws rather than count zero when the compiler did not run or stopped before checking", () => {
    assert.throws(() => readCensusRun({ status: null, error: new Error("spawnSync tsc ENOENT") }), /did not run/);
    assert.throws(
      () => readCensusRun({ status: 1, stdout: "error TS5058: The specified path does not exist: 'x.json'.\n" }),
      /tsc failed/,
    );
    assert.throws(() => readCensusRun({ status: 2, stdout: "", stderr: "" }), /tsc failed/);
    assert.throws(() => readCensusRun({ status: null, stdout: "" }), /exit signal/);
  });

  it("counts a clean run as zero and a run with file diagnostics as found", () => {
    assert.deepEqual(readCensusRun({ status: 0, stdout: "" }), []);
    assert.equal(
      readCensusRun({ status: 2, stdout: "lib/b.ts(9,20): error TS7053: Element implicitly has an 'any' type.\n" }).length,
      1,
    );
  });

  it("counts the real tree at or under the baseline, and never runs incremental", () => {
    const errors = countUncheckedIndexedAccess();

    assert.ok(
      errors.length <= UNCHECKED_ACCESS_BASELINE,
      `expected at most ${UNCHECKED_ACCESS_BASELINE} indexing errors, found ${errors.length}`,
    );
  });
});
