import { fetchTreasuryData } from "../treasury/treasuryClient";
import { computeLatestYearOverYear, fetchFredCsv, findLatestFredRow, parseFredCsvRows } from "../fred";
import type { SignalEntitySnapshot, SignalFamily } from "./types";

type FamilyFetcher = (fetcher: typeof fetch, ingestedAt: string) => Promise<SignalEntitySnapshot[]>;

// Latest-value reads need only the newest observation; 90 days covers the
// sparsest (monthly) series with margin. YoY needs the exact prior-year row,
// so it fetches 430 days to include it plus publication lag.
const LATEST_VALUE_LOOKBACK_DAYS = 90;
const YEAR_OVER_YEAR_LOOKBACK_DAYS = 430;

const readFredLatestValue = async (seriesId: string, fetcher: typeof fetch) => {
  const csv = await fetchFredCsv(fetcher, seriesId, { lookbackDays: LATEST_VALUE_LOOKBACK_DAYS });
  return findLatestFredRow(csv);
};

const readFredLatestYearOverYear = async (seriesId: string, fetcher: typeof fetch) => {
  const csv = await fetchFredCsv(fetcher, seriesId, { lookbackDays: YEAR_OVER_YEAR_LOOKBACK_DAYS });
  return computeLatestYearOverYear(parseFredCsvRows(csv), seriesId);
};

const fetchRates: FamilyFetcher = async (fetcher, ingestedAt) => {
  const ids: Array<{ signalKey: SignalEntitySnapshot["signalKey"]; seriesId: string }> = [
    { signalKey: "TREASURY_1M", seriesId: "DGS1MO" },
    { signalKey: "TREASURY_3M", seriesId: "DGS3MO" },
    { signalKey: "TREASURY_2Y", seriesId: "DGS2" },
    { signalKey: "TREASURY_10Y", seriesId: "DGS10" },
  ];

  const fromFred = async (): Promise<SignalEntitySnapshot[]> => {
    const results = await Promise.all(
      ids.map(async ({ signalKey, seriesId }) => {
        const { observedAt, value } = await readFredLatestValue(seriesId, fetcher);
        return {
          signalKey,
          family: "rates" as const,
          value,
          unit: "%" as const,
          source: { label: "FRED", url: `https://fred.stlouisfed.org/series/${seriesId}`, seriesId },
          observedAt,
          ingestedAt,
          quality: "observed" as const,
          confidence: "high" as const,
        } satisfies SignalEntitySnapshot;
      }),
    );
    return results;
  };

  const fromFallback = async (): Promise<SignalEntitySnapshot[]> => {
    const data = await fetchTreasuryData({ fetcher });
    const yieldMap: Record<string, { signalKey: SignalEntitySnapshot["signalKey"]; seriesId: string }> = {
      oneMonth: { signalKey: "TREASURY_1M", seriesId: "DGS1MO" },
      threeMonth: { signalKey: "TREASURY_3M", seriesId: "DGS3MO" },
      twoYear: { signalKey: "TREASURY_2Y", seriesId: "DGS2" },
      tenYear: { signalKey: "TREASURY_10Y", seriesId: "DGS10" },
    };

    const results: SignalEntitySnapshot[] = [];
    for (const [key, value] of Object.entries(data.yields)) {
      const mapping = yieldMap[key];
      if (!mapping || value == null) continue;
      results.push({
        signalKey: mapping.signalKey,
        family: "rates",
        value,
        unit: "%",
        source: { label: data.source, url: `https://fred.stlouisfed.org/series/${mapping.seriesId}`, seriesId: mapping.seriesId },
        observedAt: `${data.record_date}T00:00:00.000Z`,
        ingestedAt,
        quality: "observed",
        confidence: "high",
      });
    }
    return results;
  };

  try {
    return await fromFred();
  } catch {
    console.warn("[families] FRED CSV failed for rates, trying treasuryClient fallback");
    try {
      return await fromFallback();
    } catch {
      return [];
    }
  }
};

