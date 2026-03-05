import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { loadReportData } from "../lib/report/reportData";
import { buildHomeBriefModel } from "../lib/report/homeBriefModel";

describe("buildHomeBriefModel", () => {
  it("derives stable labels and constraints from report data", async () => {
    const data = await loadReportData();
    const model = buildHomeBriefModel(data);

    assert.match(model.confidenceLabel, /LOW|MED|HIGH/);
    assert.match(model.transitionWatch, /ON|OFF/);
    assert.equal(model.constraints.length, 3);
    assert.equal(typeof model.guardrail, "string");
    assert.equal(typeof model.reversalTrigger, "string");
    assert.equal(typeof model.dangerousCategory, "string");
    assert.ok(model.decisionKnobs.length > 0);
  });
});
