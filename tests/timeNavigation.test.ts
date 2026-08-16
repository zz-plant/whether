import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { loadReportDataSafe } from "../lib/report/reportData";
import { getPublishedBriefs, buildPublishedBriefPath } from "../lib/report/publishedBriefs";
import { buildTimeMachineHref, parseTimeMachineRequest } from "../lib/timeMachine/timeMachineSelection";

describe("time navigation and historical replay", () => {
  it("computes previous snapshot and report dynamics for historical selections", async () => {
    const result = await loadReportDataSafe({ month: "10", year: "2024" });
    assert.equal(result.ok, true);
    if (!result.ok) return;

    const data = result.data;
    assert.ok(data.historicalSelection, "historicalSelection should be present");
    assert.equal(data.historicalSelection?.month, 10);
    assert.equal(data.historicalSelection?.year, 2024);

    // Dynamics should have been computed against the prior snapshot (Sept 2024)
    assert.ok(data.reportDynamics, "reportDynamics should be defined");
    assert.ok(Array.isArray(data.reportDynamics.changedSignals), "changedSignals should be an array");
    assert.ok(
      typeof data.assessment.scores.tightness === "number",
      "tightness score should be a number"
    );
  });

  it("builds time machine handoff links preserving month and year", () => {
    const request = parseTimeMachineRequest({ month: "6", year: "2023" });
    assert.ok(request);
    const operateHref = buildTimeMachineHref("/operate", request);
    assert.equal(operateHref, "/operate?month=6&year=2023");

    const signalsHref = buildTimeMachineHref("/signals", request);
    assert.equal(signalsHref, "/signals?month=6&year=2023");
  });

  it("provides immutable published briefs with citable permalinks", () => {
    const briefs = getPublishedBriefs();
    assert.ok(briefs.length > 0, "should have published briefs");

    const first = briefs[0];
    assert.ok(first.slug);
    assert.ok(first.headline);
    assert.ok(first.recordDateLabel);
    assert.equal(buildPublishedBriefPath(first.slug), `/brief/${first.slug}`);
  });

  it("slices regime series across timeline zoom presets", async () => {
    const { getTimeMachineRegimeSeries } = await import("../lib/timeMachine/timeMachineCache");
    const series1Y = getTimeMachineRegimeSeries(12);
    assert.equal(series1Y.length, 12, "1Y preset should return 12 months");

    const series3Y = getTimeMachineRegimeSeries(36);
    assert.equal(series3Y.length, 36, "3Y preset should return 36 months");

    const series5Y = getTimeMachineRegimeSeries(60);
    assert.equal(series5Y.length, 60, "5Y preset should return 60 months");

    const seriesMax = getTimeMachineRegimeSeries(180);
    assert.ok(seriesMax.length > 100, "MAX preset should return full historical dataset");
    assert.ok(seriesMax[0].recordDate < seriesMax[seriesMax.length - 1].recordDate, "Series should be chronological");
  });
});
