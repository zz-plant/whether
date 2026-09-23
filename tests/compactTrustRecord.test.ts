import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { describeRecord } from "../app/components/CompactTrustPopover";

/*
 * The popover's record line reads a month-end series beside a weekly call. The
 * two disagree whenever the call moves inside a month — on 2026-09-15 the
 * record's latest month was Sunny and the hero said Freezing — and "Sunny has
 * held 9 months" under a Freezing call is a contradiction on the one control
 * whose job is to be trusted.
 */
describe("compact trust record line", () => {
  const record = { monthsCovered: 176, currentHoldMonths: 9, currentRegime: "EXPANSION", currentRegimeLabel: "Sunny" };

  it("states the hold when conditions still match the record", () => {
    assert.equal(describeRecord(record, "EXPANSION"), "Sunny has held 9 months");
    assert.equal(describeRecord({ ...record, currentHoldMonths: 1 }, "EXPANSION"), "Sunny has held 1 month");
  });

  it("says conditions changed when the hero's regime is not the record's", () => {
    assert.equal(describeRecord(record, "SCARCITY"), "Conditions changed this month, after Sunny held 9 months");
  });

  it("falls back to the record's own claim when no current regime is given", () => {
    assert.equal(describeRecord(record, undefined), "Sunny has held 9 months");
  });
});
