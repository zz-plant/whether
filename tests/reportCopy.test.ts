import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import {
  FIRST_TIME_GUIDE_HIGHLIGHTS,
  FIRST_TIME_GUIDE_NEXT_LINKS,
  FIRST_TIME_GUIDE_STEPS,
  TERM_DEFINITIONS,
} from "../lib/report/reportCopy";

describe("reportCopy", () => {
  it("defines first-time guide content with three ordered steps", () => {
    assert.equal(FIRST_TIME_GUIDE_STEPS.length, 3);
    assert.deepEqual(
      FIRST_TIME_GUIDE_STEPS.map((step) => step.label),
      ["Summary", "Proof", "Actions"],
    );
    FIRST_TIME_GUIDE_STEPS.forEach((step) => {
      assert.ok(step.detail.length > 20);
      assert.match(step.example, /^Example decision:/);
    });
  });

  it("defines each term once, in a sentence", () => {
    const values = new Set(TERM_DEFINITIONS.map((entry) => entry.value));
    assert.equal(values.size, TERM_DEFINITIONS.length);
    TERM_DEFINITIONS.forEach((entry) => {
      assert.ok(entry.term);
      assert.match(entry.summary, /\.$/);
    });
  });

  it("keeps the first-time guide's quick links", () => {
    assert.ok(FIRST_TIME_GUIDE_HIGHLIGHTS.length > 0);
    assert.ok(FIRST_TIME_GUIDE_NEXT_LINKS.length >= 3);
  });
});
