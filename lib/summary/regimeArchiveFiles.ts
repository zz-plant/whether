/**
 * The data files an archive refresh writes, and the order it writes them in.
 *
 * Each archive generator is a stage here: it reads the files it extends from a store,
 * merges what its replay built (`regimeArchiveReplay.ts`), and writes the next version
 * of each. The scripts run a stage against the working tree (`scripts/dataFileStore.ts`);
 * the Worker runs all four against the base branch as it stands, in memory, and commits
 * whatever changed (`regimeArchiveRebuild.ts`). One implementation, so the two writers
 * cannot drift the way the three generators' copies of the series parser did.
 *
 * Until 2026-11-03 these writers were `scripts/summaryArchive.ts`, `summaryFile.ts`,
 * `refreshDerivedSummaryHistory.ts` and the cache writer in `generateMonthlySummaries.ts`,
 * reading and writing the disk directly. Every file is two-space JSON with a trailing
 * newline except the calibration extract, which is one line, as before.
 *
 * A stored file is read as loosely as its key needs and kept as read: a carried entry
 * (`carryUnchangedEntries`) is the stored object itself, so its bytes do not move. A file
 * that is not a JSON array of entries throws rather than being treated as empty, which
 * would silently drop its history from a merge.
 */
import { z } from "zod";
import { extractCalibrationMonths } from "../report/confidenceCalibration";
import { carryUnchangedEntries } from "./carryUnchangedEntries";
import { buildPostureArchivePeriods, buildPostureArchiveYears, buildPostureOgTimeline } from "./postureArchiveIndex";
import type {
  MonthlySummaryArchiveEntry,
  QuarterlySummaryArchiveEntry,
  TimeMachineCacheEntry,
  WeeklySummaryArchiveEntry,
  YearlySummaryArchiveEntry,
} from "./regimeArchiveReplay";
import { parseSummaryArchive } from "./summaryArchive";

export const REGIME_ARCHIVE_PATHS = {
  summaryArchive: "data/summary_archive.json",
  calibrationMonths: "data/confidence_record_months.json",
  timeMachineCache: "data/time_machine_cache.json",
  weeklyPostureHistory: "data/summary_memory_rail_weekly.json",
  monthlyRegimeHistory: "data/summary_monthly_regime_history.json",
  postureArchiveIndex: "data/posture_archive_index.json",
  postureArchiveYears: "data/posture_archive_years.json",
  postureOgTimeline: "data/posture_og_timeline.json",
} as const;

/** Where a stage reads and writes. `read` answers null for a file that does not exist yet. */
export type ArchiveFileStore = {
  read(path: string): Promise<string | null>;
  write(path: string, content: string): Promise<void>;
};

type ArchiveMode = "replace" | "merge";

const toJsonFile = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;

const guardFor =
  <Row>(schema: z.ZodType<Row>) =>
  (value: unknown): value is Row =>
    schema.safeParse(value).success;

const readRows = <Row>(text: string | null, path: string, isRow: (value: unknown) => value is Row): Row[] => {
  if (text === null) {
    return [];
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`${path} is not JSON`);
  }
  if (!Array.isArray(parsed)) {
    throw new Error(`${path} is not a JSON array`);
  }
  const items: unknown[] = parsed;
  const rows = items.filter(isRow);
  if (rows.length !== items.length) {
    throw new Error(`${path} has ${items.length - rows.length} entries that do not validate`);
  }
  return rows;
};

const byAsOfAscending = (left: { asOf: string }, right: { asOf: string }) =>
  new Date(left.asOf).getTime() - new Date(right.asOf).getTime();

const byRecordDateAscending = (left: { record_date: string }, right: { record_date: string }) =>
  new Date(left.record_date).getTime() - new Date(right.record_date).getTime();

// ── The Time Machine cache ──

const isCacheRow = guardFor(z.looseObject({ year: z.number(), month: z.number(), record_date: z.string() }));
type CacheRow = { year: number; month: number; record_date: string };

const nextTimeMachineCache = (existing: string | null, entries: TimeMachineCacheEntry[], mode: ArchiveMode) => {
  const getKey = (entry: CacheRow) => `${entry.year}-${entry.month}`;
  const stored = readRows(existing, REGIME_ARCHIVE_PATHS.timeMachineCache, isCacheRow);
  const incoming = carryUnchangedEntries(stored, entries, getKey);
  const nextEntries =
    mode === "merge" ? Array.from(new Map([...stored, ...incoming].map((entry) => [getKey(entry), entry])).values()) : incoming;
  return toJsonFile(nextEntries.sort(byRecordDateAscending));
};

// ── The summary archive and the calibration extract ──

const CADENCES = ["weekly", "monthly", "quarterly", "yearly"] as const;
type Cadence = (typeof CADENCES)[number];

