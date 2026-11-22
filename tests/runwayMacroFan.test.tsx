import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { buildRunwayMacroFanModel, computeMacroSpellBenchmark } from "../lib/report/runwayMacroFan";
import { RunwayMacroFanChart, RunwayMacroFanGhost } from "../app/operate/components/runwayMacroFanChart";
import { getTimeMachineRegimeSeries } from "../lib/timeMachine/timeMachineCache";

describe("runway macro fan model & chart", () => {
  const series = getTimeMachineRegimeSeries(Number.MAX_SAFE_INTEGER);

  it("computes macro spell benchmark durations from historical record", () => {
    const benchmark = computeMacroSpellBenchmark(series, "SCARCITY");
    assert.ok(benchmark);
    assert.equal(benchmark.regime, "SCARCITY");
    assert.ok(benchmark.medianPastSpellMonths > 0);
    assert.ok(benchmark.longestPastSpellMonths >= benchmark.medianPastSpellMonths);
    assert.ok(benchmark.label.includes("stretch"));
  });

  it("projects cash depletion points and detects cash-out month", () => {
    const model = buildRunwayMacroFanModel({
      initialCashUsd: 1_200_000,
      netMonthlyBurnUsd: 100_000, // 12 months runway
      newMonthlyCostUsd: 50_000, // with decision: 150k burn -> 8 months runway
      maxMonths: 24,
      macroSeries: series,
      currentRegime: "SCARCITY",
    });

    assert.equal(model.initialCashUsd, 1_200_000);
    assert.equal(model.baselineCashOutMonth, 12);
    assert.equal(model.committedCashOutMonth, 8);
    assert.ok(model.benchmark !== null);

    const html = renderToStaticMarkup(<RunwayMacroFanChart model={model} />);
    assert.match(html, /data-runway-macro-fan/);
    assert.match(html, /Runway against how long past conditions lasted/);
    assert.match(html, /Cash-out: month 12/);
    assert.match(html, /with decision: month 8/);
    assert.match(html, /Past median \(\d+ mo\)/);
  });

  /*
   * The empty /operate/financial state (2026-11-21). The survival fan used to
   * appear only after three or four figures were entered, so the reader never
   * saw what the chart would do. The ghost draws the real historical spell
   * bands, and a dashed comparison line ending at the median — never a made-up
   * company figure.
   */
  it("teases the historical spell bands before a reader enters any figure", () => {
    const benchmark = computeMacroSpellBenchmark(series, "SCARCITY");
    assert.ok(benchmark);
    const html = renderToStaticMarkup(<RunwayMacroFanGhost benchmark={benchmark} />);
    assert.match(html, /data-runway-macro-fan-ghost/);
    assert.match(html, /How long past Freezing spells lasted/);
    assert.match(html, /Median \d+ mo/);
    assert.match(html, /Past median \(\d+ mo\)/);
    assert.match(html, /Your cash curve/);
    assert.match(html, /stroke-dasharray="5 5"/, "the placeholder is visibly dashed");
    assert.match(html, /Enter cash, spend and revenue/);
  });

  it("draws no bands when the condition has never completed a spell", () => {
    const benchmark = computeMacroSpellBenchmark(series, "SCARCITY");
    assert.ok(benchmark);
    assert.equal(renderToStaticMarkup(<RunwayMacroFanGhost benchmark={{ ...benchmark, completedSpellCount: 0 }} />), "");
    assert.equal(renderToStaticMarkup(<RunwayMacroFanGhost benchmark={null} />), "");
  });
});
