import type { TimeMachineRegimeEntry } from "../timeMachine/timeMachineCache";
import { REGIME_SEVERITY_RANK, getRegimePublicLabel, isRegimeKey } from "../regimePresentation";
import type { RegimeKey } from "../regimeEngine";
import { signalReadingMeaning } from "./signalTranslations";
import { formatMonthLabel } from "../timeMachine/monthFormatting";
import { RUNWAY_BAND_OPTIONS, type RunwayBand } from "./operatorRunway";

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
 * Direction, not the exact pair: seven changes since 2012 is too few for
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

/**
 * The query key for the change the card compares with (`/?compare=2022-09`), the URL's
 * like every view of `/` (ui-ux-standards §V): a link copied while comparing with Mar 2022
 * opens on Mar 2022. Absent, the card compares with the last change the same way.
 */
export const COMPARE_PARAM = "compare";

/** One change in conditions on the record, as the card's row of links names it. */
type CallChangeChoice = {
  /** "2022-09", the value `?compare=` carries and the month's `<time>` value. */
  key: string;
  /** "Sep 2022". */
  month: string;
  /** "Stormy to Freezing". */
  change: string;
  /** The one the card draws. */
  current: boolean;
  /** The last change the same way as this week's: the card's default, whose link carries no key. */
  lastSameWay: boolean;
};

export type LastTimeCallChanged = {
  /** Which way the change the card draws went: toward tighter money or easier. */
  direction: "tightening" | "easing";
  changedAt: MonthRef & { from: RegimeKey; to: RegimeKey; fromLabel: string; toLabel: string };
  after: MonthRef;
  /** Months from the change to `after`: three, or fewer for a change the record has not yet run three months past. */
  monthsLater: number;
  tightness: { atChange: number; later: number };
  riskAppetite: { atChange: number; later: number };
  /**
   * Every month-end from the change to `after`, both ends included, with how many months
   * on each is (2026-11-18). `tightness` and `riskAppetite` above are its first and last
   * entries; the card draws the months between beside them, so the drawing and the
   * cells read one walk.
   */
  path: (MonthRef & { monthsSince: number; tightness: number; riskAppetite: number })[];
  /** This week's change and scores, for the comparison with the month that was found. */
  today: { from: RegimeKey; to: RegimeKey; tightness: number; riskAppetite: number };
  /**
   * Every change in conditions on the record with a month-end after it, oldest first, for
   * the row of links over the panels (2026-11-18). The card draws the one marked `current`:
   * the change `?compare=` names, else the last one the same way as this week's.
   */
  choices: CallChangeChoice[];
};

const severityStep = (from: RegimeKey, to: RegimeKey) =>
  Math.sign(REGIME_SEVERITY_RANK[to] - REGIME_SEVERITY_RANK[from]);

const monthRef = (entry: TimeMachineRegimeEntry): MonthRef => ({
  year: entry.year,
  month: entry.month,
  recordDate: entry.recordDate,
});

/** "2022-09": a month's `?compare=` value, from its record date. */
const monthKey = (entry: Pick<MonthRef, "recordDate">) => entry.recordDate.slice(0, 7);

/** A `?compare=` value, or undefined for anything that is not a year and a month. */
export const parseCompareMonth = (value: string | undefined): string | undefined =>
  value !== undefined && /^\d{4}-(0[1-9]|1[0-2])$/.test(value) ? value : undefined;

/**
 * This week's change set beside one earlier change on the record.
 *
 * Every change in conditions on the walk is offered (`choices`), oldest first; each needs
 * one month-end after it, so its scores have somewhere to go. The one drawn is the change
 * `compare` names or, by default, the most recent change in the same direction as this
 * week's with three month-ends after it. The panels, the cells and the sentence under them
 * all read the change drawn, so a reader who picks Mar 2022 sees Mar 2022 throughout.
 */
