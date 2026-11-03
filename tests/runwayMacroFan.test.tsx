import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { buildRunwayMacroFanModel, computeMacroSpellBenchmark } from "../lib/report/runwayMacroFan";
import { RunwayMacroFanChart } from "../app/operate/components/runwayMacroFanChart";
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
    assert.match(html, /Runway depletion vs\. cycle duration/);
    assert.match(html, /Cash-out: month 12/);
    assert.match(html, /with decision: month 8/);
    assert.match(html, /Past median \(\d+ mo\)/);
  });
});
