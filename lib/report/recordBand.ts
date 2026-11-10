import type { RegimeKey } from "../types";
import { encodeRecordBandMonth, isLightField, recordBandLineY, smoothRecordSeries } from "./recordBandCodec";
import { countRecord } from "./trackRecord";

export { RECORD_BAND_HEIGHT } from "./recordBandCodec";

/**
 * The record band (docs/design/rebuild-covenant.md): every month-end reading as one
 * engraved strip under the navigation of every route. Each stretch of conditions is a
 * field in that condition's ink, and two bundles of fine lines cross it: risk appetite
 * above and funding pressure below, so easier is up, as on every other drawing.
 *
 * This module builds the server's drawing and nothing else. It reads no store and names
 * no colour: the component maps a regime to its fill through `data-regime`, and the two
 * line inks are constants of the plate, the same in both themes. Where a line sits is
 * `recordBandLineY` (recordBandCodec.ts), which History's canvas shares.
 */
type RecordBandEntry = {
  recordDate: string;
  regime: RegimeKey;
  tightness: number;
  riskAppetite: number;
};

type RecordBandBrief = { recordDate: string; regime: RegimeKey; slug: string };

type RecordBandPath = {
  d: string;
  /** Whether the stretch under this piece of line is a light field, which takes the dark line. */
  light: boolean;
};

type RecordBandGeometry = {
  /** ViewBox width: one unit per sample. The height is always `RECORD_BAND_HEIGHT`. */
  width: number;
  samplesPerMonth: number;
  paths: RecordBandPath[];
};

type RecordBandRun = { regime: RegimeKey; start: number; length: number };

type RecordBandModel = {
  months: number;
  firstDate: string;
  lastDate: string;
  changes: number;
  runs: RecordBandRun[];
  /** The engraving for a wide band: three samples a month, so each condition's line pattern draws. */
  wide: RecordBandGeometry;
  /** The engraving for a phone: one sample a month and no pattern, which would alias at 2px a month. */
  narrow: RecordBandGeometry;
  /** Each January on the band, as a share of its width. */
  years: { year: number; at: number }[];
  /** Each published brief, as a share of the band's width; one past the last month-end sits at the edge. */
  marks: { at: number; regime: RegimeKey; slug: string; recordDate: string }[];
  /** Where publication began, as a share of the width; null with no brief. */
  publishedFrom: number | null;
  /** One token a month for the readout (recordBandCodec.ts). */
  encoded: string;
};

const clamp = (value: number, low: number, high: number) => Math.min(Math.max(value, low), high);

const recordBandRuns = (entries: readonly RecordBandEntry[]): RecordBandRun[] => {
  const runs: RecordBandRun[] = [];
  entries.forEach((entry, index) => {
    const last = runs.at(-1);
    if (last && last.regime === entry.regime) last.length += 1;
    else runs.push({ regime: entry.regime, start: index, length: 1 });
  });
  return runs;
};

const buildGeometry = (
  entries: readonly RecordBandEntry[],
  runs: readonly RecordBandRun[],
  { samplesPerMonth, lines, pattern, spread }: { samplesPerMonth: number; lines: number; pattern: boolean; spread: number },
): RecordBandGeometry => {
  const series = {
    risk: smoothRecordSeries(entries.map((entry) => entry.riskAppetite)),
    pressure: smoothRecordSeries(entries.map((entry) => entry.tightness)),
  };
  const yAt = (bundle: "risk" | "pressure", line: number, sample: number, regime: RegimeKey) =>
    Math.round(recordBandLineY({ bundle, line, month: sample / samplesPerMonth, regime, series, pattern, spread }));
  const paths: RecordBandPath[] = [];
  for (const bundle of ["risk", "pressure"] as const) {
    for (let line = 0; line < lines; line += 1) {
      /* One piece of line per stretch, so each takes the ink its field calls for. A piece
         is its first point and then one step a sample: "1 dy", in whole units. */
      for (const run of runs) {
        const from = run.start * samplesPerMonth;
        const to = (run.start + run.length) * samplesPerMonth;
        const start = yAt(bundle, line, from, run.regime);
        let previous = start;
        const steps: string[] = [];
        for (let sample = from + 1; sample <= to; sample += 1) {
          const y = yAt(bundle, line, sample, run.regime);
          steps.push(`1 ${y - previous}`);
          previous = y;
        }
        paths.push({ d: `M${from} ${start}l${steps.join(" ")}`, light: isLightField(run.regime) });
      }
    }
  }
  return { width: entries.length * samplesPerMonth, samplesPerMonth, paths };
};

