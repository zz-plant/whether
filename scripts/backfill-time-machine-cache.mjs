import { writeFile } from "node:fs/promises";

const OUTPUT_PATH = "data/time_machine_cache.json";
const SOURCE = "https://fred.stlouisfed.org";
const START_YEAR_MONTH = process.env.TIME_MACHINE_START ?? "2018-01";
const MAX_MONTHS = Number.parseInt(process.env.TIME_MACHINE_MAX_MONTHS ?? "120", 10);

const SERIES_ENDPOINTS = {
  oneMonth: "https://fred.stlouisfed.org/graph/fredgraph.csv?id=DGS1MO",
  threeMonth: "https://fred.stlouisfed.org/graph/fredgraph.csv?id=DGS3MO",
  twoYear: "https://fred.stlouisfed.org/graph/fredgraph.csv?id=DGS2",
  tenYear: "https://fred.stlouisfed.org/graph/fredgraph.csv?id=DGS10",
};

const parseStartYearMonth = (value) => {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(value);
  if (!match) {
    throw new Error(`Invalid TIME_MACHINE_START value: ${value}`);
  }

  return {
    year: Number.parseInt(match[1], 10),
    month: Number.parseInt(match[2], 10),
  };
};

const parseFredCsv = (csv) => {
  const [header, ...rows] = csv.trim().split(/\r?\n/);
  if (!header) {
    return new Map();
  }

  const values = new Map();
  for (const row of rows) {
    const [date, value] = row.split(",");
    if (!date || !value || value === ".") {
      continue;
    }
    const numeric = Number(value);
    if (Number.isFinite(numeric)) {
      values.set(date, numeric);
    }
  }

  return values;
};

const fetchSeries = async (endpoint) => {
  const response = await fetch(endpoint);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${endpoint}: ${response.status}`);
  }
  const csv = await response.text();
  return parseFredCsv(csv);
};

const parseUtcDate = (date) => {
  const time = Date.parse(`${date}T00:00:00Z`);
  return Number.isFinite(time) ? time : Number.NaN;
};

const buildMonthKey = (date) => date.slice(0, 7);

const buildSnapshots = ({
  oneMonthSeries,
  threeMonthSeries,
  twoYearSeries,
  tenYearSeries,
  startYear,
  startMonth,
}) => {
  const commonDates = [];
  for (const date of oneMonthSeries.keys()) {
    if (
      threeMonthSeries.has(date) &&
      twoYearSeries.has(date) &&
      tenYearSeries.has(date)
    ) {
      commonDates.push(date);
    }
  }

  commonDates.sort((a, b) => parseUtcDate(a) - parseUtcDate(b));

  const startIso = `${String(startYear).padStart(4, "0")}-${String(startMonth).padStart(2, "0")}-01`;
  const startTime = parseUtcDate(startIso);
  const latestByMonth = new Map();

  for (const date of commonDates) {
    const dateTime = parseUtcDate(date);
    if (!Number.isFinite(dateTime) || dateTime < startTime) {
      continue;
    }
    latestByMonth.set(buildMonthKey(date), date);
  }

  const monthDates = [...latestByMonth.values()].sort(
    (a, b) => parseUtcDate(a) - parseUtcDate(b),
  );
  const trimmedMonthDates =
    MAX_MONTHS > 0 && monthDates.length > MAX_MONTHS
      ? monthDates.slice(-MAX_MONTHS)
      : monthDates;
  const fetchedAt = new Date().toISOString();

  return trimmedMonthDates.map((recordDate) => {
    const [yearText, monthText] = recordDate.split("-");
    return {
      year: Number.parseInt(yearText, 10),
      month: Number.parseInt(monthText, 10),
      source: SOURCE,
      record_date: recordDate,
      fetched_at: fetchedAt,
      isLive: false,
      yields: {
        oneMonth: oneMonthSeries.get(recordDate) ?? null,
        threeMonth: threeMonthSeries.get(recordDate) ?? null,
        twoYear: twoYearSeries.get(recordDate) ?? null,
        tenYear: tenYearSeries.get(recordDate) ?? null,
      },
    };
  });
};

const main = async () => {
  const { year: startYear, month: startMonth } = parseStartYearMonth(START_YEAR_MONTH);
  const [oneMonthSeries, threeMonthSeries, twoYearSeries, tenYearSeries] = await Promise.all([
    fetchSeries(SERIES_ENDPOINTS.oneMonth),
    fetchSeries(SERIES_ENDPOINTS.threeMonth),
    fetchSeries(SERIES_ENDPOINTS.twoYear),
    fetchSeries(SERIES_ENDPOINTS.tenYear),
  ]);

  const snapshots = buildSnapshots({
    oneMonthSeries,
    threeMonthSeries,
    twoYearSeries,
    tenYearSeries,
    startYear,
    startMonth,
  });

  if (snapshots.length === 0) {
    throw new Error("No time machine snapshots were generated.");
  }

  await writeFile(OUTPUT_PATH, `${JSON.stringify(snapshots, null, 2)}\n`, "utf8");

  const first = snapshots[0];
  const last = snapshots.at(-1);
  console.log(
    `[backfill-time-machine-cache] wrote ${snapshots.length} snapshots (${first?.record_date} -> ${last?.record_date})`,
  );
};

main().catch((error) => {
  console.error("[backfill-time-machine-cache] failed");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
