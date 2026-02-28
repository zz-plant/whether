import { describe, expect, test } from "bun:test";
import {
  buildBoldnessScore,
  buildWeeklyLeadershipBriefModel,
  getNetDeltaLabel,
  getWindowState,
  toTrendLabel,
} from "../lib/report/weeklyLeadershipBrief";
import { evaluateRegime } from "../lib/regimeEngine";
import { snapshotData } from "../lib/snapshot";

describe("weeklyLeadershipBrief helpers", () => {
  test("buildBoldnessScore clamps between 0 and 100", () => {
    expect(buildBoldnessScore(100, 100)).toBe(70);
    expect(buildBoldnessScore(0, 100)).toBe(100);
    expect(buildBoldnessScore(100, 0)).toBe(0);
  });

  test("trend and window labels are deterministic", () => {
    expect(toTrendLabel(3)).toBe("Strengthening");
    expect(toTrendLabel(-3)).toBe("Cooling");
    expect(toTrendLabel(0)).toBe("Flat");

    expect(getWindowState(80, { open: 38, strong: 64 })).toBe("Strong");
    expect(getWindowState(40, { open: 38, strong: 64 })).toBe("Open");
    expect(getWindowState(20, { open: 38, strong: 64 })).toBe("Constrained");
  });

  test("buildWeeklyLeadershipBriefModel returns expected shape", () => {
    const assessment = evaluateRegime(snapshotData);
    const model = buildWeeklyLeadershipBriefModel({
      assessment,
      previousAssessment: null,
      treasury: snapshotData,
      last4Boldness: [58, 61, 59, 63],
      hiringTrendDelta: 4,
      stabilityWeeks: 3,
    });

    expect(typeof model.boldnessScore).toBe("number");
    expect(typeof model.boldnessDelta).toBe("number");
    expect(model.stabilityWeeks).toBe(3);
    expect(model.hiringTrend).toBe("Strengthening");
    expect(model.inputsComplete).toBeTrue();
    expect(getNetDeltaLabel(2)).toBe("Slightly more aggressive than last week.");
  });
});