const fetchSpreads: FamilyFetcher = async (fetcher, ingestedAt) => {
  const [bbb, hy] = await Promise.all([readFredLatestValue("BAA10Y", fetcher), readFredLatestValue("BAMLH0A0HYM2", fetcher)]);
  return [
    {
      signalKey: "BBB_CREDIT_SPREAD",
      family: "spreads",
      value: bbb.value,
      unit: "bps",
      source: { label: "FRED", url: "https://fred.stlouisfed.org/series/BAA10Y", seriesId: "BAA10Y" },
      observedAt: bbb.observedAt,
      ingestedAt,
      quality: "observed",
      confidence: "high",
    },
    {
      signalKey: "HY_CREDIT_SPREAD",
      family: "spreads",
      value: hy.value,
      unit: "bps",
      source: { label: "FRED", url: "https://fred.stlouisfed.org/series/BAMLH0A0HYM2", seriesId: "BAMLH0A0HYM2" },
      observedAt: hy.observedAt,
      ingestedAt,
      quality: "observed",
      confidence: "high",
    },
  ];
};

const fetchLabor: FamilyFetcher = async (fetcher, ingestedAt) => {
  const unemployment = await readFredLatestValue("UNRATE", fetcher);
  return [
    {
      signalKey: "UNEMPLOYMENT_RATE",
      family: "labor",
      value: unemployment.value,
      unit: "%",
      source: { label: "FRED", url: "https://fred.stlouisfed.org/series/UNRATE", seriesId: "UNRATE" },
      observedAt: unemployment.observedAt,
      ingestedAt,
      quality: "observed",
      confidence: "high",
    },
  ];
};

const fetchInflation: FamilyFetcher = async (fetcher, ingestedAt) => {
  const cpi = await readFredLatestYearOverYear("CPIAUCSL", fetcher);
  return [
    {
      signalKey: "CPI_YOY",
      family: "inflation",
      value: cpi.value,
      unit: "%",
      source: { label: "FRED", url: "https://fred.stlouisfed.org/series/CPIAUCSL", seriesId: "CPIAUCSL" },
      observedAt: cpi.observedAt,
      ingestedAt,
      quality: "observed",
      confidence: "high",
    },
  ];
};

const fetchCredit: FamilyFetcher = async (fetcher, ingestedAt) => {
  const nfci = await readFredLatestValue("NFCI", fetcher);
  return [
    {
      signalKey: "CHICAGO_FCI",
      family: "credit",
      value: nfci.value,
      unit: "index",
      source: { label: "FRED", url: "https://fred.stlouisfed.org/series/NFCI", seriesId: "NFCI" },
      observedAt: nfci.observedAt,
      ingestedAt,
      quality: "observed",
      confidence: "high",
    },
  ];
};

const fetchVolatility: FamilyFetcher = async (fetcher, ingestedAt) => {
  const vix = await readFredLatestValue("VIXCLS", fetcher);
  return [
    {
      signalKey: "VIX_INDEX",
      family: "volatility",
      value: vix.value,
      unit: "index",
      source: { label: "FRED", url: "https://fred.stlouisfed.org/series/VIXCLS", seriesId: "VIXCLS" },
      observedAt: vix.observedAt,
      ingestedAt,
      quality: "observed",
      confidence: "high",
    },
  ];
};

const familyFetchers: Record<SignalFamily, FamilyFetcher> = {
  rates: fetchRates,
  spreads: fetchSpreads,
  labor: fetchLabor,
  inflation: fetchInflation,
  credit: fetchCredit,
  volatility: fetchVolatility,
};

export const pullSignalFamily = (family: SignalFamily, fetcher: typeof fetch, ingestedAt: string) =>
  familyFetchers[family](fetcher, ingestedAt);

export const SIGNAL_FAMILIES: SignalFamily[] = ["rates", "spreads", "labor", "inflation", "credit", "volatility"];
