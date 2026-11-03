/**
 * FRED-shaped series rebuilt from the bundled data: every observation the archives were
 * scored from — each month-end's yields, the base-rate pair the tightening-speed term chose,
 * the daily VIX tail behind the stress veto, the weekly Chicago Fed observations around each
 * month-end, and the yields each weekly, quarterly and yearly entry was read at.
 *
 * `tests/regimeArchiveReplay.test.ts` replays the generators on these and holds them to the
 * archive on record; `tests/regimeArchivePullRequest.test.ts` serves them as FRED's CSV export
 * to the Worker's rebuild. A missing print is an empty field, as FRED writes it.
 */
import { z } from "zod";

import timeMachineCache from "../../data/time_machine_cache.json";
import summaryArchive from "../../data/summary_archive.json";
import { parseSeries, type TreasuryDatasets } from "../../lib/summary/regimeArchiveContext";

const YieldsSchema = z.object({
  oneMonth: z.number().nullable().optional(),
  threeMonth: z.number().nullable().optional(),
  twoYear: z.number().nullable().optional(),
  tenYear: z.number().nullable().optional(),
});
const HistoryPointSchema = z.object({ date: z.string(), value: z.number().nullable() });
export const CacheEntrySchema = z.object({
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

export const bundledCache = z.array(CacheEntrySchema).parse(timeMachineCache);
export const bundledArchive = z.array(ArchiveEntrySchema).parse(summaryArchive);

export type BundledSeriesId = "DGS1MO" | "DGS3MO" | "DGS2" | "DGS10" | "VIXCLS" | "NFCI";

export const buildBundledSeries = () => {
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

  for (const entry of bundledCache) {
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
  for (const entry of bundledArchive) {
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

  const toCsv = (id: BundledSeriesId) =>
    [
      `observation_date,${id}`,
      ...[...series[id].entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([date, value]) => `${date},${value === null ? "" : value}`),
    ].join("\n");
  const csv: Record<BundledSeriesId, string> = {
    DGS1MO: toCsv("DGS1MO"),
    DGS3MO: toCsv("DGS3MO"),
    DGS2: toCsv("DGS2"),
    DGS10: toCsv("DGS10"),
    VIXCLS: toCsv("VIXCLS"),
    NFCI: toCsv("NFCI"),
  };
  const toDataset = (id: BundledSeriesId) => parseSeries(csv[id]);
  const datasets: TreasuryDatasets = {
    oneMonth: toDataset("DGS1MO"),
    threeMonth: toDataset("DGS3MO"),
    twoYear: toDataset("DGS2"),
    tenYear: toDataset("DGS10"),
  };
  return { datasets, vixDataset: toDataset("VIXCLS"), chicagoFciDataset: toDataset("NFCI"), conflicts, csv };
};
