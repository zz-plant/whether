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


  it("counts weak signals using signal-specific improving semantics", () => {
    const model = buildHomeBriefModel({
      assessment: {
        regime: "EXPANSION",
        thresholds: { tightnessRegime: 50, riskAppetiteRegime: 50 },
        scores: { tightness: 45, riskAppetite: 55 },
      },
      regimeAlert: null,
      stopItems: ["Stop irreversible spend"],
      reportDynamics: {
        directionLabel: "mixed",
        changedSignals: [
          { key: "tightness", delta: -2 },
          { key: "riskAppetite", delta: -1 },
        ],
      },
    });

    const approvalVelocity = model.decisionKnobs.find((knob) => knob.key === "approvalVelocity");
    assert.ok(approvalVelocity);
    assert.match(approvalVelocity.rationale, /1 weak signal/);
  });
});
