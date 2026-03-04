import { parseThresholdsFromSearchParams } from "../../thresholds";
import { loadMacroSeries } from "../../macroSnapshot";
import { snapshotData } from "../../snapshot";
import { fetchTreasuryData } from "../../treasury/treasuryClient";
import {
  DEFAULT_REGIME_SERIES_MONTHS,
  getLatestTimeMachineSnapshot,
  getTimeMachineCoverage,
  getTimeMachineMonthsByYear,
  getTimeMachineRegimeSeries,
} from "../../timeMachine/timeMachineCache";
import { parseTimeMachineRequest, resolveTimeMachineSelection } from "../../timeMachine/timeMachineSelection";
import type { ReportSearchParams } from "./reportDataTypes";

const REPORT_DATA_REVALIDATE_SECONDS = 900;

const buildLiveFetcher = () => {
  const liveFetcher: typeof fetch = (input, init) =>
    fetch(input, {
      ...init,
      next: {
        ...((init as RequestInit & { next?: { revalidate?: number } })?.next ?? {}),
        revalidate: REPORT_DATA_REVALIDATE_SECONDS,
      },
    });

  return liveFetcher;
};

export const resolveReportSelectionContext = (searchParams?: ReportSearchParams, now = new Date()) => {
  const historicalSelection = resolveTimeMachineSelection(searchParams);
  const requestedSelection = parseTimeMachineRequest(searchParams);
  const latestCache = getLatestTimeMachineSnapshot();
  const defaultMonth = latestCache?.month ?? now.getUTCMonth() + 1;
  const defaultYear = latestCache?.year ?? now.getUTCFullYear();
  const cacheCoverage = getTimeMachineCoverage();
  const cacheMonthsByYear = getTimeMachineMonthsByYear();
  const invalidHistoricalSelection = Boolean(requestedSelection && !historicalSelection);
  const selectedMonth = requestedSelection?.month ?? defaultMonth;
  const selectedYear = requestedSelection?.year ?? defaultYear;
  const thresholds = parseThresholdsFromSearchParams(searchParams);
  const regimeSeries = getTimeMachineRegimeSeries(DEFAULT_REGIME_SERIES_MONTHS, thresholds);

  return {
    cacheCoverage,
    cacheMonthsByYear,
    historicalSelection,
    invalidHistoricalSelection,
    requestedSelection,
    regimeSeries,
    selectedMonth,
    selectedYear,
    thresholds,
  };
};

export const loadReportInputs = async (searchParams?: ReportSearchParams, now = new Date()) => {
  const liveFetcher = buildLiveFetcher();
  const selectionContext = resolveReportSelectionContext(searchParams, now);
  const treasuryPromise = fetchTreasuryData({
    fetcher: liveFetcher,
    snapshotFallback: snapshotData,
    asOf: selectionContext.historicalSelection?.asOf,
  });
  const liveTreasuryPromise = selectionContext.historicalSelection
    ? fetchTreasuryData({ snapshotFallback: snapshotData, fetcher: liveFetcher })
    : null;

  const [treasury, liveTreasury, macroSeries] = await Promise.all([
    treasuryPromise,
    liveTreasuryPromise ?? treasuryPromise,
    loadMacroSeries(liveFetcher),
  ]);

  return {
    ...selectionContext,
    liveTreasury,
    macroSeries,
    treasury,
  };
};
