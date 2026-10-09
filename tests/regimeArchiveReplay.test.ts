import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "bun:test";
import { z } from "zod";

import timeMachineCache from "../data/time_machine_cache.json";
import summaryArchive from "../data/summary_archive.json";
import { ENGINE_VERSION } from "../lib/regimeEngineCore";
import { getTimeMachineRegimeSeries } from "../lib/timeMachine/timeMachineCache";
import { parseSeries, type TreasuryDatasets } from "../scripts/regimeArchiveContext";
import {
  buildMonthlyArchive,
  buildQuarterlyYearlyArchive,
  buildWeeklyArchive,
} from "../scripts/regimeArchiveReplay";

/*
 * The archive generators replayed offline, on series rebuilt from the bundled
 * data, and held to what is on record.
 *
 * The generators fetch daily FRED series, which the suite cannot reach and the
 * bundle does not carry. What the bundle does carry is every observation the
 * archives were scored from: each month-end's yields, the base-rate pair the
 * tightening-speed term chose, the daily VIX tail behind the stress veto, and
 * the weekly Chicago Fed observations around each month-end (on the record
 * basis since engine-2026-10-09b), and the yields each weekly, quarterly and
 * yearly entry was read at. Rebuilt into
 * FRED-shaped series, they are enough for the generators' own code
 * (`scripts/regimeArchiveReplay.ts`, the code the scripts run) to reproduce the
 * records. Before 2026-10-06 the replay loop existed four times (the runtime
 * walk and three generators); this is what pins the one copy left to the data
 * all four produced.
 */

const YieldsSchema = z.object({
  oneMonth: z.number().nullable().optional(),
  threeMonth: z.number().nullable().optional(),
  twoYear: z.number().nullable().optional(),
  tenYear: z.number().nullable().optional(),
});
const HistoryPointSchema = z.object({ date: z.string(), value: z.number().nullable() });
const CacheEntrySchema = z.object({
  year: z.number(),
  month: z.number(),
  vix: z.number().nullable().optional(),
  vixHistory: z.array(HistoryPointSchema).nullable().optional(),
  baseRateVelocityWindow: z
    .object({ compareDate: z.string(), compareValue: z.number(), latestDate: z.string(), latestValue: z.number() })
    .nullable()
    .optional(),
  chicagoFci: z.number().nullable().optional(),
  chicagoFciHistory: z.array(HistoryPointSchema).nullable().optional(),
  source: z.string(),
  record_date: z.string(),
  isLive: z.boolean().optional(),
  yields: YieldsSchema,
});
const ArchiveEntrySchema = z.object({
  cadence: z.enum(["weekly", "monthly", "quarterly", "yearly"]),
  year: z.number(),
  week: z.number().optional(),
  month: z.number().optional(),
  quarter: z.number().optional(),
  asOf: z.string(),
  record_date: z.string(),
  tightness: z.number().optional(),
  riskAppetite: z.number().optional(),
  summary: z.object({
    regime: z.string(),
    inputs: z.array(
      z.object({ id: z.string(), label: z.string(), value: z.number().nullable(), recordDate: z.string() }),
    ),
  }),
});

const cache = z.array(CacheEntrySchema).parse(timeMachineCache);
const archive = z.array(ArchiveEntrySchema).parse(summaryArchive);