export const findLastTimeCallChanged = ({
  series,
  currentRegime,
  previousRegime,
  currentScores,
  compare,
}: {
  /** The month-end walk, any order; only entries with both scores count. */
  series: readonly TimeMachineRegimeEntry[];
  currentRegime: RegimeKey;
  /** The call before this week's. Absent or equal means the call did not change. */
  previousRegime: RegimeKey | null | undefined;
  /** Where the two scores stand this week. */
  currentScores: { tightness: number; riskAppetite: number };
  /** The change to compare with (`?compare=2022-09`); a month the walk holds no change in is ignored. */
  compare?: string;
}): LastTimeCallChanged | null => {
  if (!previousRegime || previousRegime === currentRegime) return null;
  const step = severityStep(previousRegime, currentRegime);
  if (step === 0) return null;

  const ordered = [...series]
    .filter((entry) => Number.isFinite(entry.tightness) && Number.isFinite(entry.riskAppetite))
    .sort((a, b) => a.recordDate.localeCompare(b.recordDate));

  /* Every change with a month-end after it, oldest first, with the month before it. */
  const changes = ordered.flatMap((entry, index) => {
    const before = ordered[index - 1];
    return before && before.regime !== entry.regime && index < ordered.length - 1 ? [{ entry, before, index }] : [];
  });
  /* The default: the latest change the same way with three months after it. */
  const sameWay = changes
    .filter((change) => change.index + FOLLOW_THROUGH_MONTHS < ordered.length && severityStep(change.before.regime, change.entry.regime) === step)
    .at(-1);
  const chosen = (compare === undefined ? undefined : changes.find((change) => monthKey(change.entry) === compare)) ?? sameWay;
  if (!chosen || !sameWay) return null;

  const { entry, before, index } = chosen;
  const path = ordered.slice(index, index + FOLLOW_THROUGH_MONTHS + 1).map((month, monthsSince) => ({
    ...monthRef(month),
    monthsSince,
    tightness: month.tightness,
    riskAppetite: month.riskAppetite,
  }));
  const after = path.at(-1) ?? { ...monthRef(entry), monthsSince: 0, tightness: entry.tightness, riskAppetite: entry.riskAppetite };
  return {
    direction: severityStep(before.regime, entry.regime) > 0 ? "tightening" : "easing",
    changedAt: {
      ...monthRef(entry),
      from: before.regime,
      to: entry.regime,
      fromLabel: getRegimePublicLabel(before.regime),
      toLabel: getRegimePublicLabel(entry.regime),
    },
    after: { year: after.year, month: after.month, recordDate: after.recordDate },
    monthsLater: after.monthsSince,
    tightness: { atChange: entry.tightness, later: after.tightness },
    riskAppetite: { atChange: entry.riskAppetite, later: after.riskAppetite },
    path,
    today: { from: previousRegime, to: currentRegime, ...currentScores },
    choices: changes.map((change) => ({
      key: monthKey(change.entry),
      month: formatMonthLabel(change.entry.year, change.entry.month),
      change: `${getRegimePublicLabel(change.before.regime)} to ${getRegimePublicLabel(change.entry.regime)}`,
      current: change === chosen,
      lastSameWay: change === sameWay,
    })),
  };
};

/**
 * The card for every change it offers, keyed by `?compare=` value, from one walk each:
 * the page renders them all so a choice shows in place, without asking the server again.
 * Null where the card has nothing to show (`findLastTimeCallChanged`).
 */
export const findCallChangeComparisons = (
  args: Omit<Parameters<typeof findLastTimeCallChanged>[0], "compare">,
): { byKey: Record<string, LastTimeCallChanged>; defaultKey: string } | null => {
  const fallback = findLastTimeCallChanged(args);
  const defaultKey = fallback?.choices.find((choice) => choice.current)?.key;
  if (!fallback || defaultKey === undefined) return null;
  const byKey: Record<string, LastTimeCallChanged> = {};
  for (const choice of fallback.choices) {
    const record = choice.key === defaultKey ? fallback : findLastTimeCallChanged({ ...args, compare: choice.key });
    if (record) byKey[choice.key] = record;
  }
  return { byKey, defaultKey };
};

