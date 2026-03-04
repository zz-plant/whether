import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { loadReportData } from "../lib/report/reportData";
import goldenFixture from "./fixtures/reportData.golden.json";

const FETCH_DISABLED_ERROR = "Network disabled for reportData golden tests";
const originalFetch = globalThis.fetch;

before(() => {
  globalThis.fetch = (async () => {
    throw new Error(FETCH_DISABLED_ERROR);
  }) as typeof fetch;
});

after(() => {
  globalThis.fetch = originalFetch;
});

type ReportData = Awaited<ReturnType<typeof loadReportData>>;

const projectReportData = (reportData: ReportData) => {
  const cacheMonthsByYear = Object.fromEntries(
    Object.entries(reportData.cacheMonthsByYear)
      .sort(([yearA], [yearB]) => Number(yearA) - Number(yearB))
      .map(([year, months]) => [year, [...months].sort((a, b) => a - b)]),
  );
  const regimeSeriesFirst = reportData.regimeSeries[0] ?? null;
  const regimeSeriesLast = reportData.regimeSeries.at(-1) ?? null;

  return {
    assessment: {
      regime: reportData.assessment.regime,
      scores: reportData.assessment.scores,
      diagnostics: reportData.assessment.diagnostics,
      constraints: reportData.assessment.constraints,
      policyAssessment: {
        posture: reportData.assessment.policyAssessment.posture,
        band: reportData.assessment.policyAssessment.band,
        composites: reportData.assessment.policyAssessment.composites,
        refusal: reportData.assessment.policyAssessment.refusal,
      },
    },
    selection: {
      historicalSelection: reportData.historicalSelection,
      requestedSelection: reportData.requestedSelection,
      invalidHistoricalSelection: reportData.invalidHistoricalSelection,
      selectedMonth: reportData.selectedMonth,
      selectedYear: reportData.selectedYear,
    },
    treasury: {
      source: reportData.treasury.source,
      record_date: reportData.treasury.record_date,
      isLive: reportData.treasury.isLive,
      yields: reportData.treasury.yields,
      fallback_reason: reportData.treasury.fallback_reason ?? null,
    },
    macroSeries: reportData.macroSeries.map((series) => ({
      id: series.id,
      value: series.value,
      record_date: series.record_date,
      isLive: series.isLive,
      sourceLabel: series.sourceLabel,
    })),
    playbook: {
      startItems: reportData.startItems,
      stopItems: reportData.stopItems,
      fenceItems: reportData.fenceItems,
    },
    reportDynamics: reportData.reportDynamics,
    regimeTrend: reportData.regimeTrend,
    statusLabel: reportData.statusLabel,
    flags: {
      hasHistoricalComparison: Boolean(reportData.historicalComparison),
      hasRegimeAlert: Boolean(reportData.regimeAlert),
      hasLastYearComparison: Boolean(reportData.lastYearComparison),
      hasLiveAssessment: Boolean(reportData.liveAssessment),
    },
    cache: {
      coverage: reportData.cacheCoverage,
      monthsByYear: cacheMonthsByYear,
      regimeSeries: {
        count: reportData.regimeSeries.length,
        first:
          regimeSeriesFirst && {
            year: regimeSeriesFirst.year,
            month: regimeSeriesFirst.month,
            recordDate: regimeSeriesFirst.recordDate,
            regime: regimeSeriesFirst.regime,
          },
        last:
          regimeSeriesLast && {
            year: regimeSeriesLast.year,
            month: regimeSeriesLast.month,
            recordDate: regimeSeriesLast.recordDate,
            regime: regimeSeriesLast.regime,
          },
      },
    },
  };
};

describe("loadReportData golden contracts", () => {
  it("keeps default snapshot projection stable", async () => {
    const reportData = await loadReportData({});
    const projected = projectReportData(reportData);
    assert.deepEqual(projected, goldenFixture.defaultSnapshot);
  });

  it("keeps historical snapshot projection stable", async () => {
    const reportData = await loadReportData({ month: "10", year: "2024" });
    const projected = projectReportData(reportData);
    assert.deepEqual(projected, goldenFixture.historicalSnapshot);
  });

  it("keeps missing historical selection projection stable", async () => {
    const reportData = await loadReportData({ month: "1", year: "2025" });
    const projected = projectReportData(reportData);
    assert.deepEqual(projected, goldenFixture.missingHistoricalSelection);
  });
});