/** A date's place on the band as a share of its width; the first month starts at 0. */
const shareOf = (date: string, first: RecordBandEntry, months: number) => {
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  const day = Number(date.slice(8, 10)) || 1;
  const firstYear = Number(first.recordDate.slice(0, 4));
  const firstMonth = Number(first.recordDate.slice(5, 7));
  const slot = (year - firstYear) * 12 + (month - firstMonth) + (day - 1) / 31;
  return clamp(slot / months, 0, 1);
};

export const buildRecordBand = (
  entries: readonly RecordBandEntry[],
  briefs: readonly RecordBandBrief[] = [],
): RecordBandModel | null => {
  if (entries.length < 2) return null;
  const sorted = [...entries].sort((a, b) => a.recordDate.localeCompare(b.recordDate));
  const runs = recordBandRuns(sorted);
  const first = sorted.at(0);
  const last = sorted.at(-1);
  if (!first || !last) return null;
  const months = sorted.length;
  const years = sorted.flatMap((entry, index) =>
    entry.recordDate.slice(5, 7) === "01" ? [{ year: Number(entry.recordDate.slice(0, 4)), at: index / months }] : [],
  );
  const marks = [...briefs]
    .sort((a, b) => a.recordDate.localeCompare(b.recordDate))
    .map((brief) => ({ at: shareOf(brief.recordDate, first, months), regime: brief.regime, slug: brief.slug, recordDate: brief.recordDate }));
  return {
    months,
    firstDate: first.recordDate,
    lastDate: last.recordDate,
    changes: countRecord(sorted)?.changes ?? Math.max(runs.length - 1, 0),
    runs,
    wide: buildGeometry(sorted, runs, { samplesPerMonth: 3, lines: 5, pattern: true, spread: 1 }),
    narrow: buildGeometry(sorted, runs, { samplesPerMonth: 1, lines: 4, pattern: false, spread: 1.2 }),
    years,
    marks,
    publishedFrom: marks.at(0)?.at ?? null,
    encoded: sorted.map(encodeRecordBandMonth).join(""),
  };
};

/**
 * Where the published briefs and the month-end record name different conditions for the
 * same month. The record is scored with today's formula and the briefs stay as written,
 * so the two can differ, and History says so beside the entries it affects. It states
 * the two facts and claims no cause.
 */
type RecordDifference = { published: RegimeKey; recorded: RegimeKey; briefs: number; months: string[] };

export const findRecordDifferences = (
  entries: readonly Pick<RecordBandEntry, "recordDate" | "regime">[],
  briefs: readonly Pick<RecordBandBrief, "recordDate" | "regime">[],
): RecordDifference[] => {
  const byMonth = new Map(entries.map((entry) => [entry.recordDate.slice(0, 7), entry.regime]));
  const differences: RecordDifference[] = [];
  for (const brief of [...briefs].sort((a, b) => a.recordDate.localeCompare(b.recordDate))) {
    const month = brief.recordDate.slice(0, 7);
    const recorded = byMonth.get(month);
    if (!recorded || recorded === brief.regime) continue;
    const existing = differences.find((difference) => difference.published === brief.regime && difference.recorded === recorded);
    if (existing) {
      existing.briefs += 1;
      if (!existing.months.includes(month)) existing.months.push(month);
    } else {
      differences.push({ published: brief.regime, recorded, briefs: 1, months: [month] });
    }
  }
  return differences;
};
