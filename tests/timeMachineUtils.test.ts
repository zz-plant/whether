import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseMonthInput } from "../app/signals/components/timeMachineUtils";

describe("time machine panel month parsing", () => {
  it("parses well-formed YYYY-MM input", () => {
    assert.deepEqual(parseMonthInput("2024-06"), { year: 2024, month: 6 });
  });

  it("rejects malformed or ambiguous month strings", () => {
    assert.equal(parseMonthInput("2024-6"), null);
    assert.equal(parseMonthInput("2024-06-extra"), null);
    assert.equal(parseMonthInput("2024/06"), null);
  });
});
