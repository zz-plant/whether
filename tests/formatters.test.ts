import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatNumberWithUnit } from "../lib/formatters";

describe("formatNumberWithUnit", () => {
  it("suppresses literal index suffixes", () => {
    assert.equal(formatNumberWithUnit(-0.52, "index"), "-0.52");
  });

  it("adds readable spacing for bps values", () => {
    assert.equal(formatNumberWithUnit(174, "bps"), "174.00 bps");
  });

  it("keeps percent values unchanged", () => {
    assert.equal(formatNumberWithUnit(3.75, "%"), "3.75%");
  });
});
