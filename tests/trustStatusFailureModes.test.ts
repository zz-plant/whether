import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { buildTrustWarnings } from "../lib/report/trustStatus";

describe("buildTrustWarnings", () => {
  it("activates boundary-whipsaw when confidence is low near transition with multiple changes", () => {
    const warnings = buildTrustWarnings({
      confidenceLabel: "LOW",
      transitionWatch: "ON",
      freshnessLabel: "Mar 9, 2026 09:00 UTC",
      isFallbackSnapshot: false,
      changedSignals: [{ delta: 1.2 }, { delta: -0.9 }],
      anomalySignals: [],
    });

    assert.ok(warnings.some((warning) => warning.id === "boundary-whipsaw"));
  });

  it("deactivates boundary-whipsaw when confidence recovers even with signal movement", () => {
    const warnings = buildTrustWarnings({
      confidenceLabel: "MED",
      transitionWatch: "ON",
      freshnessLabel: "Mar 9, 2026 09:00 UTC",
      isFallbackSnapshot: false,
      changedSignals: [{ delta: 1.2 }, { delta: -0.9 }],
      anomalySignals: [],
    });

    assert.ok(!warnings.some((warning) => warning.id === "boundary-whipsaw"));
  });

  it("activates and clears stale-cached warning based on fallback and freshness", () => {
    const activeWarnings = buildTrustWarnings({
      confidenceLabel: "HIGH",
      transitionWatch: "OFF",
      freshnessLabel: "Unavailable",
      isFallbackSnapshot: true,
      provenanceStatusLabel: "Cached (medium)",
      changedSignals: [],
      anomalySignals: [],
    });
    assert.ok(activeWarnings.some((warning) => warning.id === "stale-cached"));

    const clearedWarnings = buildTrustWarnings({
      confidenceLabel: "HIGH",
      transitionWatch: "OFF",
      freshnessLabel: "Mar 9, 2026 09:00 UTC",
      isFallbackSnapshot: false,
      provenanceStatusLabel: "Live (high confidence)",
      changedSignals: [],
      anomalySignals: [],
    });
    assert.ok(!clearedWarnings.some((warning) => warning.id === "stale-cached"));
  });

  it("activates anomaly-divergence only when anomaly threshold is met", () => {
    const activeWarnings = buildTrustWarnings({
      confidenceLabel: "MED",
      transitionWatch: "ON",
      freshnessLabel: "Mar 9, 2026 09:00 UTC",
      isFallbackSnapshot: false,
      changedSignals: [{ delta: 0.2 }],
      anomalySignals: [{ reason: "Source drift" }, { reason: "Outlier print" }],
    });
    assert.ok(activeWarnings.some((warning) => warning.id === "anomaly-divergence"));

    const clearedWarnings = buildTrustWarnings({
      confidenceLabel: "MED",
      transitionWatch: "ON",
      freshnessLabel: "Mar 9, 2026 09:00 UTC",
      isFallbackSnapshot: false,
      changedSignals: [{ delta: 0.2 }],
      anomalySignals: [{ reason: "Source drift" }],
    });
    assert.ok(!clearedWarnings.some((warning) => warning.id === "anomaly-divergence"));
  });
});
