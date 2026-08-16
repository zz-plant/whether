import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { computeTransitionProbability } from "../lib/timeMachine/transitionProbability";

describe("regime transition probability", () => {
  it("exposes the event and monthly horizon represented by the transition rate", () => {
    const result = computeTransitionProbability("DEFENSIVE");

    if (result.probability === 0) {
      assert.equal(result.forecast, null);
      return;
    }

    assert.deepEqual(result.forecast, {
      probabilityPercent: result.probability,
      eventLabel: "Chance conditions change",
      horizonLabel: "by next month",
    });
  });
});
