import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { evaluateRegime } from "../lib/regimeEngine";
import { buildSignsToWatch } from "../lib/report/reportNarrative";
import type { TreasuryData } from "../lib/types";

const baseTreasury: TreasuryData = {
  source: "US Treasury",
  record_date: "2025-01-31",
  fetched_at: "2025-02-01T00:00:00Z",
  isLive: true,
  yields: {
    oneMonth: 3.2,
    twoYear: 3.2,
    tenYear: 4.2,
  },
};

describe("report narrative signs", () => {
  it("returns fallback guidance when no trigger conditions are met", () => {
    const assessment = evaluateRegime(baseTreasury);
    const signs = buildSignsToWatch(assessment);

    assert.deepEqual(signs, [
      "No additional caution signs this cycle; maintain baseline monitoring.",
    ]);
  });

  it("returns inversion, tightness, and risk appetite signs when all triggers apply", () => {
    const assessment = evaluateRegime({
      ...baseTreasury,
      yields: {
        oneMonth: 5.4,
        twoYear: 5.1,
        tenYear: 4.2,
      },
    });

    const signs = buildSignsToWatch(assessment);

    assert.equal(signs.length, 3);
    assert.ok(signs[0].includes("curve slope stays inverted"));
    assert.ok(signs[1].includes("cash availability tightens"));
    assert.ok(signs[2].includes("risk appetite softens"));
  });
});
