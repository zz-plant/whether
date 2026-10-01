import assert from "node:assert/strict";
import { describe, it } from "bun:test";

import { evaluateAlert, publishedScoreLines, type AlertConditions, type LastAlertState } from "../lib/alert/alertEvaluator";
import { thresholdCrossingEmail } from "../lib/alert/alertTemplates";

const conditions = (over: Partial<AlertConditions> = {}): AlertConditions => ({
  regime: "DEFENSIVE",
  tightness: 78,
  riskAppetite: 42,
  posture: "Stage approvals",
  recordDate: "2026-08-18",
  ...over,
});

const lastKnown = (over: Partial<LastAlertState> = {}): LastAlertState => ({
  regime: "DEFENSIVE",
  tightness: 60,
  riskAppetite: 60,
  // Old enough to clear the one-week cooldown.
  lastSentAt: "2020-01-01T00:00:00.000Z",
  ...over,
});

describe("alert routing", () => {
  it("tags each threshold alert with the score that crossed", () => {
    const decisions = evaluateAlert(conditions(), lastKnown());
    const thresholds = decisions.filter((d) => d.type === "threshold");
    assert.ok(thresholds.length > 0, "expected at least one threshold alert");

    for (const decision of thresholds) {
      // Delivery picks the email template from `metric`. It used to substring-match
      // the headline for "tightness", so renaming the label silently routed every
      // funding-pressure alert down the risk-appetite branch — wrong metric, wrong
      // score, no error.
      assert.ok(
        decision.metric === "credit" || decision.metric === "sentiment",
        `threshold alert is missing a metric: ${decision.headline}`,
      );
    }
  });

  it("routes a funding-pressure crossing to the credit metric and Finance/CFO role", () => {
    const decisions = evaluateAlert(
      conditions({ riskAppetite: 60 }),
      lastKnown({ riskAppetite: 60 }),
    );
    const thresholds = decisions.filter((d) => d.type === "threshold");
    assert.ok(thresholds.length > 0);
    assert.ok(thresholds.every((d) => d.metric === "credit"));
    assert.ok(thresholds.every((d) => d.department === "Finance"));
    assert.ok(thresholds.every((d) => d.rolePreset === "CFO"));
    assert.ok(thresholds.every((d) => d.headline.startsWith("Funding pressure")));
  });

  it("routes a risk-appetite crossing to the sentiment metric and Operations/COO role", () => {
    const decisions = evaluateAlert(
      conditions({ tightness: 60, riskAppetite: 42 }),
      lastKnown({ tightness: 60, riskAppetite: 60 }),
    );
    const thresholds = decisions.filter((d) => d.type === "threshold");
    assert.ok(thresholds.length > 0);
    assert.ok(thresholds.every((d) => d.metric === "sentiment"));
    assert.ok(thresholds.every((d) => d.department === "Operations"));
    assert.ok(thresholds.every((d) => d.rolePreset === "COO"));
    assert.ok(thresholds.every((d) => d.headline.startsWith("Risk appetite")));
  });

  it("leaves regime-change alerts without a metric", () => {
    const decisions = evaluateAlert(
      conditions({ regime: "SCARCITY" }),
      lastKnown({ regime: "DEFENSIVE" }),
    );
    const regimeChange = decisions.find((d) => d.type === "regime_change");
    assert.ok(regimeChange);
    assert.equal(regimeChange?.metric, undefined);
  });
});

describe("alert email copy", () => {
  it("names the metrics the way every other surface does", () => {
    const [tightnessPause, , , , riskChange] = publishedScoreLines();
    const credit = thresholdCrossingEmail(tightnessPause, 78, null);
    assert.match(credit.subject, /Funding pressure crossed the pause line \(76\)/);
    assert.ok(!/tightness/i.test(credit.text), "alert text still says tightness");
    assert.ok(!/tightness/i.test(credit.html), "alert html still says tightness");

    const sentiment = thresholdCrossingEmail(riskChange, 42, null);
    assert.match(sentiment.subject, /Risk appetite crossed the line where conditions change \(50\)/);
    assert.ok(!/investor appetite/i.test(sentiment.text));
  });
});
