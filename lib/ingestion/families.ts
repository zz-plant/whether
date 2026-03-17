import { fetchWithTimeout } from "../fetchWithTimeout";
import type { SignalEntitySnapshot, SignalFamily } from "./types";

const MACRO_SERIES_REVALIDATE_SECONDS = 900;
const BLS_YOY_LOOKBACK_YEARS = 2;
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

const readBlsLatestValue = async (seriesId: string, fetcher: typeof fetch) => {
  const response = await fetchWithTimeout(fetcher, "https://api.bls.gov/publicAPI/v2/timeseries/data/", {
    method: "POST",
    headers: { "content-type": "application/json" },
    next: { revalidate: MACRO_SERIES_REVALIDATE_SECONDS },
    body: JSON.stringify({ seriesid: [seriesId], latest: true }),
  });

  if (!response.ok) {
    throw new Error(`BLS request failed for ${seriesId}`);
  }

  const payload = (await response.json()) as {
    Results?: { series?: Array<{ data?: Array<{ year: string; period: string; value: string }> }> };
  };

  const point = payload.Results?.series?.[0]?.data?.[0];
  if (!point?.year || !point.period || !point.value) {
    throw new Error(`No BLS rows for ${seriesId}`);
  }

  const month = point.period.replace("M", "");
  return {
    observedAt: `${point.year}-${month.padStart(2, "0")}-01T00:00:00.000Z`,
    value: Number(point.value),
  };
};

const readBlsLatestYearOverYear = async (seriesId: string, fetcher: typeof fetch) => {
  const currentYear = new Date().getUTCFullYear();
  const response = await fetchWithTimeout(fetcher, "https://api.bls.gov/publicAPI/v2/timeseries/data/", {
    method: "POST",
    headers: { "content-type": "application/json" },
    next: { revalidate: MACRO_SERIES_REVALIDATE_SECONDS },
    body: JSON.stringify({
      seriesid: [seriesId],
      startyear: String(currentYear - BLS_YOY_LOOKBACK_YEARS),
      endyear: String(currentYear),
    }),
  });

  if (!response.ok) {
    throw new Error(`BLS request failed for ${seriesId}`);
  }

  const payload = (await response.json()) as {
    Results?: { series?: Array<{ data?: Array<{ year: string; period: string; value: string }> }> };
  };

  const points = (payload.Results?.series?.[0]?.data ?? [])
    .filter((point) => /^M\d{2}$/.test(point.period) && point.period !== "M13")
    .sort((a, b) => `${b.year}${b.period}`.localeCompare(`${a.year}${a.period}`));
  const latest = points[0];

  if (!latest) {
    throw new Error(`No BLS rows for ${seriesId}`);
  }

  const previousYearPoint = points.find(
    (point) => point.period === latest.period && point.year === String(Number(latest.year) - 1),
  );

  if (!previousYearPoint) {
    throw new Error(`No prior year BLS row for ${seriesId}`);
  }

  const latestValue = Number(latest.value);
  const previousYearValue = Number(previousYearPoint.value);
  if (!Number.isFinite(latestValue) || !Number.isFinite(previousYearValue) || previousYearValue === 0) {
    throw new Error(`Invalid BLS rows for ${seriesId}`);
  }

  const month = latest.period.replace("M", "").padStart(2, "0");
  return {
    observedAt: `${latest.year}-${month}-01T00:00:00.000Z`,
    value: ((latestValue - previousYearValue) / previousYearValue) * YEAR_OVER_YEAR_PERCENT_MULTIPLIER,
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
  const unemployment = await readBlsLatestValue("LNS14000000", fetcher);
  return [
    {
      signalKey: "UNEMPLOYMENT_RATE",
      family: "labor",
      value: unemployment.value,
      unit: "%",
      source: { label: "BLS public API", url: "https://api.bls.gov/publicAPI/v2/timeseries/data/", seriesId: "LNS14000000" },
      observedAt: unemployment.observedAt,
      ingestedAt,
      quality: "observed",
      confidence: "high",
    },
  ];
};

const fetchInflation: FamilyFetcher = async (fetcher, ingestedAt) => {
  const cpi = await readBlsLatestYearOverYear("CUUR0000SA0", fetcher);
  return [
    {
      signalKey: "CPI_YOY",
      family: "inflation",
      value: cpi.value,
      unit: "%",
      source: { label: "BLS public API", url: "https://api.bls.gov/publicAPI/v2/timeseries/data/", seriesId: "CUUR0000SA0" },
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
