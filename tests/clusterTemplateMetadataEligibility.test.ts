import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { buildSignalDecisionScenarioMetadata } from "../app/signals/[cluster]/[decision-scenario]/page";

describe("cluster template metadata eligibility", () => {
  it("forces noindex for degraded signal/scenario pages", () => {
    const metadata = buildSignalDecisionScenarioMetadata({
      cluster: "capital-tightness-watch",
      decisionScenario: "hiring",
      signalTitle: "Funding pressure watch",
      signalSummary: "Financing and spend pressure signal.",
      scenarioTitle: "Hiring",
      payload: {
        currentCall: "Hold hiring pace.",
        immediateAction: "Backfill only the most critical roles.",
        degraded: true,
        noindex: true,
        noindexReasons: ["freshness-stale"],
      },
    });

    assert.deepEqual(metadata.robots, { index: false, follow: true });
  });

  it("leaves an eligible signal/scenario page indexable", () => {
    const metadata = buildSignalDecisionScenarioMetadata({
      cluster: "capital-tightness-watch",
      decisionScenario: "hiring",
      signalTitle: "Funding pressure watch",
      signalSummary: "Financing and spend pressure signal.",
      scenarioTitle: "Hiring",
      payload: {
        currentCall: "Hold hiring pace.",
        immediateAction: "Backfill only the most critical roles.",
        degraded: false,
        noindex: false,
        noindexReasons: [],
      },
    });

    assert.equal(metadata.robots, undefined);
  });
});