/** FRED-shaped series rebuilt from the bundle; a missing print is an empty field, as FRED writes it. */
const buildBundledSeries = () => {
  const series = {
    DGS1MO: new Map<string, number | null>(),
    DGS3MO: new Map<string, number | null>(),
    DGS2: new Map<string, number | null>(),
    DGS10: new Map<string, number | null>(),
    VIXCLS: new Map<string, number | null>(),
    NFCI: new Map<string, number | null>(),
  };
  const conflicts: string[] = [];
  const put = (map: Map<string, number | null>, date: string, value: number | null | undefined) => {
    if (value === undefined) return;
    if (map.has(date)) {
      if (map.get(date) !== value) conflicts.push(`${date}: ${map.get(date)} vs ${value}`);
      return;
    }
    map.set(date, value);
  };

  for (const entry of cache) {
    put(series.DGS1MO, entry.record_date, entry.yields.oneMonth ?? null);
    put(series.DGS3MO, entry.record_date, entry.yields.threeMonth ?? null);
    put(series.DGS2, entry.record_date, entry.yields.twoYear ?? null);
    put(series.DGS10, entry.record_date, entry.yields.tenYear ?? null);
    const window = entry.baseRateVelocityWindow;
    if (window) {
      put(series.DGS1MO, window.compareDate, window.compareValue);
      put(series.DGS1MO, window.latestDate, window.latestValue);
    }
    for (const point of entry.vixHistory ?? []) put(series.VIXCLS, point.date, point.value);
    for (const point of entry.chicagoFciHistory ?? []) put(series.NFCI, point.date, point.value);
  }
  for (const entry of archive) {
    if (entry.cadence === "monthly") continue;
    for (const input of entry.summary.inputs) {
      if (input.value === null) continue;
      if (input.id === "base-rate") {
        put(input.label.includes("(3M)") ? series.DGS3MO : series.DGS1MO, input.recordDate, input.value);
      } else if (input.id === "two-year") {
        put(series.DGS2, input.recordDate, input.value);
      } else if (input.id === "ten-year") {
        put(series.DGS10, input.recordDate, input.value);
      }
    }
  }

  const toDataset = (id: keyof typeof series) =>
    parseSeries(
      [
        `observation_date,${id}`,
        ...[...series[id].entries()]
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([date, value]) => `${date},${value === null ? "" : value}`),
      ].join("\n"),
    );
  const datasets: TreasuryDatasets = {
    oneMonth: toDataset("DGS1MO"),
    threeMonth: toDataset("DGS3MO"),
    twoYear: toDataset("DGS2"),
    tenYear: toDataset("DGS10"),
  };
  return { datasets, vixDataset: toDataset("VIXCLS"), chicagoFciDataset: toDataset("NFCI"), conflicts };
};

// The archives on record were regenerated on Oct 9, 2026 (engine-2026-10-09b); the weekly range ends at the Friday it covers.
const NOW = new Date("2026-10-09T18:29:43.682Z");

// A partial-run variable in the environment would scope what the builders write.
const HISTORY_ENV = ["HISTORY_START_YEAR", "HISTORY_END_YEAR", "HISTORY_WEEKS"];
const savedEnv = new Map<string, string | undefined>();

const bundled = buildBundledSeries();

