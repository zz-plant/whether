import type { TimeMachineRegimeEntry } from "../timeMachine/timeMachineCache";
import { REGIME_SEVERITY_RANK, getRegimePublicLabel } from "../regimePresentation";
import type { RegimeKey } from "../regimeEngine";
import { formatMonthLabel } from "../timeMachine/monthFormatting";
import { signalReadingMeaning } from "./signalTranslations";

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
 *
 * What it found is one earlier month, and a reader takes it for a pattern unless the
 * card says how that month differed from this one: the scores three months on
 * stood where they stood because of where they started, and the change it matched
 * may have come from another state. `today` carries this week's pair and scores so
 * the card can put the two side by side (`describeAgainstToday`).
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
  /** This week's change and scores, for the comparison with the month that was found. */
  today: { from: RegimeKey; to: RegimeKey; tightness: number; riskAppetite: number };
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
  currentScores,
}: {
  /** The month-end walk, any order; only entries with both scores count. */
  series: readonly TimeMachineRegimeEntry[];
  currentRegime: RegimeKey;
  /** The call before this week's. Absent or equal means the call did not change. */
  previousRegime: RegimeKey | null | undefined;
  /** Where the two scores stand this week. */
  currentScores: { tightness: number; riskAppetite: number };
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
      today: { from: previousRegime, to: currentRegime, ...currentScores },
    };
  }
  return null;
};

/* Inside this many points a score is "about where it was": the walk is monthly and the
   scores are whole numbers, so a gap this small is not a difference worth naming. */
const ABOUT_THE_SAME = 5;

/**
 * The month that was found, set against this week: the change it was and the one this
 * week is, then each score with what it meant, then and now. The meaning rides beside
 * every number (`signalReadingMeaning`), so "7" and "43" say "avoiding risk" and
 * "selective about risk" without the reader knowing which end of the scale is which.
 * `alike` is where the two are the same change with both scores about where they were;
 * anything else says it is one earlier outcome and not a forecast, because that is what
 * a reader who sees "3 months on, the scores stood here" is most likely to take it for.
 */
export const describeAgainstToday = (record: LastTimeCallChanged): { alike: boolean; text: string } => {
  const { today, changedAt } = record;
  const samePair = changedAt.from === today.from && changedAt.to === today.to;
  const alike =
    samePair
    && Math.abs(today.tightness - record.tightness.atChange) <= ABOUT_THE_SAME
    && Math.abs(today.riskAppetite - record.riskAppetite.atChange) <= ABOUT_THE_SAME;
  const reading = (key: "tightness" | "riskAppetite", score: number) => `${score} (${signalReadingMeaning(key, score)})`;
  const sentences = [
    ...(samePair
      ? []
      : [`That change was ${changedAt.fromLabel} to ${changedAt.toLabel}; this week's is ${getRegimePublicLabel(today.from)} to ${getRegimePublicLabel(today.to)}.`]),
    `Then, funding pressure was ${reading("tightness", record.tightness.atChange)} and risk appetite ${reading("riskAppetite", record.riskAppetite.atChange)}; now they are ${reading("tightness", today.tightness)} and ${reading("riskAppetite", today.riskAppetite)}.`,
    ...(alike ? [] : ["It is one earlier outcome, not a forecast."]),
  ];
  return { alike, text: sentences.join(" ") };
};

/**
 * The card as one sentence, for a first visit, where the card folds away with the rest of the
 * brief and the turning points under the decision picker were links with nothing to read on the
 * page. Where each score started and where it stood three months on, because the later number
 * alone reads as a forecast; the meaning rides with the later number, and with the earlier one
 * too when the two sit in different bands. The caveat is the card's, on the same condition.
 */
export const summarizeLastTimeCallChanged = (record: LastTimeCallChanged): string => {
  const movement = (key: "tightness" | "riskAppetite") => {
    const { atChange, later } = record[key];
    const before = signalReadingMeaning(key, atChange);
    const after = signalReadingMeaning(key, later);
    return `${atChange}${before === after ? "" : ` (${before})`} to ${later} (${after})`;
  };
  const changedAt = formatMonthLabel(record.changedAt.year, record.changedAt.month);
  const after = formatMonthLabel(record.after.year, record.after.month);
  const sentences = [
    `The last time conditions moved this way was ${changedAt} (${record.changedAt.fromLabel} to ${record.changedAt.toLabel}).`,
    `By ${after}, funding pressure had gone from ${movement("tightness")} and risk appetite from ${movement("riskAppetite")}.`,
    ...(describeAgainstToday(record).alike ? [] : ["One earlier outcome, not a forecast."]),
  ];
  return sentences.join(" ");
};

/** The comparison page for the change month against the month three later. */
export const buildLastTimeCompareHref = (record: LastTimeCallChanged) =>
  `/history/compare?yearA=${record.changedAt.year}&monthA=${record.changedAt.month}&yearB=${record.after.year}&monthB=${record.after.month}`;

type RecentCallChange = MonthRef & { fromLabel: string; toLabel: string };

/**
 * The most recent months the call changed, newest first — the turning points a
 * first-time reader can open in the time machine to check what the site said
 * then against what they remember happening. Read off the same month-end walk
 * as the card above, so a month offered here is one the time machine covers.
 */
export const findRecentCallChanges = (
  series: readonly TimeMachineRegimeEntry[],
  count: number,
): RecentCallChange[] => {
  const ordered = [...series].sort((a, b) => a.recordDate.localeCompare(b.recordDate));
  const changes: RecentCallChange[] = [];
  for (let index = ordered.length - 1; index >= 1 && changes.length < count; index -= 1) {
    const entry = ordered[index];
    const before = ordered[index - 1];
    if (entry.regime === before.regime) continue;
    changes.push({
      ...monthRef(entry),
      fromLabel: getRegimePublicLabel(before.regime),
      toLabel: getRegimePublicLabel(entry.regime),
    });
  }
  return changes;
};
