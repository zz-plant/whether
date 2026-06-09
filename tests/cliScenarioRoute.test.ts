import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { applyScenarioOverridesToTreasury } from "../lib/cli/scenarioInputs";

const treasury = {
  source: "test",
  record_date: "2026-03-12",
  fetched_at: "2026-03-12T12:00:00.000Z",
  isLive: true,
  yields: {
    oneMonth: 3.0,
    threeMonth: 3.0,
    twoYear: 4.5,
    tenYear: 4.1,
  },
};

describe("cli scenario route helpers", () => {
  it("maps tightness and risk appetite overrides into treasury yields", () => {
    const overridden = applyScenarioOverridesToTreasury({
      treasury,
      tightness: 80,
      riskAppetite: 80,
    });

    assert.ok((overridden.yields.oneMonth ?? 0) > (treasury.yields.oneMonth ?? 0));
    assert.ok((overridden.yields.tenYear ?? 0) > (overridden.yields.twoYear ?? 0));
  });

  it("preserves original yields when no overrides are provided", () => {
    const unchanged = applyScenarioOverridesToTreasury({
      treasury,
      tightness: null,
      riskAppetite: null,
    });

    assert.deepEqual(unchanged.yields, {
      oneMonth: 3.0,
      threeMonth: 3.0,
      twoYear: 4.5,
      tenYear: 4.1,
    });
  });
});
