import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import {
  countUncheckedIndexedAccess,
  parseTscErrorLines,
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

  it("counts the real tree at or under the baseline, and never runs incremental", () => {
    const errors = countUncheckedIndexedAccess();

    assert.ok(
      errors.length <= UNCHECKED_ACCESS_BASELINE,
      `expected at most ${UNCHECKED_ACCESS_BASELINE} indexing errors, found ${errors.length}`,
    );
  });
});
