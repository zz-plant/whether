/**
 * Sensor builder unit tests for base rate and curve slope readings.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildSensorReadings } from "../lib/sensors";
import type { TreasuryData } from "../lib/types";

describe("sensor readings", () => {
  it("builds base rate and curve slope sensors", () => {
    const treasury: TreasuryData = {
      source: "Treasury",
      record_date: "2024-10-01",
      fetched_at: "2024-10-02T00:00:00Z",
      isLive: true,
      yields: {
        oneMonth: 5.2,
        twoYear: 4.8,
        tenYear: 4.6,
      },
    };

    const readings = buildSensorReadings(treasury);
    assert.equal(readings.length, 2);
    assert.equal(readings[0].label.includes("Base rate"), true);
    assert.equal(readings[1].value, -0.2);
    assert.equal(readings[0].category, "Rates");
    assert.equal(Array.isArray(readings[0].timeWindows), true);
  });
});
