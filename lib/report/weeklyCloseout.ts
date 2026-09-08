/**
 * What an operator settled at the end of a week, and how it reads the next one.
 *
 * The control this replaces was a checkbox, four dots and a flame streak.
 * `docs/adoption-driven-change-plan.md` already called that weak gamification:
 * a streak measures attendance, and the thing worth recording at the end of a
 * decision review is what was decided. This module owns the record's shape and
 * the comparison that reopens it next week; the component owns only the form.
 */

export type WeeklyCloseout = {
  recordDate: string;
  closedAt: string;
  /** Decision areas the operator chose to change this week. */
  changed: string[];
  /** Conditions they said they were watching. */
  watching: string[];
  note?: string;
  /** Readings at the moment of closing, so next week can say what moved. */
  conditions?: { tightness: number; riskAppetite?: number };
};

export type CloseoutStore = Record<string, WeeklyCloseout>;

/** A movement worth showing beside a reopened record. */
export type ConditionDrift = {
  label: string;
  delta: number;
};

export type ReopenedCloseout = {
  record: WeeklyCloseout;
  /** Areas changed last week that this week flags again. */
  flaggedAgain: string[];
  /** Areas changed last week that this week leaves alone. */
  settled: string[];
  /** How far the conditions have moved since the record was written. */
  drift: ConditionDrift[];
};

const round1 = (value: number) => Math.round(value * 10) / 10;

/**
 * The most recent closeout strictly before `recordDate`.
 *
 * Sorted lexically, which is safe only because record dates are stored as the
 * ISO-ish labels the report emits. A store written under a different label
 * format sorts wrong rather than throwing, so the caller gets a stale record
 * instead of a crash — the failure a reader can see and ignore.
 */
export const selectPreviousCloseout = (
  store: CloseoutStore,
  recordDate: string,
): WeeklyCloseout | null => {
  const earlier = Object.values(store)
    .filter((entry) => entry.recordDate !== recordDate)
    .sort((left, right) => (left.closedAt < right.closedAt ? 1 : -1));
  return earlier[0] ?? null;
};

/**
 * Reopens last week's record against this week's conditions.
 *
 * `flaggedAgain` is the point of the whole feature: an area the operator chose
 * to change last week and that the model has queued again is the one place a
 * weekly ritual can catch a decision that is not holding.
 */
export const reopenCloseout = ({
  record,
  revisitAreas,
  conditions,
}: {
  record: WeeklyCloseout | null;
  revisitAreas: readonly string[];
  conditions?: { tightness: number; riskAppetite?: number };
}): ReopenedCloseout | null => {
  if (!record) return null;

  const queued = new Set(revisitAreas);
  const flaggedAgain = record.changed.filter((area) => queued.has(area));
  const settled = record.changed.filter((area) => !queued.has(area));

  const drift: ConditionDrift[] = [];
  if (record.conditions && conditions) {
    const tightnessDelta = round1(conditions.tightness - record.conditions.tightness);
    if (tightnessDelta !== 0) drift.push({ label: "Funding pressure", delta: tightnessDelta });

    if (
      typeof conditions.riskAppetite === "number" &&
      typeof record.conditions.riskAppetite === "number"
    ) {
      const riskDelta = round1(conditions.riskAppetite - record.conditions.riskAppetite);
      if (riskDelta !== 0) drift.push({ label: "Risk appetite", delta: riskDelta });
    }
  }

  return { record, flaggedAgain, settled, drift };
};

export const formatDriftLabel = (drift: ConditionDrift) =>
  `${drift.label} ${drift.delta > 0 ? "+" : "−"}${Math.abs(drift.delta).toFixed(1)} since`;

/** How many of the given weeks carry a record. Coverage, not a streak. */
export const countClosedWeeks = (store: CloseoutStore, recordDates: readonly string[]) =>
  recordDates.filter((date) => Boolean(store[date])).length;
