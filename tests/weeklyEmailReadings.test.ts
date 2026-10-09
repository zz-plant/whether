import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { buildWeeklyEmailReadings } from "../lib/email/sendWeeklyBrief";
import { buildOperatingSnapshot } from "../lib/operatingState/snapshot";
import { briefSourceFromSnapshot, buildBriefDocument } from "../lib/report/briefDocument";
import { macroSeries } from "../lib/macroSnapshot";
import { snapshotData } from "../lib/snapshot";

describe("weekly email readings", () => {
  it("carries the two scores, their deltas and the confidence label", () => {
    const snapshot = buildOperatingSnapshot({
      treasury: snapshotData,
      macroSeries,
      now: new Date("2026-08-31T12:00:00.000Z"),
    });
    const readings = buildWeeklyEmailReadings(buildBriefDocument(briefSourceFromSnapshot(snapshot), snapshot.weeklyCall));

    assert.deepEqual(readings.map((reading) => reading.label), ["Funding pressure", "Risk appetite", "Margin"]);
    assert.match(readings[0].value, /^\d+\/100$/);
    assert.match(readings[1].value, /^\d+\/100$/);
    // The margin in words and points, under its own label; the engine's code is not for an inbox.
    assert.equal(readings[2].label, "Margin");
    assert.match(readings[2].value, /^(clear of|within reach of|close to) the line \((funding pressure|risk appetite) is (\d+ points? from|at) its change line\)$/);
    assert.match(readings[0].meaning ?? "", /^money is /);
    assert.match(readings[1].meaning ?? "", /^investors are /);
  });

  it("counts one point as a point", () => {
    const readings = buildWeeklyEmailReadings({
      readings: {
        scores: { tightness: 71, riskAppetite: 48 },
        vsThreshold: { tightness: 1, riskAppetite: -2 },
        thresholds: { tightnessRegime: 70, riskAppetiteRegime: 50 },
      },
      confidence: "MED",
    });

    assert.equal(readings[0].distance?.label, "1 point above the line where conditions change");
    assert.equal(readings[1].distance?.label, "2 points below the line where conditions change");
  });

  it("sends nothing numeric without a snapshot rather than inventing a reading", () => {
    assert.deepEqual(buildWeeklyEmailReadings(undefined), []);
  });
});
