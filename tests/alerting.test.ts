import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { emitBoundedAlerts } from "../lib/report/alerting";
import { evaluateRegime } from "../lib/regimeEngine";

const assessment = evaluateRegime({
  source: "FRED",
  record_date: "2026-01-01",
  fetched_at: "2026-01-01T00:00:00Z",
  isLive: true,
  yields: { oneMonth: 5.8, twoYear: 5.1, tenYear: 4.1 },
});

describe("bounded alerting", () => {
  it("emits actionable deltas when thresholds are crossed", () => {
    const alerts = emitBoundedAlerts(assessment, "2026-01-01T12:00:00Z");
    assert.ok(alerts.some((alert) => alert.message.includes("Tighten hiring now")));
  });
});
