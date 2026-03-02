import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getConceptConflicts } from "../lib/conceptConflicts";

describe("concept conflicts", () => {
  it("returns resolved conflict entries with canonical articles", () => {
    const conflicts = getConceptConflicts();
    assert.ok(conflicts.length > 0);
    assert.ok(conflicts.every((entry) => entry.left.slug && entry.right.slug));
  });
});
