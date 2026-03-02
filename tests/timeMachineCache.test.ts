import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildUniqueMonthEntries } from "../lib/timeMachine/timeMachineCache";

describe("time machine cache month entry helpers", () => {
  it("deduplicates repeated entries in the same month while preserving order", () => {
    const entries = buildUniqueMonthEntries([
      { year: 2024, month: 3 },
      { year: 2024, month: 3 },
      { year: 2024, month: 2 },
      { year: 2024, month: 2 },
      { year: 2024, month: 1 },
    ]);

    assert.deepEqual(entries, [
      { year: 2024, month: 3 },
      { year: 2024, month: 2 },
      { year: 2024, month: 1 },
    ]);
  });
});