/* Inside this many points a score is "about where it was": the walk is monthly and the
   scores are whole numbers, so a gap this small is not a difference worth naming. */
const ABOUT_THE_SAME = 5;

/** "tightened" or "eased": which way a change went, by the severity order of the weather words. */
const lastTimeVerb = (record: Pick<LastTimeCallChanged, "direction">) =>
  record.direction === "tightening" ? "tightened" : "eased";

/**
 * The change the card draws, set against this week, answer first (2026-11-18): how alike
 * the two changes were, then each score with what it meant, then and now.
 *
 * The lead answers before any number: "The same change", "Tightened both times" (or
 * "Eased"), or "The other way" when one went toward tighter money and the other toward
 * easier. A reader who picks a change from the row should not have to work out from two
 * pairs of weather words that it went the opposite way. It names the month, so the
 * sentence still says which change it means when it is copied out alone.
 *
 * Each score carries its meaning (`signalReadingMeaning`), once where both readings share
 * it, so "7" and "43" say "avoiding risk" and "selective about risk" without the reader
 * knowing which end of the scale is which. `alike` is where the two are the same change
 * with both scores about where they were; anything else says it is one earlier outcome and
 * not a forecast, because that is what a reader who sees "3 months on" is most likely to
 * take it for.
 */
export const describeAgainstToday = (record: LastTimeCallChanged): { alike: boolean; text: string } => {
  const { today, changedAt } = record;
  const samePair = changedAt.from === today.from && changedAt.to === today.to;
  const alike =
    samePair
    && Math.abs(today.tightness - record.tightness.atChange) <= ABOUT_THE_SAME
    && Math.abs(today.riskAppetite - record.riskAppetite.atChange) <= ABOUT_THE_SAME;
  /* One sentence per score, and a meaning printed once when both readings share
     it: "Funding pressure was 79 (money is hard to raise) then and is 90 (money is
     hard to raise) now; risk appetite was …" carried the same gloss twice in a
     35-word sentence until 2026-10-09. */
  const scoreSentence = (key: "tightness" | "riskAppetite", label: string, then: number, now: number) => {
    const meaningThen = signalReadingMeaning(key, then);
    const meaningNow = signalReadingMeaning(key, now);
    return meaningThen === meaningNow
      ? `${label} was ${then} then and is ${now} now; at both readings, ${meaningThen}.`
      : `${label} was ${then} then (${meaningThen}) and is ${now} now (${meaningNow}).`;
  };
  const then = formatMonthLabel(changedAt.year, changedAt.month);
  const thenPair = `${changedAt.fromLabel} to ${changedAt.toLabel}`;
  const nowPair = `${getRegimePublicLabel(today.from)} to ${getRegimePublicLabel(today.to)}`;
  const thisWeek = lastTimeVerb({ direction: severityStep(today.from, today.to) > 0 ? "tightening" : "easing" });
  const lead = samePair
    ? `The same change: ${then} also went ${thenPair}.`
    : lastTimeVerb(record) === thisWeek
      ? `${thisWeek === "tightened" ? "Tightened" : "Eased"} both times: ${then} went ${thenPair}; this week went ${nowPair}.`
      : `The other way: ${then} ${lastTimeVerb(record)} from ${thenPair}; this week ${thisWeek} from ${nowPair}.`;
  const sentences = [
    lead,
    scoreSentence("tightness", "Funding pressure", record.tightness.atChange, today.tightness),
    scoreSentence("riskAppetite", "Risk appetite", record.riskAppetite.atChange, today.riskAppetite),
    ...(alike ? [] : ["One earlier outcome, not a forecast."]),
  ];
  return { alike, text: sentences.join(" ") };
};

/** The comparison page for the change month against the month three later. */
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

type Spell = { regime: RegimeKey; start: MonthRef; end: MonthRef; months: number };

