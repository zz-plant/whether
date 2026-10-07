import type { RegimeKey, RegimeScores } from "../regimeEngine";
import type { PublishedBrief } from "./publishedBriefs";

/**
 * The earlier reading a week's moves are measured against.
 *
 * "What changed this week" compares the reading with last week's published brief:
 * the record the archive froze from the live brief a week ago. It is like-for-like
 * only when the same engine scored both, so a record counts only when its scores
 * carry today's `ENGINE_VERSION`. Until 2026-10-07 every
 * week compared with the previous Time Machine snapshot, the last month-end, so
 * each brief in a month restated the same move (§1.1.26 and §1.1.28 of
 * docs/feature-specs-current.md). The month-end is now the fallback, used only
 * where no brief from the previous one to two weeks exists, or none scored by
 * this engine, and named by its date like any other basis. The month-end is
 * re-scored by the current engine on every load, so it is like-for-like either way.
 */
export type ComparisonReading = {
  /** The earlier reading's record date, ISO: a brief's, or the month-end snapshot's. */
  recordDate: string;
  /** The conditions it was published or scored as. */
  regime: RegimeKey;
  scores: {
    tightness: number;
    riskAppetite: number;
    /** Null where the earlier reading did not record it: that row prints no comparison rather than an invented one. */
    baseRate: number | null;
    curveSlope: number | null;
  };
};

/*
 * How far back last week's brief can be. Five days at the near end, so a mid-week
 * read compares with the previous week's brief and never with this week's own
 * record (frozen from the same Monday reading, or later); fourteen at the far end,
 * so a missed freeze reaches back one more week before the month-end takes over.
 */
const NEAREST_DAYS = 5;
const FURTHEST_DAYS = 14;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const dayOf = (value: string) => Date.parse(`${value.slice(0, 10)}T00:00:00.000Z`);

/**
 * A reading's short-term rate, or null where it had none. The engine scores a
 * missing rate as 0 (`baseRateUsed: "MISSING"`), which is not a reading: compared
 * as one, a feed failure printed as the rate falling to zero.
 */
export const observedBaseRate = (scores: Pick<RegimeScores, "baseRate" | "baseRateUsed">): number | null =>
  scores.baseRateUsed === "MISSING" ? null : scores.baseRate;

/**
 * The most recent published brief whose record date is five to fourteen days
 * before `currentRecordDate`, as the reading this week compares with; null when
 * the archive has none in that window, and then the caller compares with the
 * month-end. A record without scores cannot be compared with and is passed
 * over, and so is one scored by another engine than `engineVersion`, or by one
 * it did not record (every record frozen before 2026-10-07): across a scoring
 * change the move would be the code's, printed as the market's. A record dated
 * on or after the reading never qualifies.
 */
export const findWeeklyComparisonReading = (
  records: readonly Pick<PublishedBrief, "recordDate" | "regime" | "scores">[],
  currentRecordDate: string,
  engineVersion: string,
): ComparisonReading | null => {
  const current = dayOf(currentRecordDate);
  if (!Number.isFinite(current)) return null;

  const latest = records
    .flatMap((record) => {
      const recorded = dayOf(record.recordDate);
      const daysBefore = (current - recorded) / MS_PER_DAY;
      return record.scores?.engineVersion === engineVersion &&
        Number.isFinite(recorded) &&
        daysBefore >= NEAREST_DAYS &&
        daysBefore <= FURTHEST_DAYS
        ? [{ record, scores: record.scores, recorded }]
        : [];
    })
    .sort((left, right) => right.recorded - left.recorded)[0];
  if (!latest) return null;

  return {
    recordDate: latest.record.recordDate,
    regime: latest.record.regime,
    scores: {
      tightness: latest.scores.tightness,
      riskAppetite: latest.scores.riskAppetite,
      baseRate: latest.scores.baseRate ?? null,
      curveSlope: latest.scores.curveSlope ?? null,
    },
  };
};
