import { fetchWithTimeout } from "../fetchWithTimeout";
import type { SignalEntitySnapshot, SignalFamily } from "./types";

const MACRO_SERIES_REVALIDATE_SECONDS = 900;
const YEAR_OVER_YEAR_PERCENT_MULTIPLIER = 100;

type FamilyFetcher = (fetcher: typeof fetch, ingestedAt: string) => Promise<SignalEntitySnapshot[]>;

const readFredLatestValue = async (seriesId: string, fetcher: typeof fetch) => {
  const response = await fetchWithTimeout(
    fetcher,
    `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${encodeURIComponent(seriesId)}`,
    { next: { revalidate: MACRO_SERIES_REVALIDATE_SECONDS } },
  );

  if (!response.ok) {
    throw new Error(`FRED request failed for ${seriesId}`);
  }

  const csv = await response.text();
  const rows = csv.trim().split(/\r?\n/).slice(1);
  const latestRow = rows
    .map((row) => row.split(","))
    .reverse()
    .find((parts) => parts.length >= 2 && parts[1] !== "." && !Number.isNaN(Number(parts[1])));

  if (!latestRow) {
    throw new Error(`No FRED rows for ${seriesId}`);
  }

  return {
    observedAt: `${latestRow[0]}T00:00:00.000Z`,
    value: Number(latestRow[1]),
  };
};

const readFredLatestYearOverYear = async (seriesId: string, fetcher: typeof fetch) => {
  const response = await fetchWithTimeout(
    fetcher,
    `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${encodeURIComponent(seriesId)}`,
    { next: { revalidate: MACRO_SERIES_REVALIDATE_SECONDS } },
  );

  if (!response.ok) {
    throw new Error(`FRED request failed for ${seriesId}`);
  }

  const csv = await response.text();
  const rows = csv
    .trim()
    .split(/\r?\n/)
    .slice(1)
    .map((row) => row.split(","))
    .filter((parts) => parts.length >= 2 && parts[1] !== "." && !Number.isNaN(Number(parts[1])))
    .map((parts) => ({ date: parts[0] ?? "", value: Number(parts[1]) }))
    .filter((point) => Number.isFinite(point.value))
    .sort((a, b) => a.date.localeCompare(b.date));

  const latest = rows[rows.length - 1];
  if (!latest) {
    throw new Error(`No FRED rows for ${seriesId}`);
  }

  const latestDate = new Date(latest.date + "T00:00:00.000Z");
  const priorYear = new Date(latestDate);
  priorYear.setUTCFullYear(priorYear.getUTCFullYear() - 1);
  const priorKey = priorYear.toISOString().slice(0, 10);
  const priorPoint = rows.find((r) => r.date === priorKey);

  if (!priorPoint || priorPoint.value === 0) {
    throw new Error(`No prior year FRED row for ${seriesId}`);
  }

  return {
    observedAt: `${latest.date}T00:00:00.000Z`,
    value: ((latest.value - priorPoint.value) / priorPoint.value) * YEAR_OVER_YEAR_PERCENT_MULTIPLIER,
  };
};

const fetchRates: FamilyFetcher = async (fetcher, ingestedAt) => {
  const ids = ["DGS1MO", "DGS3MO", "DGS2", "DGS10"] as const;
  const [oneMonth, threeMonth, twoYear, tenYear] = await Promise.all(ids.map((id) => readFredLatestValue(id, fetcher)));

  return [
    {
      signalKey: "TREASURY_1M",
      family: "rates",
      value: oneMonth.value,
      unit: "%",
      source: { label: "FRED", url: "https://fred.stlouisfed.org/series/DGS1MO", seriesId: "DGS1MO" },
      observedAt: oneMonth.observedAt,
      ingestedAt,
      quality: "observed",
      confidence: "high",
    },
    {
      signalKey: "TREASURY_3M",
      family: "rates",
      value: threeMonth.value,
      unit: "%",
      source: { label: "FRED", url: "https://fred.stlouisfed.org/series/DGS3MO", seriesId: "DGS3MO" },
      observedAt: threeMonth.observedAt,
      ingestedAt,
      quality: "observed",
      confidence: "high",
    },
    {
      signalKey: "TREASURY_2Y",
      family: "rates",
      value: twoYear.value,
      unit: "%",
      source: { label: "FRED", url: "https://fred.stlouisfed.org/series/DGS2", seriesId: "DGS2" },
      observedAt: twoYear.observedAt,
      ingestedAt,
      quality: "observed",
      confidence: "high",
    },
    {
      signalKey: "TREASURY_10Y",
      family: "rates",
      value: tenYear.value,
      unit: "%",
      source: { label: "FRED", url: "https://fred.stlouisfed.org/series/DGS10", seriesId: "DGS10" },
      observedAt: tenYear.observedAt,
      ingestedAt,
      quality: "observed",
      confidence: "high",
    },
  ];
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
