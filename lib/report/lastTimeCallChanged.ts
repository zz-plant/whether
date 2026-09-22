import type { TimeMachineRegimeEntry } from "../timeMachine/timeMachineCache";
import { REGIME_SEVERITY_RANK, getRegimePublicLabel } from "../regimePresentation";
import type { RegimeKey } from "../regimeEngine";

/**
 * The last time the call moved the way it moved this week, and what the two
 * scores did afterwards.
 *
 * `/history/compare` and the time machine hold fourteen years of record, and
 * neither is offered at the moment a reader most needs it: the week the call
 * changes. This reads the month-end walk the site already serves and finds
 * the most recent month the call moved in the same direction — toward tighter
 * money or toward easier money, by the severity order the four weather words
 * sit in — then reports where funding pressure and risk appetite stood three
 * months later. Null when this week's call did not change, or when no earlier
 * change in that direction has three following months on record.
 *
 * Direction, not the exact pair: six changes in fourteen years is too few for
 * "Sunny to Freezing" to have a precedent most weeks, and the card names the
 * pair it found so a reader can tell the two apart.
 */
const FOLLOW_THROUGH_MONTHS = 3;

type MonthRef = { year: number; month: number; recordDate: string };

export type LastTimeCallChanged = {
  direction: "tightening" | "easing";
  changedAt: MonthRef & { from: RegimeKey; to: RegimeKey; fromLabel: string; toLabel: string };
  after: MonthRef;
  monthsLater: number;
  tightness: { atChange: number; later: number };
  riskAppetite: { atChange: number; later: number };
};

const severityStep = (from: RegimeKey, to: RegimeKey) =>
  Math.sign(REGIME_SEVERITY_RANK[to] - REGIME_SEVERITY_RANK[from]);

const monthRef = (entry: TimeMachineRegimeEntry): MonthRef => ({
  year: entry.year,
  month: entry.month,
  recordDate: entry.recordDate,
});

export const findLastTimeCallChanged = ({
  series,
  currentRegime,
  previousRegime,
}: {
  /** The month-end walk, any order; only entries with both scores count. */
  series: readonly TimeMachineRegimeEntry[];
  currentRegime: RegimeKey;
  /** The call before this week's. Absent or equal means the call did not change. */
  previousRegime: RegimeKey | null | undefined;
}): LastTimeCallChanged | null => {
  if (!previousRegime || previousRegime === currentRegime) return null;
  const step = severityStep(previousRegime, currentRegime);
  if (step === 0) return null;

  const ordered = [...series]
    .filter((entry) => Number.isFinite(entry.tightness) && Number.isFinite(entry.riskAppetite))
    .sort((a, b) => a.recordDate.localeCompare(b.recordDate));

  for (let index = ordered.length - 1 - FOLLOW_THROUGH_MONTHS; index >= 1; index -= 1) {
    const entry = ordered[index];
    const before = ordered[index - 1];
    if (entry.regime === before.regime) continue;
    if (severityStep(before.regime, entry.regime) !== step) continue;
    const after = ordered[index + FOLLOW_THROUGH_MONTHS];
    return {
      direction: step > 0 ? "tightening" : "easing",
      changedAt: {
        ...monthRef(entry),
        from: before.regime,
        to: entry.regime,
        fromLabel: getRegimePublicLabel(before.regime),
        toLabel: getRegimePublicLabel(entry.regime),
      },
      after: monthRef(after),
      monthsLater: FOLLOW_THROUGH_MONTHS,
      tightness: { atChange: entry.tightness, later: after.tightness },
      riskAppetite: { atChange: entry.riskAppetite, later: after.riskAppetite },
    };
  }
  return null;
};

/** The comparison page for the change month against the month three later. */
export const buildLastTimeCompareHref = (record: LastTimeCallChanged) =>
  `/history/compare?yearA=${record.changedAt.year}&monthA=${record.changedAt.month}&yearB=${record.after.year}&monthB=${record.after.month}`;
