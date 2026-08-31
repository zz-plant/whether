import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import {
  assessDecisionStaleness,
  stalenessVerdictLabel,
} from "../lib/report/decisionStaleness";
import { buildDecisionMemoryEntry } from "../lib/decisionMemory";
import { DEFAULT_THRESHOLDS } from "../lib/regimeEngine";

const baseSnapshot = {
  tightness: 60,
  riskAppetite: 55,
  tightnessThreshold: 70,
  riskAppetiteThreshold: 50,
};

describe("decision staleness", () => {
  it("returns STAND when conditions remain inside the recorded range", () => {
    const result = assessDecisionStaleness(baseSnapshot, { tightness: 64, riskAppetite: 52 });
    assert.equal(result.verdict, "STAND");
    assert.equal(result.moved.length, 0);
    assert.equal(stalenessVerdictLabel(result.verdict), "STAND");
  });

  it("watches when one supporting assumption moves outside the recorded range", () => {
    const result = assessDecisionStaleness(baseSnapshot, { tightness: 60, riskAppetite: 42 });
    assert.equal(result.verdict, "WATCH");
    assert.equal(result.moved.length, 1);
    assert.equal(result.moved[0].dimension, "risk");
    assert.match(result.why, /Demand expectations/);
    assert.equal(stalenessVerdictLabel(result.verdict), "WATCH");
  });

  it("reconsiders when two supporting assumptions move outside the recorded range", () => {
    const result = assessDecisionStaleness(baseSnapshot, { tightness: 76, riskAppetite: 40 });
    assert.equal(result.verdict, "RECONSIDER");
    assert.equal(result.moved.length, 2);
    assert.match(result.why, /Capital conditions and Demand expectations/);
    assert.equal(stalenessVerdictLabel(result.verdict), "RECONSIDER");
  });

  it("counts tightening capital as a moved assumption when it crosses the watch line", () => {
    const result = assessDecisionStaleness(baseSnapshot, { tightness: 74, riskAppetite: 55 });
    assert.equal(result.verdict, "WATCH");
    assert.equal(result.moved[0].dimension, "capital");
  });

  it("does not treat improving conditions as moved", () => {
    const result = assessDecisionStaleness(baseSnapshot, { tightness: 52, riskAppetite: 70 });
    assert.equal(result.verdict, "STAND");
    assert.equal(result.moved.length, 0);
  });

  it("builds a decision-memory entry with an assumption snapshot at write time", () => {
    const entry = buildDecisionMemoryEntry({
      clientId: "client-1",
      recordDate: "2026-08-14",
      decision: { lifecycle: "GROWTH", category: "HIRING", action: "HIRE" },
      outcome: {
        verdict: "SAFE",
        summary: "Hiring remains open.",
        guardrail: "Pause if tightness crosses 70.",
        reversalTrigger: "tightness falls below 70",
      },
      assessment: {
        regime: "DEFENSIVE",
        scores: { tightness: 60, riskAppetite: 55, baseRate: 4.9, curveSlope: 0.4, baseRateUsed: "1M" },
        thresholds: DEFAULT_THRESHOLDS,
        inputs: [],
      },
    });

    assert.deepEqual(entry.assumptions, {
      tightness: 60,
      riskAppetite: 55,
      tightnessThreshold: DEFAULT_THRESHOLDS.tightnessRegime,
      riskAppetiteThreshold: DEFAULT_THRESHOLDS.riskAppetiteRegime,
    });
  });
});