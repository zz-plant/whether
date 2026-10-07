import type { RegimeKey } from "../regimeEngine";
import type { PublishedBrief } from "./publishedBriefs";

/**
 * The earlier reading a week's moves are measured against.
 *
 * "What changed this week" compares the reading with last week's published brief:
 * the record the archive froze from the live brief a week ago, scored the way
 * today's reading is, so the comparison is like-for-like. Until 2026-10-07 every
 * week compared with the previous Time Machine snapshot, the last month-end, so
 * each brief in a month restated the same move (§1.1.26 and §1.1.28 of
 * docs/feature-specs-current.md). The month-end is now the fallback, used only
 * where no brief from the previous one to two weeks exists, and named by its
 * date like any other basis.
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
 * The most recent published brief whose record date is five to fourteen days
 * before `currentRecordDate`, as the reading this week compares with; null when
 * the archive has none in that window, and then the caller compares with the
 * month-end. A record without scores cannot be compared with and is passed
 * over. A record dated on or after the reading never qualifies.
 */
export const findWeeklyComparisonReading = (
  records: readonly Pick<PublishedBrief, "recordDate" | "regime" | "scores">[],
  currentRecordDate: string,
): ComparisonReading | null => {
  const current = dayOf(currentRecordDate);
  if (!Number.isFinite(current)) return null;

  const latest = records
    .flatMap((record) => {
      const recorded = dayOf(record.recordDate);
      const daysBefore = (current - recorded) / MS_PER_DAY;
      return record.scores && Number.isFinite(recorded) && daysBefore >= NEAREST_DAYS && daysBefore <= FURTHEST_DAYS
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
