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
      record_date: "2026-02-01",
      fetched_at: "2026-02-02T00:00:00Z",
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
    assert.ok(Math.abs((readings[1].value ?? 0) - -0.2) < 1e-9);
    assert.equal(readings[0].category, "Rates");
    assert.equal(Array.isArray(readings[0].timeWindows), true);
    assert.equal(readings[0].group.label, "Rates");
    assert.equal(readings[0].availableTimeWindows.length > 0, true);
  });
});
