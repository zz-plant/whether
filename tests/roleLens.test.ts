import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseRoleLens } from "../lib/report/roleLens";

describe("parseRoleLens", () => {
  it("returns first lens when query param is repeated", () => {
    const lens = parseRoleLens({ lens: ["finance", "pm"] });

    assert.equal(lens, "finance");
  });

  it("falls back to default for unknown repeated lens values", () => {
    const lens = parseRoleLens({ lens: ["unknown", "engineering"] });

    assert.equal(lens, "pm");
  });
});
