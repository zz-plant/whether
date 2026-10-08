import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import {
  DECISION_CONTRACT_LABELS,
  FIRST_TIME_GUIDE_LINES,
  FIRST_TIME_GUIDE_STEPS,
  TERM_DEFINITIONS,
} from "../lib/report/reportCopy";
import { CALL_CHANGE_RULE } from "../lib/report/trackRecordCopy";

describe("reportCopy", () => {
  it("defines the first-time guide as three steps named for what the page shows", () => {
    assert.deepEqual(
      FIRST_TIME_GUIDE_STEPS.map((step) => step.label),
      ["Read the guidance", "Pick what you're deciding", "Act on it"],
    );
    FIRST_TIME_GUIDE_STEPS.forEach((step) => {
      assert.ok(step.detail.length > 20);
      assert.match(step.detail, /\.$/);
    });
  });

  it("tells the change line from an area's pause and resume lines", () => {
    const [change, areaLines] = FIRST_TIME_GUIDE_LINES;
    assert.equal(change?.label, DECISION_CONTRACT_LABELS.watch.changeLine);
    assert.ok(change?.detail.includes(CALL_CHANGE_RULE), "the change line says how conditions change");
    assert.match(areaLines?.detail ?? "", /stage and runway move both/);
  });

  it("defines each term once, in a sentence", () => {
    const values = new Set(TERM_DEFINITIONS.map((entry) => entry.value));
    assert.equal(values.size, TERM_DEFINITIONS.length);
    TERM_DEFINITIONS.forEach((entry) => {
      assert.ok(entry.term);
      assert.match(entry.summary, /\.$/);
    });
  });
});
