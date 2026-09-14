import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { businessAreaOrder, businessAreaOwner } from "../lib/report/decisionKnobs";

/**
 * The owner map is the role-split of the artifact: each lever's line names the
 * role that routes the decision in a meeting. Every lever must carry one, and
 * fundraising must keep the CEO + Finance pair — the same owners the weekly
 * lock commitment already assigns.
 */
describe("businessAreaOwner", () => {
  it("covers every lever in the canonical order", () => {
    for (const lever of businessAreaOrder) {
      const owner = businessAreaOwner[lever];
      assert.ok(owner, `no owner defined for ${lever}`);
      assert.ok(owner.trim().length > 0);
    }
  });

  it("keeps fundraising with the CEO + Finance pair", () => {
    assert.equal(businessAreaOwner["sales-posture"], "CEO + Finance lead");
  });

  it("does not give one role every lane", () => {
    const owners = new Set(businessAreaOrder.map((lever) => businessAreaOwner[lever]));
    assert.ok(owners.size > 1, "all levers resolve to one owner — the split is not a split");
  });
});
