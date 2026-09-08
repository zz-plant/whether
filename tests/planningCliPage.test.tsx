import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { operationsSectionLinks, operationsWorkstreamLinks } from "../lib/navigation/planningNavigation";

describe("operations navigation", () => {
  it("keeps operations focused on the weekly plan route", () => {
    // No /operate/memory: the ledger is a record, and moved to /history/decisions.
    assert.deepEqual(operationsWorkstreamLinks.map((link) => link.href), ["/operate", "/operate/financial", "/operate/scenarios"]);
  });

  it("keeps planning navigation centered on plan execution and sharing checkpoints", () => {
    assert.deepEqual(operationsSectionLinks.plan.map((link) => link.href), [
      "#ops-monthly-action-summary",
      "#ops-failure-patterns",
      "#ops-playbook",
      "#ops-finance-strategy",
      "#ops-export-briefs",
      "#ops-operator-requests",
    ]);
  });
});
