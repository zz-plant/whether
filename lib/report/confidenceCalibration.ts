import { z } from "zod";
import rawCalibrationMonths from "../../data/confidence_record_months.json";
import { DEFAULT_THRESHOLDS } from "../regimeEngineCore";
import { resolveDistanceToFlip } from "./confidence";

/**
 * What the published confidence percent is worth, measured against the record.
 *
 * The percent is `55 + distance-to-the-nearest-regime-boundary`, capped at 92.
 * It has never been checked against whether calls at a given distance actually
 * held, and docs/agents/lessons/regime-scoring.md has carried that as the open work since the scale was
 * written. This is the check, run over the month-end readings in
 * `data/summary_archive.json` (177 from 2012-01 to 2026-09 as of 2026-10-09, so 176
 * month-to-month comparisons; `countRecord` in lib/report/trackRecord.ts gives the
 * current counts, and tests/recordCounts.test.ts holds the two sources together).
 *
 * The answer is not that the number is miscalibrated by some factor. It is that
 * it does not measure what its name implies, in two separate ways:
 *
 *  - **It understates, in every band.** Month-to-month the published regime held
 *    169 times in 176 (as of the September 2026 close). Every bucket's observed hold rate sits above the percent
 *    those months reported, and above its 95% interval — the closest band is the
 *    ceiling, still 7 points low.
 *  - **It does not order the outcome.** Calls at 0-5 points from a boundary held
 *    11 of 11. Calls at 5-10 held 7 of 10. Distance is supposed to be the whole
 *    signal, and across the two least-confident bands it runs backwards.
 *
 * The archive also cannot support re-fitting the number: seven changes since
 * 2012 is not enough to estimate a probability per band, and a curve fitted to
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
  /**
   * The month-ends behind `months` and `held`, oldest first: each one's conditions
   * and the next month's. The trust strip draws one square per entry beside the
   * count, so the drawing and the sentence are the same months, counted once.
   */
  entries: CalibrationEntry[];
};

/** One month-end in a band: its conditions, and the conditions a month later. */
export type CalibrationEntry = { asOf: string; regime: string; next: string };

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

export type CalibrationMonth = z.infer<typeof calibrationMonthSchema>;

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

/** The month-end rows the extract holds, in date order. The one input every calibration question reads. */
export const calibrationMonthRows = (): CalibrationMonth[] =>
  z.array(calibrationMonthSchema).catch([]).parse(rawCalibrationMonths);

const bucketFor = (distance: number): number => {
  for (let index = BUCKET_EDGES.length - 1; index >= 0; index -= 1) {
    if (distance >= BUCKET_EDGES[index]) return index;
  }
  return 0;
};

/** The bands with their held counts, over whichever months a question is asking about. */
export const calibrationBuckets = (months: CalibrationMonth[]): ConfidenceCalibrationBucket[] => {
  const buckets: ConfidenceCalibrationBucket[] = BUCKET_EDGES.map((from, index) => ({
    from,
    to: index + 1 < BUCKET_EDGES.length ? BUCKET_EDGES[index + 1] : null,
    months: 0,
    held: 0,
    entries: [],
  }));

  for (let index = 0; index + 1 < months.length; index += 1) {
    const month = months[index];
    const following = months[index + 1];
    /* Both exist inside the loop's bounds; the guard keeps the reads checked. */
    if (!month || !following) continue;
    const distance = resolveDistanceToFlip({
      scores: { tightness: month.tightness, riskAppetite: month.riskAppetite },
      thresholds: {
        tightnessRegime: DEFAULT_THRESHOLDS.tightnessRegime,
        riskAppetiteRegime: DEFAULT_THRESHOLDS.riskAppetiteRegime,
      },
    });
    const bucket = buckets[bucketFor(distance)];
    if (!bucket) continue;
    const next = following.regime;
    bucket.months += 1;
    if (next === month.regime) bucket.held += 1;
    bucket.entries.push({ asOf: month.asOf, regime: month.regime, next });
  }

  return buckets;
};

let cached: ConfidenceCalibrationBucket[] | null = null;

/** The bands, each with how many month-ends landed in it and how many held. */
export const confidenceCalibration = (): ConfidenceCalibrationBucket[] =>
  (cached ??= calibrationBuckets(calibrationMonthRows()));

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

