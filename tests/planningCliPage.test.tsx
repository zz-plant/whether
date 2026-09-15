import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { operationsSectionLinks, operationsWorkstreamLinks } from "../lib/navigation/planningNavigation";

describe("operations navigation", () => {
  it("keeps operations focused on the weekly plan route", () => {
    // No /operate/memory: the ledger was retired; the record the product keeps is /history.
    assert.deepEqual(operationsWorkstreamLinks.map((link) => link.href), ["/operate", "/operate/financial", "/operate/scenarios"]);
  });

  it("indexes the plan page in page order, one entry per section", () => {
    // The five stepper steps, then the risk-checks tail — the order a reader
    // meets them. This used to be six labels in a different order, two of which
    // named panels inside other steps, and none of which named the Test step.
    assert.deepEqual(operationsSectionLinks.plan.map((link) => link.href), [
      "#ops-monthly-action-summary",
      "#ops-export-briefs",
      "#ops-playbook",
      "#ops-decision-shield",
      "#ops-finance-strategy",
      "#ops-failure-patterns",
    ]);
  });
});