const spellsOf = (series: readonly TimeMachineRegimeEntry[]): Spell[] => {
  const ordered = [...series].sort((a, b) => a.recordDate.localeCompare(b.recordDate));
  const spells: Spell[] = [];
  for (const entry of ordered) {
    const last = spells.at(-1);
    if (last && last.regime === entry.regime) {
      last.end = monthRef(entry);
      last.months += 1;
    } else {
      spells.push({ regime: entry.regime, start: monthRef(entry), end: monthRef(entry), months: 1 });
    }
  }
  return spells;
};

/**
 * Since when this week's conditions have held, for the card's stamp line: "Since Apr
 * 2026" (2026-11-03). A reader can't tell from "Cloudy" alone whether it is this week's
 * news or the standing state. Null when the latest month-end is not in these
 * conditions (a change that began this week, which the stamp's "Was …" already says)
 * or the record does not reach back to a change.
 */
export const describeConditionsSince = ({
  series,
  currentRegime,
}: {
  series: readonly TimeMachineRegimeEntry[];
  currentRegime: RegimeKey;
}): string | null => {
  const spells = spellsOf(series);
  const current = spells.at(-1);
  if (spells.length < 2 || !current || current.regime !== currentRegime) return null;
  return `Since ${formatMonthLabel(current.start.year, current.start.month)}`;
};

/**
 * Where a score sits against every month-end on the record, in words, for a reader who
 * has no feel for the 0–100 scale (2026-11-03): "higher than in most months since 2012",
 * or "about typical" in the middle fifth. Words, not "9 of 10": the reader needs the
 * rank, not a second fraction beside the score. Higher and lower, not better and worse:
 * the sentence it sits in says which way the score is bad.
 */
const shareWords = (share: number) => (share >= 0.95 ? "almost every month" : "most months");

type RecordMetric = "tightness" | "riskAppetite";

/**
 * Where a score ranks among the record's month-ends: the share below it and above it.
 * One count, read by the sentence beside the guidance and by the distribution drawn
 * behind the score's rail, so the two cannot rank the score differently. Null on a
 * record too short to rank against.
 */
const rankAgainstRecord = (series: readonly TimeMachineRegimeEntry[], metric: RecordMetric, value: number) => {
  const first = [...series].sort((a, b) => a.recordDate.localeCompare(b.recordDate)).at(0);
  if (series.length < 24 || first === undefined) return null;
  return {
    below: series.filter((entry) => entry[metric] < value).length / series.length,
    above: series.filter((entry) => entry[metric] > value).length / series.length,
    first,
    months: series.length,
  };
};

const describeScoreAgainstRecord = ({
  series,
  metric,
  value,
}: {
  series: readonly TimeMachineRegimeEntry[];
  metric: RecordMetric;
  value: number;
}): string | null => {
  const rank = rankAgainstRecord(series, metric, value);
  if (!rank) return null;
  if (rank.below >= 0.6) return `higher than ${shareWords(rank.below)} since ${rank.first.year}`;
  if (rank.above >= 0.6) return `lower than ${shareWords(rank.above)} since ${rank.first.year}`;
  return "about typical";
};

const SCORE_BIN_POINTS = 5;
const PERCENT = new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 0 });

type ScoreDistribution = {
  /** Month-ends in each 5-point band of the 0–100 scale, lowest band first. */
  bins: number[];
  binPoints: number;
  /** "Higher than 92% of the 178 month-end readings since Jan 2012." */
  summary: string;
};

/**
 * Every month-end reading of a score on the record, in 5-point bands, for a quiet
 * histogram behind the score's rail (2026-11-18), with the score's rank in the words the
 * figure's title and accessible name carry. The same series and the same count as
 * `describeConditionFacts`' "higher than most months since 2012".
 */
export const describeScoreDistribution = ({
  series,
  metric,
  value,
}: {
  series: readonly TimeMachineRegimeEntry[];
  metric: RecordMetric;
  value: number;
}): ScoreDistribution | null => {
  const rank = rankAgainstRecord(series, metric, value);
  if (!rank) return null;
  const bins = Array.from({ length: 100 / SCORE_BIN_POINTS }, () => 0);
  for (const entry of series) {
    const index = Math.min(bins.length - 1, Math.max(0, Math.floor(entry[metric] / SCORE_BIN_POINTS)));
    bins[index] += 1;
  }
  const since = formatMonthLabel(rank.first.year, rank.first.month);
  const of = `of the ${rank.months} month-end readings since ${since}`;
  const summary =
    rank.below >= rank.above
      ? `Higher than ${PERCENT.format(rank.below)} ${of}.`
      : `Lower than ${PERCENT.format(rank.above)} ${of}.`;
  return { bins, binPoints: SCORE_BIN_POINTS, summary };
};

