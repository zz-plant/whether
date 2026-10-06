import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { operationsSectionLinks, operationsWorkstreamLinks } from "../lib/navigation/planningNavigation";

describe("operations navigation", () => {
  it("keeps operations focused on the weekly plan route", () => {
    // No /operate/memory: the ledger was retired; the record the product keeps is /history.
    assert.deepEqual(operationsWorkstreamLinks.map((link) => link.href), ["/operate", "/operate/financial", "/operate/scenarios"]);
  });

  it("indexes the plan page in page order, one entry per section", () => {
    // The six sections, then the risk-checks tail — the order a reader meets
    // them. Plan-first since 2026-10-06: the reader's own decision leads, then
    // the rules, then the area reference the brief also prints.
    assert.deepEqual(operationsSectionLinks.plan.map((link) => link.href), [
      "#ops-decision-shield",
      "#ops-playbook",
      "#ops-monthly-action-summary",
      "#ops-plan-lines",
      "#ops-finance-strategy",
      "#ops-export-briefs",
      "#ops-failure-patterns",
    ]);
  });
});