const isStoredArchiveRow = guardFor(
  z.looseObject({
    cadence: z.enum(CADENCES),
    year: z.number(),
    week: z.number().optional(),
    month: z.number().optional(),
    quarter: z.number().optional(),
    asOf: z.string(),
    record_date: z.string(),
    summary: z.looseObject({ regime: z.enum(["SCARCITY", "DEFENSIVE", "VOLATILE", "EXPANSION"]) }),
    tightness: z.number().optional(),
    riskAppetite: z.number().optional(),
  }),
);
type ArchiveRow = {
  cadence: Cadence;
  year: number;
  week?: number;
  month?: number;
  quarter?: number;
  asOf: string;
  record_date: string;
  summary: { regime: string };
  tightness?: number;
  riskAppetite?: number;
};

// Periods ending on the same day keep one order whichever generator ran last.
const CADENCE_ORDER: Record<Cadence, number> = { monthly: 0, weekly: 1, quarterly: 2, yearly: 3 };

const getArchiveKey = (entry: ArchiveRow) => {
  switch (entry.cadence) {
    case "weekly":
      return `${entry.year}-${entry.week}`;
    case "monthly":
      return `${entry.year}-${entry.month}`;
    case "quarterly":
      return `${entry.year}-${entry.quarter}`;
    case "yearly":
      return `${entry.year}`;
  }
};

/** Which engine calibration scored the entry; absent on entries written before 2026-10-06. */
const carryEngineStamp = ({ engineVersion }: { engineVersion?: string }) =>
  engineVersion === undefined ? {} : { engineVersion };

const mergeCadenceEntries = (existing: ArchiveRow[], cadence: Cadence, incoming: ArchiveRow[]) => {
  const preserved = existing.filter((entry) => entry.cadence !== cadence);
  const merged = new Map<string, ArchiveRow>();
  existing.filter((entry) => entry.cadence === cadence).forEach((entry) => merged.set(getArchiveKey(entry), entry));
  incoming.forEach((entry) => merged.set(getArchiveKey(entry), entry));
  return [...preserved, ...merged.values()];
};

type ArchiveCadenceEntries = {
  weeklyEntries?: WeeklySummaryArchiveEntry[];
  monthlyEntries?: MonthlySummaryArchiveEntry[];
  quarterlyEntries?: QuarterlySummaryArchiveEntry[];
  yearlyEntries?: YearlySummaryArchiveEntry[];
};

const nextSummaryArchive = (
  existing: string | null,
  { weeklyEntries, monthlyEntries, quarterlyEntries, yearlyEntries }: ArchiveCadenceEntries,
  mode: ArchiveMode,
) => {
  const stored = readRows(existing, REGIME_ARCHIVE_PATHS.summaryArchive, isStoredArchiveRow);
  const replaced = new Set<Cadence>([
    ...(weeklyEntries ? ["weekly" as const] : []),
    ...(monthlyEntries ? ["monthly" as const] : []),
    ...(quarterlyEntries ? ["quarterly" as const] : []),
    ...(yearlyEntries ? ["yearly" as const] : []),
  ]);
  let nextEntries: ArchiveRow[] = mode === "replace" ? stored.filter((entry) => !replaced.has(entry.cadence)) : stored;

  const add = (cadence: Cadence, normalized: ArchiveRow[]) => {
    nextEntries = mode === "merge" ? mergeCadenceEntries(nextEntries, cadence, normalized) : [...nextEntries, ...normalized];
  };

  if (weeklyEntries) {
    add(
      "weekly",
      weeklyEntries.map((entry) => ({
        cadence: "weekly",
        year: entry.year,
        week: entry.week,
        asOf: entry.asOf,
        record_date: entry.record_date,
        summary: entry.summary,
        ...carryEngineStamp(entry),
      })),
    );
  }

  if (monthlyEntries) {
    add(
      "monthly",
      monthlyEntries.map((entry) => ({
        cadence: "monthly",
        year: entry.year,
        month: entry.month,
        asOf: entry.asOf,
        record_date: entry.record_date,
        summary: entry.summary,
        tightness: entry.tightness,
        riskAppetite: entry.riskAppetite,
        ...carryEngineStamp(entry),
      })),
    );
  }

  if (quarterlyEntries) {
    add(
      "quarterly",
      quarterlyEntries.map((entry) => ({
        cadence: "quarterly",
        year: entry.year,
        quarter: entry.quarter,
        asOf: entry.asOf,
        record_date: entry.record_date,
        summary: entry.summary,
        ...carryEngineStamp(entry),
      })),
    );
  }

  if (yearlyEntries) {
    add(
      "yearly",
      yearlyEntries.map((entry) => ({
        cadence: "yearly",
        year: entry.year,
        asOf: entry.asOf,
        record_date: entry.record_date,
        summary: entry.summary,
        ...carryEngineStamp(entry),
      })),
    );
  }

  const sorted = carryUnchangedEntries(stored, nextEntries, (entry) => `${entry.cadence}:${getArchiveKey(entry)}`).sort(
    (a, b) => byAsOfAscending(a, b) || CADENCE_ORDER[a.cadence] - CADENCE_ORDER[b.cadence],
  );
  return {
    archive: toJsonFile(sorted),
    // The confidence record reads a five-field extract of this file so its pages do not
    // bundle 5MB (lib/report/confidenceCalibration.ts). Written with the archive, so no
    // stage can refresh one and forget the other; tests/confidenceCalibration.test.ts
    // fails if they ever disagree.
    calibrationMonths: `${JSON.stringify(extractCalibrationMonths(sorted))}\n`,
  };
};