describe("archive replay from bundled series", () => {
  beforeEach(() => {
    for (const key of HISTORY_ENV) {
      savedEnv.set(key, process.env[key]);
      delete process.env[key];
    }
  });
  afterEach(() => {
    for (const [key, value] of savedEnv) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it("rebuilds the series without contradicting itself", () => {
    // Every source that names an observation agrees on its value.
    assert.deepEqual(bundled.conflicts, []);
  });

  it("reproduces every monthly record: regime, both scores and the record date", () => {
    const { entries } = buildMonthlyArchive({ ...bundled, now: NOW });
    const onRecord = archive.filter((entry) => entry.cadence === "monthly");
    assert.equal(entries.length, onRecord.length);
    assert.ok(entries.length > 170);

    const replayed = new Map(entries.map((entry) => [`${entry.year}-${entry.month}`, entry]));
    const diffs = onRecord.flatMap((entry) => {
      const replay = replayed.get(`${entry.year}-${entry.month}`);
      const expected = `${entry.record_date} ${entry.summary.regime} ${entry.tightness}/${entry.riskAppetite}`;
      const actual = replay
        ? `${replay.record_date} ${replay.summary.regime} ${replay.tightness}/${replay.riskAppetite}`
        : "missing";
      return expected === actual ? [] : [`${entry.year}-${entry.month}: replay ${actual} vs record ${expected}`];
    });
    assert.deepEqual(diffs, []);
    // Each entry names the calibration that scored it.
    assert.deepEqual([...new Set(entries.map((entry) => entry.engineVersion))], [ENGINE_VERSION]);
  });

  it("writes the Time Machine cache the runtime walk reads, entry for entry", () => {
    const { timeMachineEntries } = buildMonthlyArchive({ ...bundled, now: NOW });
    // Everything but the fetch timestamp: yields, VIX close and tail, and the velocity pair.
    const comparable = (entries: readonly z.input<typeof CacheEntrySchema>[]) =>
      entries.map(({ year, month, vix, vixHistory, baseRateVelocityWindow, chicagoFci, chicagoFciHistory, source, record_date, yields }) => ({
        year,
        month,
        vix,
        vixHistory,
        baseRateVelocityWindow,
        chicagoFci,
        chicagoFciHistory,
        source,
        record_date,
        yields,
      }));
    assert.deepEqual(comparable(timeMachineEntries), comparable(cache));
  });

  /*
   * The weekly, quarterly and yearly entries store no scores, so these hold the
   * regime and the record date. Two limits on what the bundle can replay, and
   * the comparisons stop at them rather than pass by luck:
   *  - The daily VIX tails end at the last cached month-end, so a week after it
   *    replays without the stress adjustments the archive scored with.
   *  - VIX tails start in late 2011, so 2010-2011 quarters replay without them;
   *    those periods still thread the walk, they are just not compared.
   * The weekly base-rate series is also thinner than FRED's (month-ends, weekly
   * record dates and the stored pairs), which can move the tightening-speed
   * term's comparison point; the regimes on record do not depend on it today.
   */
  it("reproduces every weekly regime and record date the bundle can replay", () => {
    const { entries } = buildWeeklyArchive({ ...bundled, now: NOW });
    const onRecord = archive.filter((entry) => entry.cadence === "weekly");
    assert.equal(entries.length, onRecord.length);

    const lastVixCovered = cache.at(-1)?.record_date ?? "";
    const replayed = new Map(entries.map((entry) => [entry.asOf, entry]));
    const compared = onRecord.filter((entry) => entry.asOf <= lastVixCovered);
    assert.ok(compared.length > 400, `only ${compared.length} weeks fall inside the bundled VIX tails`);

    const diffs = compared.flatMap((entry) => {
      const replay = replayed.get(entry.asOf);
      return replay?.record_date === entry.record_date && replay.summary.regime === entry.summary.regime
        ? []
        : [`${entry.asOf}: replay ${replay?.record_date} ${replay?.summary.regime} vs record ${entry.record_date} ${entry.summary.regime}`];
    });
    assert.deepEqual(diffs, []);
  });

  it("reproduces every quarterly and yearly regime and record date from 2012", () => {
    const { quarterlyEntries, yearlyEntries } = buildQuarterlyYearlyArchive({ ...bundled, now: NOW });
    const cases = [
      {
        onRecord: archive.filter((entry) => entry.cadence === "quarterly"),
        replayed: quarterlyEntries,
        key: (entry: { year: number; quarter?: number }) => `${entry.year}-Q${entry.quarter}`,
      },
      {
        onRecord: archive.filter((entry) => entry.cadence === "yearly"),
        replayed: yearlyEntries,
        key: (entry: { year: number }) => `${entry.year}`,
      },
    ];
    for (const { onRecord, replayed, key } of cases) {
      assert.equal(replayed.length, onRecord.length);
      const byKey = new Map<string, { record_date: string; summary: { regime: string } }>(
        replayed.map((entry) => [key(entry), entry]),
      );
      const compared = onRecord.filter((entry) => entry.year >= 2012);
      assert.ok(compared.length > 10);
      const diffs = compared.flatMap((entry) => {
        const replay = byKey.get(key(entry));
        return replay?.record_date === entry.record_date && replay.summary.regime === entry.summary.regime
          ? []
          : [`${key(entry)}: replay ${replay?.record_date} ${replay?.summary.regime} vs record ${entry.record_date} ${entry.summary.regime}`];
      });
      assert.deepEqual(diffs, []);
    }
  });

  /* The regenerated archive (engine-2026-10-09b, the Chicago Fed index backfilled) is a
     function of the series and the clock: two replays write the same bytes. */
  it("replays to the same bytes twice from the same series and clock", () => {
    for (const build of [buildMonthlyArchive, buildWeeklyArchive, buildQuarterlyYearlyArchive]) {
      assert.equal(JSON.stringify(build({ ...bundled, now: NOW })), JSON.stringify(build({ ...bundled, now: NOW })));
    }
  });

  it("carries the Chicago Fed index into every cached month, as a reader had it", () => {
    const { timeMachineEntries } = buildMonthlyArchive({ ...bundled, now: NOW });
    assert.deepEqual(timeMachineEntries.filter((entry) => typeof entry.chicagoFci !== "number").map((entry) => entry.record_date), []);
    /* Mar 31, 2020: the Mar 27 week was published Apr 1, so the month reads Mar 20's 0.175. */
    const march2020 = timeMachineEntries.find((entry) => entry.record_date === "2020-03-31");
    assert.equal(march2020?.chicagoFci, 0.175);
    assert.equal(march2020?.chicagoFciHistory?.some((point) => point.date > "2020-03-26"), false);
  });

  it("scores each month the way the runtime walk does", () => {
    const { entries } = buildMonthlyArchive({ ...bundled, now: NOW });
    const walk = new Map(
      getTimeMachineRegimeSeries(Number.MAX_SAFE_INTEGER).map((entry) => [`${entry.year}-${entry.month}`, entry]),
    );
    const diffs = entries.flatMap((entry) => {
      const runtime = walk.get(`${entry.year}-${entry.month}`);
      return runtime?.regime === entry.summary.regime &&
        runtime.tightness === entry.tightness &&
        runtime.riskAppetite === entry.riskAppetite
        ? []
        : [`${entry.year}-${entry.month}`];
    });
    assert.deepEqual(diffs, []);
  });
});