/** The current scores against the record, even when the committed conditions are holding. */
export const describeConditionFacts = ({
  series,
  regime,
  tightness,
  riskAppetite,
}: {
  series: readonly TimeMachineRegimeEntry[];
  regime: string;
  tightness: number;
  riskAppetite: number;
}): string | null => {
  if (!isRegimeKey(regime)) return null;
  /* "since 2012" once: the second comparison is against the same record. */
  const pressure = describeScoreAgainstRecord({ series, metric: "tightness", value: tightness });
  const appetiteRecord = describeScoreAgainstRecord({ series, metric: "riskAppetite", value: riskAppetite });
  const appetite = pressure?.includes(" since ") ? appetiteRecord?.replace(/ since \d{4}$/, "") : appetiteRecord;
  return (
    `Funding pressure is ${Math.round(tightness)}${pressure ? `, ${pressure}` : ""}. ` +
    `Risk appetite is ${Math.round(riskAppetite)}${appetite ? `, ${appetite}` : ""}.`
  );
};

/* Months, as a colleague counts them (2026-10-28). Each is a month-end reading, and the
   sentences said "month-ends", which nobody says out loud about a stretch of weather. */
const monthEnds = (count: number) => (count === 1 ? "1 month" : `${count} months`);
const spellRange = (spell: Spell) =>
  `${formatMonthLabel(spell.start.year, spell.start.month)} to ${formatMonthLabel(spell.end.year, spell.end.month)}`;

/** One stretch on the plot: how long it ran, the month it began (the time machine opens there) and what its mark says. */
type SpellPlotStretch = { months: number; start: MonthRef; latest: boolean; label: string };

/**
 * Every stretch of conditions on the record, by how long it ran, for the plot beside the
 * sentences (2026-11-18): one row per condition, a mark per stretch, the stretch the
 * record ends in open, and a rule at the shortest that ended. The same walk and the same
 * `shortest` as the sentence "every stretch of conditions has lasted at least 6 months",
 * so the rule and the sentence cannot name two numbers.
 */
export type SpellLengthPlot = {
  /** The conditions the record holds, mildest first (the order the record's key uses). */
  rows: { regime: RegimeKey; label: string; total: string; stretches: SpellPlotStretch[] }[];
  /** The shortest stretch that ended, in months; null with none ended. */
  shortest: number | null;
  /** The axis' end in months: the longest stretch, up to a whole year. */
  axisMax: number;
  /** The months the plot reads: "Jan 2012 to Oct 2026". */
  range: string;
  /** What the open mark is, for the key. */
  latestKey: string;
};

const buildSpellLengthPlot = (spells: readonly Spell[], ongoing: boolean, shortest: number | null): SpellLengthPlot | null => {
  const first = spells.at(0);
  const last = spells.at(-1);
  if (!first || !last) return null;
  const lastMonth = formatMonthLabel(last.end.year, last.end.month);
  const regimes = [...new Set(spells.map((spell) => spell.regime))].sort(
    (left, right) => REGIME_SEVERITY_RANK[left] - REGIME_SEVERITY_RANK[right],
  );
  const rows = regimes.map((regime) => {
    const label = getRegimePublicLabel(regime);
    const own = spells.filter((spell) => spell.regime === regime);
    return {
      regime,
      label,
      total: `${monthEnds(own.reduce((sum, spell) => sum + spell.months, 0))} in all`,
      stretches: own.map((spell) => {
        const latest = spell === last;
        const since = formatMonthLabel(spell.start.year, spell.start.month);
        /* The stretch the record ends in has not ended at its last month-end, whether or
           not this week's reading has moved on from it. */
        const text = !latest
          ? `${label}, ${spellRange(spell)}: ${monthEnds(spell.months)}`
          : ongoing
            ? `${label} since ${since}: ${monthEnds(spell.months)} so far`
            : `${label} since ${since}: ${monthEnds(spell.months)} by ${lastMonth}, the latest month-end`;
        return { months: spell.months, start: spell.start, latest, label: text };
      }),
    };
  });
  const longest = Math.max(...spells.map((spell) => spell.months));
  return {
    rows,
    shortest,
    axisMax: Math.max(12, Math.ceil(longest / 12) * 12),
    range: `${formatMonthLabel(first.start.year, first.start.month)} to ${lastMonth}`,
    latestKey: ongoing ? "this one, so far" : `latest, to ${lastMonth}`,
  };
};

