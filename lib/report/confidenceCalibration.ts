import { z } from "zod";
import rawCalibrationMonths from "../../data/confidence_record_months.json";
import { DEFAULT_THRESHOLDS } from "../regimeEngineCore";
import { resolveDistanceToFlip } from "./confidence";

/**
 * What the published confidence percent is worth, measured against the record.
 *
 * The percent is `55 + distance-to-the-nearest-regime-boundary`, capped at 92.
 * It has never been checked against whether calls at a given distance actually
 * held, and CLAUDE.md has carried that as the open work since the scale was
 * written. This is the check, run over the 176 month-end readings in
 * `data/summary_archive.json` (2012-01 to 2026-08).
 *
 * The answer is not that the number is miscalibrated by some factor. It is that
 * it does not measure what its name implies, in two separate ways:
 *
 *  - **It understates, in every band.** Month-to-month the published regime held
 *    169 times in 175. Every bucket's observed hold rate sits above the percent
 *    those months reported, and above its 95% interval — the closest band is the
 *    ceiling, still 7 points low.
 *  - **It does not order the outcome.** Calls at 0-5 points from a boundary held
 *    11 of 11. Calls at 5-10 held 7 of 9. Distance is supposed to be the whole
 *    signal, and across the two least-confident bands it runs backwards.
 *
 * The archive also cannot support re-fitting the number: six flips in fourteen
 * years is not enough to estimate a probability per band, and a curve fitted to
 * the base rate would report ~97% for every month, which discriminates nothing.
 * So the percent keeps measuring distance, which is an honest thing to measure,
 * and the record is published beside it rather than folded into it. An operator
 * asking "will this call change" gets a count of months, not a modelled number.
 *
 * Derived from the archive rather than baked into a constant, so the monthly
 * refresh improves it instead of dating it — but from a five-field extract of
 * it (`data/confidence_record_months.json`, written by `bun run archive:index`
 * with `extractCalibrationMonths` below), not the archive itself. Importing the
 * 5MB archive put a 4.3MB chunk on `/trust`, `/history` and `/calibration`,
 * parsed and validated on every fresh Worker instance before the first byte:
 * those were the three slowest pages in the real-user timings on 2026-09-23.
 * `tests/confidenceCalibration.test.ts` fails if the extract and the archive
 * ever disagree.
 */
type ConfidenceCalibrationBucket = {
  /** Inclusive lower bound, in tightness-equivalent points from the nearest boundary. */
  from: number;
  /** Exclusive upper bound. `null` is the open top band. */
  to: number | null;
  /** Month-end readings in this band that had a following month to compare against. */
  months: number;
  /** How many of those kept the same published regime the following month. */
  held: number;
};

/**
 * Chosen before looking at the outcomes: 5 and 12 are the labelled-confidence
 * thresholds the engine already uses (`REGIME_CONFIDENCE_NEAR_THRESHOLD`,
 * `REGIME_CONFIDENCE_MEDIUM_THRESHOLD`, rounded to 10/20 for legibility), and 37
 * is where the percent hits its ceiling and stops varying.
 */
const BUCKET_EDGES = [0, 5, 10, 20, 37] as const;

/*
 * Parsed, not asserted. Only the fields this calculation reads are described,
 * and `loose` lets every other field through untouched, so a month that is
 * missing one is skipped rather than crashing a page — the archive is
 * generated data and predates some of its own columns.
 */
const archiveMonthSchema = z.object({
  cadence: z.literal("monthly"),
  asOf: z.string(),
  tightness: z.number(),
  riskAppetite: z.number(),
  summary: z.object({ regime: z.string() }).loose(),
});

const calibrationMonthSchema = z.object({
  asOf: z.string(),
  tightness: z.number(),
  riskAppetite: z.number(),
  regime: z.string(),
});

type CalibrationMonth = z.infer<typeof calibrationMonthSchema>;

/** The month-end rows the record needs, out of a full summary archive, in date order. */
export const extractCalibrationMonths = (archive: unknown): CalibrationMonth[] =>
  z
    .array(z.unknown())
    .catch([])
    .parse(archive)
    .flatMap((row) => {
      const parsed = archiveMonthSchema.safeParse(row);
      return parsed.success
        ? [{ asOf: parsed.data.asOf, tightness: parsed.data.tightness, riskAppetite: parsed.data.riskAppetite, regime: parsed.data.summary.regime }]
        : [];
    })
    .sort((left, right) => left.asOf.localeCompare(right.asOf));

const monthlyRows = (): CalibrationMonth[] =>
  z.array(calibrationMonthSchema).catch([]).parse(rawCalibrationMonths);

const bucketFor = (distance: number): number => {
  for (let index = BUCKET_EDGES.length - 1; index >= 0; index -= 1) {
    if (distance >= BUCKET_EDGES[index]) return index;
  }
  return 0;
};

const build = (): ConfidenceCalibrationBucket[] => {
  const months = monthlyRows();
  const buckets: ConfidenceCalibrationBucket[] = BUCKET_EDGES.map((from, index) => ({
    from,
    to: index + 1 < BUCKET_EDGES.length ? BUCKET_EDGES[index + 1] : null,
    months: 0,
    held: 0,
  }));

  for (let index = 0; index + 1 < months.length; index += 1) {
    const month = months[index];
    const distance = resolveDistanceToFlip({
      scores: { tightness: month.tightness, riskAppetite: month.riskAppetite },
      thresholds: {
        tightnessRegime: DEFAULT_THRESHOLDS.tightnessRegime,
        riskAppetiteRegime: DEFAULT_THRESHOLDS.riskAppetiteRegime,
      },
    });
    const bucket = buckets[bucketFor(distance)];
    bucket.months += 1;
    if (months[index + 1].regime === month.regime) bucket.held += 1;
  }

  return buckets;
};

let cached: ConfidenceCalibrationBucket[] | null = null;

/** The bands, each with how many month-ends landed in it and how many held. */
export const confidenceCalibration = (): ConfidenceCalibrationBucket[] => (cached ??= build());

/** The band a reading at this distance belongs to, or null when the archive has none. */
export const calibrationForDistance = (distance: number): ConfidenceCalibrationBucket | null => {
  const bucket = confidenceCalibration()[bucketFor(distance)];
  return bucket && bucket.months > 0 ? bucket : null;
};

/** Every month-end compared, across all bands. The denominator for the base rate. */
export const confidenceCalibrationTotals = (): { months: number; held: number } =>
  confidenceCalibration().reduce(
    (totals, bucket) => ({ months: totals.months + bucket.months, held: totals.held + bucket.held }),
    { months: 0, held: 0 },
  );