/**
 * A distance group as `/calibration`'s table prints it under "Points from the line": "0 to
 * 5", "37 or more". One wording for the table, its chart and `/trust`'s choice of groups.
 */
export const formatCalibrationGroup = ({ from, to }: { from: number; to: number | null }) =>
  to === null ? `${from} or more` : `${from} to ${to}`;

/** The same group with its unit, where no column header carries it: "10 to 20 points". */
export const formatCalibrationDistance = (group: { from: number; to: number | null }) =>
  `${formatCalibrationGroup(group)} points`;

/** The query key `/trust` carries a picked distance group in: the group's lower edge. */
export const CALIBRATION_DISTANCE_PARAM = "distance";

/**
 * The link that picks a group on `/trust`: the page's query as it stands with the group's
 * key set, or dropped for the default group so it keeps the plain URL, plus `extra` (the
 * open fold the group sits in), landing on the choice itself.
 */
export const buildCalibrationChoiceHref = ({
  path,
  params,
  group,
  extra = {},
}: {
  path: string;
  params: Record<string, string | undefined> | undefined;
  group: Pick<CalibrationChoiceGroup, "from" | "isDefault">;
  extra?: Record<string, string>;
}) => {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params ?? {})) {
    if (typeof value === "string") query.set(key, value);
  }
  if (group.isDefault) query.delete(CALIBRATION_DISTANCE_PARAM);
  else query.set(CALIBRATION_DISTANCE_PARAM, String(group.from));
  for (const [key, value] of Object.entries(extra)) query.set(key, value);
  const search = query.toString();
  return `${path}${search ? `?${search}` : ""}#distance-held`;
};

/** The lower edge of the group a distance falls in. */
export const calibrationGroupFor = (distance: number): number => BUCKET_EDGES[bucketFor(distance)] ?? 0;

/*
 * The answer before the count, as a person would give it (editorial-guardrails, "Questions
 * and answers"): how often, in a word, then the months. A count of past months, never a
 * chance.
 */
const describeHeldShare = (held: number, months: number) => {
  if (held === months) return "Every month";
  if (held === 0) return "Never";
  const share = held / months;
  if (share >= 0.7) return "Mostly";
  if (share > 0.5) return "More often than not";
  if (share === 0.5) return "Half the time";
  return "Less often than not";
};

export type CalibrationChoiceGroup = {
  from: number;
  to: number | null;
  /** "10 to 20 points". */
  label: string;
  held: number;
  months: number;
  entries: CalibrationEntry[];
  /** The group this week's distance falls in. */
  thisWeek: boolean;
  /** The group shown with no `?distance=`: this week's, or the first when this week has no distance. */
  isDefault: boolean;
  selected: boolean;
  /** The answer, then the count in the trust strip's words at this group's distance: "Mostly: conditions held 7 of 10 months at 5 to 10 points." */
  sentence: string;
};

/**
 * Every distance group with month-ends in it, for a reader to pick one and see how often
 * conditions held there (2026-11-18). The trust strip quotes this week's group only; this
 * lays the others beside it, each counted from the same entries the strip's squares draw.
 * `distance` is the one the strip looks up (`calibrationForDistance`), so the group picked
 * by default is the one the strip quotes. `requested` is the URL's group, kept only when it
 * names one.
 */
export const buildCalibrationChoice = ({
  distance,
  requested,
}: {
  distance: number | null | undefined;
  requested: string | undefined;
}): CalibrationChoiceGroup[] => {
  const groups = confidenceCalibration().filter((bucket) => bucket.months > 0);
  const thisWeek = typeof distance === "number" ? calibrationGroupFor(distance) : null;
  const fallback = groups.some((group) => group.from === thisWeek) ? thisWeek : (groups[0]?.from ?? null);
  const asked = requested === undefined || requested === "" ? Number.NaN : Number(requested);
  const selected = groups.some((group) => group.from === asked) ? asked : fallback;
  return groups.map((group) => {
    const label = formatCalibrationDistance(group);
    return {
      from: group.from,
      to: group.to,
      label,
      held: group.held,
      months: group.months,
      entries: group.entries,
      thisWeek: group.from === thisWeek,
      isDefault: group.from === fallback,
      selected: group.from === selected,
      sentence: `${describeHeldShare(group.held, group.months)}: conditions held ${group.held} of ${group.months} months at ${label}.`,
    };
  });
};
