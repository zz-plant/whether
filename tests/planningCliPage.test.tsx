import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { operationsSectionLinks } from "../lib/navigation/planningNavigation";
import { pagesInGroup } from "../lib/navigation/informationArchitecture";

describe("operations navigation", () => {
  it("keeps Decide focused on the plan, its two tools and the market multiples", () => {
    // No /operate/memory: the ledger was retired; the record the product keeps is /history.
    // The planning switcher's three links are the Decide group's tabs since 2026-10-08.
    assert.deepEqual(pagesInGroup("decide").map((page) => page.href), ["/operate", "/operate/financial", "/operate/scenarios", "/comps"]);
  });

  it("indexes the plan page in page order, one entry per section", () => {
    // The six sections, then the risk-checks tail — the order a reader meets
    // them. Rules-first since 2026-10-07: each area's rule and its lines lead,
    // then the do/don't lists, then the test that checks one move against them.
    // (2026-10-06 led with the test, which opened the page on an empty form.)
    assert.deepEqual(operationsSectionLinks.plan.map((link) => link.href), [
      "#ops-monthly-action-summary",
      "#ops-playbook",
      "#ops-decision-shield",
      "#ops-plan-lines",
      "#ops-finance-strategy",
      "#ops-failure-patterns",
    ]);
  });
});
