import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { loadReportData } from "../lib/report/reportData";

const FETCH_DISABLED_ERROR = "Network disabled for report viewmodel tests";
const originalFetch = globalThis.fetch;

before(() => {
  globalThis.fetch = (async () => {
    throw new Error(FETCH_DISABLED_ERROR);
  }) as typeof fetch;
});

after(() => {
  globalThis.fetch = originalFetch;
});

describe("report view-model compatibility bundle", () => {
  it("exposes posture, operations, historical, and provenance partitions", async () => {
    const reportData = await loadReportData({});
    const bundle = reportData.viewModels;

    assert.ok(bundle, "viewModels should be present");
    assert.deepEqual(bundle.postureEvidence.assessment, reportData.assessment);
    assert.deepEqual(bundle.operations.startItems, reportData.startItems);
    assert.deepEqual(bundle.operations.stopItems, reportData.stopItems);
    assert.deepEqual(bundle.operations.fenceItems, reportData.fenceItems);
    assert.deepEqual(bundle.historical.cacheCoverage, reportData.cacheCoverage);
    assert.deepEqual(bundle.historical.regimeSeries, reportData.regimeSeries);
    assert.equal(bundle.provenance.recordDateLabel, reportData.recordDateLabel);
    assert.equal(bundle.provenance.fetchedAtLabel, reportData.fetchedAtLabel);
    assert.deepEqual(bundle.provenance.treasuryProvenance, reportData.treasuryProvenance);
  });

  it("keeps historical selection context aligned with legacy top-level fields", async () => {
    const reportData = await loadReportData({ month: "10", year: "2024" });
    const historical = reportData.viewModels.historical;

    assert.deepEqual(historical.historicalSelection, reportData.historicalSelection);
    assert.deepEqual(historical.requestedSelection, reportData.requestedSelection);
    assert.equal(historical.invalidHistoricalSelection, reportData.invalidHistoricalSelection);
    assert.equal(historical.selectedMonth, reportData.selectedMonth);
    assert.equal(historical.selectedYear, reportData.selectedYear);
    assert.deepEqual(historical.historicalComparison, reportData.historicalComparison);
    assert.deepEqual(historical.lastYearComparison, reportData.lastYearComparison);
  });
});
