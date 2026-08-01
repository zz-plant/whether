import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { isWebVitalMetric, type WebVitalMetric } from "../lib/webVitalsTelemetry";

const validMetric = (overrides: Partial<WebVitalMetric> = {}): WebVitalMetric => ({
  name: "LCP",
  value: 2500,
  rating: "good",
  id: "v3-1234567890-abc",
  delta: 0,
  path: "/",
  navigationType: "navigate",
  ...overrides,
});

describe("web-vitals telemetry validation", () => {
  it("accepts a well-formed metric", () => {
    assert.ok(isWebVitalMetric(validMetric()));
  });

  it("accepts all five metric names", () => {
    for (const name of ["CLS", "FCP", "INP", "LCP", "TTFB"] as const) {
      assert.ok(isWebVitalMetric(validMetric({ name })));
    }
  });

  it("rejects unknown metric names", () => {
    assert.ok(!isWebVitalMetric(validMetric({ name: "FID" as never })));
    assert.ok(!isWebVitalMetric(validMetric({ name: "TBT" as never })));
  });

  it("rejects non-object input", () => {
    assert.ok(!isWebVitalMetric(null));
    assert.ok(!isWebVitalMetric(undefined));
    assert.ok(!isWebVitalMetric("string"));
    assert.ok(!isWebVitalMetric(42));
  });

  it("rejects NaN or infinite values", () => {
    assert.ok(!isWebVitalMetric(validMetric({ value: Number.NaN })));
    assert.ok(!isWebVitalMetric(validMetric({ value: Number.POSITIVE_INFINITY })));
    assert.ok(!isWebVitalMetric(validMetric({ delta: Number.NaN })));
  });

  it("rejects negative values", () => {
    assert.ok(!isWebVitalMetric(validMetric({ value: -1 })));
  });

  it("rejects implausibly large values (> 60s)", () => {
    assert.ok(!isWebVitalMetric(validMetric({ value: 60_001 })));
    assert.ok(!isWebVitalMetric(validMetric({ delta: 60_001 })));
    assert.ok(!isWebVitalMetric(validMetric({ delta: -60_001 })));
  });

  it("accepts delta of zero", () => {
    assert.ok(isWebVitalMetric(validMetric({ delta: 0 })));
  });

  it("rejects empty or missing id", () => {
    assert.ok(!isWebVitalMetric(validMetric({ id: "" })));
  });

  it("rejects empty path", () => {
    assert.ok(!isWebVitalMetric(validMetric({ path: "" })));
  });

  it("rejects path exceeding 2048 chars", () => {
    assert.ok(!isWebVitalMetric(validMetric({ path: "/".repeat(2049) })));
  });

  it("rejects invalid ratings", () => {
    assert.ok(!isWebVitalMetric(validMetric({ rating: "excellent" as never })));
    assert.ok(!isWebVitalMetric(validMetric({ rating: "bad" as never })));
  });

  it("accepts all three ratings", () => {
    for (const rating of ["good", "needs-improvement", "poor"] as const) {
      assert.ok(isWebVitalMetric(validMetric({ rating })));
    }
  });
});
