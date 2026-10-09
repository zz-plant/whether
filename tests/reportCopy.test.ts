import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { TERM_DEFINITIONS } from "../lib/report/reportCopy";

describe("reportCopy", () => {
  it("defines each term once, in a sentence", () => {
    const values = new Set(TERM_DEFINITIONS.map((entry) => entry.value));
    assert.equal(values.size, TERM_DEFINITIONS.length);
    TERM_DEFINITIONS.forEach((entry) => {
      assert.ok(entry.term);
      assert.match(entry.summary, /\.$/);
    });
  });
});
