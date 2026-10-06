import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { evaluateDecision } from "../lib/decisionShield";
import { buildShareText } from "../app/operate/components/decisionShieldUtils";
import { getBaseRate } from "../lib/regimeEngineCore";
import { BASE_RATE_SOURCE_LABELS, buildRegimeInputs } from "../lib/report/regimeDescription";
import { evaluateRegime } from "../lib/regimeEngine";
import type { TreasuryData } from "../lib/types";

const treasury = (yields: Partial<TreasuryData["yields"]>): TreasuryData => ({
  record_date: "2026-08-31",
  fetched_at: "2026-08-31T09:00:00Z",
  source: "US Treasury",
  isLive: true,
  yields: { oneMonth: null, threeMonth: null, twoYear: 4.8, tenYear: 4.2, ...yields },
});

describe("the base rate is named as the series that was read", () => {
  it("calls a one-month bill a one-month bill in the verdict evidence", () => {
    const assessment = evaluateRegime(treasury({ oneMonth: 5.2 }));
    assert.equal(assessment.scores.baseRateUsed, "1M");

    const output = evaluateDecision(assessment, { lifecycle: "GROWTH", category: "HIRING", action: "HIRE" });
    const evidence = output.bullets.join("\n");

    // The line said "The Fed rate is 5.20%" for a DGS1MO reading.
    assert.ok(!/Fed rate/i.test(evidence), `evidence still claims a Fed rate: ${evidence}`);
    assert.match(evidence, /The short-term borrowing rate \(the 1-month Treasury bill\) is 5\.20%/);
  });

  it("carries the corrected name into the block operators paste", () => {
    const assessment = evaluateRegime(treasury({ oneMonth: 5.2 }));
    const output = evaluateDecision(assessment, { lifecycle: "GROWTH", category: "HIRING", action: "HIRE" });
    const shared = buildShareText(assessment, "GROWTH", "HIRING", "HIRE", output);

    assert.ok(!/Fed rate/i.test(shared), "the copied artifact must not claim a Fed rate either");
    assert.match(shared, /1-month Treasury bill/);
  });

  it("falls to the three-month bill and names that instead", () => {
    const assessment = evaluateRegime(treasury({ threeMonth: 5.0 }));
    assert.equal(assessment.scores.baseRateUsed, "3M");
    const output = evaluateDecision(assessment, { lifecycle: "GROWTH", category: "HIRING", action: "HIRE" });
    assert.match(output.bullets.join("\n"), /The short-term borrowing rate \(the 3-month Treasury bill\) is 5\.00%/);
  });

  it("would name the policy rate only if a policy rate were ever read", () => {
    // The FED rung is unreachable today: nothing populates `fedFunds`. The label
    // exists so that wiring DFF renames the surface rather than leaving it wrong
    // in the other direction.
    assert.equal(BASE_RATE_SOURCE_LABELS.FED, "The federal funds rate");
    assert.equal(getBaseRate({ fedFunds: 4.25, oneMonth: 5.2, twoYear: 4.8, tenYear: 4.2 }).used, "FED");
  });

  it("labels the regime input by its series rather than as a policy rate", () => {
    const data = treasury({ oneMonth: 5.2 });
    const inputs = buildRegimeInputs(data, getBaseRate(data.yields), -0.6);
    const labels = inputs.map((input) => input.label);

    assert.ok(!labels.some((label) => label.startsWith("Policy base rate")), labels.join(" | "));
    assert.ok(labels.includes("The 1-month Treasury bill (1M)"), labels.join(" | "));
  });
});