/**
 * How long conditions like this week's lasted before, from the month-end walk.
 *
 * A headline says money is tight; what a plan needs to know is for how long,
 * and the record answers that without a forecast: the earlier spells of these
 * conditions and their length in month-ends. The record is short (seven spells
 * since 2012, one of them Freezing), so the sentence counts the spells it
 * found rather than averaging them, and says once that a count is not a
 * forecast.
 *
 * The spell the record ends in is left out of the earlier ones when it is this
 * week's conditions, since it has not ended. With a chosen runway band whose
 * top is shorter than every earlier spell, the sentence says so: that is the
 * comparison a reader with 12–24 months of cash is making in their head.
 */
export const describeSpellLengths = ({
  series,
  currentRegime,
  runwayBand,
}: {
  series: readonly TimeMachineRegimeEntry[];
  currentRegime: RegimeKey;
  /** The reader's own band; null when they have not chosen one. */
  runwayBand: RunwayBand | null;
}): { lead: string; rest: string; plot: SpellLengthPlot | null } | null => {
  const spells = spellsOf(series);
  const firstYear = spells.at(0)?.start.year;
  if (spells.length < 2 || firstYear === undefined) return null;
  const ongoing = spells.at(-1)?.regime === currentRegime;
  const earlier = spells.filter((spell, index) => spell.regime === currentRegime && !(ongoing && index === spells.length - 1));
  const label = getRegimePublicLabel(currentRegime);
  const completed = spells.slice(0, -1);
  const shortest = completed.length > 0 ? Math.min(...completed.map((spell) => spell.months)) : null;

  /*
   * The lead sets this spell beside the earlier ones (2026-10-27): "how long will it
   * last" is the question the section exists for, and the earlier lengths alone left
   * a reader to work out how far into this one the record is. Only while the latest
   * month-end is still in these conditions; a spell that began this week has no
   * month-end yet, and the lead then names the earlier spells alone.
   */
  const current = ongoing ? spells.at(-1)?.months ?? null : null;
  const soFar = current !== null ? `It's been ${label} for ${monthEnds(current)} so far. ` : "";
  let lead = "";
  if (earlier.length === 0) {
    lead = current !== null
      ? `This is the first ${label} stretch since ${firstYear}, ${monthEnds(current)} so far.`
      : `There's no earlier ${label} stretch since ${firstYear}.`;
  } else if (earlier.length === 1) {
    const only = earlier.at(0);
    if (only) {
      lead = current !== null
        ? `${soFar}The last ${label} stretch lasted ${monthEnds(only.months)}, ${spellRange(only)}.`
        : `The only earlier ${label} stretch lasted ${monthEnds(only.months)}, ${spellRange(only)}.`;
    }
  } else {
    const lengths = earlier.map((spell) => spell.months);
    const listed = `${lengths.slice(0, -1).join(", ")} and ${monthEnds(lengths.at(-1) ?? 0)}`;
    lead = current !== null
      ? `${soFar}The ${earlier.length} earlier ones lasted ${listed}.`
      : `There have been ${earlier.length} earlier ${label} stretches, lasting ${listed}.`;
  }
  const parts: string[] = [];
  if (shortest !== null) parts.push(`Since ${firstYear}, every stretch of conditions has lasted at least ${monthEnds(shortest)}.`);

  const band = runwayBand ? RUNWAY_BAND_OPTIONS.find((option) => option.key === runwayBand) : undefined;
  const bandTop = band?.maxMonths ?? null;
  if (band && bandTop !== null && earlier.length > 0 && earlier.every((spell) => spell.months > bandTop)) {
    parts.push(
      `${earlier.length === 1 ? "That stretch" : "Each one"} lasted longer than ${band.phrase} of runway, the band you chose.`,
    );
  }
  parts.push("That's a count, not a forecast.");
  return { lead, rest: parts.join(" "), plot: buildSpellLengthPlot(spells, ongoing, shortest) };
};

