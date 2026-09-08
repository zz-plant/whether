import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { buildWeeklyEmailReadings } from "../lib/email/sendWeeklyBrief";
import { buildOperatingSnapshot } from "../lib/operatingState/snapshot";
import { macroSeries } from "../lib/macroSnapshot";
import { snapshotData } from "../lib/snapshot";

describe("weekly email readings", () => {
  it("carries the two scores, their deltas and the confidence label", () => {
    const snapshot = buildOperatingSnapshot({
      treasury: snapshotData,
      macroSeries,
      now: new Date("2026-08-31T12:00:00.000Z"),
    });
    const readings = buildWeeklyEmailReadings(snapshot);

    assert.deepEqual(readings.map((reading) => reading.label), ["Funding pressure", "Risk appetite", "Confidence"]);
    assert.match(readings[0].value, /^\d+\/100$/);
    assert.match(readings[1].value, /^\d+\/100$/);
    assert.match(readings[2].value, /^(HIGH|MED|LOW)$/);
  });

  it("sends nothing numeric without a snapshot rather than inventing a reading", () => {
    assert.deepEqual(buildWeeklyEmailReadings(undefined), []);
  });
});