const writeSummaryArchive = async (store: ArchiveFileStore, entries: ArchiveCadenceEntries, mode: ArchiveMode) => {
  const { archive, calibrationMonths } = nextSummaryArchive(await store.read(REGIME_ARCHIVE_PATHS.summaryArchive), entries, mode);
  await store.write(REGIME_ARCHIVE_PATHS.summaryArchive, archive);
  await store.write(REGIME_ARCHIVE_PATHS.calibrationMonths, calibrationMonths);
  return archive;
};

// ── The month rail and the homepage's four weeks, derived from the archive ──

const toDerivedHistoryEntry = (entry: ArchiveRow) => ({
  record_date: entry.record_date,
  regime: entry.summary.regime,
  tightness: entry.tightness,
  riskAppetite: entry.riskAppetite,
});

const writeDerivedSummaryHistory = async (store: ArchiveFileStore, archive: string) => {
  const rows = readRows(archive, REGIME_ARCHIVE_PATHS.summaryArchive, isStoredArchiveRow);
  const history = (cadence: Cadence) => rows.filter((entry) => entry.cadence === cadence).sort(byAsOfAscending);

  await store.write(
    REGIME_ARCHIVE_PATHS.weeklyPostureHistory,
    toJsonFile(history("weekly").slice(-4).map(toDerivedHistoryEntry).sort(byRecordDateAscending)),
  );
  await store.write(
    REGIME_ARCHIVE_PATHS.monthlyRegimeHistory,
    toJsonFile(history("monthly").map(toDerivedHistoryEntry).sort(byRecordDateAscending)),
  );
};

// ── The stages, one per generator, in the order a refresh runs them ──

/** `scripts/generateMonthlySummaries.ts`: the archive's month-ends, the Time Machine cache, the derived history. */
export const writeMonthlyArchive = async (
  store: ArchiveFileStore,
  built: { entries: MonthlySummaryArchiveEntry[]; timeMachineEntries: TimeMachineCacheEntry[]; mode: ArchiveMode },
) => {
  const archive = await writeSummaryArchive(store, { monthlyEntries: built.entries }, built.mode);
  await store.write(
    REGIME_ARCHIVE_PATHS.timeMachineCache,
    nextTimeMachineCache(await store.read(REGIME_ARCHIVE_PATHS.timeMachineCache), built.timeMachineEntries, built.mode),
  );
  await writeDerivedSummaryHistory(store, archive);
};

/** `scripts/generateWeeklySummaries.ts`: the archive's weeks, the derived history. */
export const writeWeeklyArchive = async (
  store: ArchiveFileStore,
  built: { entries: WeeklySummaryArchiveEntry[]; mode: ArchiveMode },
) => {
  const archive = await writeSummaryArchive(store, { weeklyEntries: built.entries }, built.mode);
  await writeDerivedSummaryHistory(store, archive);
};

/** `scripts/generateQuarterlyYearlySummaries.ts`: the archive's quarters and years. */
export const writeQuarterlyYearlyArchive = async (
  store: ArchiveFileStore,
  built: { quarterlyEntries: QuarterlySummaryArchiveEntry[]; yearlyEntries: YearlySummaryArchiveEntry[]; mode: ArchiveMode },
) => {
  await writeSummaryArchive(store, { quarterlyEntries: built.quarterlyEntries, yearlyEntries: built.yearlyEntries }, built.mode);
};

/**
 * `bun run archive:index`: the `/history/[period]` index, the year list, the OG timeline and
 * the calibration extract, from the archive as the store now holds it. Refuses an archive that
 * does not validate rather than writing an empty index.
 */
export const writePostureArchiveIndex = async (store: ArchiveFileStore) => {
  const text = await store.read(REGIME_ARCHIVE_PATHS.summaryArchive);
  if (text === null) {
    throw new Error(`${REGIME_ARCHIVE_PATHS.summaryArchive} is missing; refusing to write an empty index.`);
  }
  const raw: unknown = JSON.parse(text);
  const archive = parseSummaryArchive(raw);
  if (!archive.length) {
    throw new Error("Summary archive is empty or failed validation; refusing to write an empty index.");
  }

  const periods = buildPostureArchivePeriods(archive);
  const calibrationMonths = extractCalibrationMonths(raw);
  await store.write(REGIME_ARCHIVE_PATHS.postureArchiveIndex, toJsonFile(periods));
  await store.write(REGIME_ARCHIVE_PATHS.postureArchiveYears, toJsonFile(buildPostureArchiveYears(periods)));
  await store.write(REGIME_ARCHIVE_PATHS.postureOgTimeline, toJsonFile(buildPostureOgTimeline(periods)));
  await store.write(REGIME_ARCHIVE_PATHS.calibrationMonths, `${JSON.stringify(calibrationMonths)}\n`);
  return { periods, calibrationMonths };
};