type HoldLine = { value: number; holdsAbove: boolean };

const isPast = (score: number, line: HoldLine) => (line.holdsAbove ? score > line.value : score < line.value);

/**
 * How long a hold has run, and how long the earlier ones at the same lines took to lift,
 * from the month-end walk (2026-11-03): "It rose above 76 in Sep 2026. The last time, in
 * Sep 2022, it took 39 months to thaw." "Restarts when funding pressure falls
 * below 66" says what lifts a hold and not when, and when is what a hiring plan needs.
 *
 * A hold starts at the first month-end past the pause line and lifts at the first one past
 * the restart line, as the rule does between them. Today's lines are read back over the
 * whole record, so this is what the score did, not what a published rule said at the time.
 * A hold already running in the record's first month is left out: its start is not on it.
 * Months, not weeks, because the record is month-ends: a hold that began this week has no
 * start to name yet. Counts, not a range or a median, while there are fewer than three.
 * Null when the two lines are on different scores.
 */
export const describePastHolds = ({
  series,
  metric,
  pause,
  restart,
}: {
  series: readonly TimeMachineRegimeEntry[];
  metric: "tightness" | "riskAppetite";
  pause: HoldLine;
  restart: HoldLine;
}): string | null => {
  const ordered = [...series].sort((a, b) => a.recordDate.localeCompare(b.recordDate));
  const firstYear = ordered.at(0)?.year;
  if (ordered.length < 24 || firstYear === undefined) return null;
  const holds: { start: TimeMachineRegimeEntry; months: number }[] = [];
  let open: { start: TimeMachineRegimeEntry; index: number } | null = null;
  let censored = false;
  for (const [index, entry] of ordered.entries()) {
    if (!open && isPast(entry[metric], pause)) {
      open = { start: entry, index };
      censored = index === 0;
    } else if (open && isPast(entry[metric], restart)) {
      if (!censored) holds.push({ start: open.start, months: index - open.index });
      open = null;
    }
  }
  const rose = pause.holdsAbove ? "rose above" : "fell below";
  const since = open && !censored ? `It ${rose} ${pause.value} in ${formatMonthLabel(open.start.year, open.start.month)}` : null;
  if (holds.length === 0) {
    return since
      ? `${since}, for the first time since the record began in ${firstYear}.`
      : `It had not ${pause.holdsAbove ? "risen above" : "fallen below"} ${pause.value} since the record began in ${firstYear}.`;
  }
  const lead = since ? `${since}. ` : "";
  const only = holds.length === 1 ? holds.at(0) : undefined;
  if (only) {
    return `${lead}The last time, in ${formatMonthLabel(only.start.year, only.start.month)}, it took ${monthEnds(only.months)} to thaw.`;
  }
  const lengths = holds.map((hold) => hold.months);
  if (holds.length === 2) {
    return `${lead}The 2 earlier times, it took ${lengths.join(" and ")} months to thaw.`;
  }
  const sorted = [...lengths].sort((a, b) => a - b);
  const median = sorted.at(Math.floor((sorted.length - 1) / 2)) ?? 0;
  return `${lead}The ${holds.length} earlier times, it took ${sorted.at(0)} to ${monthEnds(sorted.at(-1) ?? 0)} to thaw; half took ${monthEnds(median)} or fewer.`;
};
